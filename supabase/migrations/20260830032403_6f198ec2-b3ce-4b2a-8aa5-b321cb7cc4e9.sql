-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM (
  'SUPER_ADMIN','TOURNAMENT_ADMIN','COMPETITION_MANAGER','VENUE_MANAGER',
  'MATCH_COMMISSIONER','REFEREE','TIMEKEEPER','SCOREKEEPER','TEAM_OFFICIAL','MEDIA','PUBLIC'
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text,
  contingent_id text,
  venue_id text,
  team_id text,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('SUPER_ADMIN','TOURNAMENT_ADMIN','COMPETITION_MANAGER','VENUE_MANAGER',
                   'MATCH_COMMISSIONER','REFEREE','TIMEKEEPER','SCOREKEEPER')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('SUPER_ADMIN','TOURNAMENT_ADMIN','COMPETITION_MANAGER')
  );
$$;

CREATE OR REPLACE FUNCTION public.my_team_id()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT team_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE POLICY "profiles_select_self_or_staff" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "user_roles_select_self_or_staff" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), COALESCE(NEW.email, ''))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'PUBLIC')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ COMPETITION REFERENCE DATA ============
CREATE TABLE public.tournaments (
  id text PRIMARY KEY,
  name text NOT NULL,
  season integer NOT NULL,
  host_city text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ACTIVE','COMPLETED')),
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.categories (
  id text PRIMARY KEY,
  tournament_id text NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  key text NOT NULL CHECK (key IN ('MEN','WOMEN')),
  name text NOT NULL,
  team_count integer NOT NULL DEFAULT 0,
  format text NOT NULL DEFAULT ''
);

CREATE TABLE public.contingents (
  id text PRIMARY KEY,
  tournament_id text NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name text NOT NULL,
  short_name text NOT NULL,
  region_code text NOT NULL,
  manager_name text NOT NULL DEFAULT '',
  contact text NOT NULL DEFAULT ''
);

CREATE TABLE public.venues (
  id text PRIMARY KEY,
  name text NOT NULL,
  city text NOT NULL,
  address text NOT NULL DEFAULT '',
  capacity integer NOT NULL DEFAULT 0,
  court_count integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE public.groups (
  id text PRIMARY KEY,
  category_id text NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  stage text NOT NULL DEFAULT 'GROUP'
    CHECK (stage IN ('GROUP','QUARTER_FINAL','SEMI_FINAL','THIRD_PLACE','FINAL'))
);

CREATE TABLE public.teams (
  id text PRIMARY KEY,
  contingent_id text NOT NULL REFERENCES public.contingents(id) ON DELETE CASCADE,
  category_id text NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  short_name text NOT NULL,
  group_id text REFERENCES public.groups(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'REGISTERED'
    CHECK (status IN ('REGISTERED','VERIFIED','DISQUALIFIED')),
  primary_color text NOT NULL DEFAULT '#8f1d1d'
);

CREATE TABLE public.players (
  id text PRIMARY KEY,
  team_id text NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  jersey_number integer NOT NULL,
  position text NOT NULL CHECK (position IN ('GOALKEEPER','ANCHOR','FLANK','PIVOT')),
  birth_date date NOT NULL,
  nik_verified boolean NOT NULL DEFAULT false,
  is_captain boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('ELIGIBLE','PENDING','SUSPENDED')),
  registration_status text
);

CREATE TABLE public.team_officials (
  id text PRIMARY KEY,
  team_id text NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('HEAD_COACH','ASSISTANT_COACH','MANAGER','PHYSIO','DOCTOR')),
  license_number text,
  registration_status text
);

-- ============ MATCH OPERATIONS ============
CREATE TABLE public.matches (
  id text PRIMARY KEY,
  tournament_id text NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  category_id text NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  group_id text REFERENCES public.groups(id) ON DELETE SET NULL,
  match_number integer NOT NULL,
  home_team_id text NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  away_team_id text NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  venue_id text NOT NULL REFERENCES public.venues(id),
  court integer NOT NULL DEFAULT 1,
  kickoff_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN
    ('SCHEDULED','CHECK_IN','LINEUP','READY','LIVE','HALFTIME','FULL_TIME','CONFIRMED','PUBLISHED')),
  period text NOT NULL DEFAULT 'PRE_MATCH'
    CHECK (period IN ('PRE_MATCH','FIRST_HALF','HALF_TIME','SECOND_HALF','ENDED')),
  clock_seconds integer NOT NULL DEFAULT 0,
  home_score integer NOT NULL DEFAULT 0,
  away_score integer NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 0,
  stage text NOT NULL DEFAULT 'GROUP'
    CHECK (stage IN ('GROUP','QUARTER_FINAL','SEMI_FINAL','THIRD_PLACE','FINAL'))
);

