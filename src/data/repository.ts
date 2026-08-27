import type { NewMatchEventInput } from "@/domain/match-operations";
import type { MatchOfficialRole, MatchStatus } from "@/domain/types";
import type {
  AuditLog,
  Category,
  Contingent,
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
  listGroups(): Promise<Group[]>;
  listTeams(): Promise<Team[]>;
  listPlayers(): Promise<Player[]>;
  listTeamOfficials(): Promise<TeamOfficial[]>;
  listVenues(): Promise<Venue[]>;
  listMatches(): Promise<Match[]>;
  getMatch(id: UUID): Promise<Match | null>;
  listMatchOfficials(matchId: UUID): Promise<MatchOfficial[]>;
  listLineup(matchId: UUID): Promise<MatchLineupEntry[]>;
  listMatchEvents(matchId: UUID): Promise<MatchEvent[]>;
  listStandings(categoryId: UUID): Promise<StandingRow[]>;
  listTopScorers(categoryId: UUID): Promise<TopScorerRow[]>;
  listUsers(): Promise<User[]>;
  listAuditLogs(): Promise<AuditLog[]>;

  /* ------------------------------- Mutations ------------------------------ */
  /** Menyimpan event pertandingan (immutable append) dan menurunkan ulang skor. */
  recordMatchEvent(input: NewMatchEventInput): Promise<MatchEvent>;
  /** Perpindahan status. Transisi ilegal ditolak. */
  transitionMatchStatus(input: {
    match_id: UUID;
    to: MatchStatus;
    operator_id: UUID;
  }): Promise<Match>;
  updateMatchClock(input: { match_id: UUID; clock_seconds: number }): Promise<Match>;
  updateMatchSchedule(input: {
    match_id: UUID;
    kickoff_at?: string;
    venue_id?: UUID;
    court?: number;
  }): Promise<Match>;
  assignMatchOfficial(input: {
    match_id: UUID;
    role: MatchOfficialRole;
    user_id: UUID;
    operator_id: UUID;
  }): Promise<MatchOfficial[]>;
}
