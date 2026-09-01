-- ============================================================
-- PHASE 2: PERMISSION-LEVEL RLS + BUSINESS LOGIC TRIGGERS
-- ============================================================
-- Objectives:
--   1. Enhance RLS policies to enforce specific permissions
--      (not just generic is_admin() / is_staff())
--   2. Implement business logic triggers to validate state
--      machines and domain invariants at DB layer
--   3. Ensure no illegal state transitions can persist
--   4. Harden audit_logs against tampering
--
-- Changes:
--   - Helper: has_permission(actor_id, permission_key) function
--   - Enhance match/* RLS: require match.record_event / match.manage
--   - Enhance player/* RLS: require player.create / player.update
--   - Enhance registration/* RLS: require document.upload / document.review
--   - Trigger: before_match_event_insert() - validate match state
--   - Trigger: before_registration_update() - validate state transitions
--   - Trigger: before_player_update() - check registration_locked
--   - RLS: audit_logs - only admin INSERT (was all authenticated)
--   - Trigger: before_audit_logs_delete() - prevent any deletion
-- ============================================================

BEGIN;

/* ================================================================= */
/* 0. Helper: has_permission(actor_id, permission_key) → boolean     */
/*    Check if actor's highest role has the requested permission.    */
/*    Uses role_permissions matrix to determine access.              */
/* ================================================================= */

CREATE OR REPLACE FUNCTION public.has_permission(
  _actor_id uuid,
  _permission text
)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _role app_role;
BEGIN
  -- 1. Get highest ranking role for this actor
  SELECT role INTO _role
    FROM public.user_roles
   WHERE user_id = _actor_id
   ORDER BY public._role_rank(role) DESC
   LIMIT 1;
  
  -- 2. If no role found (public user), they have no permissions
  IF _role IS NULL THEN
    RETURN false;
  END IF;
  
  -- 3. Check if this role includes the permission
  --    Embed permission matrix (matches src/domain/permissions.ts)
  RETURN CASE _role
    -- SUPER_ADMIN has all permissions
    WHEN 'SUPER_ADMIN' THEN true
    
    -- TOURNAMENT_ADMIN: all tournament + competition + match + document permissions
    WHEN 'TOURNAMENT_ADMIN' THEN _permission = ANY(ARRAY[
      'tournament.create', 'tournament.manage',
      'competition.create', 'competition.manage',
      'match.record_event', 'match.manage', 'match.operate_clock',
      'schedule.manage', 'official.manage',
      'document.review', 'submission.submit',
      'role.manage', 'team.create', 'team.account.manage', 'team.account.create'
    ])
    
    -- COMPETITION_MANAGER: competition + match + document permissions (no tournament.manage)
    WHEN 'COMPETITION_MANAGER' THEN _permission = ANY(ARRAY[
      'competition.manage',
      'match.record_event', 'match.manage', 'match.operate_clock',
      'schedule.manage', 'official.manage',
      'document.review', 'submission.submit'
    ])
    
    -- VENUE_MANAGER: venue + match operations only
    WHEN 'VENUE_MANAGER' THEN _permission = ANY(ARRAY[
      'match.record_event', 'match.operate_clock',
      'schedule.read', 'official.assign'
    ])
    
    -- MATCH_COMMISSIONER: match operations only
    WHEN 'MATCH_COMMISSIONER' THEN _permission = ANY(ARRAY[
      'match.record_event', 'match.operate_clock'
    ])
    
    -- TEAM_OFFICIAL: team-scoped permissions only
    WHEN 'TEAM_OFFICIAL' THEN _permission = ANY(ARRAY[
      'player.create', 'player.update',
      'official.create', 'official.update',
      'submission.submit', 'document.upload',
      'team.profile.update'
    ])
    
    -- PUBLIC: no permissions
    ELSE false
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_permission TO authenticated, anon;

COMMENT ON FUNCTION public.has_permission IS
  'Check if actor has specific permission based on their highest role. Embeds permission matrix from src/domain/permissions.ts.';

/* ================================================================= */
/* 1. DROP and RECREATE match-related RLS policies with permissions  */
/*    Old: "is_staff()" — New: requires match.record_event/manage    */
/* ================================================================= */

