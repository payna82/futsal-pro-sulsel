import type { NewMatchEventInput } from "@/domain/match-operations";
import type {
  AccountStatus,
  DocumentStatus,
  DocumentType,
  RegistrationDocument,
  RegistrationEntityType,
  RoleRequest,
  RoleRequestStatus,
  TeamAccount,
  TeamProfile,
  TeamRegistrationSummary,
  VerificationAction,
  VerificationHistory,
  ActorContext,
} from "@/domain/registration";
import type { MatchOfficialRole, MatchStatus, RoleKey } from "@/domain/types";
import type {
  AuditLog,
  Category,
  Contingent,
  ContingentStatus,
  Group,
  Match,
  MatchEvent,
  MatchLineupEntry,
  MatchOfficial,
  Player,
  StandingRow,
  Team,
  TeamOfficial,
  TopScorerRow,
  Tournament,
  User,
  UUID,
  Venue,
} from "@/domain/types";

/**
 * Kontrak akses data. Implementasi saat ini memakai adapter in-memory.
 * Adapter Supabase akan mengimplementasikan interface yang sama.
 */
export interface CompetitionRepository {
  getTournament(): Promise<Tournament>;
  listCategories(): Promise<Category[]>;
  listContingents(): Promise<Contingent[]>;
  updateContingentStatus(input: {
    contingent_id: UUID;
    status: ContingentStatus;
    decision_note?: string;
    operator_id?: UUID;
    actor: ActorContext;
  }): Promise<Contingent>;
  listGroups(): Promise<Group[]>;
  listTeams(): Promise<Team[]>;
  listPlayers(actor: ActorContext): Promise<Player[]>;
  getPlayer(id: UUID, actor: ActorContext): Promise<Player>;
  listTeamOfficials(actor: ActorContext): Promise<TeamOfficial[]>;
  getTeamOfficial(id: UUID, actor: ActorContext): Promise<TeamOfficial>;
  listVenues(): Promise<Venue[]>;
  listMatches(): Promise<Match[]>;
  getMatch(id: UUID): Promise<Match | null>;
  listMatchOfficials(
    matchId: UUID,
    options?: { includeHistory?: boolean },
  ): Promise<MatchOfficial[]>;
  listLineup(matchId: UUID): Promise<MatchLineupEntry[]>;
  listMatchEvents(matchId: UUID): Promise<MatchEvent[]>;
  listStandings(categoryId: UUID): Promise<StandingRow[]>;
  listTopScorers(categoryId: UUID): Promise<TopScorerRow[]>;
  listUsers(): Promise<User[]>;
  listAuditLogs(): Promise<AuditLog[]>;
  listTeamAccounts(actor: ActorContext): Promise<TeamAccount[]>;
  getTeamAccount(teamId: UUID, actor: ActorContext): Promise<TeamAccount>;
  getTeamAccountByUsername(username: string): Promise<TeamAccount | null>;
  authenticateTeam(username: string, password: string): Promise<TeamAccount | null>;
  getTeamProfile(teamId: UUID, actor: ActorContext): Promise<TeamProfile>;
  getTeamRegistration(teamId: UUID, actor: ActorContext): Promise<TeamRegistrationSummary>;
  listRegistrationDocuments(
    actor: ActorContext,
    entityType?: RegistrationEntityType,
    entityId?: UUID,
  ): Promise<RegistrationDocument[]>;
  getRegistrationDocument(id: UUID, actor: ActorContext): Promise<RegistrationDocument>;
  listVerificationHistory(
    entityType: RegistrationEntityType,
    entityId: UUID,
    actor: ActorContext,
  ): Promise<VerificationHistory[]>;

