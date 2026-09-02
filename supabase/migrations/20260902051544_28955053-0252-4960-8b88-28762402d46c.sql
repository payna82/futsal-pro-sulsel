BEGIN;

CREATE OR REPLACE FUNCTION public.has_permission(
  _actor_id uuid,
  _permission text
)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _role app_role;
BEGIN
  SELECT role INTO _role
    FROM public.user_roles
   WHERE user_id = _actor_id
   ORDER BY public._role_rank(role) DESC
   LIMIT 1;

  IF _role IS NULL THEN
    RETURN false;
  END IF;

  RETURN CASE _role
    WHEN 'SUPER_ADMIN' THEN true
    WHEN 'TOURNAMENT_ADMIN' THEN _permission = ANY(ARRAY[
      'tournament.create', 'tournament.manage',
      'competition.create', 'competition.manage',
      'match.record_event', 'match.manage', 'match.operate_clock',
      'schedule.manage', 'official.manage', 'official.assign',
      'document.review', 'submission.submit',
      'role.manage', 'team.create', 'team.account.manage', 'team.account.create'
    ])
    WHEN 'COMPETITION_MANAGER' THEN _permission = ANY(ARRAY[
      'competition.manage',
      'match.record_event', 'match.manage', 'match.operate_clock',
      'schedule.manage', 'official.manage', 'official.assign',
      'document.review', 'submission.submit'
    ])
    WHEN 'VENUE_MANAGER' THEN _permission = ANY(ARRAY[
      'match.record_event', 'match.operate_clock',
      'schedule.read', 'official.assign'
    ])
    WHEN 'MATCH_COMMISSIONER' THEN _permission = ANY(ARRAY[
      'match.record_event', 'match.operate_clock'
    ])
    WHEN 'REFEREE' THEN _permission = ANY(ARRAY[
      'match.record_event', 'match.operate_clock'
    ])
    WHEN 'TIMEKEEPER' THEN _permission = ANY(ARRAY[
      'match.operate_clock'
    ])
    WHEN 'SCOREKEEPER' THEN _permission = ANY(ARRAY[
      'match.record_event'
    ])
    WHEN 'TEAM_OFFICIAL' THEN _permission = ANY(ARRAY[
      'player.create', 'player.update',
      'official.create', 'official.update',
      'submission.submit', 'document.upload',
      'team.profile.update'
    ])
    ELSE false
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated;

DROP POLICY IF EXISTS "matches_staff_write" ON public.matches;
DROP POLICY IF EXISTS "match_officials_staff_write" ON public.match_officials;
DROP POLICY IF EXISTS "match_lineups_staff_write" ON public.match_lineups;
DROP POLICY IF EXISTS "match_events_staff_insert" ON public.match_events;

CREATE POLICY "matches_admin_write" ON public.matches FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "matches_event_record" ON public.matches FOR UPDATE TO authenticated
  USING (
    public.has_permission(auth.uid(), 'match.record_event') OR
    public.has_permission(auth.uid(), 'match.manage')
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'match.record_event') OR
    public.has_permission(auth.uid(), 'match.manage')
  );

CREATE POLICY "match_officials_admin_write" ON public.match_officials FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "match_officials_assign" ON public.match_officials FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission(auth.uid(), 'official.manage') OR
    public.has_permission(auth.uid(), 'official.assign')
  );

CREATE POLICY "match_lineups_admin_write" ON public.match_lineups FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "match_lineups_update" ON public.match_lineups FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'match.manage'))
  WITH CHECK (public.has_permission(auth.uid(), 'match.manage'));

CREATE POLICY "match_events_insert" ON public.match_events FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission(auth.uid(), 'match.record_event') OR
    public.has_permission(auth.uid(), 'match.manage')
  );

DROP POLICY IF EXISTS "players_team_write" ON public.players;
DROP POLICY IF EXISTS "team_officials_team_write" ON public.team_officials;

CREATE POLICY "players_team_write" ON public.players FOR ALL TO authenticated
  USING (
    team_id = public.my_team_id() AND (
      public.has_permission(auth.uid(), 'player.create') OR
      public.has_permission(auth.uid(), 'player.update')
    )
  )
  WITH CHECK (
    team_id = public.my_team_id() AND (
      public.has_permission(auth.uid(), 'player.create') OR
      public.has_permission(auth.uid(), 'player.update')
    )
  );

CREATE POLICY "team_officials_team_write" ON public.team_officials FOR ALL TO authenticated
  USING (
    team_id = public.my_team_id() AND (
      public.has_permission(auth.uid(), 'official.create') OR
      public.has_permission(auth.uid(), 'official.update')
    )
  )
  WITH CHECK (
    team_id = public.my_team_id() AND (
      public.has_permission(auth.uid(), 'official.create') OR
      public.has_permission(auth.uid(), 'official.update')
    )
  );

DROP POLICY IF EXISTS "registration_documents_team_write" ON public.registration_documents;

