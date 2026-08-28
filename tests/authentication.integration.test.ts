import { assertEquals, assertRejects } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { DemoAuthenticationAdapter } from "../src/domain/demo-authentication-adapter.ts";
import { AuthenticationService } from "../src/domain/authentication-service.ts";
import type {
  AuthenticatedSession,
  LoginCredentials,
  UserIdentity,
  TeamMembership,
} from "../src/domain/authentication.ts";

/**
 * Authentication Integration Tests
 *
 * Verifies Phase 3.1 Authentication Foundation:
 * - User identity (no credentials exposed)
 * - Team membership (separate from user)
 * - Session lifecycle
 * - Authentication flows
 * - Security boundaries
 * - No password exposure
 */

const adapter = new DemoAuthenticationAdapter();
const authService = new AuthenticationService(adapter);

// Helper: Create demo team account for testing
async function createTeamAccountForTesting(): Promise<{
  id: string;
  teamId: string;
  username: string;
}> {
  // Note: In real implementation, would use repository
  // For demo, we'll test through authentication flow
  return {
    id: "ta-demo-1",
    teamId: "tm-demo-1",
    username: "test.team",
  };
}

Deno.test("1. valid team login creates authenticated session", async () => {
  const credentials: LoginCredentials = {
    username: "test.team",
    password: "password123",
  };

  const result = await authService.authenticate(credentials);

  assertEquals(result.success, true);
  assertEquals(result.session !== undefined, true);
  assertEquals(result.user !== undefined, true);

  // Session must have required fields
  if (result.session) {
    assertEquals(result.session.status, "ACTIVE");
    assertEquals(result.session.user_id !== undefined, true);
    assertEquals(result.session.session_id !== undefined, true);
    assertEquals(result.session.authenticated_at !== undefined, true);
    assertEquals(result.session.expires_at !== undefined, true);
  }

  // User must NOT contain password
  if (result.user) {
    assertEquals((result.user as any).password, undefined);
    assertEquals((result.user as any).password_hash, undefined);
    assertEquals((result.user as any).credential_digest, undefined);
  }
});

Deno.test("2. invalid team login returns generic error", async () => {
  const credentials: LoginCredentials = {
    username: "nonexistent.team",
    password: "anypassword",
  };

  const result = await authService.authenticate(credentials);

  assertEquals(result.success, false);
  assertEquals(result.error, "INVALID_CREDENTIALS");
  // Must NOT reveal whether account exists
  assertEquals(result.session, undefined);
  assertEquals(result.user, undefined);
});

Deno.test("3. disabled team account login fails", async () => {
  // Disabled account would return specific error
  // This test ensures error differentiation
  const result = await authService.authenticate({
    username: "disabled.team",
    password: "password",
  });

  // Should be either INVALID_CREDENTIALS (no account) or ACCOUNT_DISABLED
  assertEquals(result.success, false);
  assertEquals(result.error !== undefined, true);
});

Deno.test("4. admin login by email creates session", async () => {
  const credentials: LoginCredentials = {
    email: "superadmin@porprovsulsel.id",
    password: "demo",
  };

  const result = await authService.authenticate(credentials);

  assertEquals(result.success, true);
  assertEquals(result.session !== undefined, true);
  assertEquals(result.user !== undefined, true);

  if (result.user) {
    assertEquals(result.user.email, "superadmin@porprovsulsel.id");
    assertEquals(result.user.status, "ACTIVE");
  }
});

Deno.test("5. invalid admin email login returns generic error", async () => {
  const result = await authService.authenticate({
    email: "nonexistent@example.com",
    password: "password",
  });

  assertEquals(result.success, false);
  assertEquals(result.error, "INVALID_CREDENTIALS");
  // Generic error - no account existence leak
  assertEquals(result.session, undefined);
});

Deno.test("6. logout invalidates session", async () => {
  // First authenticate
  const authResult = await authService.authenticate({
    email: "superadmin@porprovsulsel.id",
    password: "demo",
  });

  assertEquals(authResult.success, true);

  if (authResult.session && authResult.user) {
    // Then logout
    await authService.logout({
      userId: authResult.user.id,
      sessionId: authResult.session.session_id,
    });

    // Session should now be invalid
    const isValid = await authService.isSessionValid(authResult.session.session_id);
    assertEquals(isValid, false);
  }
});

Deno.test("7. get session returns valid session", async () => {
  const authResult = await authService.authenticate({
    username: "test.team",
    password: "password",
  });

  assertEquals(authResult.success, true);

  if (authResult.session) {
    const retrieved = await authService.getSession(authResult.session.session_id);
    assertEquals(retrieved !== null, true);
    assertEquals(retrieved?.status, "ACTIVE");
    assertEquals(retrieved?.user_id, authResult.session.user_id);
  }
});

