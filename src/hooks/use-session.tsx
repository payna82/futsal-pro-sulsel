import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { PermissionKey } from "@/domain/permissions";
import { can, canAny } from "@/domain/permissions";
import type { RoleKey } from "@/domain/types";

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
  signIn: (user: SessionUser) => void;
  signOut: () => void;
  can: (permission: PermissionKey) => boolean;
  canAny: (permissions: PermissionKey[]) => boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Sesi demo sisi klien. Hanya untuk mengatur tampilan navigasi/aksi.
 * Otentikasi dan otorisasi sesungguhnya akan ditangani backend.
 */
/** Sesi demo bawaan sebelum autentikasi backend tersedia. */
const DEMO_USER: SessionUser = {
  id: "usr-1",
  full_name: "Andi Baso Mappasessu",
  email: "superadmin@porprovsulsel.id",
  role: "SUPER_ADMIN",
  account_type: "ADMIN",
};

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(DEMO_USER);

  const signIn = useCallback((next: SessionUser) => setUser(next), []);
  const signOut = useCallback(() => setUser(null), []);

  const value = useMemo<SessionContextValue>(() => {
    const role: RoleKey = user?.role ?? "PUBLIC";
    return {
      user,
      isAuthenticated: user !== null,
      signIn,
      signOut,
      can: (permission) => can(role, permission),
      canAny: (permissions) => canAny(role, permissions),
    };
  }, [user, signIn, signOut]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession harus dipakai di dalam SessionProvider");
  return ctx;
}