CREATE POLICY "registration_documents_team_upload" ON public.registration_documents FOR ALL TO authenticated
  USING (
    team_id = public.my_team_id() AND
    public.has_permission(auth.uid(), 'document.upload')
  )
  WITH CHECK (
    team_id = public.my_team_id() AND
    public.has_permission(auth.uid(), 'document.upload')
  );

CREATE POLICY "registration_documents_admin_review" ON public.registration_documents FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'document.review'))
  WITH CHECK (public.has_permission(auth.uid(), 'document.review'));

DROP POLICY IF EXISTS "audit_logs_authenticated_insert" ON public.audit_logs;

CREATE POLICY "audit_logs_admin_insert" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.before_match_event_insert()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  match_rec public.matches;
BEGIN
  SELECT * INTO match_rec FROM public.matches WHERE id = NEW.match_id;

  IF match_rec IS NULL THEN
    RAISE EXCEPTION 'Pertandingan dengan ID % tidak ditemukan.', NEW.match_id;
  END IF;

  IF match_rec.status NOT IN ('LIVE', 'HALFTIME') THEN
    RAISE EXCEPTION
      'Tidak dapat merekam event pada pertandingan dengan status %. Status harus "LIVE" atau "HALFTIME".',
      match_rec.status;
  END IF;

  IF NEW.type NOT IN ('MATCH_START', 'PERIOD_START', 'GOAL', 'CARD', 'FOUL', 'SUBSTITUTION', 'TIMEOUT', 'PERIOD_END', 'HALFTIME', 'MATCH_END', 'MATCH_CORRECTION') THEN
    RAISE EXCEPTION 'Tipe event % tidak valid.', NEW.type;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_before_match_event_insert ON public.match_events;
CREATE TRIGGER tr_before_match_event_insert
  BEFORE INSERT ON public.match_events
  FOR EACH ROW
  EXECUTE FUNCTION public.before_match_event_insert();

CREATE OR REPLACE FUNCTION public.before_player_update()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  team_profile_rec public.team_profiles;
  profile_status text;
BEGIN
  SELECT * INTO team_profile_rec FROM public.team_profiles WHERE team_id = NEW.team_id;

  IF team_profile_rec IS NOT NULL THEN
    profile_status := COALESCE(team_profile_rec.data->>'registration_status', 'DRAFT');
    IF profile_status IN ('APPROVED', 'REJECTED', 'LOCKED')
       AND NOT public.has_permission(auth.uid(), 'document.review')
       AND NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Pemain tidak dapat diubah: registrasi tim sudah %.', profile_status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_before_player_update ON public.players;
CREATE TRIGGER tr_before_player_update
  BEFORE UPDATE ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.before_player_update();

CREATE OR REPLACE FUNCTION public.before_team_official_update()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  team_profile_rec public.team_profiles;
  profile_status text;
BEGIN
  SELECT * INTO team_profile_rec FROM public.team_profiles WHERE team_id = NEW.team_id;

  IF team_profile_rec IS NOT NULL THEN
    profile_status := COALESCE(team_profile_rec.data->>'registration_status', 'DRAFT');
    IF profile_status IN ('APPROVED', 'REJECTED', 'LOCKED')
       AND NOT public.has_permission(auth.uid(), 'document.review')
       AND NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Ofisial tidak dapat diubah: registrasi tim sudah %.', profile_status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_before_team_official_update ON public.team_officials;
CREATE TRIGGER tr_before_team_official_update
  BEFORE UPDATE ON public.team_officials
  FOR EACH ROW
  EXECUTE FUNCTION public.before_team_official_update();

CREATE OR REPLACE FUNCTION public.before_registration_state_update()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  old_status text;
  new_status text;
BEGIN
  old_status := COALESCE((OLD.data->>'registration_status'), 'DRAFT');
  new_status := COALESCE((NEW.data->>'registration_status'), 'DRAFT');

  IF old_status = new_status THEN
    RETURN NEW;
  END IF;

  IF old_status = 'APPROVED' AND new_status <> 'LOCKED' THEN
    RAISE EXCEPTION 'Perubahan status registrasi tidak valid: APPROVED → %.', new_status;
  END IF;

  IF old_status = 'REJECTED' AND new_status NOT IN ('LOCKED', 'DRAFT') THEN
    RAISE EXCEPTION 'Perubahan status registrasi tidak valid: REJECTED → %.', new_status;
  END IF;

  IF old_status = 'LOCKED' THEN
    RAISE EXCEPTION 'Perubahan status registrasi tidak valid: LOCKED tidak dapat berubah.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_before_registration_state_update ON public.team_profiles;
CREATE TRIGGER tr_before_registration_state_update
  BEFORE UPDATE ON public.team_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.before_registration_state_update();

CREATE OR REPLACE FUNCTION public.before_audit_logs_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable. Deletion is not allowed.';
END;
$$;

DROP TRIGGER IF EXISTS tr_prevent_audit_logs_delete ON public.audit_logs;
CREATE TRIGGER tr_prevent_audit_logs_delete
  BEFORE DELETE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.before_audit_logs_delete();

COMMIT;