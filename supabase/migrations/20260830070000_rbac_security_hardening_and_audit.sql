-- ============================================================
-- PRIORITAS 2 BAGIAN 1/2: RBAC SECURITY HARDENING + AUDIT LOGS
-- Menutup:
--   SA-02 (HIGH) : Gradasi peran approve — cegah junior admin
--                  approve senior role request
--   SA-03 (HIGH) : Self-revoke SUPER_ADMIN prevention +
--                  minimal 1 SUPER_ADMIN invariant
--   SA-05 (MED  ): Audit log INSERT ke audit_logs pada
--                  approve_role_request / reject_role_request /
--                  revoke_user_role (sesuai audit gap)
-- ============================================================
--
-- ARSITEKTUR GRADASI PERAN (HIERARKI):
--
--   Tingkat  Role                     Approve Level Maksimal
--   ───────  ───────────────────────  ──────────────────────
--   4        SUPER_ADMIN              SEMUA peran (incl dirinya)
--   3        TOURNAMENT_ADMIN         Hingga TOURNAMENT_ADMIN
--                                     (tidak boleh approve SUPER)
--   2        COMPETITION_MANAGER      Hingga COMPETITION_MANAGER
--                                     (tidak boleh approve TOURNAMENT/SUPER)
--   1        VENUE_MANAGER /
--            MATCH_COMMISSIONER       Hanya staff/operasional
--                                     (VENUE_MANAGER, MATCH_COMM,
--                                      REFEREE, TIMEKEEPER, dll)
--   0        Staff lainnya / PUBLIC   Tidak bisa approve
--
-- CATATAN: VENUE_MANAGER dan MATCH_COMMISSIONER MASUK dalam
-- is_admin() cluster di fungsi lama (is_admin = SUPER/TOURNAMENT/COMP)
-- — TIDAK. Bukti migration 032403: is_admin() HANYA mencakup 3 role
-- (SUPER, TOURNAMENT, COMPETITION). VENUE_MANAGER hanya masuk
-- is_staff(). Jadi guard terluar is_admin() sudah cukup filter
-- 3 role ini. Fungsi _role_rank() di bawah TIDAK PERLU memasukkan
-- VENUE_MANAGER/MATCH_COMMISSIONER ke dalam rank approve.
-- ============================================================

BEGIN;

/* ================================================================= */
/* 0. Helper: _role_rank(role) → integer rank 0..4                   */
/* ================================================================= */

CREATE OR REPLACE FUNCTION public._role_rank(_r public.app_role)
RETURNS integer
LANGUAGE plpgsql IMMUTABLE AS $$
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
  'Tingkat hirarki peran untuk gradasi approval. Semakin tinggi rank semakin senior perannya. Senior role = rank lebih TINGGI.';

/* ================================================================= */
/* 1. SA-02: Gradasi approve/revoke — ROLE_RANK guard                */
/*    Tambahkan guard: reviewer rank >= requested_role rank          */
/*    DAN: Hanya SUPER_ADMIN yang boleh approve SUPER_ADMIN role     */
/* ================================================================= */

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
  req           public.role_requests;
  reviewer_rank integer;
  target_rank   integer;
  reviewer_id   uuid := auth.uid();
  reviewer_name text;
  actor_email   text;
