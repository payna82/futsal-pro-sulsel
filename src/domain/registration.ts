import type { OfficialRole, Player, RoleKey, Team, TeamOfficial, UUID } from "./types";
import { ROLE_PERMISSIONS, type PermissionKey } from "./permissions";

export interface ActorContext {
  userId: UUID;
  role: string;
  teamId?: UUID;
  permissions: PermissionKey[];
}

/* ============================ Role Requests ============================ */

export type RoleRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "REVOKED"
  | "CANCELLED";

export const ROLE_REQUEST_STATUS_LABEL: Record<RoleRequestStatus, string> = {
  PENDING: "Menunggu Tinjauan",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  REVOKED: "Dicabut",
  CANCELLED: "Dibatalkan",
};

/** Daftar peran yang boleh diajukan secara mandiri oleh pengguna.
 *  Admin/Senior role (SUPER_ADMIN, TOURNAMENT_ADMIN, COMPETITION_MANAGER,
 *  VENUE_MANAGER, MATCH_COMMISSIONER) tidak dapat diajukan mandiri. */
export const SELF_REQUESTABLE_ROLES = [
  "REFEREE",
  "TIMEKEEPER",
  "SCOREKEEPER",
  "MEDIA",
  "TEAM_OFFICIAL",
] as const;

export const SELF_REQUESTABLE_ROLE_LABELS: Record<
  (typeof SELF_REQUESTABLE_ROLES)[number], string
> = {
  REFEREE: "Wasit Pertandingan",
  TIMEKEEPER: "Pencatat Waktu",
  SCOREKEEPER: "Pencatat Skor",
  MEDIA: "Petugas Media & Publikasi",
  TEAM_OFFICIAL: "Ofisial / Pengurus Tim",
};

export interface SupportingDoc {
  name: string;
  description?: string;
}

