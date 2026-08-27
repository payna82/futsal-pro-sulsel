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
}
