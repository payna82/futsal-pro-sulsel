import type {
  UUID,
  AuthenticationResult,
  AuthenticatedSession,
  LoginCredentials,
  LogoutContext,
  UserIdentity,
  TeamMembership,
} from "@/domain/authentication";
import type { AuthenticationAdapter } from "@/domain/authentication-service";
import { repository } from "@/data";

/**
 * Demo Authentication Adapter
 *
 * In-memory implementation for development/demo.
 * Uses in-memory repository for team accounts and admin users.
 *
 * IMPORTANT: This is NOT production-secure.
 * Phase 3.2+ will use Supabase Auth or similar.
 */
export class DemoAuthenticationAdapter implements AuthenticationAdapter {
  private sessions: Map<UUID, AuthenticatedSession> = new Map();
  private identities: Map<UUID, UserIdentity> = new Map();
  private memberships: Map<UUID, TeamMembership[]> = new Map();

  constructor() {
    this.initializeDemoData();
  }

  /**
   * Initialize demo users and sessions.
   * Only for development - production will load from database.
   */
  private initializeDemoData(): void {
    // Demo admin identity
    const adminId: UUID = "usr-admin-1";
    this.identities.set(adminId, {
      id: adminId,
      email: "superadmin@porprovsulsel.id",
      display_name: "Andi Baso Mappasessu",
      status: "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Demo team identities (for testing)
    const teamUserId: UUID = "usr-team-1";
    this.identities.set(teamUserId, {
      id: teamUserId,
      username: "test.team",
      email: "test.team@team.demo",
      display_name: "Test Team",
      status: "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Demo team membership
    const membershipId: UUID = "membership-team-1";
    this.memberships.set(teamUserId, [
      {
        id: membershipId,
        user_id: teamUserId,
        team_id: "tm-demo-1",
        status: "ACTIVE",
        role: "TEAM_OFFICIAL",
        joined_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
  }

  async authenticate(credentials: LoginCredentials): Promise<AuthenticationResult> {
    // Generic error message to prevent account enumeration
    const genericError: AuthenticationResult = {
      success: false,
      error: "INVALID_CREDENTIALS",
    };

    // Team login flow
    if (credentials.username) {
      // First check demo identities
      const demoIdentity = Array.from(this.identities.values()).find(
        (u) => u.username === credentials.username,
      );

      if (demoIdentity) {
        // Use demo identity
        if (demoIdentity.status === "DISABLED")
          return { success: false, error: "ACCOUNT_DISABLED" };
        if (demoIdentity.status === "SUSPENDED")
          return { success: false, error: "ACCOUNT_SUSPENDED" };

        // Demo: accept any password
        const sessionId: UUID = `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        const session: AuthenticatedSession = {
          user_id: demoIdentity.id,
          session_id: sessionId,
          status: "ACTIVE",
          authenticated_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          last_activity_at: now.toISOString(),
        };

        this.sessions.set(sessionId, session);

        return {
          success: true,
          session,
          user: demoIdentity,
        };
      }

      // Then check repository
      try {
        const account = await repository.getTeamAccountByUsername(credentials.username);
        if (!account) return genericError;

        // Verify account status
        if (account.account_status === "DISABLED")
          return { success: false, error: "ACCOUNT_DISABLED" };
        if (account.account_status === "SUSPENDED")
          return { success: false, error: "ACCOUNT_SUSPENDED" };

        // Create user identity for team account if not exists
        let userIdentity = this.identities.get(account.id);
        if (!userIdentity) {
          const identity: UserIdentity = {
            id: account.id,
            username: account.username,
            email: `${account.username}@team.demo`,
            display_name: account.username,
            status: account.account_status === "ACTIVE" ? "ACTIVE" : "DISABLED",
            created_at: account.created_at,
            updated_at: account.updated_at,
          };
          if (account.last_login_at) {
            identity.last_login_at = account.last_login_at;
          }
          userIdentity = identity;
          this.identities.set(account.id, userIdentity);
        }

        // Create team membership
        const membershipId: UUID = `membership-${account.id}-${account.team_id}`;
        const membership: TeamMembership = {
          id: membershipId,
          user_id: account.id,
          team_id: account.team_id,
          status: "ACTIVE",
          role: "TEAM_OFFICIAL",
          joined_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const memberships = this.memberships.get(account.id) || [];
        if (!memberships.some((item) => item.team_id === membership.team_id)) {
          memberships.push(membership);
        }
        this.memberships.set(account.id, memberships);

        // Create session
        const sessionId: UUID = `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        const session: AuthenticatedSession = {
          user_id: account.id,
          session_id: sessionId,
          status: "ACTIVE",
          authenticated_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          last_activity_at: now.toISOString(),
        };

        this.sessions.set(sessionId, session);

        if (userIdentity) {
          return {
            success: true,
            session,
            user: userIdentity,
          };
        }
        return genericError;
      } catch (error) {
        console.error("Error checking repository:", error);
        return genericError;
      }
    }

    // Admin login flow (email-based)
    if (credentials.email) {
      // Find user by email from identities
      const userIdentity = Array.from(this.identities.values()).find(
        (u) => u.email === credentials.email,
      );

      if (!userIdentity) return genericError;

      // Verify status
      if (userIdentity.status === "DISABLED") return { success: false, error: "ACCOUNT_DISABLED" };
      if (userIdentity.status === "SUSPENDED")
        return { success: false, error: "ACCOUNT_SUSPENDED" };

      // Demo: accept any password (unsafe!)
      // Production: validate against credential digest

      // Create session
      const sessionId: UUID = `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const session: AuthenticatedSession = {
        user_id: userIdentity.id,
        session_id: sessionId,
        status: "ACTIVE",
        authenticated_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        last_activity_at: now.toISOString(),
      };

      this.sessions.set(sessionId, session);

      return {
        success: true,
        session,
        user: userIdentity,
      };
    }

    return genericError;
  }

  async getSession(sessionId: UUID): Promise<AuthenticatedSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Check if expired
    if (new Date(session.expires_at) < new Date()) {
      session.status = "EXPIRED";
      return null;
    }

    if (session.status !== "ACTIVE") return null;

    return session;
  }

  async getUserIdentity(userId: UUID): Promise<UserIdentity | null> {
    return this.identities.get(userId) || null;
  }

  async getTeamMemberships(userId: UUID): Promise<TeamMembership[]> {
    return this.memberships.get(userId) || [];
  }

  async logout(context: LogoutContext): Promise<void> {
    // Invalidate session
    if (context.sessionId) {
      const session = this.sessions.get(context.sessionId);
      if (session) {
        session.status = "REVOKED";
      }
    }

    // In production, might also update last_logout_at, audit logs, etc.
  }

  async isSessionValid(sessionId: UUID): Promise<boolean> {
    const session = await this.getSession(sessionId);
    return session !== null && session.status === "ACTIVE";
  }

  async refreshSession(sessionId: UUID): Promise<AuthenticatedSession | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    // Extend expiry
    const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    session.expires_at = newExpiresAt.toISOString();
    session.last_activity_at = new Date().toISOString();

    return session;
  }
}