BEGIN
  -- 1. Hanya admin yang boleh menjalankan fungsi ini
  IF NOT public.is_admin(reviewer_id) THEN
    RAISE EXCEPTION 'Hanya administrator yang dapat menyetujui permintaan peran.';
  END IF;

  -- 2. SA-02 GUARD: Hitung rank reviewer dan rank target role
  reviewer_rank := public._role_rank(
    (SELECT role FROM public.user_roles
      WHERE user_id = reviewer_id ORDER BY public._role_rank(role) DESC LIMIT 1)::public.app_role
  );
  -- Jika reviewer ada di user_roles dengan role tak dikenal → rank 0 (gagal)
  IF reviewer_rank IS NULL THEN reviewer_rank := 0; END IF;

  -- 3. Ambil request dengan kunci update
  SELECT * FROM public.role_requests WHERE id = _request_id FOR UPDATE INTO req;
  IF req IS NULL THEN
    RAISE EXCEPTION 'Permintaan peran tidak ditemukan.';
  END IF;
  IF req.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Permintaan ini sudah diproses.';
  END IF;

  -- 4. SA-02 GRADASI: Cek rank target dibanding rank reviewer
  target_rank := public._role_rank(req.requested_role);
  -- 4a. TOURNAMENT_ADMIN (rank 3) TIDAK BOLEH approve SUPER_ADMIN (rank 4)
  -- 4b. COMPETITION_MANAGER (rank 2) TIDAK BOLEH approve TOURNAMENT_ADMIN (rank3)
  --     DAN TIDAK BOLEH approve SUPER_ADMIN (rank 4)
  -- Rule umum: reviewer_rank >= target_rank
  IF reviewer_rank < target_rank THEN
    RAISE EXCEPTION
      'Anda tidak memiliki wewenang menyetujui peran %. Perlu minimal peran % untuk menyetujuinya.',
      req.requested_role,
      CASE target_rank
        WHEN 4 THEN 'SUPER_ADMIN'
        WHEN 3 THEN 'TOURNAMENT_ADMIN atau SUPER_ADMIN'
        WHEN 2 THEN 'COMPETITION_MANAGER atau lebih senior'
        ELSE 'admin apa pun'
      END;
  END IF;
  -- 4c. Tambahan ketat: Hanya SUPER_ADMIN yang boleh approve SUPER_ADMIN
  IF target_rank = 4 AND reviewer_rank <> 4 THEN
    RAISE EXCEPTION 'Hanya SUPER_ADMIN yang boleh menyetujui permintaan SUPER_ADMIN.';
  END IF;

  -- 5. Insert role ke user_roles (ON CONFLICT jika sudah ada)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (req.user_id, req.requested_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 6. Binding ke profiles jika diberikan
  IF _contingent_id IS NOT NULL OR _venue_id IS NOT NULL OR _team_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, contingent_id, venue_id, team_id)
    VALUES (req.user_id, _contingent_id, _venue_id, _team_id)
    ON CONFLICT (id) DO UPDATE
      SET contingent_id = COALESCE(_contingent_id, profiles.contingent_id),
          venue_id     = COALESCE(_venue_id,     profiles.venue_id),
          team_id      = COALESCE(_team_id,      profiles.team_id);
  END IF;

  -- 7. Tandai request APPROVED
  UPDATE public.role_requests
  SET status         = 'APPROVED',
      reviewer_id    = reviewer_id,
      reviewed_at    = now(),
      decision_note  = COALESCE(_decision_note, decision_note),
      contingent_id  = COALESCE(_contingent_id, contingent_id),
      venue_id       = COALESCE(_venue_id, venue_id),
      team_id        = COALESCE(_team_id, team_id),
      updated_at     = now()
  WHERE id = _request_id
  RETURNING * INTO req;

  -- 8. SA-05: Audit Log — ROLE_APPROVED
  reviewer_name := COALESCE(
    (SELECT full_name FROM public.profiles WHERE id = reviewer_id),
    (SELECT email FROM auth.users WHERE id = reviewer_id),
    reviewer_id::text
  );
  actor_email   := COALESCE(
    (SELECT email FROM auth.users WHERE id = reviewer_id),
    reviewer_id::text
  );
  INSERT INTO public.audit_logs (
    id, actor_id, actor_name, action, entity, entity_id, summary, created_at, result
  ) VALUES (
    public.gen_random_uuid_text(),
    reviewer_id,
    reviewer_name,
    'ROLE_APPROVED',
    'role_requests',
    req.id,
    format('Approve peran %s → user_id=%s oleh %s (%s). Alasan: %s',
      req.requested_role, req.user_id, reviewer_name, actor_email,
      COALESCE(_decision_note, '(tanpa catatan)')),
    now(),
    'ACCEPTED'
  );

  RETURN req;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_role_request TO authenticated;

COMMENT ON FUNCTION public.approve_role_request IS
  'SA-02 Hardened: Hanya admin dengan rank >= target role yang bisa approve. SUPER_ADMIN hanya bisa diapprove oleh SUPER_ADMIN. SA-05: Insert audit_logs ROLE_APPROVED.';

/* ================================================================= */
/* 2. reject_role_request — tambahkan SA-05 audit log                */
/* ================================================================= */

CREATE OR REPLACE FUNCTION public.reject_role_request(
  _request_id uuid,
  _decision_note text
)
RETURNS public.role_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  req           public.role_requests;
  reviewer_id   uuid := auth.uid();
  reviewer_rank integer;
  target_rank   integer;
  reviewer_name text;
  actor_email   text;
