import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PermissionKey } from "@/domain/permissions";
import { can, canAny } from "@/domain/permissions";
import type { RoleKey } from "@/domain/types";
import type { UserIdentity, TeamMembership } from "@/domain/authentication";
import { AuthenticationService } from "@/domain/authentication-service";
import { DemoAuthenticationAdapter } from "@/domain/demo-authentication-adapter";
import { setAuthenticationService } from "@/domain/authentication-service";

/**
 * SessionUser: Derived representation for React components.
 * Maps from UserIdentity + TeamMembership for backward compatibility.
 *
 * IMPORTANT:
 * - No password or credentials
 * - No sensitive auth material
 * - Derived from authenticated session only
 */
export interface SessionUser {
  id: string;
  full_name: string;
  email: string;
  role: RoleKey;
  team_id?: string;
  account_type?: "ADMIN" | "TEAM";
}

interface SessionContextValue {
  user: SessionUser | null;
  isAuthenticated: boolean;
  signIn: (credentials: { username?: string; email?: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  can: (permission: PermissionKey) => boolean;
  canAny: (permissions: PermissionKey[]) => boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Initialize authentication service with demo adapter.
 * Phase 3.2+: Will swap adapter to production authentication.
 */
function initializeAuthenticationService(): AuthenticationService {
  const adapter = new DemoAuthenticationAdapter();
  const service = new AuthenticationService(adapter);
  setAuthenticationService(service);
  return service;
}

/**
 * SessionProvider: Manages authenticated session state.
 *
 * Derives from authentication boundary:
 * AuthenticatedSession → UserIdentity + TeamMembership → SessionUser (for React)
 *
 * SECURITY:
 * - Never stores credentials in state
 * - Never exposes credential material through context
 * - Invalidates protected data on logout
 * - Preserves ActorContext boundary from Phase 2.6
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userIdentity, setUserIdentity] = useState<UserIdentity | null>(null);
  const [memberships, setMemberships] = useState<TeamMembership[]>([]);
  const [authService] = useState(() => initializeAuthenticationService());
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize demo admin session on mount
  useEffect(() => {
    const initializeDemoSession = async () => {
      try {
        // Auto-login demo admin for development
        const result = await authService.authenticate({
          email: "superadmin@porprovsulsel.id",
          password: "demo", // demo password
        });

        if (result.success && result.session && result.user) {
          setSessionId(result.session.session_id);
          setUserIdentity(result.user);

          // Derive session user for React
          const derived: SessionUser = {
            id: result.user.id,
            full_name: result.user.display_name,
            email: result.user.email,
            role: "SUPER_ADMIN", // Phase 3.3: resolve from RBAC
            account_type: "ADMIN",
          };
          setUser(derived);
        }
      } catch (error) {
        console.error("Failed to initialize demo session:", error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeDemoSession();
  }, [authService]);

  const signIn = useCallback(
    async (credentials: { username?: string; email?: string; password: string }) => {
      try {
        const result = await authService.authenticate(credentials);

        if (!result.success) {
          throw new Error(result.error || "Authentication failed");
        }

        if (!result.session || !result.user) {
          throw new Error("Invalid authentication result");
        }

        // Store session and identity
        setSessionId(result.session.session_id);
        setUserIdentity(result.user);

        // Fetch team memberships
        const userMemberships = await authService.getTeamMemberships(result.user.id);
        setMemberships(userMemberships);

        // Derive session user from identity + memberships
        const teamId = userMemberships[0]?.team_id; // Use first team as primary
        const derived: SessionUser = {
          id: result.user.id,
          full_name: result.user.display_name,
          email: result.user.email,
          role: credentials.username ? "TEAM_OFFICIAL" : "SUPER_ADMIN", // Phase 3.3: resolve from RBAC
          ...(teamId ? { team_id: teamId } : {}),
          account_type: credentials.username ? "TEAM" : "ADMIN",
        };

        setUser(derived);
      } catch (error) {
        console.error("Sign in failed:", error);
        throw error;
      }
    },
    [authService],
  );

  const signOut = useCallback(async () => {
    try {
      if (sessionId && userIdentity) {
        await authService.logout({
          userId: userIdentity.id,
          sessionId,
        });
      }
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      // Clear all session state
      setUser(null);
      setSessionId(null);
      setUserIdentity(null);
      setMemberships([]);
    }
  }, [authService, sessionId, userIdentity]);

  const value = useMemo<SessionContextValue>(() => {
    const role: RoleKey = user?.role ?? "PUBLIC";
    return {
      user,
      isAuthenticated: user !== null && !isInitializing,
      signIn,
      signOut,
      can: (permission) => can(role, permission),
      canAny: (permissions) => canAny(role, permissions),
    };
  }, [user, signIn, signOut, isInitializing]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession harus dipakai di dalam SessionProvider");
  return ctx;
}
