BEGIN;

CREATE OR REPLACE FUNCTION public.gen_random_uuid_text()
RETURNS text
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN gen_random_uuid()::text;
END;
$$;

CREATE OR REPLACE FUNCTION public._role_rank(_r public.app_role)
RETURNS integer
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN CASE _r
    WHEN 'SUPER_ADMIN'          THEN 4
    WHEN 'TOURNAMENT_ADMIN'     THEN 3
    WHEN 'COMPETITION_MANAGER'  THEN 2
    WHEN 'VENUE_MANAGER'        THEN 1
    WHEN 'MATCH_COMMISSIONER'   THEN 1
    ELSE 0
  END;
END;
$$;

COMMENT ON FUNCTION public._role_rank IS
  'Tingkat hirarki peran untuk gradasi approval. Semakin tinggi rank semakin senior perannya.';

CREATE OR REPLACE FUNCTION public.approve_role_request(
  _request_id uuid,
  _decision_note text DEFAULT NULL,
  _contingent_id text DEFAULT NULL,
  _venue_id text DEFAULT NULL,
  _team_id text DEFAULT NULL
)
RETURNS public.role_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  req            public.role_requests;
  v_reviewer_id  uuid := auth.uid();
  reviewer_rank  integer;
  target_rank    integer;
  reviewer_name  text;
  actor_email    text;
BEGIN
  IF NOT public.is_admin(v_reviewer_id) THEN
    RAISE EXCEPTION 'Hanya administrator yang dapat menyetujui permintaan peran.';
  END IF;

  SELECT COALESCE(MAX(public._role_rank(role)), 0) INTO reviewer_rank
    FROM public.user_roles WHERE user_id = v_reviewer_id;

  SELECT * FROM public.role_requests WHERE id = _request_id FOR UPDATE INTO req;
  IF req IS NULL THEN
    RAISE EXCEPTION 'Permintaan peran tidak ditemukan.';
  END IF;
  IF req.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Permintaan ini sudah diproses.';
  END IF;

  target_rank := public._role_rank(req.requested_role);
  IF reviewer_rank < target_rank THEN
    RAISE EXCEPTION 'Anda tidak memiliki wewenang menyetujui peran %.', req.requested_role;
  END IF;
  IF target_rank = 4 AND reviewer_rank <> 4 THEN
    RAISE EXCEPTION 'Hanya SUPER_ADMIN yang boleh menyetujui permintaan SUPER_ADMIN.';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (req.user_id, req.requested_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF _contingent_id IS NOT NULL OR _venue_id IS NOT NULL OR _team_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, contingent_id, venue_id, team_id)
    VALUES (req.user_id, _contingent_id, _venue_id, _team_id)
    ON CONFLICT (id) DO UPDATE
      SET contingent_id = COALESCE(_contingent_id, profiles.contingent_id),
          venue_id     = COALESCE(_venue_id,     profiles.venue_id),
          team_id      = COALESCE(_team_id,      profiles.team_id);
  END IF;

  UPDATE public.role_requests
  SET status         = 'APPROVED',
      reviewer_id    = v_reviewer_id,
      reviewed_at    = now(),
      decision_note  = COALESCE(_decision_note, decision_note),
      contingent_id  = COALESCE(_contingent_id, contingent_id),
      venue_id       = COALESCE(_venue_id, venue_id),
      team_id        = COALESCE(_team_id, team_id),
      updated_at     = now()
  WHERE id = _request_id
  RETURNING * INTO req;

  reviewer_name := COALESCE(
    (SELECT full_name FROM public.profiles WHERE id = v_reviewer_id),
    v_reviewer_id::text
  );
  actor_email := COALESCE(
    (SELECT email FROM public.profiles WHERE id = v_reviewer_id),
    v_reviewer_id::text
  );

  INSERT INTO public.audit_logs (
    id, actor_id, actor_name, action, entity, entity_id, summary, created_at, result
  ) VALUES (
    public.gen_random_uuid_text(),
    v_reviewer_id::text,
    reviewer_name,
    'ROLE_APPROVED',
    'role_requests',
    req.id::text,
    format('Approve peran %s untuk user_id=%s oleh %s (%s). Catatan: %s',
      req.requested_role, req.user_id, reviewer_name, actor_email,
      COALESCE(_decision_note, '(tanpa catatan)')),
    now(),
    'ACCEPTED'
  );

  RETURN req;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_role_request(
  _request_id uuid,
  _decision_note text
)
RETURNS public.role_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  req            public.role_requests;
  v_reviewer_id  uuid := auth.uid();
  reviewer_rank  integer;
  target_rank    integer;
  reviewer_name  text;
