import type {
  UUID,
  AuthenticationResult,
  AuthenticatedSession,
  AuthContext,
  LoginCredentials,
  LogoutContext,
  UserIdentity,
  TeamMembership,
} from "@/domain/authentication";

/**
 * Authentication Adapter Interface
 *
 * Defines the contract for authentication implementation.
 * Allows swapping demo vs. production authentication.
 *
 * Phase 3.1 (now): In-memory demo implementation
 * Phase 3.2+: Production authentication (Supabase, database, etc.)
 */
export interface AuthenticationAdapter {
  /**
   * Authenticate with credentials.
   * Returns session + user identity on success.
   * Returns generic error on failure (no account existence leak).
   */
  authenticate(credentials: LoginCredentials): Promise<AuthenticationResult>;

  /**
   * Get current authenticated session.
   * Returns session if valid, null if expired/invalid.
   */
  getSession(sessionId: UUID): Promise<AuthenticatedSession | null>;

  /**
   * Get user identity (no credentials).
   * Used after authentication to populate session.
   */
  getUserIdentity(userId: UUID): Promise<UserIdentity | null>;

  /**
   * Get team memberships for user.
   * Used to populate ActorContext with team access.
   */
  getTeamMemberships(userId: UUID): Promise<TeamMembership[]>;

  /**
   * Logout: invalidate session.
   * Clears authentication state.
   */
  logout(context: LogoutContext): Promise<void>;

  /**
   * Check if session is still valid.
   * Returns false if expired or revoked.
   */
  isSessionValid(sessionId: UUID): Promise<boolean>;

  /**
   * Refresh session expiry.
   * Returns updated session if still valid.
   */
  refreshSession(sessionId: UUID): Promise<AuthenticatedSession | null>;
}

/**
 * Authentication Service
 *
 * Thin wrapper around adapter.
 * Provides clean API for session management and ActorContext derivation.
 */
export class AuthenticationService {
  constructor(private adapter: AuthenticationAdapter) {}

  async authenticate(credentials: LoginCredentials): Promise<AuthenticationResult> {
    return this.adapter.authenticate(credentials);
  }

  async getSession(sessionId: UUID): Promise<AuthenticatedSession | null> {
    return this.adapter.getSession(sessionId);
  }

  async getUserIdentity(userId: UUID): Promise<UserIdentity | null> {
    return this.adapter.getUserIdentity(userId);
  }

  async getTeamMemberships(userId: UUID): Promise<TeamMembership[]> {
    return this.adapter.getTeamMemberships(userId);
  }

  async logout(context: LogoutContext): Promise<void> {
    return this.adapter.logout(context);
  }

  async isSessionValid(sessionId: UUID): Promise<boolean> {
    return this.adapter.isSessionValid(sessionId);
  }

  async refreshSession(sessionId: UUID): Promise<AuthenticatedSession | null> {
    return this.adapter.refreshSession(sessionId);
  }

  /**
   * Derive ActorContext from authenticated session.
   * This is Phase 3.1 placeholder - full RBAC resolution in Phase 3.3.
   */
  async deriveActorContext(
    sessionId: UUID,
    teamId?: UUID,
  ): Promise<{ userId: UUID; role: string; teamId?: UUID } | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    const user = await this.getUserIdentity(session.user_id);
    if (!user) return null;

    const context: { userId: UUID; role: string; teamId?: UUID } = {
      userId: user.id,
      role: "TEAM_OFFICIAL", // Phase 3.3: resolve from RBAC
    };
    if (teamId) {
      context.teamId = teamId;
    }
    return context;
  }
}

/**
 * Global authentication service instance.
 * Singleton pattern to ensure consistent authentication state.
 */
let authServiceInstance: AuthenticationService | null = null;

export function getAuthenticationService(): AuthenticationService {
  if (!authServiceInstance) {
    throw new Error("Authentication service not initialized");
  }
  return authServiceInstance;
}

export function setAuthenticationService(service: AuthenticationService): void {
  authServiceInstance = service;
}