export interface RoleRequest {
  id: UUID;
  user_id: UUID;
  requested_role: RoleKey;
  request_reason: string;
  supporting_docs: SupportingDoc[];
  status: RoleRequestStatus;
  reviewer_id?: UUID;
  reviewed_at?: ISODateTime;
  decision_note?: string;
  contingent_id?: UUID;
  venue_id?: UUID;
  team_id?: UUID;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export type ISODateTime = string;

/** Aktor untuk pengunjung publik yang belum terautentikasi (read-only). */
export const GUEST_ACTOR: ActorContext = {
  userId: "guest",
  role: "PUBLIC",
  permissions: [...ROLE_PERMISSIONS.PUBLIC],
};

export type RegistrationStatus =
  | "DRAFT"
  | "READY_FOR_SUBMISSION"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "REVISION_REQUIRED"
  | "APPROVED"
  | "REJECTED"
  | "LOCKED";

export type AccountStatus = "INVITED" | "ACTIVE" | "SUSPENDED" | "DISABLED";
export type DocumentStatus =
  "MISSING" | "UPLOADED" | "UNDER_REVIEW" | "APPROVED" | "REVISION_REQUIRED" | "REJECTED";
export type VerificationAction = "SUBMITTED" | "APPROVED" | "REVISION_REQUESTED" | "REJECTED";
export type RegistrationEntityType = "PLAYER" | "OFFICIAL" | "TEAM";

export const REGISTRATION_STATUS_LABEL: Record<RegistrationStatus, string> = {
  DRAFT: "Draf",
  READY_FOR_SUBMISSION: "Siap Dikirim",
  SUBMITTED: "Dikirim",
  UNDER_REVIEW: "Dalam Pemeriksaan",
  REVISION_REQUIRED: "Perlu Revisi",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  LOCKED: "Terkunci",
};

export const DOCUMENT_STATUS_LABEL: Record<DocumentStatus, string> = {
  MISSING: "Belum Ada",
  UPLOADED: "Terunggah",
  UNDER_REVIEW: "Dalam Pemeriksaan",
  APPROVED: "Disetujui",
  REVISION_REQUIRED: "Perlu Revisi",
  REJECTED: "Ditolak",
};

export const DOCUMENT_TYPES = [
  { key: "IDENTITY", label: "Identitas Pemain/Ofisial" },
  { key: "REGISTRATION", label: "Bukti Registrasi" },
  { key: "MEDICAL", label: "Dokumen Kesehatan" },
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number]["key"];

export interface TeamAccount {
  id: UUID;
  team_id: UUID;
  username: string;
  account_status: AccountStatus;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export interface TeamProfile {
  team_id: UUID;
  contact_person: string;
  contact_phone: string;
  contact_email: string;
  address: string;
  training_venue?: string;
  registration_status: RegistrationStatus;
  updated_at: string;
}

export interface RegistrationDocument {
  id: UUID;
  entity_type: RegistrationEntityType;
  entity_id: UUID;
  type: DocumentType;
  file_name: string;
  storage_ref: string;
  status: DocumentStatus;
  uploaded_at: string;
  reviewer_id?: UUID;
  reviewed_at?: string;
  revision_reason?: string;
}

export interface VerificationHistory {
  id: UUID;
  entity_type: RegistrationEntityType;
  entity_id: UUID;
  actor_id: UUID;
  action: VerificationAction;
  previous_status: RegistrationStatus | DocumentStatus | "ELIGIBLE" | "PENDING" | "SUSPENDED";
  new_status: RegistrationStatus | DocumentStatus | "ELIGIBLE" | "PENDING" | "SUSPENDED";
  reason?: string;
  created_at: string;
}

export interface TeamRegistrationSummary {
  team: Team;
  profile: TeamProfile;
  players: Player[];
  officials: TeamOfficial[];
  documents: RegistrationDocument[];
  pending_count: number;
  revision_count: number;
  approved_player_count: number;
  is_ready: boolean;
}

export const REGISTRATION_TRANSITIONS: Record<RegistrationStatus, RegistrationStatus[]> = {
  DRAFT: ["READY_FOR_SUBMISSION"],
  READY_FOR_SUBMISSION: ["SUBMITTED", "DRAFT"],
  SUBMITTED: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["REVISION_REQUIRED", "APPROVED", "REJECTED"],
  REVISION_REQUIRED: ["SUBMITTED", "DRAFT"],
  REJECTED: ["SUBMITTED"],
  APPROVED: ["LOCKED"],
  LOCKED: [],
};

export function canTransitionRegistration(from: RegistrationStatus, to: RegistrationStatus) {
  return REGISTRATION_TRANSITIONS[from].includes(to);
}

export const PARTICIPANT_REGISTRATION_TRANSITIONS: Record<
  RegistrationStatus,
  RegistrationStatus[]
> = {
  ...REGISTRATION_TRANSITIONS,
  DRAFT: ["SUBMITTED"],
  READY_FOR_SUBMISSION: ["SUBMITTED"],
};

export function canTransitionParticipantRegistration(
  from: RegistrationStatus,
  to: RegistrationStatus,
) {
  return PARTICIPANT_REGISTRATION_TRANSITIONS[from].includes(to);
}

export function isRegistrationLocked(status: RegistrationStatus) {
  return status === "APPROVED" || status === "LOCKED";
}

export function isDocumentApproved(documents: RegistrationDocument[], entityId: UUID) {
  return DOCUMENT_TYPES.every((required) =>
    documents.some(
      (document) =>
        document.entity_id === entityId &&
        document.type === required.key &&
        document.status === "APPROVED",
    ),
  );
}

export function registrationSummary(
  team: Team,
  profile: TeamProfile,
  players: Player[],
  officials: TeamOfficial[],
  documents: RegistrationDocument[],
): TeamRegistrationSummary {
  const related = [...players, ...officials].map((item) => item.id);
  const pending_count = related.filter((id) =>
    documents.some(
      (doc) => doc.entity_id === id && ["UPLOADED", "UNDER_REVIEW"].includes(doc.status),
    ),
  ).length;
  const revision_count = documents
    .filter((doc) => doc.entity_id === team.id || related.includes(doc.entity_id))
    .filter((doc) => doc.status === "REVISION_REQUIRED").length;
  const approved_player_count = players.filter(
    (player) => player.status === "ELIGIBLE" && isDocumentApproved(documents, player.id),
  ).length;
  const profileComplete = [
    profile.contact_person,
    profile.contact_phone,
    profile.contact_email,
    profile.address,
  ].every((value) => value.trim().length > 0);
  const is_ready =
    profile.registration_status !== "LOCKED" &&
    profileComplete &&
    players.length > 0 &&
    officials.length > 0 &&
    players.every((player) => isDocumentApproved(documents, player.id)) &&
    officials.every((official) => isDocumentApproved(documents, official.id));
  return {
    team,
    profile,
    players,
    officials,
    documents,
    pending_count,
    revision_count,
    approved_player_count,
    is_ready,
  };
}