-- Drop old match policies (will recreate stricter versions)
DROP POLICY IF EXISTS "matches_staff_write" ON public.matches;
DROP POLICY IF EXISTS "match_officials_staff_write" ON public.match_officials;
DROP POLICY IF EXISTS "match_lineups_staff_write" ON public.match_lineups;
DROP POLICY IF EXISTS "match_events_staff_insert" ON public.match_events;

-- Matches: Admin can do anything; staff/officials can record events if they have match.record_event
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

-- Match Officials: Admin write; staff with official.manage can assign
CREATE POLICY "match_officials_admin_write" ON public.match_officials FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "match_officials_assign" ON public.match_officials FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission(auth.uid(), 'official.manage') OR
    public.has_permission(auth.uid(), 'official.assign')
  );

-- Match Lineups: Admin write; staff with match.manage can update
CREATE POLICY "match_lineups_admin_write" ON public.match_lineups FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "match_lineups_update" ON public.match_lineups FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'match.manage'))
  WITH CHECK (public.has_permission(auth.uid(), 'match.manage'));

-- Match Events: Append-only; INSERT requires match.record_event; NO UPDATE/DELETE
CREATE POLICY "match_events_insert" ON public.match_events FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission(auth.uid(), 'match.record_event') OR
    public.has_permission(auth.uid(), 'match.manage')
  );

COMMENT ON POLICY "matches_admin_write" ON public.matches IS
  'Admin can read/write matches. Enforces is_admin() check.';

COMMENT ON POLICY "matches_event_record" ON public.matches IS
  'Staff with match.record_event or match.manage can record events on matches.';

COMMENT ON POLICY "match_events_insert" ON public.match_events IS
  'Only staff with match.record_event permission can append match events. Events are immutable (no UPDATE/DELETE).';

/* ================================================================= */
/* 2. Enhance player/team_official RLS with specific permissions     */
/*    Old: team_id = my_team_id() — New: also check player.create    */
/* ================================================================= */

-- Drop old player policies
DROP POLICY IF EXISTS "players_team_write" ON public.players;
DROP POLICY IF EXISTS "team_officials_team_write" ON public.team_officials;

-- Players: Team members with player.create/player.update can manage
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

-- Team Officials: Team members with official.create/official.update can manage
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

/* ================================================================= */
/* 3. Enhance registration_documents RLS with permission separation  */
/*    - Team members with document.upload can INSERT/UPDATE own docs */
/*    - Admin with document.review can review/approve                */
/* ================================================================= */

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

COMMENT ON POLICY "registration_documents_team_upload" ON public.registration_documents IS
  'Team members with document.upload permission can manage their own registration documents.';

COMMENT ON POLICY "registration_documents_admin_review" ON public.registration_documents IS
  'Admin with document.review permission can review and approve/reject registration documents.';

/* ================================================================= */
/* 4. Harden audit_logs: Only admin can insert (not all authenticated) */
/*    and make immutable (trigger prevents UPDATE/DELETE)             */
/* ================================================================= */

-- Drop old audit_logs policies
DROP POLICY IF EXISTS "audit_logs_authenticated_insert" ON public.audit_logs;

-- Only admin can insert audit logs (or trigger on behalf of mutation)
CREATE POLICY "audit_logs_admin_insert" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR auth.uid() IS NULL);

-- Audit logs are immutable: no UPDATE/DELETE allowed
CREATE POLICY "audit_logs_no_update" ON public.audit_logs FOR UPDATE
  USING (false);

CREATE POLICY "audit_logs_no_delete" ON public.audit_logs FOR DELETE
  USING (false);

COMMENT ON POLICY "audit_logs_admin_insert" ON public.audit_logs IS
  'Only admin can insert audit logs (or internal triggers). Application layer must respect this.';

COMMENT ON POLICY "audit_logs_no_update" ON public.audit_logs IS
  'Audit logs are immutable: no UPDATE allowed. Any update attempt is rejected at RLS layer.';

COMMENT ON POLICY "audit_logs_no_delete" ON public.audit_logs IS
  'Audit logs are immutable: no DELETE allowed. Any delete attempt is rejected at RLS layer.';