BEGIN
  IF NOT public.is_admin(reviewer_id) THEN
    RAISE EXCEPTION 'Hanya administrator yang dapat menolak permintaan peran.';
  END IF;

  -- SA-02 gradasi juga berlaku untuk reject:
  -- junior admin tidak boleh reject permintaan senior role
  -- (untuk menghindari sabotase admin junior menghambat promosi)
  reviewer_rank := public._role_rank(
    (SELECT role FROM public.user_roles
      WHERE user_id = reviewer_id ORDER BY public._role_rank(role) DESC LIMIT 1)::public.app_role
  );
  IF reviewer_rank IS NULL THEN reviewer_rank := 0; END IF;

  SELECT * FROM public.role_requests WHERE id = _request_id FOR UPDATE INTO req;
  IF req IS NULL THEN
    RAISE EXCEPTION 'Permintaan peran tidak ditemukan.';
  END IF;
  IF req.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Permintaan ini sudah diproses.';
  END IF;

  target_rank := public._role_rank(req.requested_role);
  IF reviewer_rank < target_rank THEN
    RAISE EXCEPTION
      'Anda tidak memiliki wewenang menolak permintaan peran %.',
      req.requested_role;
  END IF;
  IF target_rank = 4 AND reviewer_rank <> 4 THEN
    RAISE EXCEPTION 'Hanya SUPER_ADMIN yang boleh menolak permintaan SUPER_ADMIN.';
  END IF;

  UPDATE public.role_requests
  SET status        = 'REJECTED',
      reviewer_id   = reviewer_id,
      reviewed_at   = now(),
      decision_note = _decision_note,
      updated_at    = now()
  WHERE id = _request_id
  RETURNING * INTO req;

  -- SA-05: Audit Log — ROLE_REJECTED
  reviewer_name := COALESCE(
    (SELECT full_name FROM public.profiles WHERE id = reviewer_id),
    (SELECT email FROM auth.users WHERE id = reviewer_id),
    reviewer_id::text
  );
  actor_email   := COALESCE(
    (SELECT email FROM auth.users WHERE id = reviewer_id),
    reviewer_id::text
  );
  INSERT INTO public.audit_logs (
    id, actor_id, actor_name, action, entity, entity_id, summary, created_at, result
  ) VALUES (
    public.gen_random_uuid_text(),
    reviewer_id,
    reviewer_name,
    'ROLE_REJECTED',
    'role_requests',
    req.id,
    format('Reject peran %s → user_id=%s oleh %s (%s). Alasan: %s',
      req.requested_role, req.user_id, reviewer_name, actor_email, _decision_note),
    now(),
    'ACCEPTED'
  );

  RETURN req;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_role_request TO authenticated;

COMMENT ON FUNCTION public.reject_role_request IS
  'SA-02: gradasi rank juga berlaku untuk reject (sabotage prevention). SA-05: Insert audit_logs ROLE_REJECTED.';

/* ================================================================= */
/* 3. SA-03 + SA-05: revoke_user_role — HARDENING                    */
/*    * Self-revoke SUPER_ADMIN prevention                           */
/*    * Minimal 1 SUPER_ADMIN invariant (tidak boleh 0 SUPER_ADMIN)  */
/*    * Gradasi rank: hanya rank >= target_rank yang boleh revoke    */
/*    * HANYA SUPER_ADMIN yang boleh revoke SUPER_ADMIN lain         */
/*    * SA-05 audit log ROLE_REVOKED                                 */
/* ================================================================= */

