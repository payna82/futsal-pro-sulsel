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
  "player.manage",
  "official.manage",
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
    "player.manage",
    "official.manage",
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
  TEAM_OFFICIAL: ["team.view_own", "report.view"],
  MEDIA: ["report.view", "statistic.view"],
  PUBLIC: [],
};

export function can(role: RoleKey, permission: PermissionKey): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canAny(role: RoleKey, permissions: PermissionKey[]): boolean {
  return permissions.some((p) => can(role, p));
}
