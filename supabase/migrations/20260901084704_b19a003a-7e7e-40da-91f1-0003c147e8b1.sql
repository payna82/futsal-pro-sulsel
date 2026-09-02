-- ============================================================
-- MIGRASI: Flow Permintaan Role & Perbaikan RLS Privilege Escalation
-- IDENTIFIKASI GAP: RG-01, RG-07
-- ============================================================

-- --------------------------------------------------------------------
-- RG-07: MITIGASI PRIVILEGE ESCALATION user_roles
-- Sebelumnya: GRANT INSERT/UPDATE/DELETE ON user_roles TO authenticated
--             + TIDAK ADA policy INSERT → user bisa self-insert SUPER_ADMIN
-- Perbaikan: Hapus tulisan langsung dari authenticated; hanya service_role
--            yang boleh write. Approved request via function SECURITY DEFINER.
-- --------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;

DROP POLICY IF EXISTS "user_roles_select_self_or_staff" ON public.user_roles;
CREATE POLICY "user_roles_select_self_or_staff" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

-- --------------------------------------------------------------------
-- RG-01: TABEL role_requests
-- Penyimpanan permintaan peningkatan role dari user PUBLIC
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.role_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_role public.app_role NOT NULL,
  request_reason text NOT NULL DEFAULT '',
  supporting_docs jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','APPROVED','REJECTED','REVOKED','CANCELLED')),
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  decision_note text,
  contingent_id text REFERENCES public.contingents(id) ON DELETE SET NULL,
  venue_id text REFERENCES public.venues(id) ON DELETE SET NULL,
  team_id text REFERENCES public.teams(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS role_requests_status_idx ON public.role_requests (status);
CREATE INDEX IF NOT EXISTS role_requests_user_idx ON public.role_requests (user_id);

GRANT SELECT ON public.role_requests TO authenticated;
GRANT INSERT, UPDATE ON public.role_requests TO authenticated;
GRANT ALL ON public.role_requests TO service_role;

ALTER TABLE public.role_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "role_requests_self_or_staff_read" ON public.role_requests;
DROP POLICY IF EXISTS "role_requests_self_insert" ON public.role_requests;
DROP POLICY IF EXISTS "role_requests_self_cancel" ON public.role_requests;
DROP POLICY IF EXISTS "role_requests_admin_decide" ON public.role_requests;

-- User bisa melihat permintaannya sendiri; staff bisa melihat semua
CREATE POLICY "role_requests_self_or_staff_read" ON public.role_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

-- User bisa INSERT permintaan baru hanya untuk dirinya sendiri
CREATE POLICY "role_requests_self_insert" ON public.role_requests
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
    AND status = 'PENDING'
    AND requested_role IN (
      'REFEREE','TIMEKEEPER','SCOREKEEPER','MEDIA','TEAM_OFFICIAL'
    )
  );

-- User bisa CANCEL permintaannya sendiri selama masih PENDING
CREATE POLICY "role_requests_self_cancel" ON public.role_requests
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'PENDING')
  WITH CHECK (
    user_id = auth.uid()
    AND status IN ('PENDING','CANCELLED')
    AND requested_role = requested_role
  );

-- Hanya ADMIN yang boleh APPROVE/REJECT
CREATE POLICY "role_requests_admin_decide" ON public.role_requests
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- --------------------------------------------------------------------
-- FUNGSI approve_role_request (SECURITY DEFINER)
--     → Insert ke user_roles (karena authenticated tidak punya akses tulis)
--     → Update reviewer/reviewed_at pada role_requests
--     → Insert ke profiles contingent/venue/team binding jika diminta
-- --------------------------------------------------------------------
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
  req public.role_requests;