CREATE TABLE public.match_officials (
  id text PRIMARY KEY,
  match_id text NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN
    ('COMMISSIONER','REFEREE_1','REFEREE_2','THIRD_REFEREE','TIMEKEEPER','SCOREKEEPER')),
  active boolean NOT NULL DEFAULT true,
  effective_from timestamptz,
  effective_to timestamptz
);

CREATE TABLE public.match_lineups (
  id text PRIMARY KEY,
  match_id text NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  team_id text NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_id text NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  is_starting boolean NOT NULL DEFAULT false,
  shirt_number integer NOT NULL
);

CREATE TABLE public.match_events (
  id text PRIMARY KEY,
  match_id text NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  command_id text,
  sequence_no integer,
  timestamp integer NOT NULL DEFAULT 0,
  period text NOT NULL
    CHECK (period IN ('PRE_MATCH','FIRST_HALF','HALF_TIME','SECOND_HALF','ENDED')),
  team_id text,
  player_id text,
  type text NOT NULL CHECK (type IN
    ('MATCH_START','PERIOD_START','GOAL','CARD','FOUL','SUBSTITUTION','TIMEOUT',
     'PERIOD_END','HALFTIME','MATCH_END','MATCH_CORRECTION')),
  operator_id text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, command_id)
);
CREATE INDEX match_events_match_idx ON public.match_events (match_id, sequence_no);

