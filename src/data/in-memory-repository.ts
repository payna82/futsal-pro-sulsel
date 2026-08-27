import { canTransition } from "@/domain/match-state";
import {
  deriveScore,
  periodForStatus,
  statusTransitionEvent,
  isEventVoided,
  validateMatchEvent,
  type NewMatchEventInput,
} from "@/domain/match-operations";
import { computeStandings } from "@/domain/standings";
import {
  canTransitionRegistration,
  isRegistrationLocked,
  registrationSummary,
} from "@/domain/registration";
import type {
  DocumentStatus,
  RegistrationEntityType,
  TeamProfile,
  VerificationAction,
} from "@/domain/registration";
import type {
  AuditLog,
  Match,
  MatchEvent,
  MatchOfficial,
  MatchOfficialRole,
  Player,
  MatchStatus,
  Team,
  TeamOfficial,
  StandingRow,
  TopScorerRow,
  UUID,
} from "@/domain/types";
import * as fx from "./fixtures";
import type { CompetitionRepository } from "./repository";

let sequence = 0;
const commandResults = new Map<UUID, Match | MatchOfficial[]>();
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${sequence++}`;
const clone = <T>(value: T): T => structuredClone(value);
const commandId = (value?: UUID) => value ?? nextId("cmd");

function requireMatch(id: UUID): Match {
  const match = fx.matches.find((m) => m.id === id);
  if (!match) throw new Error("Pertandingan tidak ditemukan.");
  return match;
}

function actorName(userId: UUID): string {
  return fx.users.find((u) => u.id === userId)?.full_name ?? "Sistem";
}

function audit(
  actorId: UUID,
  action: string,
  entity: string,
  entityId: UUID,
  summary: string,
  command_id?: UUID,
  result: "ACCEPTED" | "REPLAYED" = "ACCEPTED",
) {
  const log: AuditLog = {
    id: nextId("au"),
    actor_id: actorId,
    actor_name: actorName(actorId),
    action,
    entity,
    entity_id: entityId,
    summary,
    result,
    ...(command_id ? { command_id } : {}),
    created_at: new Date().toISOString(),
  };
  fx.auditLogs.unshift(log);
}

function appendEvent(input: NewMatchEventInput): MatchEvent {
  const priorEvents = fx.matchEvents.filter((event) => event.match_id === input.match_id);
  const event: MatchEvent = {
    id: nextId("ev"),
    match_id: input.match_id,
    command_id: commandId(input.command_id),
    sequence_no: priorEvents.reduce((max, event) => Math.max(max, event.sequence_no ?? 0), 0) + 1,
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

function projectMatch(match: Match): Match {
  const score = deriveScore(
    fx.matchEvents.filter((event) => event.match_id === match.id),
    match.home_team_id,
    match.away_team_id,
  );
  return clone({ ...match, home_score: score.home, away_score: score.away });
}

function assertVersion(match: Match, expectedVersion?: number) {
  if (expectedVersion !== undefined && (match.version ?? 0) !== expectedVersion) {
    throw new Error("Pertandingan telah berubah. Muat ulang sebelum mencoba lagi.");
  }
}

function touch(match: Match) {
  match.version = (match.version ?? 0) + 1;
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
    return fx.matches.map(projectMatch);
  },
  async getMatch(id: UUID) {
    const match = fx.matches.find((m) => m.id === id);
    return match ? projectMatch(match) : null;
  },
  async listMatchOfficials(matchId: UUID, options?: { includeHistory?: boolean }) {
    return clone(
      fx.matchOfficials.filter(
        (o) => o.match_id === matchId && (options?.includeHistory || o.active !== false),
      ),
    );
  },
  async listLineup(matchId: UUID) {
    return fx.lineups.filter((l) => l.match_id === matchId);
  },
  async listMatchEvents(matchId: UUID) {
    return clone(
      fx.matchEvents
        .filter((e) => e.match_id === matchId)
        .sort(
          (a, b) =>
            (a.sequence_no ?? 0) - (b.sequence_no ?? 0) ||
            a.created_at.localeCompare(b.created_at) ||
            a.id.localeCompare(b.id),
        ),
    );
  },
  async listStandings(categoryId: UUID): Promise<StandingRow[]> {
    const teams = fx.teams.filter((t) => t.category_id === categoryId);
    const ids = new Set(teams.map((t) => t.id));
    const matches = fx.matches
      .filter((m) => ids.has(m.home_team_id) && ids.has(m.away_team_id))
      .map(projectMatch);
    return computeStandings(teams, matches);
  },
  async listTopScorers(categoryId: UUID): Promise<TopScorerRow[]> {
    const teams = fx.teams.filter((t) => t.category_id === categoryId);
    const ids = new Set(teams.map((t) => t.id));
    const tally = new Map<string, TopScorerRow>();
    for (const ev of fx.matchEvents) {
      if (ev.type !== "GOAL" || isEventVoided(ev, fx.matchEvents) || !ev.player_id || !ev.team_id)
        continue;
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
    return clone(fx.auditLogs);
  },
  async listTeamAccounts() {
    return clone(fx.teamAccounts.map(({ credential_digest: _credential, ...account }) => account));
  },
  async getTeamAccountByUsername(username) {
    const account = fx.teamAccounts.find(
      (item) => item.username.toLowerCase() === username.trim().toLowerCase(),
    );
    return account
      ? clone({
          id: account.id,
          team_id: account.team_id,
          username: account.username,
          account_status: account.account_status,
          created_at: account.created_at,
          updated_at: account.updated_at,
          ...(account.last_login_at ? { last_login_at: account.last_login_at } : {}),
        })
      : null;
  },
  async authenticateTeam(username, password) {
    const account = fx.teamAccounts.find(
      (item) => item.username === username.trim() && item.credential_digest === `demo:${password}`,
    );
    if (!account || account.account_status !== "ACTIVE") return null;
    account.last_login_at = new Date().toISOString();
    account.updated_at = account.last_login_at;
    return clone({
      id: account.id,
      team_id: account.team_id,
      username: account.username,
      account_status: account.account_status,
      created_at: account.created_at,
      updated_at: account.updated_at,
      last_login_at: account.last_login_at,
    });
  },
  async getTeamProfile(teamId) {
    const profile = fx.teamProfiles.find((item) => item.team_id === teamId);
    if (!profile) throw new Error("Profil tim tidak ditemukan.");
    return clone(profile);
  },
  async getTeamRegistration(teamId) {
    const team = fx.teams.find((item) => item.id === teamId);
    const profile = fx.teamProfiles.find((item) => item.team_id === teamId);
    if (!team || !profile) throw new Error("Tim tidak ditemukan.");
    return registrationSummary(
      team,
      profile,
      fx.players.filter((item) => item.team_id === teamId),
      fx.teamOfficials.filter((item) => item.team_id === teamId),
      fx.registrationDocuments,
    );
  },
  async listRegistrationDocuments(entityType, entityId) {
    return clone(
      fx.registrationDocuments.filter(
        (item) =>
          (!entityType || item.entity_type === entityType) &&
          (!entityId || item.entity_id === entityId),
      ),
    );
  },
  async listVerificationHistory(entityType, entityId) {
    return clone(
      fx.verificationHistory.filter(
        (item) => item.entity_type === entityType && item.entity_id === entityId,
      ),
    );
  },

  /* ------------------------------- Mutations ------------------------------ */
  async recordMatchEvent(input: NewMatchEventInput) {
    const match = requireMatch(input.match_id);
    const id = commandId(input.command_id);
    const replay = fx.matchEvents.find(
      (event) => event.match_id === input.match_id && event.command_id === id,
    );
    if (replay) {
      audit(
        input.operator_id ?? "system",
        "MATCH_EVENT_CREATE",
        "match_events",
        replay.id,
        "Mengulang command event yang sudah diterima",
        id,
        "REPLAYED",
      );
      return clone(replay);
    }
    assertVersion(match, input.expected_version);
    const error = validateMatchEvent(
      { ...input, command_id: id },
      {
        status: match.status,
        homeTeamId: match.home_team_id,
        awayTeamId: match.away_team_id,
        playersOfTeam: (teamId) =>
          fx.lineups
            .filter((entry) => entry.match_id === match.id && entry.team_id === teamId)
            .map((entry) => entry.player_id),
        playerEligible: (playerId) =>
          fx.players.some((player) => player.id === playerId && player.status === "ELIGIBLE"),
        existingEvents: fx.matchEvents.filter((event) => event.match_id === match.id),
      },
    );
    if (error) throw new Error(error);
    const event = appendEvent({ ...input, command_id: id });
    resyncScore(match);
    touch(match);
    audit(
      input.operator_id ?? "system",
      "MATCH_EVENT_CREATE",
      "match_events",
      match.id,
      `Mencatat ${input.type} pada pertandingan #${match.match_number}`,
      id,
    );
    return clone(event);
  },

  async transitionMatchStatus({
    match_id,
    to,
    operator_id,
    command_id,
    expected_version,
  }: {
    match_id: UUID;
    to: MatchStatus;
    operator_id?: UUID;
    command_id?: UUID;
    expected_version?: number;
  }) {
    const match = requireMatch(match_id);
    const id = commandId(command_id);
    const previous = commandResults.get(id);
    if (previous && !Array.isArray(previous)) return clone(previous);
    assertVersion(match, expected_version);
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
        command_id: `${id}-period`,
        type,
        period: match.period,
        timestamp: match.clock_seconds,
        operator_id: operator_id ?? "system",
      });
      if (to === "LIVE" && from === "READY") {
        appendEvent({
          match_id,
          command_id: `${id}-start`,
          type: "MATCH_START",
          period: match.period,
          timestamp: 0,
          operator_id: operator_id ?? "system",
        });
      }
    }
    resyncScore(match);
    touch(match);
    audit(
      operator_id ?? "system",
      "MATCH_STATUS_CHANGE",
      "matches",
      match.id,
      `Mengubah status ${from} menjadi ${to}`,
      id,
    );
    const result = clone(match);
    commandResults.set(id, result);
    return result;
  },

  async updateMatchClock({
    match_id,
    clock_seconds,
    operator_id,
    command_id,
    expected_version,
  }: {
    match_id: UUID;
    clock_seconds: number;
    operator_id?: UUID;
    command_id?: UUID;
    expected_version?: number;
  }) {
    const match = requireMatch(match_id);
    const id = commandId(command_id);
    const previous = commandResults.get(id);
    if (previous && !Array.isArray(previous)) return clone(previous);
    assertVersion(match, expected_version);
    if (!Number.isFinite(clock_seconds) || clock_seconds < 0 || clock_seconds > 1200)
      throw new Error("Jam pertandingan tidak valid.");
    if (match.status !== "LIVE" && match.status !== "HALFTIME")
      throw new Error("Jam hanya dapat diubah saat pertandingan aktif.");
    match.clock_seconds = Math.max(0, Math.round(clock_seconds));
    touch(match);
    audit(
      operator_id ?? "system",
      "MATCH_CLOCK_UPDATE",
      "matches",
      match.id,
      `Memperbarui jam pertandingan menjadi ${match.clock_seconds}`,
      id,
    );
    const result = clone(match);
    commandResults.set(id, result);
    return result;
  },

  async updateMatchSchedule({
    match_id,
    operator_id,
    command_id,
    expected_version,
    kickoff_at,
    venue_id,
    court,
  }: {
    match_id: UUID;
    operator_id?: UUID;
    command_id?: UUID;
    expected_version?: number;
    kickoff_at?: string;
    venue_id?: UUID;
    court?: number;
  }) {
    const match = requireMatch(match_id);
    const id = commandId(command_id);
    const previous = commandResults.get(id);
    if (previous && !Array.isArray(previous)) return clone(previous);
    assertVersion(match, expected_version);
    if (kickoff_at && Number.isNaN(Date.parse(kickoff_at)))
      throw new Error("Waktu kick-off tidak valid.");
    if (venue_id) {
      const venue = fx.venues.find((item) => item.id === venue_id);
      if (!venue || !venue.is_active) throw new Error("Venue tidak aktif atau tidak ditemukan.");
      if (court === undefined || court < 1 || court > venue.court_count)
        throw new Error("Lapangan tidak valid untuk venue ini.");
    }
    const nextKickoff = kickoff_at ?? match.kickoff_at;
    const nextVenue = venue_id ?? match.venue_id;
    const nextCourt = court ?? match.court;
    if (
      fx.matches.some(
        (item) =>
          item.id !== match.id &&
          item.kickoff_at === nextKickoff &&
          item.venue_id === nextVenue &&
          item.court === nextCourt,
      )
    ) {
      throw new Error("Jadwal bentrok dengan pertandingan lain.");
    }
    if (kickoff_at) match.kickoff_at = kickoff_at;
    if (venue_id) match.venue_id = venue_id;
    if (typeof court === "number") match.court = court;
    touch(match);
    audit(
      operator_id ?? "system",
      "SCHEDULE_UPDATE",
      "matches",
      match.id,
      `Memperbarui jadwal pertandingan #${match.match_number}`,
      id,
    );
    const result = clone(match);
    commandResults.set(id, result);
    return result;
  },

  async assignMatchOfficial({
    match_id,
    role,
    user_id,
    operator_id,
    command_id,
    expected_version,
  }: {
    match_id: UUID;
    role: MatchOfficialRole;
    user_id: UUID;
    operator_id?: UUID;
    command_id?: UUID;
    expected_version?: number;
  }) {
    const match = requireMatch(match_id);
    const id = commandId(command_id);
    const previous = commandResults.get(id);
    if (previous && Array.isArray(previous)) return clone(previous);
    assertVersion(match, expected_version);
    const user = fx.users.find((u) => u.id === user_id);
    if (!user) throw new Error("Petugas tidak ditemukan.");
    const eligible: Record<MatchOfficialRole, string[]> = {
      COMMISSIONER: ["MATCH_COMMISSIONER"],
      REFEREE_1: ["REFEREE"],
      REFEREE_2: ["REFEREE"],
      THIRD_REFEREE: ["REFEREE"],
      TIMEKEEPER: ["TIMEKEEPER"],
      SCOREKEEPER: ["SCOREKEEPER"],
    };
    if (!eligible[role].includes(user.role))
      throw new Error("Petugas tidak memenuhi syarat untuk peran ini.");
    const duplicate = fx.matchOfficials.find(
      (o) =>
        o.match_id === match_id && o.active !== false && o.user_id === user_id && o.role !== role,
    );
    if (duplicate) throw new Error("Petugas sudah bertugas pada peran lain di pertandingan ini.");

    const existing = fx.matchOfficials.find(
      (o) => o.match_id === match_id && o.role === role && o.active !== false,
    );
    if (existing) {
      if (existing.user_id === user_id) {
        const result = clone(
          fx.matchOfficials.filter((o) => o.match_id === match_id && o.active !== false),
        );
        commandResults.set(id, result);
        return result;
      }
      existing.active = false;
      existing.effective_to = new Date().toISOString();
      fx.matchOfficials.push({
        id: nextId("mo"),
        match_id,
        user_id,
        full_name: user.full_name,
        role,
        active: true,
        effective_from: new Date().toISOString(),
      });
    } else {
      const assignment: MatchOfficial = {
        id: nextId("mo"),
        match_id,
        user_id,
        full_name: user.full_name,
        role,
        active: true,
        effective_from: new Date().toISOString(),
      };
      fx.matchOfficials.push(assignment);
    }
    touch(match);
    audit(
      operator_id ?? "system",
      "MATCH_OFFICIAL_ASSIGN",
      "match_officials",
      match_id,
      `Menugaskan ${user.full_name} sebagai ${role} pada pertandingan #${match.match_number}`,
      id,
    );
    const result = clone(
      fx.matchOfficials.filter((o) => o.match_id === match_id && o.active !== false),
    );
    commandResults.set(id, result);
    return result;
  },

  async createTeamAccount({ team_id, username, password, operator_id }) {
    if (!fx.teams.some((team) => team.id === team_id)) throw new Error("Tim tidak ditemukan.");
    if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)) throw new Error("Username tidak valid.");
    if (fx.teamAccounts.some((account) => account.username === username))
      throw new Error("Username sudah digunakan.");
    if (fx.teamAccounts.some((account) => account.team_id === team_id))
      throw new Error("Tim sudah memiliki akun.");
    const now = new Date().toISOString();
    const account = {
      id: nextId("ta"),
      team_id,
      username,
      account_status: "ACTIVE" as const,
      credential_digest: `demo:${password}`,
      created_at: now,
      updated_at: now,
    };
    fx.teamAccounts.push(account);
    audit(
      operator_id ?? "system",
      "TEAM_ACCOUNT_CREATED",
      "team_accounts",
      account.id,
      `Membuat akun ${username} untuk tim`,
      undefined,
    );
    const { credential_digest: _credential, ...safe } = account;
    return clone(safe);
  },
  async createTeam({ operator_id: _operatorId, ...input }) {
    if (
      fx.teams.some(
        (team) =>
          team.name.toLowerCase() === input.name.toLowerCase() ||
          team.short_name.toLowerCase() === input.short_name.toLowerCase(),
      )
    )
      throw new Error("Nama atau singkatan tim sudah digunakan.");
    const team: Team = { ...input, id: nextId("tm"), status: "REGISTERED" };
    fx.teams.push(team);
    fx.teamProfiles.push({
      team_id: team.id,
      contact_person: "",
      contact_phone: "",
      contact_email: "",
      address: "",
      registration_status: "DRAFT",
      updated_at: new Date().toISOString(),
    });
    audit(_operatorId ?? "system", "TEAM_CREATED", "teams", team.id, `Membuat tim ${team.name}`);
    return clone(team);
  },
  async updateTeamAccountStatus({ team_id, status, operator_id }) {
    const account = fx.teamAccounts.find((item) => item.team_id === team_id);
    if (!account) throw new Error("Akun tim tidak ditemukan.");
    account.account_status = status;
    account.updated_at = new Date().toISOString();
    audit(
      operator_id ?? "system",
      `TEAM_ACCOUNT_${status}`,
      "team_accounts",
      account.id,
      `Mengubah status akun menjadi ${status}`,
    );
    const { credential_digest: _credential, ...safe } = account;
    return clone(safe);
  },
  async resetTeamCredential({ team_id, password, operator_id }) {
    const account = fx.teamAccounts.find((item) => item.team_id === team_id);
    if (!account || password.length < 8) throw new Error("Kredensial tidak valid.");
    account.credential_digest = `demo:${password}`;
    account.updated_at = new Date().toISOString();
    audit(
      operator_id ?? "system",
      "TEAM_ACCOUNT_CREDENTIAL_RESET",
      "team_accounts",
      account.id,
      "Mereset kredensial akun tim",
    );
    const { credential_digest: _credential, ...safe } = account;
    return clone(safe);
  },
  async updateTeamProfile({ team_id, profile, operator_id }) {
    const current = fx.teamProfiles.find((item) => item.team_id === team_id);
    if (!current) throw new Error("Profil tim tidak ditemukan.");
    if (isRegistrationLocked(current.registration_status))
      throw new Error("Profil yang disetujui tidak dapat diubah langsung.");
    const { registration_status: _status, ...editableProfile } = profile;
    Object.assign(current, editableProfile, { updated_at: new Date().toISOString() });
    audit(
      operator_id ?? "system",
      "TEAM_UPDATED",
      "team_profiles",
      team_id,
      "Memperbarui profil tim",
    );
    return clone(current);
  },
  async createPlayer({ operator_id: _operatorId, ...input }) {
    const team = fx.teams.find((item) => item.id === input.team_id);
    if (!team) throw new Error("Tim tidak ditemukan.");
    const profile = fx.teamProfiles.find((item) => item.team_id === input.team_id);
    if (profile && isRegistrationLocked(profile.registration_status))
      throw new Error("Registrasi tim sudah terkunci.");
    if (
      fx.players.some(
        (player) =>
          player.team_id === input.team_id && player.jersey_number === input.jersey_number,
      )
    )
      throw new Error("Nomor punggung sudah digunakan.");
    const player: Player = { ...input, id: nextId("pl"), status: "PENDING", nik_verified: false };
    fx.players.push(player);
    audit(
      _operatorId ?? "system",
      "PLAYER_CREATED",
      "players",
      player.id,
      `Menambahkan pemain ${player.full_name}`,
    );
    return clone(player);
  },
  async updatePlayer({ id, changes, operator_id }) {
    const player = fx.players.find((item) => item.id === id);
    if (!player) throw new Error("Pemain tidak ditemukan.");
    const profile = fx.teamProfiles.find((item) => item.team_id === player.team_id);
    if (profile && isRegistrationLocked(profile.registration_status))
      throw new Error("Pemain yang disetujui tidak dapat diubah langsung.");
    Object.assign(player, changes);
    audit(
      operator_id ?? "system",
      "PLAYER_UPDATED",
      "players",
      id,
      `Memperbarui pemain ${player.full_name}`,
    );
    return clone(player);
  },
  async createTeamOfficial({ operator_id: _operatorId, ...input }) {
    if (!fx.teams.some((team) => team.id === input.team_id))
      throw new Error("Tim tidak ditemukan.");
    const official: TeamOfficial = { ...input, id: nextId("of") };
    fx.teamOfficials.push(official);
    audit(
      _operatorId ?? "system",
      "OFFICIAL_CREATED",
      "team_officials",
      official.id,
      `Menambahkan ofisial ${official.full_name}`,
    );
    return clone(official);
  },
  async updateTeamOfficial({ id, changes, operator_id }) {
    const official = fx.teamOfficials.find((item) => item.id === id);
    if (!official) throw new Error("Ofisial tidak ditemukan.");
    const profile = fx.teamProfiles.find((item) => item.team_id === official.team_id);
    if (profile && isRegistrationLocked(profile.registration_status))
      throw new Error("Ofisial yang disetujui tidak dapat diubah langsung.");
    Object.assign(official, changes);
    audit(
      operator_id ?? "system",
      "OFFICIAL_UPDATED",
      "team_officials",
      id,
      `Memperbarui ofisial ${official.full_name}`,
    );
    return clone(official);
  },
  async submitRegistration({ entityType, entityId, operator_id }) {
    const profile =
      entityType === "TEAM" ? fx.teamProfiles.find((item) => item.team_id === entityId) : undefined;
    if (!profile) throw new Error("Registrasi tidak ditemukan.");
    const summary = await this.getTeamRegistration(entityId);
    if (!summary.is_ready) throw new Error("Registrasi belum memenuhi persyaratan.");
    if (!canTransitionRegistration(profile.registration_status, "SUBMITTED"))
      throw new Error("Transisi registrasi tidak diizinkan.");
    const previous = profile.registration_status;
    profile.registration_status = "SUBMITTED";
    profile.updated_at = new Date().toISOString();
    audit(
      operator_id ?? "system",
      "TEAM_SUBMITTED",
      "team_profiles",
      entityId,
      `Mengirim registrasi dari ${previous}`,
    );
  },
  async uploadRegistrationDocument({ entityType, entityId, type, file_name, operator_id }) {
    const existing = fx.registrationDocuments.find(
      (item) =>
        item.entity_type === entityType && item.entity_id === entityId && item.type === type,
    );
    const now = new Date().toISOString();
    const document = existing ?? {
      id: nextId("doc"),
      entity_type: entityType,
      entity_id: entityId,
      type,
      file_name,
      storage_ref: `demo-private/${entityId}/${type.toLowerCase()}`,
      status: "UPLOADED" as const,
      uploaded_at: now,
    };
    if (existing)
      Object.assign(existing, {
        file_name,
        status: "UPLOADED" as const,
        uploaded_at: now,
        revision_reason: undefined,
      });
    else fx.registrationDocuments.push(document);
    audit(
      operator_id ?? "system",
      existing ? "DOCUMENT_REPLACED" : "DOCUMENT_UPLOADED",
      "registration_documents",
      document.id,
      `Mengunggah dokumen ${type}`,
    );
    return clone(document);
  },
  async reviewRegistration({ entityType, entityId, action, reason, operator_id }) {
    const documents = fx.registrationDocuments.filter(
      (item) => item.entity_type === entityType && item.entity_id === entityId,
    );
    if (action !== "APPROVED" && (!reason || reason.trim().length < 3))
      throw new Error("Alasan wajib diisi.");
    if (action === "APPROVED" && !documents.length)
      throw new Error("Dokumen wajib tersedia sebelum persetujuan.");
    for (const document of documents)
      document.status =
        action === "APPROVED"
          ? "APPROVED"
          : action === "REVISION_REQUESTED"
            ? "REVISION_REQUIRED"
            : "REJECTED";
    const player =
      entityType === "PLAYER" ? fx.players.find((item) => item.id === entityId) : undefined;
    if (player && action === "APPROVED") {
      player.status = "ELIGIBLE";
      player.nik_verified = true;
    }
    const current = player?.status ?? "PENDING";
    const next =
      action === "APPROVED"
        ? "APPROVED"
        : action === "REVISION_REQUESTED"
          ? "REVISION_REQUIRED"
          : "REJECTED";
    fx.verificationHistory.push({
      id: nextId("vh"),
      entity_type: entityType,
      entity_id: entityId,
      actor_id: operator_id ?? "system",
      action,
      previous_status: current,
      new_status: next,
      ...(reason ? { reason } : {}),
      created_at: new Date().toISOString(),
    });
    audit(
      operator_id ?? "system",
      `${entityType}_${action}`,
      entityType.toLowerCase(),
      entityId,
      reason ?? `Memproses ${action}`,
    );
  },
};
