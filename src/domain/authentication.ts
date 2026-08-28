import type { UUID, ISODateTime, RoleKey } from "./types";

export type { UUID, ISODateTime, RoleKey };

/**
 * Authentication Domain Models
 *
 * Core concept: Separate User identity from Team.
 * A User can have multiple TeamMemberships.
 *
 * Architecture:
 *   UserIdentity ← AuthenticatedSession → TeamMembership ← Team
 */

/* ============================== User Identity ============================= */

export type UserStatus = "ACTIVE" | "INVITED" | "DISABLED" | "SUSPENDED";

/**
 * UserIdentity: Core user record, never exposed with credentials.
 * Represents both admin and team users.
 * No password or credential material stored here.
 */
export interface UserIdentity {
  id: UUID;
  username?: string; // optional, for team accounts
  email: string;
  display_name: string;
  status: UserStatus;
  created_at: ISODateTime;
  updated_at: ISODateTime;
  last_login_at?: ISODateTime;
}

/* ============================= Team Membership ============================= */

export type MembershipStatus = "ACTIVE" | "INVITED" | "INACTIVE";

/**
 * TeamMembership: Links a user to a team.
 * Establishes which teams a user belongs to and their roles within each team.
 *
 * Separate from UserIdentity to allow:
 * - One user → multiple teams
 * - One team → multiple users
 * - Flexible membership lifecycle
 */
export interface TeamMembership {
  id: UUID;
  user_id: UUID;
  team_id: UUID;
  status: MembershipStatus;
  role?: RoleKey; // user's role within this team context (e.g., TEAM_OFFICIAL)
  joined_at: ISODateTime;
  updated_at: ISODateTime;
}

/* ============================== Session ============================== */

export type SessionStatus = "ACTIVE" | "EXPIRED" | "REVOKED";

/**
 * AuthenticatedSession: Represents an authenticated session.
 * Contains no password or sensitive credential material.
 * Never exposed to UI with credential data.
 */
export interface AuthenticatedSession {
  user_id: UUID;
  session_id: UUID;
  status: SessionStatus;
  authenticated_at: ISODateTime;
  expires_at: ISODateTime;
  last_activity_at?: ISODateTime;
  user_agent?: string;
}

/* ========================= Authentication Result ========================== */

export type AuthenticationError =
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_DISABLED"
  | "ACCOUNT_SUSPENDED"
  | "ACCOUNT_NOT_FOUND"
  | "SESSION_EXPIRED"
  | "UNAUTHENTICATED";

/**
 * AuthenticationResult: Outcome of authentication attempt.
 * On success: contains session and user identity (no credentials).
 * On failure: contains specific error (no account existence leak).
 */
export interface AuthenticationResult {
  success: boolean;
  error?: AuthenticationError;
  session?: AuthenticatedSession;
  user?: UserIdentity;
}

/* ======================== Login Credentials ======================== */

/**
 * LoginCredentials: Input for authentication.
 * Kept separate from domain model to prevent credential exposure.
 */
export interface LoginCredentials {
  username?: string; // for team login
  email?: string; // for admin login
  password: string;
}

/* ====================== Authentication Context ===================== */

/**
 * AuthContext: Minimal context for authentication checks.
 * Never contains password or credential material.
 */
export interface AuthContext {
  isAuthenticated: boolean;
  userId?: UUID;
  sessionId?: UUID;
  expiresAt?: ISODateTime;
}

/* ======================== Logout Context ======================== */

export interface LogoutContext {
  userId: UUID;
  sessionId?: UUID;
  reason?: string;
}