CREATE OR REPLACE FUNCTION public.revoke_user_role(
  _user_id uuid,
  _role public.app_role,
  _reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  deleted         integer;
  actor_id        uuid := auth.uid();
  actor_rank      integer;
  target_rank     integer;
  super_admin_cnt integer;
  actor_name      text;
  actor_email     text;
  target_email    text;
BEGIN
  IF NOT public.is_admin(actor_id) THEN
    RAISE EXCEPTION 'Hanya administrator yang dapat mencabut peran.';
  END IF;
  IF _role = 'PUBLIC' THEN
    RAISE EXCEPTION 'Peran PUBLIC tidak dapat dicabut.';
  END IF;

  -- SA-03 (A): Self-revoke prevention untuk SUPER_ADMIN
  IF actor_id = _user_id AND _role = 'SUPER_ADMIN' THEN
    RAISE EXCEPTION
      'Anda tidak dapat mencabut peran SUPER_ADMIN milik sendiri. Minta SUPER_ADMIN lain untuk mencabutnya.';
  END IF;

  -- Rank calculation
  actor_rank := public._role_rank(
    (SELECT role FROM public.user_roles
      WHERE user_id = actor_id ORDER BY public._role_rank(role) DESC LIMIT 1)::public.app_role
  );
  IF actor_rank IS NULL THEN actor_rank := 0; END IF;
  target_rank := public._role_rank(_role);

  -- SA-02 gradasi juga berlaku untuk revoke
  IF actor_rank < target_rank THEN
    RAISE EXCEPTION
      'Anda tidak memiliki wewenang mencabut peran %. Perlu minimal peran % untuk mencabutnya.',
      _role,
      CASE target_rank
        WHEN 4 THEN 'SUPER_ADMIN'
        WHEN 3 THEN 'TOURNAMENT_ADMIN atau SUPER_ADMIN'
        WHEN 2 THEN 'COMPETITION_MANAGER atau lebih senior'
        ELSE 'admin apa pun'
      END;
  END IF;
  -- Ketat: Hanya SUPER_ADMIN yang boleh revoke SUPER_ADMIN
  IF target_rank = 4 AND actor_rank <> 4 THEN
    RAISE EXCEPTION 'Hanya SUPER_ADMIN yang boleh mencabut peran SUPER_ADMIN.';
  END IF;

  -- SA-03 (B): Minimal 1 SUPER_ADMIN invariant
  -- Jika target peran adalah SUPER_ADMIN → hitung terlebih dahulu jumlah SUPER_ADMIN
  -- di sistem. Jika yang akan dihapus adalah satu-satunya → GAGALKAN.
  IF _role = 'SUPER_ADMIN' THEN
    SELECT COUNT(*) INTO super_admin_cnt
      FROM public.user_roles
     WHERE role = 'SUPER_ADMIN';
    -- Hanya lakukan pengecekan jika user tersebut BETUL-BETUL punya SUPER_ADMIN
    -- (jika tidak punya, row_count = 0 dan invariant tidak perlu)
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'SUPER_ADMIN') THEN
      IF super_admin_cnt <= 1 THEN
        RAISE EXCEPTION
          'Tidak dapat mencabut satu-satunya SUPER_ADMIN di sistem. Tambahkan SUPER_ADMIN lain terlebih dahulu sebelum mencabut akun ini.';
      END IF;
    END IF;
  END IF;

  -- Eksekusi DELETE
  DELETE FROM public.user_roles
   WHERE user_id = _user_id AND role = _role;
  GET DIAGNOSTICS deleted = ROW_COUNT;

  IF deleted > 0 THEN
    UPDATE public.role_requests
       SET status = 'REVOKED', reviewer_id = actor_id,
           reviewed_at = now(), decision_note = _reason, updated_at = now()
     WHERE user_id = _user_id AND requested_role = _role
       AND status IN ('PENDING','APPROVED');

    -- SA-05 Audit Log ROLE_REVOKED
    actor_name   := COALESCE(
      (SELECT full_name FROM public.profiles WHERE id = actor_id),
      (SELECT email FROM auth.users WHERE id = actor_id),
      actor_id::text
    );
    actor_email  := COALESCE((SELECT email FROM auth.users WHERE id = actor_id), actor_id::text);
    target_email := COALESCE((SELECT email FROM auth.users WHERE id = _user_id), _user_id::text);

    INSERT INTO public.audit_logs (
      id, actor_id, actor_name, action, entity, entity_id, summary, created_at, result
    ) VALUES (
      public.gen_random_uuid_text(),
      actor_id,
      actor_name,
      'ROLE_REVOKED',
      'user_roles',
      _user_id,
      format('Cabut peran %s dari user %s oleh %s (%s). Alasan: %s',
        _role, target_email, actor_name, actor_email,
        COALESCE(_reason, '(tanpa catatan)')),
      now(),
      'ACCEPTED'
    );
  END IF;

  RETURN (deleted > 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_user_role TO authenticated;

COMMENT ON FUNCTION public.revoke_user_role IS
  'SA-03 hardened: (A) Tidak bisa self-revoke SUPER_ADMIN. (B) Invariant minimal 1 SUPER_ADMIN di sistem. SA-02 gradasi: junior admin tidak bisa revoke senior. SA-05: Insert audit_logs ROLE_REVOKED.';

/* ================================================================= */
/* 4. Helper: gen_random_uuid_text() → kompatibel dengan audit_logs  */
/*    (audit_logs id saat ini menggunakan text, bukan native uuid)   */
/* ================================================================= */

CREATE OR REPLACE FUNCTION public.gen_random_uuid_text()
RETURNS text
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN gen_random_uuid()::text;
END;
$$;

COMMIT;