CREATE TABLE public.audit_logs (
  id text PRIMARY KEY,
  actor_id text NOT NULL,
  actor_name text NOT NULL DEFAULT '',
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text NOT NULL,
  summary text NOT NULL DEFAULT '',
  result text CHECK (result IN ('ACCEPTED','REPLAYED')),
  command_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ TEAM REGISTRATION ============
CREATE TABLE public.team_accounts (
  id text PRIMARY KEY,
  team_id text NOT NULL UNIQUE REFERENCES public.teams(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  account_status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (account_status IN ('ACTIVE','SUSPENDED','LOCKED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

CREATE TABLE public.team_profiles (
  team_id text PRIMARY KEY REFERENCES public.teams(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.registration_documents (
  id text PRIMARY KEY,
  entity_type text NOT NULL CHECK (entity_type IN ('TEAM','PLAYER','OFFICIAL')),
  entity_id text NOT NULL,
  team_id text REFERENCES public.teams(id) ON DELETE CASCADE,
  type text NOT NULL,
  file_name text NOT NULL,
  storage_path text,
  status text NOT NULL DEFAULT 'PENDING',
  reason text,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by text
);

CREATE TABLE public.verification_history (
  id text PRIMARY KEY,
  entity_type text NOT NULL CHECK (entity_type IN ('TEAM','PLAYER','OFFICIAL')),
  entity_id text NOT NULL,
  team_id text REFERENCES public.teams(id) ON DELETE CASCADE,
  action text NOT NULL,
  reason text,
  actor_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ GRANTS ============
GRANT SELECT ON public.tournaments, public.categories, public.contingents, public.venues,
  public.groups, public.teams, public.players, public.team_officials, public.matches,
  public.match_officials, public.match_lineups, public.match_events TO anon;
GRANT SELECT ON public.tournaments, public.categories, public.contingents, public.venues,
  public.groups, public.teams, public.players, public.team_officials, public.matches,
  public.match_officials, public.match_lineups, public.match_events, public.audit_logs,
  public.team_accounts, public.team_profiles, public.registration_documents,
  public.verification_history TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tournaments, public.categories, public.contingents,
  public.venues, public.groups, public.teams, public.players, public.team_officials,
  public.matches, public.match_officials, public.match_lineups, public.team_accounts,
  public.team_profiles, public.registration_documents TO authenticated;
GRANT INSERT ON public.match_events, public.audit_logs, public.verification_history TO authenticated;
GRANT ALL ON public.tournaments, public.categories, public.contingents, public.venues,
  public.groups, public.teams, public.players, public.team_officials, public.matches,
  public.match_officials, public.match_lineups, public.match_events, public.audit_logs,
  public.team_accounts, public.team_profiles, public.registration_documents,
  public.verification_history TO service_role;

-- ============ RLS ============
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contingents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_officials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_officials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_lineups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_history ENABLE ROW LEVEL SECURITY;

-- Public competition data: readable by everyone, writable by staff/admin.
CREATE POLICY "tournaments_public_read" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "tournaments_admin_write" ON public.tournaments FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "categories_public_read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories_admin_write" ON public.categories FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "contingents_public_read" ON public.contingents FOR SELECT USING (true);
CREATE POLICY "contingents_admin_write" ON public.contingents FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "venues_public_read" ON public.venues FOR SELECT USING (true);
CREATE POLICY "venues_admin_write" ON public.venues FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "groups_public_read" ON public.groups FOR SELECT USING (true);
CREATE POLICY "groups_admin_write" ON public.groups FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "teams_public_read" ON public.teams FOR SELECT USING (true);
CREATE POLICY "teams_admin_write" ON public.teams FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "players_public_read" ON public.players FOR SELECT USING (true);
CREATE POLICY "players_admin_write" ON public.players FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "players_team_write" ON public.players FOR ALL TO authenticated
  USING (team_id = public.my_team_id()) WITH CHECK (team_id = public.my_team_id());

CREATE POLICY "team_officials_public_read" ON public.team_officials FOR SELECT USING (true);
CREATE POLICY "team_officials_admin_write" ON public.team_officials FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "team_officials_team_write" ON public.team_officials FOR ALL TO authenticated
  USING (team_id = public.my_team_id()) WITH CHECK (team_id = public.my_team_id());

CREATE POLICY "matches_public_read" ON public.matches FOR SELECT USING (true);
CREATE POLICY "matches_staff_write" ON public.matches FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "match_officials_public_read" ON public.match_officials FOR SELECT USING (true);
CREATE POLICY "match_officials_staff_write" ON public.match_officials FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "match_lineups_public_read" ON public.match_lineups FOR SELECT USING (true);
CREATE POLICY "match_lineups_staff_write" ON public.match_lineups FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Match events are append-only: no UPDATE/DELETE policy exists for anyone.
CREATE POLICY "match_events_public_read" ON public.match_events FOR SELECT USING (true);
CREATE POLICY "match_events_staff_insert" ON public.match_events FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "audit_logs_staff_read" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "audit_logs_authenticated_insert" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "team_accounts_scoped_read" ON public.team_accounts FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR team_id = public.my_team_id());
CREATE POLICY "team_accounts_admin_write" ON public.team_accounts FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "team_profiles_scoped_read" ON public.team_profiles FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR team_id = public.my_team_id());
CREATE POLICY "team_profiles_team_write" ON public.team_profiles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR team_id = public.my_team_id())
  WITH CHECK (public.is_admin(auth.uid()) OR team_id = public.my_team_id());

CREATE POLICY "registration_documents_scoped_read" ON public.registration_documents
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR team_id = public.my_team_id());
CREATE POLICY "registration_documents_team_write" ON public.registration_documents
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR team_id = public.my_team_id())
  WITH CHECK (public.is_admin(auth.uid()) OR team_id = public.my_team_id());

CREATE POLICY "verification_history_scoped_read" ON public.verification_history
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR team_id = public.my_team_id());
CREATE POLICY "verification_history_admin_insert" ON public.verification_history
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));