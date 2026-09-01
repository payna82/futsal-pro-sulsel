import type { RoleKey } from "./types";

export const ROLE_LABEL: Record<RoleKey, string> = {
  SUPER_ADMIN: "Super Admin",
  TOURNAMENT_ADMIN: "Admin Turnamen",
  COMPETITION_MANAGER: "Manajer Kompetisi",
  VENUE_MANAGER: "Manajer Venue",
  MATCH_COMMISSIONER: "Komisaris Pertandingan",
  REFEREE: "Wasit",
  TIMEKEEPER: "Pencatat Waktu",
  SCOREKEEPER: "Pencatat Skor",
  TEAM_OFFICIAL: "Ofisial Tim",
  MEDIA: "Media",
  PUBLIC: "Pengunjung",
};

/**
 * Matriks izin sisi klien. HANYA untuk menyembunyikan navigasi dan aksi.
 * Otorisasi otoritatif dilakukan backend (RLS + server function).
 */
export const PERMISSIONS = [
  "tournament.manage",
  "competition.manage",
  "contingent.manage",
  "team.manage",
  "team.view_own",
  "team.read",
  "team.create",
  "team.update",
  "team.account.create",
  "team.account.manage",
  "team.profile.read",
  "team.profile.update",
  "player.manage",
  "player.read",
  "player.create",
  "player.update",
  "player.submit",
  "player.verify",
  "official.manage",
  "official.read",
  "official.create",
  "official.update",
  "official.submit",
  "official.verify",
  "document.upload",
  "document.review",
  "submission.submit",
  "venue.manage",
  "group.manage",
  "schedule.manage",
  "match.manage",
  "match.operate_clock",
  "match.record_event",
  "match.confirm",
  "match.publish",
  "report.view",
  "statistic.view",
  "user.manage",
  "role.manage",
  "audit.view",
] as const;
export type PermissionKey = (typeof PERMISSIONS)[number];

const ALL: PermissionKey[] = [...PERMISSIONS];

export const ROLE_PERMISSIONS: Record<RoleKey, PermissionKey[]> = {
  SUPER_ADMIN: ALL,
  TOURNAMENT_ADMIN: ALL.filter((p) => p !== "role.manage"),
  COMPETITION_MANAGER: [
    "competition.manage",
    "contingent.manage",
    "team.manage",
    "team.read",
    "team.create",
    "team.update",
    "team.account.create",
    "team.account.manage",
    "player.manage",
    "player.read",
    "player.create",
    "player.update",
    "player.submit",
    "player.verify",
    "official.manage",
    "official.read",
    "official.create",
    "official.update",
    "official.submit",
    "official.verify",
    "document.review",
    "group.manage",
    "schedule.manage",
    "match.manage",
    "report.view",
    "statistic.view",
  ],
  VENUE_MANAGER: ["venue.manage", "schedule.manage", "match.manage", "report.view"],
  MATCH_COMMISSIONER: [
    "match.manage",
    "match.record_event",
    "match.confirm",
    "report.view",
    "audit.view",
  ],
  REFEREE: ["match.record_event", "report.view"],
  TIMEKEEPER: ["match.operate_clock", "match.record_event"],
  SCOREKEEPER: ["match.record_event", "match.operate_clock"],
  TEAM_OFFICIAL: [
    "team.view_own",
    "team.profile.read",
    "team.profile.update",
    "player.read",
    "player.create",
    "player.update",
    "player.submit",
    "official.read",
    "official.create",
    "official.update",
    "official.submit",
    "document.upload",
    "submission.submit",
    "report.view",
  ],
  MEDIA: ["report.view", "statistic.view"],
  PUBLIC: [],
};

export function can(role: RoleKey, permission: PermissionKey): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canAny(role: RoleKey, permissions: PermissionKey[]): boolean {
  return permissions.some((p) => can(role, p));
}

export function getAdminRedirectRoute(role: RoleKey, permission: PermissionKey): string | null {
  return can(role, permission) ? null : "/admin";
}

export function getAdminRoutePermission(pathname: string): PermissionKey | null {
  const normalized = pathname.replace(/\/+$/, "") || "/admin";
  const routeMap: Record<string, PermissionKey> = {
    "/admin/users": "user.manage",
    "/admin/roles": "role.manage",
    "/admin/permissions": "role.manage",
    "/admin/audit-logs": "audit.view",
    "/admin/tournaments": "tournament.manage",
    "/admin/competitions": "competition.manage",
    "/admin/groups": "group.manage",
    "/admin/venues": "venue.manage",
    "/admin/contingents": "contingent.manage",
    "/admin/teams": "team.manage",
    "/admin/teams/new": "team.create",
    "/admin/players": "player.manage",
    "/admin/officials": "official.manage",
    "/admin/match-officials": "official.manage",
    "/admin/matches": "match.manage",
    "/admin/schedule": "schedule.manage",
    "/admin/verification": "player.verify",
    "/admin/reports": "report.view",
    "/admin/statistics": "statistic.view",
  };

  if (normalized.startsWith("/admin/teams/")) {
    if (normalized.endsWith("/new")) return "team.create";
    return "team.read";
  }

  return routeMap[normalized] ?? null;
}
