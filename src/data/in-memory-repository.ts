import { canTransition } from "@/domain/match-state";
import {
  deriveScore,
  periodForStatus,
  statusTransitionEvent,
  type NewMatchEventInput,
} from "@/domain/match-operations";
import { computeStandings } from "@/domain/standings";
import type {
  AuditLog,
  Match,
  MatchEvent,
  MatchOfficial,
  MatchOfficialRole,
  MatchStatus,
  StandingRow,
  TopScorerRow,
  UUID,
} from "@/domain/types";
import * as fx from "./fixtures";
import type { CompetitionRepository } from "./repository";

let sequence = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${sequence++}`;

function requireMatch(id: UUID): Match {
  const match = fx.matches.find((m) => m.id === id);
  if (!match) throw new Error("Pertandingan tidak ditemukan.");
  return match;
}

function actorName(userId: UUID): string {
  return fx.users.find((u) => u.id === userId)?.full_name ?? "Sistem";
}

function audit(actorId: UUID, action: string, entity: string, entityId: UUID, summary: string) {
  const log: AuditLog = {
    id: nextId("au"),
    actor_id: actorId,
    actor_name: actorName(actorId),
    action,
    entity,
    entity_id: entityId,
    summary,
    created_at: new Date().toISOString(),
  };
  fx.auditLogs.unshift(log);
}

function appendEvent(input: NewMatchEventInput): MatchEvent {
  const event: MatchEvent = {
    id: nextId("ev"),
    match_id: input.match_id,
    timestamp: Math.max(0, Math.round(input.timestamp)),
    period: input.period,
    type: input.type,
    operator_id: input.operator_id,
    metadata: input.metadata ?? {},
    created_at: new Date().toISOString(),
    ...(input.team_id ? { team_id: input.team_id } : {}),
    ...(input.player_id ? { player_id: input.player_id } : {}),
  };
  fx.matchEvents.push(event);
  return event;
}

function resyncScore(match: Match) {
  const events = fx.matchEvents.filter((e) => e.match_id === match.id);
  const score = deriveScore(events, match.home_team_id, match.away_team_id);
  match.home_score = score.home;
  match.away_score = score.away;
}

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

  /* ------------------------------- Mutations ------------------------------ */
  async recordMatchEvent(input: NewMatchEventInput) {
    const match = requireMatch(input.match_id);
    const event = appendEvent(input);
    resyncScore(match);
    audit(
      input.operator_id,
      "MATCH_EVENT_CREATE",
      "match_events",
      match.id,
      `Mencatat ${input.type} pada pertandingan #${match.match_number}`,
    );
    return event;
  },

  async transitionMatchStatus({
    match_id,
    to,
    operator_id,
  }: {
    match_id: UUID;
    to: MatchStatus;
    operator_id: UUID;
  }) {
    const match = requireMatch(match_id);
    if (!canTransition(match.status, to)) {
      throw new Error(`Transisi ${match.status} → ${to} tidak diizinkan.`);
    }
    const from = match.status;
    match.status = to;
    match.period = periodForStatus(to, match.period);
    if (to === "LIVE" && from === "READY") match.clock_seconds = 0;
    if (to === "LIVE" && from === "HALFTIME") match.clock_seconds = 0;

    const type = statusTransitionEvent(to);
    if (type) {
      appendEvent({
        match_id,
        type,
        period: match.period,
        timestamp: match.clock_seconds,
        operator_id,
      });
      if (to === "LIVE" && from === "READY") {
        appendEvent({
          match_id,
          type: "MATCH_START",
          period: match.period,
          timestamp: 0,
          operator_id,
        });
      }
    }
    resyncScore(match);
    audit(
      operator_id,
      "MATCH_STATUS_CHANGE",
      "matches",
      match.id,
      `Mengubah status ${from} menjadi ${to}`,
    );
    return match;
  },

  async updateMatchClock({ match_id, clock_seconds }: { match_id: UUID; clock_seconds: number }) {
    const match = requireMatch(match_id);
    match.clock_seconds = Math.max(0, Math.round(clock_seconds));
    return match;
  },

  async updateMatchSchedule({
    match_id,
    kickoff_at,
    venue_id,
    court,
  }: {
    match_id: UUID;
    kickoff_at?: string;
    venue_id?: UUID;
    court?: number;
  }) {
    const match = requireMatch(match_id);
    if (kickoff_at) match.kickoff_at = kickoff_at;
    if (venue_id) match.venue_id = venue_id;
    if (typeof court === "number") match.court = court;
    return match;
  },

  async assignMatchOfficial({
    match_id,
    role,
    user_id,
    operator_id,
  }: {
    match_id: UUID;
    role: MatchOfficialRole;
    user_id: UUID;
    operator_id: UUID;
  }) {
    const match = requireMatch(match_id);
    const user = fx.users.find((u) => u.id === user_id);
    if (!user) throw new Error("Petugas tidak ditemukan.");
    const duplicate = fx.matchOfficials.find(
      (o) => o.match_id === match_id && o.user_id === user_id && o.role !== role,
    );
    if (duplicate) throw new Error("Petugas sudah bertugas pada peran lain di pertandingan ini.");

    const existing = fx.matchOfficials.find((o) => o.match_id === match_id && o.role === role);
    if (existing) {
      existing.user_id = user_id;
      existing.full_name = user.full_name;
    } else {
      const assignment: MatchOfficial = {
        id: nextId("mo"),
        match_id,
        user_id,
        full_name: user.full_name,
        role,
      };
      fx.matchOfficials.push(assignment);
    }
    audit(
      operator_id,
      "MATCH_OFFICIAL_ASSIGN",
      "match_officials",
      match_id,
      `Menugaskan ${user.full_name} sebagai ${role} pada pertandingan #${match.match_number}`,
    );
    return fx.matchOfficials.filter((o) => o.match_id === match_id);
  },
};

