import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { PermissionKey } from "@/domain/permissions";
import { can, canAny, ROLE_PERMISSIONS } from "@/domain/permissions";
import { GUEST_ACTOR, type ActorContext } from "@/domain/registration";
import type { RoleKey } from "@/domain/types";

/**
 * SessionUser: representasi sesi terautentikasi untuk komponen React.
 * Sumber kebenarannya adalah sesi Lovable Cloud (auth) + tabel profiles/user_roles.
 * Tidak pernah menyimpan kredensial.
 */
export interface SessionUser {
  id: string;
  full_name: string;
  email: string;
  role: RoleKey;
  team_id?: string;
  contingent_id?: string;
  account_type?: "ADMIN" | "TEAM";
}

interface SessionContextValue {
  user: SessionUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (credentials: { username?: string; email?: string; password: string }) => Promise<void>;
  signUp: (input: { email: string; password: string; full_name: string }) => Promise<void>;
  signOut: () => Promise<void>;
  can: (permission: PermissionKey) => boolean;
  canAny: (permissions: PermissionKey[]) => boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/** Peran dan profil dibaca dari database; RLS tetap otoritas sebenarnya. */
async function loadSessionUser(session: Session): Promise<SessionUser> {
  const userId = session.user.id;
  const email = session.user.email ?? "";

  const [profileResult, roleResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, team_id, contingent_id")
      .eq("id", userId)
      .maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId).limit(1).maybeSingle(),
  ]);

  const fullName =
    profileResult.data?.full_name ||
    (session.user.user_metadata["full_name"] as string | undefined) ||
    email;
  const role = (roleResult.data?.role as RoleKey | undefined) ?? "PUBLIC";
  const teamId = profileResult.data?.team_id ?? undefined;
  const contingentId = profileResult.data?.contingent_id ?? undefined;

  return {
    id: userId,
    full_name: fullName,
    email,
    role,
    ...(teamId ? { team_id: teamId } : {}),
    ...(contingentId ? { contingent_id: contingentId } : {}),
    account_type: role === "TEAM_OFFICIAL" ? "TEAM" : "ADMIN",
  };
}

export function resolveAuthDestination(user: SessionUser | null): string {
  if (!user) return "/masuk";
  if (user.account_type === "TEAM" || user.role === "TEAM_OFFICIAL") return "/team";
  return "/admin";
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;

    const apply = (session: Session | null) => {
      if (!session) {
        if (active) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }
      // Pembacaan profil/peran ditunda agar tidak memblokir callback auth.
      void loadSessionUser(session)
        .then((next) => {
          if (active) setUser(next);
        })
        .catch((error) => {
          console.error("Gagal memuat profil sesi:", error);
          if (active) setUser(null);
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });
    };

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (!session) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      setTimeout(() => apply(session), 0);
    });

    void supabase.auth.getSession().then(({ data }) => apply(data.session));

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(
    async (credentials: { username?: string; email?: string; password: string }) => {
      const email = credentials.email ?? credentials.username ?? "";
      if (!email.includes("@")) {
        throw new Error("Gunakan alamat email akun resmi Anda.");
      }
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: credentials.password,
      });
      if (error) throw new Error(error.message);
      if (data.session) setUser(await loadSessionUser(data.session));
    },
    [],
  );

  const signUp = useCallback(
    async ({
      email,
      password,
      full_name,
    }: {
      email: string;
      password: string;
      full_name: string;
    }) => {
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/masuk`,
          data: { full_name },
        },
      });
      if (error) throw new Error(error.message);
    },
    [],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    // Bersihkan state aplikasi (cache TanStack Query) lalu alihkan ke beranda publik.
    queryClient.clear();
    navigate({ to: "/", replace: true });
  }, [queryClient, navigate]);

  const value = useMemo<SessionContextValue>(() => {
    const role: RoleKey = user?.role ?? "PUBLIC";
    return {
      user,
      isAuthenticated: user !== null,
      isLoading,
      signIn,
      signUp,
      signOut,
      can: (permission) => can(role, permission),
      canAny: (permissions) => canAny(role, permissions),
    };
  }, [user, isLoading, signIn, signUp, signOut]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession harus dipakai di dalam SessionProvider");
  return ctx;
}

/**
 * Aktor otorisasi untuk lapisan repository, diturunkan dari sesi nyata.
 * Pengunjung tanpa sesi memakai GUEST_ACTOR (read-only publik).
 */
export function useActor(): ActorContext {
  const { user } = useSession();
  return useMemo<ActorContext>(() => {
    if (!user) return GUEST_ACTOR;
    return {
      userId: user.id,
      role: user.role,
      permissions: ROLE_PERMISSIONS[user.role] ?? [],
      ...(user.team_id ? { teamId: user.team_id } : {}),
    };
  }, [user]);
}