BEGIN
  -- 1. Hanya admin yang boleh menjalankan fungsi ini
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Hanya administrator yang dapat menyetujui permintaan peran.';
  END IF;

  -- 2. Ambil request dengan kunci update
  SELECT * FROM public.role_requests WHERE id = _request_id FOR UPDATE INTO req;
  IF req IS NULL THEN
    RAISE EXCEPTION 'Permintaan peran tidak ditemukan.';
  END IF;
  IF req.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Permintaan ini sudah diproses.';
  END IF;

  -- 3. Insert role ke user_roles (ON CONFLICT jika sudah ada)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (req.user_id, req.requested_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 4. Binding ke profiles jika diberikan
  IF _contingent_id IS NOT NULL OR _venue_id IS NOT NULL OR _team_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, contingent_id, venue_id, team_id)
    VALUES (req.user_id, _contingent_id, _venue_id, _team_id)
    ON CONFLICT (id) DO UPDATE
      SET contingent_id = COALESCE(_contingent_id, profiles.contingent_id),
          venue_id     = COALESCE(_venue_id,     profiles.venue_id),
          team_id      = COALESCE(_team_id,      profiles.team_id);
  END IF;

  -- 5. Tandai request APPROVED
  UPDATE public.role_requests
  SET status         = 'APPROVED',
      reviewer_id    = auth.uid(),
      reviewed_at    = now(),
      decision_note  = COALESCE(_decision_note, decision_note),
      contingent_id  = COALESCE(_contingent_id, contingent_id),
      venue_id       = COALESCE(_venue_id, venue_id),
      team_id        = COALESCE(_team_id, team_id),
      updated_at     = now()
  WHERE id = _request_id
  RETURNING * INTO req;

  RETURN req;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_role_request TO authenticated;

-- --------------------------------------------------------------------
-- FUNGSI reject_role_request
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_role_request(
  _request_id uuid,
  _decision_note text
)
RETURNS public.role_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  req public.role_requests;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Hanya administrator yang dapat menolak permintaan peran.';
  END IF;

  SELECT * FROM public.role_requests WHERE id = _request_id FOR UPDATE INTO req;
  IF req IS NULL THEN
    RAISE EXCEPTION 'Permintaan peran tidak ditemukan.';
  END IF;
  IF req.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Permintaan ini sudah diproses.';
  END IF;

  UPDATE public.role_requests
  SET status        = 'REJECTED',
      reviewer_id   = auth.uid(),
      reviewed_at   = now(),
      decision_note = _decision_note,
      updated_at    = now()
  WHERE id = _request_id
  RETURNING * INTO req;

  RETURN req;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_role_request TO authenticated;

-- --------------------------------------------------------------------
-- FUNGSI revoke_user_role (hapus role dari user_roles, non-PUBLIC)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.revoke_user_role(
  _user_id uuid,
  _role public.app_role,
  _reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  deleted integer;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Hanya administrator yang dapat mencabut peran.';
  END IF;
  IF _role = 'PUBLIC' THEN
    RAISE EXCEPTION 'Peran PUBLIC tidak dapat dicabut.';
  END IF;

  DELETE FROM public.user_roles
   WHERE user_id = _user_id AND role = _role;
  GET DIAGNOSTICS deleted = ROW_COUNT;

  IF deleted > 0 THEN
    -- Catat sebagai request REVOKED di riwayat jika ada PENDING/APPROVED request
    UPDATE public.role_requests
       SET status = 'REVOKED', reviewer_id = auth.uid(),
           reviewed_at = now(), decision_note = _reason, updated_at = now()
     WHERE user_id = _user_id AND requested_role = _role
       AND status IN ('PENDING','APPROVED');
  END IF;

  RETURN (deleted > 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_user_role TO authenticated;

-- --------------------------------------------------------------------
-- TRIGGER updated_at untuk role_requests
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_role_requests_updated()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_role_requests_updated_at ON public.role_requests;
CREATE TRIGGER set_role_requests_updated_at
BEFORE UPDATE ON public.role_requests
FOR EACH ROW EXECUTE FUNCTION public.trigger_role_requests_updated();