/* ================================================================= */
/* 5. Business Logic: before_match_event_insert() trigger             */
/*    Validate:                                                       */
/*      - Match status must be 'in_progress' or 'not_started'        */
/*      - Event type must be valid for current period/status         */
/*      - No events allowed if match_status = 'finished'             */
/* ================================================================= */

CREATE OR REPLACE FUNCTION public.before_match_event_insert()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  match_rec public.matches;
BEGIN
  -- Fetch match to validate status
  SELECT * INTO match_rec FROM public.matches WHERE id = NEW.match_id;
  
  IF match_rec IS NULL THEN
    RAISE EXCEPTION 'Pertandingan dengan ID % tidak ditemukan.', NEW.match_id;
  END IF;
  
  -- Match must be in_progress or not_started to record events
  IF match_rec.match_status NOT IN ('in_progress', 'not_started') THEN
    RAISE EXCEPTION
      'Tidak dapat merekam event pada pertandingan dengan status %. Status harus "in_progress" atau "not_started".',
      match_rec.match_status;
  END IF;
  
  -- Validate event_type matches expected transitions for current period
  -- (Detailed validation would use MATCH_OPERATIONS.isValidEvent() logic)
  -- For now, accept common event types: goal, correction, void_goal, period_end, etc.
  IF NEW.event_type NOT IN ('goal', 'correction', 'void_goal', 'period_end', 'substitution', 'warning', 'foul') THEN
    RAISE EXCEPTION 'Tipe event % tidak valid.', NEW.event_type;
  END IF;
  
  -- Period must be valid for current status
  IF match_rec.match_status = 'not_started' AND NEW.period IS NOT NULL AND NEW.period > 0 THEN
    RAISE EXCEPTION 'Pertandingan belum dimulai, tidak boleh ada event dengan period > 0.';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_before_match_event_insert
  BEFORE INSERT ON public.match_events
  FOR EACH ROW
  EXECUTE FUNCTION public.before_match_event_insert();

COMMENT ON FUNCTION public.before_match_event_insert IS
  'Validate match state before event insertion: status must allow events, event type valid, period consistent.';

/* ================================================================= */
/* 6. Business Logic: before_player_update() trigger                 */
/*    Validate:                                                       */
/*      - Cannot update player if registration_status = APPROVED     */
/*      - Cannot update if team profile is locked                    */
/* ================================================================= */

CREATE OR REPLACE FUNCTION public.before_player_update()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  team_profile_rec public.team_profiles;
BEGIN
  -- Check if player was already approved (ELIGIBLE)
  IF OLD.status = 'ELIGIBLE' THEN
    RAISE EXCEPTION 'Pemain yang telah disetujui tidak dapat diubah. Status: ELIGIBLE (locked).';
  END IF;
  
  -- Fetch team profile to check registration status
  SELECT * INTO team_profile_rec FROM public.team_profiles WHERE team_id = NEW.team_id;
  
  IF team_profile_rec IS NOT NULL THEN
    -- Check if registration is locked (APPROVED, REJECTED, LOCKED)
    IF team_profile_rec.registration_status IN ('APPROVED', 'REJECTED', 'LOCKED') THEN
      RAISE EXCEPTION
        'Pemain tidak dapat diubah: registrasi tim sudah %.',
        team_profile_rec.registration_status;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_before_player_update
  BEFORE UPDATE ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.before_player_update();

COMMENT ON FUNCTION public.before_player_update IS
  'Validate player update: cannot update ELIGIBLE players or if team registration is locked.';

/* ================================================================= */
/* 7. Business Logic: before_registration_state_update() trigger     */
/*    Validate:                                                       */
/*      - Registration state transitions must be legal               */
/*      - APPROVED → DRAFT transition is forbidden                   */
/*      - Insert audit log on state change                           */
/* ================================================================= */

CREATE OR REPLACE FUNCTION public.before_registration_state_update()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  old_status text;
  new_status text;
  actor_id   uuid := auth.uid();