BEGIN
  IF NOT public.is_admin(v_reviewer_id) THEN
    RAISE EXCEPTION 'Hanya administrator yang dapat menolak permintaan peran.';
  END IF;

  SELECT COALESCE(MAX(public._role_rank(role)), 0) INTO reviewer_rank
    FROM public.user_roles WHERE user_id = v_reviewer_id;

  SELECT * FROM public.role_requests WHERE id = _request_id FOR UPDATE INTO req;
  IF req IS NULL THEN
    RAISE EXCEPTION 'Permintaan peran tidak ditemukan.';
  END IF;
  IF req.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Permintaan ini sudah diproses.';
  END IF;

  target_rank := public._role_rank(req.requested_role);
  IF reviewer_rank < target_rank THEN
    RAISE EXCEPTION 'Anda tidak memiliki wewenang menolak permintaan peran %.', req.requested_role;
  END IF;
  IF target_rank = 4 AND reviewer_rank <> 4 THEN
    RAISE EXCEPTION 'Hanya SUPER_ADMIN yang boleh menolak permintaan SUPER_ADMIN.';
  END IF;

  UPDATE public.role_requests
  SET status        = 'REJECTED',
      reviewer_id   = v_reviewer_id,
      reviewed_at   = now(),
      decision_note = _decision_note,
      updated_at    = now()
  WHERE id = _request_id
  RETURNING * INTO req;

  reviewer_name := COALESCE(
    (SELECT full_name FROM public.profiles WHERE id = v_reviewer_id),
    v_reviewer_id::text
  );

  INSERT INTO public.audit_logs (
    id, actor_id, actor_name, action, entity, entity_id, summary, created_at, result
  ) VALUES (
    public.gen_random_uuid_text(),
    v_reviewer_id::text,
    reviewer_name,
    'ROLE_REJECTED',
    'role_requests',
    req.id::text,
    format('Reject peran %s untuk user_id=%s oleh %s. Alasan: %s',
      req.requested_role, req.user_id, reviewer_name, _decision_note),
    now(),
    'ACCEPTED'
  );

  RETURN req;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_user_role(
  _user_id uuid,
  _role public.app_role,
  _reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  deleted         integer;
  v_actor_id      uuid := auth.uid();
  actor_rank      integer;
  target_rank     integer;
  super_admin_cnt integer;
  actor_name      text;
BEGIN
  IF NOT public.is_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Hanya administrator yang dapat mencabut peran.';
  END IF;
  IF _role = 'PUBLIC' THEN
    RAISE EXCEPTION 'Peran PUBLIC tidak dapat dicabut.';
  END IF;

  IF v_actor_id = _user_id AND _role = 'SUPER_ADMIN' THEN
    RAISE EXCEPTION 'Anda tidak dapat mencabut peran SUPER_ADMIN milik sendiri.';
  END IF;

  SELECT COALESCE(MAX(public._role_rank(role)), 0) INTO actor_rank
    FROM public.user_roles WHERE user_id = v_actor_id;
  target_rank := public._role_rank(_role);

  IF actor_rank < target_rank THEN
    RAISE EXCEPTION 'Anda tidak memiliki wewenang mencabut peran %.', _role;
  END IF;
  IF target_rank = 4 AND actor_rank <> 4 THEN
    RAISE EXCEPTION 'Hanya SUPER_ADMIN yang boleh mencabut peran SUPER_ADMIN.';
  END IF;

  IF _role = 'SUPER_ADMIN' THEN
    SELECT COUNT(*) INTO super_admin_cnt FROM public.user_roles WHERE role = 'SUPER_ADMIN';
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'SUPER_ADMIN')
       AND super_admin_cnt <= 1 THEN
      RAISE EXCEPTION 'Tidak dapat mencabut satu-satunya SUPER_ADMIN di sistem.';
    END IF;
  END IF;

  DELETE FROM public.user_roles WHERE user_id = _user_id AND role = _role;
  GET DIAGNOSTICS deleted = ROW_COUNT;

  IF deleted > 0 THEN
    UPDATE public.role_requests
       SET status = 'REVOKED', reviewer_id = v_actor_id,
           reviewed_at = now(), decision_note = _reason, updated_at = now()
     WHERE user_id = _user_id AND requested_role = _role
       AND status IN ('PENDING','APPROVED');

    actor_name := COALESCE(
      (SELECT full_name FROM public.profiles WHERE id = v_actor_id),
      v_actor_id::text
    );

    INSERT INTO public.audit_logs (
      id, actor_id, actor_name, action, entity, entity_id, summary, created_at, result
    ) VALUES (
      public.gen_random_uuid_text(),
      v_actor_id::text,
      actor_name,
      'ROLE_REVOKED',
      'user_roles',
      _user_id::text,
      format('Cabut peran %s dari user %s oleh %s. Alasan: %s',
        _role, _user_id, actor_name, COALESCE(_reason, '(tanpa catatan)')),
      now(),
      'ACCEPTED'
    );
  END IF;

  RETURN (deleted > 0);
END;
$$;

REVOKE ALL ON FUNCTION public._role_rank(public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.gen_random_uuid_text() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_role_request(uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_role_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_user_role(uuid, public.app_role, text) TO authenticated;

COMMIT;