  /* ------------------------------- Mutations ------------------------------ */
  /** Menyimpan event pertandingan (immutable append) dan menurunkan ulang skor. */
  recordMatchEvent(input: NewMatchEventInput & { actor?: ActorContext }): Promise<MatchEvent>;
  /** Perpindahan status. Transisi ilegal ditolak. */
  transitionMatchStatus(input: {
    match_id: UUID;
    to: MatchStatus;
    operator_id?: UUID;
    actor?: ActorContext;
    command_id?: UUID;
    expected_version?: number;
  }): Promise<Match>;
  updateMatchClock(input: {
    match_id: UUID;
    clock_seconds: number;
    operator_id?: UUID;
    actor?: ActorContext;
    command_id?: UUID;
    expected_version?: number;
  }): Promise<Match>;
  updateMatchSchedule(input: {
    match_id: UUID;
    operator_id?: UUID;
    actor?: ActorContext;
    command_id?: UUID;
    expected_version?: number;
    kickoff_at?: string;
    venue_id?: UUID;
    court?: number;
  }): Promise<Match>;
  assignMatchOfficial(input: {
    match_id: UUID;
    role: MatchOfficialRole;
    user_id: UUID;
    operator_id?: UUID;
    actor?: ActorContext;
    command_id?: UUID;
    expected_version?: number;
  }): Promise<MatchOfficial[]>;
  createTeamAccount(input: {
    team_id: UUID;
    username: string;
    password: string;
    operator_id?: UUID;
    actor: ActorContext;
  }): Promise<TeamAccount>;
  createTeam(
    input: Omit<Team, "id" | "status"> & { operator_id?: UUID; actor: ActorContext },
  ): Promise<Team>;
  updateTeamAccountStatus(input: {
    team_id: UUID;
    status: AccountStatus;
    operator_id?: UUID;
    actor: ActorContext;
  }): Promise<TeamAccount>;
  resetTeamCredential(input: {
    team_id: UUID;
    password: string;
    operator_id?: UUID;
    actor: ActorContext;
  }): Promise<TeamAccount>;
  updateTeamProfile(input: {
    team_id: UUID;
    profile: Omit<TeamProfile, "team_id" | "updated_at">;
    operator_id?: UUID;
    actor: ActorContext;
  }): Promise<TeamProfile>;
  createPlayer(
    input: Omit<Player, "id" | "status" | "nik_verified"> & {
      operator_id?: UUID;
      actor: ActorContext;
    },
  ): Promise<Player>;
  updatePlayer(input: {
    id: UUID;
    changes: Partial<
      Pick<Player, "full_name" | "jersey_number" | "position" | "birth_date" | "is_captain">
    >;
    operator_id?: UUID;
    actor: ActorContext;
  }): Promise<Player>;
  createTeamOfficial(
    input: Omit<TeamOfficial, "id"> & { operator_id?: UUID; actor: ActorContext },
  ): Promise<TeamOfficial>;
  updateTeamOfficial(input: {
    id: UUID;
    changes: Partial<Pick<TeamOfficial, "full_name" | "role" | "license_number">>;
    operator_id?: UUID;
    actor: ActorContext;
  }): Promise<TeamOfficial>;
  submitRegistration(input: {
    entityType: RegistrationEntityType;
    entityId: UUID;
    operator_id?: UUID;
    actor: ActorContext;
  }): Promise<void>;
  uploadRegistrationDocument(input: {
    entityType: RegistrationEntityType;
    entityId: UUID;
    type: DocumentType;
    file_name: string;
    operator_id?: UUID;
    actor: ActorContext;
  }): Promise<RegistrationDocument>;
  reviewRegistration(input: {
    entityType: RegistrationEntityType;
    entityId: UUID;
    action: VerificationAction;
    reason?: string;
    operator_id?: UUID;
    actor: ActorContext;
  }): Promise<void>;

  /* -------------------------- Role Requests (RBAC) ------------------------- */
  listRoleRequests(actor: ActorContext): Promise<RoleRequest[]>;
  listMyRoleRequests(actor: ActorContext): Promise<RoleRequest[]>;
  createRoleRequest(input: {
    requested_role: RoleKey;
    request_reason: string;
    supporting_docs?: { name: string; description?: string }[];
    contingent_id?: UUID;
    venue_id?: UUID;
    team_id?: UUID;
    actor: ActorContext;
  }): Promise<RoleRequest>;
  cancelRoleRequest(input: { id: UUID; actor: ActorContext }): Promise<RoleRequest>;
  approveRoleRequest(input: {
    id: UUID;
    decision_note?: string;
    contingent_id?: UUID;
    venue_id?: UUID;
    team_id?: UUID;
    actor: ActorContext;
  }): Promise<RoleRequest>;
  rejectRoleRequest(input: {
    id: UUID;
    decision_note: string;
    actor: ActorContext;
  }): Promise<RoleRequest>;
  revokeUserRole(input: {
    user_id: UUID;
    role: RoleKey;
    reason?: string;
    actor: ActorContext;
  }): Promise<boolean>;
  assignUserRole(input: {
    user_id: UUID;
    role: RoleKey;
    contingent_id?: UUID;
    venue_id?: UUID;
    team_id?: UUID;
    actor: ActorContext;
  }): Promise<boolean>;
}