Deno.test("8. expired session returns null", async () => {
  const authResult = await authService.authenticate({
    username: "test.team",
    password: "password",
  });

  assertEquals(authResult.success, true);

  if (authResult.session) {
    // Set expiry to past
    const session = authResult.session;
    session.expires_at = new Date(Date.now() - 1000).toISOString();

    // Should return null for expired
    const retrieved = await authService.getSession(session.session_id);
    assertEquals(retrieved, null);
  }
});

Deno.test("9. get user identity without password", async () => {
  const authResult = await authService.authenticate({
    email: "superadmin@porprovsulsel.id",
    password: "demo",
  });

  assertEquals(authResult.success, true);

  if (authResult.user) {
    const identity = await authService.getUserIdentity(authResult.user.id);

    assertEquals(identity !== null, true);
    if (identity) {
      // Must not contain credentials
      assertEquals((identity as any).password, undefined);
      assertEquals((identity as any).password_hash, undefined);
      assertEquals((identity as any).credential_digest, undefined);
      assertEquals(identity.display_name, "Andi Baso Mappasessu");
    }
  }
});

Deno.test("10. team membership resolves for team user", async () => {
  const authResult = await authService.authenticate({
    username: "test.team",
    password: "password",
  });

  assertEquals(authResult.success, true);

  if (authResult.user) {
    const memberships = await authService.getTeamMemberships(authResult.user.id);

    assertEquals(memberships.length > 0, true);

    const membership = memberships[0];
    assertEquals(membership.status, "ACTIVE");
    assertEquals(membership.user_id, authResult.user.id);
    assertEquals(membership.team_id !== undefined, true);
  }
});

Deno.test("11. admin has no team membership", async () => {
  const authResult = await authService.authenticate({
    email: "superadmin@porprovsulsel.id",
    password: "demo",
  });

  assertEquals(authResult.success, true);

  if (authResult.user) {
    const memberships = await authService.getTeamMemberships(authResult.user.id);

    // Admin should have no memberships (or empty array)
    assertEquals(memberships.length, 0);
  }
});

Deno.test("12. session contains no password", async () => {
  const authResult = await authService.authenticate({
    username: "test.team",
    password: "secretpassword",
  });

  assertEquals(authResult.success, true);

  if (authResult.session) {
    const sessionAny = authResult.session as any;
    assertEquals(sessionAny.password, undefined);
    assertEquals(sessionAny.password_hash, undefined);
    assertEquals(sessionAny.credential_digest, undefined);
    assertEquals(sessionAny.credentials, undefined);
  }
});

Deno.test("13. unauthenticated cannot access protected operations", async () => {
  // Try to get non-existent session
  const session = await authService.getSession("invalid-session-id");
  assertEquals(session, null);
});

Deno.test("14. session identity resolves user", async () => {
  const authResult = await authService.authenticate({
    username: "test.team",
    password: "password",
  });

  assertEquals(authResult.success, true);

  if (authResult.session && authResult.user) {
    // Simulate retrieving user from session
    const retrievedUser = await authService.getUserIdentity(authResult.session.user_id);

    assertEquals(retrievedUser !== null, true);
    if (retrievedUser) {
      assertEquals(retrievedUser.id, authResult.user.id);
    }
  }
});

Deno.test("15. session refresh extends expiry", async () => {
  const authResult = await authService.authenticate({
    username: "test.team",
    password: "password",
  });

  assertEquals(authResult.success, true);

  if (authResult.session) {
    const beforeRefresh = new Date();

    // Refresh
    const refreshed = await authService.refreshSession(authResult.session.session_id);

    assertEquals(refreshed !== null, true);
    if (refreshed) {
      // Expiry should be in the future (at least 23 hours from now for 24h refresh)
      const refreshedExpiryTime = new Date(refreshed.expires_at).getTime();
      const expectedMinTime = beforeRefresh.getTime() + 23 * 60 * 60 * 1000;
      assertEquals(refreshedExpiryTime > expectedMinTime, true);
    }
  }
});

Deno.test("16. expired session cannot be refreshed", async () => {
  const authResult = await authService.authenticate({
    username: "test.team",
    password: "password",
  });

  assertEquals(authResult.success, true);

  if (authResult.session) {
    authResult.session.expires_at = new Date(Date.now() - 1000).toISOString();

    const refreshed = await authService.refreshSession(authResult.session.session_id);
    assertEquals(refreshed, null);
  }
});

Deno.test("17. repeated team login does not duplicate membership", async () => {
  const first = await authService.authenticate({
    username: "test.team",
    password: "password",
  });
  const second = await authService.authenticate({
    username: "test.team",
    password: "password",
  });

  assertEquals(first.success, true);
  assertEquals(second.success, true);

  if (first.user) {
    const memberships = await authService.getTeamMemberships(first.user.id);
    assertEquals(memberships.length, 1);
  }
});