BEGIN
  old_status := (OLD.registration_status)::text;
  new_status := (NEW.registration_status)::text;
  
  -- If status unchanged, allow the update
  IF old_status = new_status THEN
    RETURN NEW;
  END IF;
  
  -- Validate state transition based on domain/registration.ts REGISTRATION_TRANSITIONS
  -- Legal transitions:
  --   DRAFT → READY_FOR_SUBMISSION, READY_FOR_SUBMISSION → SUBMITTED,
  --   SUBMITTED → UNDER_REVIEW, UNDER_REVIEW → APPROVED/REVISION_REQUIRED/REJECTED,
  --   Any status → LOCKED (final state)
  --
  -- Illegal transitions:
  --   APPROVED → anything except LOCKED
  --   REJECTED → anything except LOCKED
  --   LOCKED → anything
  
  IF old_status = 'APPROVED' AND new_status <> 'LOCKED' THEN
    RAISE EXCEPTION
      'Perubahan status registrasi tidak valid: APPROVED → %. Hanya dapat berubah ke LOCKED.',
      new_status;
  END IF;
  
  IF old_status = 'REJECTED' AND new_status <> 'LOCKED' THEN
    RAISE EXCEPTION
      'Perubahan status registrasi tidak valid: REJECTED → %. Hanya dapat berubah ke LOCKED.',
      new_status;
  END IF;
  
  IF old_status = 'LOCKED' THEN
    RAISE EXCEPTION 'Perubahan status registrasi tidak valid: LOCKED tidak dapat berubah.';
  END IF;
  
  -- Valid transitions allowed; audit will be inserted by app layer
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_before_registration_state_update
  BEFORE UPDATE OF registration_status ON public.team_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.before_registration_state_update();

COMMENT ON FUNCTION public.before_registration_state_update IS
  'Validate registration state machine: prevent illegal transitions (APPROVED→DRAFT, LOCKED→*).';

/* ================================================================= */
/* 8. Business Logic: before_team_official_update() trigger          */
/*    Validate:                                                       */
/*      - Cannot update if registration_status = APPROVED            */
/*      - Cannot update if team profile is locked                    */
/* ================================================================= */

CREATE OR REPLACE FUNCTION public.before_team_official_update()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  team_profile_rec public.team_profiles;
BEGIN
  -- Check if official was already approved
  IF OLD.registration_status = 'APPROVED' THEN
    RAISE EXCEPTION 'Ofisial yang telah disetujui tidak dapat diubah. Status: APPROVED (locked).';
  END IF;
  
  -- Fetch team profile to check registration status
  SELECT * INTO team_profile_rec FROM public.team_profiles WHERE team_id = NEW.team_id;
  
  IF team_profile_rec IS NOT NULL THEN
    IF team_profile_rec.registration_status IN ('APPROVED', 'REJECTED', 'LOCKED') THEN
      RAISE EXCEPTION
        'Ofisial tidak dapat diubah: registrasi tim sudah %.',
        team_profile_rec.registration_status;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_before_team_official_update
  BEFORE UPDATE ON public.team_officials
  FOR EACH ROW
  EXECUTE FUNCTION public.before_team_official_update();

COMMENT ON FUNCTION public.before_team_official_update IS
  'Validate team official update: cannot update APPROVED officials or if team registration is locked.';

/* ================================================================= */
/* 9. Prevent audit_logs tampering: Trigger blocks any DELETE        */
/*    (Already blocked by RLS, but this is defense-in-depth)         */
/* ================================================================= */

CREATE OR REPLACE FUNCTION public.before_audit_logs_delete()
RETURNS trigger
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable. Deletion is not allowed.';
END;
$$;

CREATE TRIGGER tr_prevent_audit_logs_delete
  BEFORE DELETE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.before_audit_logs_delete();

COMMENT ON FUNCTION public.before_audit_logs_delete IS
  'Defense-in-depth: prevent audit log deletion at trigger layer (RLS already blocks it).';

/* ================================================================= */
/* 10. Verification: Ensure all triggers and policies are in place   */
/* ================================================================= */

-- List all policies for critical tables (for verification)
-- SELECT tablename, policyname FROM pg_policies
--  WHERE tablename IN ('matches','match_events','players','team_officials','registration_documents','audit_logs')
--  ORDER BY tablename, policyname;

-- List all triggers (for verification)
-- SELECT trigger_name, event_object_table FROM information_schema.triggers
--  WHERE trigger_schema = 'public'
--  ORDER BY event_object_table, trigger_name;

COMMIT;
