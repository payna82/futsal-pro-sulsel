/**
 * Domain model for the PORPROV Sulsel 2026 futsal competition system.
 * These interfaces mirror the future PostgreSQL/Supabase schema 1:1.
 */

export type UUID = string;
export type ISODateTime = string;

/* ---------------------------------- RBAC --------------------------------- */

export const ROLES = [
  "SUPER_ADMIN",
  "TOURNAMENT_ADMIN",
  "COMPETITION_MANAGER",
  "VENUE_MANAGER",
  "MATCH_COMMISSIONER",
  "REFEREE",
  "TIMEKEEPER",
  "SCOREKEEPER",
  "TEAM_OFFICIAL",
  "MEDIA",
  "PUBLIC",
] as const;
export type RoleKey = (typeof ROLES)[number];

export interface Role {
  id: UUID;
  key: RoleKey;
  name: string;
  description: string;
}

export interface Permission {
  id: UUID;
  key: string;
  name: string;
  module: string;
}

export interface User {
  id: UUID;
  full_name: string;
  email: string;
  phone?: string;
  role: RoleKey;
  contingent_id?: UUID;
  venue_id?: UUID;
  is_active: boolean;
  last_login_at?: ISODateTime;
  created_at: ISODateTime;
}

/* ------------------------------ Competition ------------------------------ */

export type CategoryKey = "MEN" | "WOMEN";

export interface Tournament {
  id: UUID;
  name: string;
  season: number;
  host_city: string;
  start_date: string;
  end_date: string;
  status: "DRAFT" | "ACTIVE" | "COMPLETED";
  description: string;
}

export interface Category {
  id: UUID;
  tournament_id: UUID;
  key: CategoryKey;
  name: string;
  team_count: number;
  format: string;
}

export interface Contingent {
  id: UUID;
  tournament_id: UUID;
  name: string;
  short_name: string;
  region_code: string;
  manager_name: string;
  contact: string;
}

export interface Team {
  id: UUID;
  contingent_id: UUID;
  category_id: UUID;
  name: string;
  short_name: string;
  group_id?: UUID;
  status: "REGISTERED" | "VERIFIED" | "DISQUALIFIED";
  primary_color: string;
}

export type PlayerPosition = "GOALKEEPER" | "ANCHOR" | "FLANK" | "PIVOT";

export interface Player {
  id: UUID;
  team_id: UUID;
  full_name: string;
  jersey_number: number;
  position: PlayerPosition;
  birth_date: string;
  nik_verified: boolean;
  is_captain: boolean;
  status: "ELIGIBLE" | "PENDING" | "SUSPENDED";
}

export type OfficialRole = "HEAD_COACH" | "ASSISTANT_COACH" | "MANAGER" | "PHYSIO" | "DOCTOR";

export interface TeamOfficial {
  id: UUID;
  team_id: UUID;
  full_name: string;
  role: OfficialRole;
  license_number?: string;
}

export interface Venue {
  id: UUID;
  name: string;
  city: string;
  address: string;
  capacity: number;
  court_count: number;
  is_active: boolean;
}

export interface Group {
  id: UUID;
  category_id: UUID;
  name: string;
  stage: "GROUP" | "QUARTER_FINAL" | "SEMI_FINAL" | "THIRD_PLACE" | "FINAL";
}

/* -------------------------------- Matches -------------------------------- */

export const MATCH_STATUSES = [
  "SCHEDULED",
  "CHECK_IN",
  "LINEUP",
  "READY",
  "LIVE",
  "HALFTIME",
  "FULL_TIME",
  "CONFIRMED",
  "PUBLISHED",
] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export type MatchPeriod = "PRE_MATCH" | "FIRST_HALF" | "HALF_TIME" | "SECOND_HALF" | "ENDED";

export interface Match {
  id: UUID;
  tournament_id: UUID;
  category_id: UUID;
  group_id?: UUID | undefined;
  match_number: number;
  home_team_id: UUID;
  away_team_id: UUID;
  venue_id: UUID;
  court: number;
  kickoff_at: ISODateTime;
  status: MatchStatus;
  period: MatchPeriod;
  /** Detik berjalan pada periode aktif. Sumber kebenaran akhir ada di backend. */
  clock_seconds: number;
  home_score: number;
  away_score: number;
  stage: Group["stage"];
}

export type MatchOfficialRole =
  | "COMMISSIONER"
  | "REFEREE_1"
  | "REFEREE_2"
  | "THIRD_REFEREE"
  | "TIMEKEEPER"
  | "SCOREKEEPER";

export interface MatchOfficial {
  id: UUID;
  match_id: UUID;
  user_id: UUID;
  full_name: string;
  role: MatchOfficialRole;
}

export interface MatchLineupEntry {
  id: UUID;
  match_id: UUID;
  team_id: UUID;
  player_id: UUID;
  is_starting: boolean;
  shirt_number: number;
}

export const MATCH_EVENT_TYPES = [
  "MATCH_START",
  "PERIOD_START",
  "GOAL",
  "CARD",
  "FOUL",
  "SUBSTITUTION",
  "TIMEOUT",
  "PERIOD_END",
  "HALFTIME",
  "MATCH_END",
  "MATCH_CORRECTION",
] as const;
export type MatchEventType = (typeof MATCH_EVENT_TYPES)[number];

export interface MatchEvent {
  id: UUID;
  match_id: UUID;
  /** Detik pada periode saat event terjadi. */
  timestamp: number;
  period: MatchPeriod;
  team_id?: UUID;
  player_id?: UUID;
  type: MatchEventType;
  /** User yang menginput event (scorekeeper/timekeeper/commissioner). */
  operator_id: UUID;
  metadata: Record<string, string | number | boolean | null>;
  created_at: ISODateTime;
}

export interface StandingRow {
  team_id: UUID;
  group_id: UUID;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  fair_play_points: number;
}

export interface AuditLog {
  id: UUID;
  actor_id: UUID;
  actor_name: string;
  action: string;
  entity: string;
  entity_id: UUID;
  summary: string;
  created_at: ISODateTime;
}

export interface TopScorerRow {
  player_id: UUID;
  team_id: UUID;
  goals: number;
}
