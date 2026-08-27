import { computeStandings } from "@/domain/standings";
import type { StandingRow, TopScorerRow, UUID } from "@/domain/types";
import * as fx from "./fixtures";
import type { CompetitionRepository } from "./repository";

/** Adapter sementara. Ditukar dengan adapter Supabase tanpa mengubah komponen. */
export const inMemoryRepository: CompetitionRepository = {
  async getTournament() {
    return fx.tournament;
  },
  async listCategories() {
    return fx.categories;
  },
  async listContingents() {
    return fx.contingents;
  },
  async listGroups() {
    return fx.groups;
  },
  async listTeams() {
    return fx.teams;
  },
  async listPlayers() {
    return fx.players;
  },
  async listTeamOfficials() {
    return fx.teamOfficials;
  },
  async listVenues() {
    return fx.venues;
  },
  async listMatches() {
    return fx.matches;
  },
  async getMatch(id: UUID) {
    return fx.matches.find((m) => m.id === id) ?? null;
  },
  async listMatchOfficials(matchId: UUID) {
    return fx.matchOfficials.filter((o) => o.match_id === matchId);
  },
  async listLineup(matchId: UUID) {
    return fx.lineups.filter((l) => l.match_id === matchId);
  },
  async listMatchEvents(matchId: UUID) {
    return fx.matchEvents.filter((e) => e.match_id === matchId);
  },
  async listStandings(categoryId: UUID): Promise<StandingRow[]> {
    const teams = fx.teams.filter((t) => t.category_id === categoryId);
    const ids = new Set(teams.map((t) => t.id));
    const matches = fx.matches.filter(
      (m) => ids.has(m.home_team_id) && ids.has(m.away_team_id),
    );
    return computeStandings(teams, matches);
  },
  async listTopScorers(categoryId: UUID): Promise<TopScorerRow[]> {
    const teams = fx.teams.filter((t) => t.category_id === categoryId);
    const ids = new Set(teams.map((t) => t.id));
    const tally = new Map<string, TopScorerRow>();
    for (const ev of fx.matchEvents) {
      if (ev.type !== "GOAL" || !ev.player_id || !ev.team_id) continue;
      if (!ids.has(ev.team_id)) continue;
      const row = tally.get(ev.player_id) ?? {
        player_id: ev.player_id,
        team_id: ev.team_id,
        goals: 0,
      };
      row.goals += 1;
      tally.set(ev.player_id, row);
    }
    return [...tally.values()].sort((a, b) => b.goals - a.goals);
  },
  async listUsers() {
    return fx.users;
  },
  async listAuditLogs() {
    return fx.auditLogs;
  },
};
