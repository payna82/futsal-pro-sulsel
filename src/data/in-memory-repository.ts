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
import { can } from "@/domain/permissions";
import {
  canTransitionRegistration,
  canTransitionParticipantRegistration,
  DOCUMENT_TYPES,
  isDocumentApproved,
  isRegistrationLocked,
  registrationSummary,
  SELF_REQUESTABLE_ROLES,
} from "@/domain/registration";
import type {
  DocumentStatus,
  RegistrationEntityType,
  RoleRequest,
  TeamProfile,
  VerificationAction,
  ActorContext,
} from "@/domain/registration";
import type {
  AuditLog,
  Match,
  MatchEvent,
  MatchOfficial,
  MatchOfficialRole,
  Player,
  MatchStatus,
  RoleKey,
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

function assertTeamAccess(
  actor: ActorContext | undefined,
  teamId: UUID,
  permission: Parameters<typeof can>[1],
) {
  assertActor(actor);
  if (
    !actor.permissions.includes(permission) ||
    (actor.teamId !== undefined && actor.teamId !== teamId)
  ) {
    throw new Error("Akses tim ditolak.");
  }
}

function assertActor(actor: ActorContext | undefined): asserts actor is ActorContext {
  if (!actor) throw new Error("ActorContext diperlukan.");
}

function assertRead(actor: ActorContext, permission: Parameters<typeof can>[1]) {
  assertActor(actor);
  if (!actor.permissions.includes(permission)) throw new Error("Akses data ditolak.");
}

function assertAdmin(actor: ActorContext, permission: Parameters<typeof can>[1]) {
  assertActor(actor);
  if (actor.teamId !== undefined) throw new Error("Akses verifikasi ditolak.");
  if (!actor.permissions.includes(permission)) throw new Error("Akses admin ditolak.");
}

function scopeTeam<T extends { team_id: UUID }>(
  rows: T[],
  actor: ActorContext,
  permission: Parameters<typeof can>[1],
) {
  assertRead(actor, permission);
  return actor.teamId ? rows.filter((row) => row.team_id === actor.teamId) : rows;
}

function teamIdForEntity(entityType: RegistrationEntityType, entityId: UUID): UUID {
  if (entityType === "TEAM") return entityId;
  if (entityType === "PLAYER")
    return fx.players.find((item) => item.id === entityId)?.team_id ?? "";
  return fx.teamOfficials.find((item) => item.id === entityId)?.team_id ?? "";
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
  async listPlayers(actor) {
    return clone(scopeTeam(fx.players, actor, "player.read"));
  },
  async getPlayer(id, actor) {
    const player = fx.players.find((item) => item.id === id);
    if (!player) throw new Error("Pemain tidak ditemukan.");
    assertTeamAccess(actor, player.team_id, "player.read");
    return clone(player);
  },
  async listTeamOfficials(actor) {
    return clone(scopeTeam(fx.teamOfficials, actor, "official.read"));
  },
  async getTeamOfficial(id, actor) {
    const official = fx.teamOfficials.find((item) => item.id === id);
    if (!official) throw new Error("Ofisial tidak ditemukan.");
    assertTeamAccess(actor, official.team_id, "official.read");
    return clone(official);
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
  async listTeamAccounts(actor) {
    assertRead(actor, "team.read");
    const accounts = actor.teamId
      ? fx.teamAccounts.filter((account) => account.team_id === actor.teamId)
      : fx.teamAccounts;
    return clone(accounts.map(({ credential_digest: _credential, ...account }) => account));
  },
  async getTeamAccount(teamId, actor) {
    assertTeamAccess(actor, teamId, "team.read");
    const account = fx.teamAccounts.find((item) => item.team_id === teamId);
    if (!account) throw new Error("Akun tim tidak ditemukan.");
    const { credential_digest: _credential, ...safe } = account;
    return clone(safe);
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
  async getTeamProfile(teamId, actor) {
    assertTeamAccess(actor, teamId, "team.profile.read");
    const profile = fx.teamProfiles.find((item) => item.team_id === teamId);
    if (!profile) throw new Error("Profil tim tidak ditemukan.");
    return clone(profile);
  },
  async getTeamRegistration(teamId, actor) {
    assertTeamAccess(actor, teamId, "team.view_own");
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
  async listRegistrationDocuments(actor, entityType, entityId) {
    assertRead(actor, "player.read");
    const documents = fx.registrationDocuments.filter(
      (item) =>
        (!entityType || item.entity_type === entityType) &&
        (!entityId || item.entity_id === entityId),
    );
    const scoped = actor.teamId
      ? documents.filter(
          (document) => teamIdForEntity(document.entity_type, document.entity_id) === actor.teamId,
        )
      : documents;
    return clone(scoped);
  },
  async getRegistrationDocument(id, actor) {
    const document = fx.registrationDocuments.find((item) => item.id === id);
    if (!document) throw new Error("Dokumen tidak ditemukan.");
    assertTeamAccess(
      actor,
      teamIdForEntity(document.entity_type, document.entity_id),
      "team.view_own",
    );
    return clone(document);
  },
  async listVerificationHistory(entityType, entityId, actor) {
    assertTeamAccess(actor, teamIdForEntity(entityType, entityId), "team.view_own");
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

  async createTeamAccount({ team_id, username, password, operator_id, actor }) {
    assertAdmin(actor, "team.account.create");
    if (!fx.teams.some((team) => team.id === team_id)) throw new Error("Tim tidak ditemukan.");
    if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)) throw new Error("Username tidak valid.");
    if (fx.teamAccounts.some((account) => account.team_id === team_id))
      throw new Error("Tim sudah memiliki akun.");
    if (fx.teamAccounts.some((account) => account.username === username))
      throw new Error("Username sudah digunakan.");
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
  async createTeam({ operator_id: _operatorId, actor, ...input }) {
    assertAdmin(actor, "team.create");
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
  async updateTeamAccountStatus({ team_id, status, operator_id, actor }) {
    assertAdmin(actor, "team.account.manage");
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
  async resetTeamCredential({ team_id, password, operator_id, actor }) {
    assertAdmin(actor, "team.account.manage");
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
  async updateTeamProfile({ team_id, profile, operator_id, actor }) {
    assertTeamAccess(actor, team_id, "team.profile.update");
    const current = fx.teamProfiles.find((item) => item.team_id === team_id);
    if (!current) throw new Error("Profil tim tidak ditemukan.");
    if (isRegistrationLocked(current.registration_status))
      throw new Error("Profil yang disetujui tidak dapat diubah langsung.");
    const { registration_status: _status, ...editableProfile } = profile;
    Object.assign(current, editableProfile, { updated_at: new Date().toISOString() });
    // Auto-transition to READY_FOR_SUBMISSION if all contact fields are present
    if (
      current.registration_status === "DRAFT" &&
      current.contact_person &&
      current.contact_phone &&
      current.contact_email &&
      current.address
    ) {
      current.registration_status = "READY_FOR_SUBMISSION";
    }
    audit(
      operator_id ?? "system",
      "TEAM_UPDATED",
      "team_profiles",
      team_id,
      "Memperbarui profil tim",
    );
    return clone(current);
  },
  async createPlayer({ operator_id: _operatorId, actor, ...input }) {
    assertTeamAccess(actor, input.team_id, "player.create");
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
    const player: Player = {
      ...input,
      id: nextId("pl"),
      status: "PENDING",
      registration_status: "DRAFT",
      nik_verified: false,
    };
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
  async updatePlayer({ id, changes, operator_id, actor }) {
    const player = fx.players.find((item) => item.id === id);
    if (!player) throw new Error("Pemain tidak ditemukan.");
    assertTeamAccess(actor, player.team_id, "player.update");
    if (player.status === "ELIGIBLE")
      throw new Error("Pemain yang disetujui tidak dapat diubah langsung.");
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
  async createTeamOfficial({ operator_id: _operatorId, actor, ...input }) {
    assertTeamAccess(actor, input.team_id, "official.create");
    if (!fx.teams.some((team) => team.id === input.team_id))
      throw new Error("Tim tidak ditemukan.");
    const official: TeamOfficial = { ...input, id: nextId("of"), registration_status: "DRAFT" };
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
  async updateTeamOfficial({ id, changes, operator_id, actor }) {
    const official = fx.teamOfficials.find((item) => item.id === id);
    if (!official) throw new Error("Ofisial tidak ditemukan.");
    assertTeamAccess(actor, official.team_id, "official.update");
    if (official.registration_status === "APPROVED")
      throw new Error("Ofisial yang disetujui tidak dapat diubah langsung.");
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
  async submitRegistration({ entityType, entityId, operator_id, actor }) {
    assertTeamAccess(actor, teamIdForEntity(entityType, entityId), "submission.submit");
    if (entityType !== "TEAM") {
      const participant =
        entityType === "PLAYER"
          ? fx.players.find((item) => item.id === entityId)
          : fx.teamOfficials.find((item) => item.id === entityId);
      if (!participant) throw new Error("Data registrasi tidak ditemukan.");
      const current = participant.registration_status ?? "DRAFT";
      if (!canTransitionParticipantRegistration(current, "SUBMITTED"))
        throw new Error("Transisi registrasi tidak diizinkan.");
      participant.registration_status = "SUBMITTED";
      audit(
        operator_id ?? "system",
        entityType === "PLAYER" ? "PLAYER_SUBMITTED" : "OFFICIAL_SUBMITTED",
        entityType.toLowerCase(),
        entityId,
        `Mengirim registrasi ${entityType.toLowerCase()}`,
      );
      return;
    }
    const profile =
      entityType === "TEAM" ? fx.teamProfiles.find((item) => item.team_id === entityId) : undefined;
    if (!profile) throw new Error("Registrasi tidak ditemukan.");
    const summary = await this.getTeamRegistration(entityId, actor);
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
  async uploadRegistrationDocument({ entityType, entityId, type, file_name, operator_id, actor }) {
    assertTeamAccess(actor, teamIdForEntity(entityType, entityId), "document.upload");
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
  async reviewRegistration({ entityType, entityId, action, reason, operator_id, actor }) {
    assertAdmin(actor, "document.review");
    const documents = fx.registrationDocuments.filter(
      (item) => item.entity_type === entityType && item.entity_id === entityId,
    );
    if (action !== "APPROVED" && (!reason || reason.trim().length < 3))
      throw new Error("Alasan wajib diisi.");
    const requiredDocumentsComplete = DOCUMENT_TYPES.every((required) =>
      documents.some(
        (document) =>
          document.type === required.key &&
          document.status !== "MISSING" &&
          document.status !== "REJECTED",
      ),
    );
    if (action === "APPROVED" && !requiredDocumentsComplete)
      throw new Error("Semua dokumen wajib harus disetujui sebelum persetujuan.");
    const player =
      entityType === "PLAYER" ? fx.players.find((item) => item.id === entityId) : undefined;
    const previous = player?.status ?? documents[0]?.status ?? "MISSING";
    const participant =
      entityType === "OFFICIAL" ? fx.teamOfficials.find((item) => item.id === entityId) : player;
    if (
      participant &&
      !["SUBMITTED", "UNDER_REVIEW", "REVISION_REQUIRED"].includes(
        participant.registration_status ?? "DRAFT",
      )
    )
      throw new Error("Data belum berada pada status pemeriksaan.");
    if (participant && action === "APPROVED") participant.registration_status = "APPROVED";
    if (participant && action === "REVISION_REQUESTED")
      participant.registration_status = "REVISION_REQUIRED";
    if (participant && action === "REJECTED") participant.registration_status = "REJECTED";
    for (const document of documents) {
      document.reviewer_id = actor.userId;
      document.reviewed_at = new Date().toISOString();
    }
    for (const document of documents)
      document.status =
        action === "APPROVED"
          ? "APPROVED"
          : action === "REVISION_REQUESTED"
            ? "REVISION_REQUIRED"
            : "REJECTED";
    if (player && action === "APPROVED") {
      player.status = "ELIGIBLE";
      player.nik_verified = true;
    }
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
      previous_status: previous,
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

  /* -------------------------- Role Requests (RBAC) ------------------------- */
  async listRoleRequests(actor: ActorContext) {
    assertAdmin(actor, "role.manage");
    return clone(fx.roleRequests);
  },
  async listMyRoleRequests(actor: ActorContext) {
    assertActor(actor);
    return clone(fx.roleRequests.filter((r) => r.user_id === actor.userId));
  },
  async createRoleRequest({
    requested_role,
    request_reason,
    supporting_docs,
    contingent_id,
    venue_id,
    team_id,
    actor,
  }) {
    assertActor(actor);
    if (!SELF_REQUESTABLE_ROLES.includes(requested_role as (typeof SELF_REQUESTABLE_ROLES)[number])) {
      throw new Error("Peran ini tidak dapat diajukan secara mandiri.");
    }
    if (!request_reason.trim() || request_reason.trim().length < 10) {
      throw new Error("Alasan pengajuan terlalu singkat (minimal 10 karakter).");
    }
    const existingPending = fx.roleRequests.find(
      (r) =>
        r.user_id === actor.userId &&
        r.requested_role === requested_role &&
        r.status === "PENDING",
    );
    if (existingPending) throw new Error("Anda masih memiliki pengajuan menunggu untuk peran ini.");
    const now = new Date().toISOString();
    const req: RoleRequest = {
      id: nextId("rr"),
      user_id: actor.userId,
      requested_role,
      request_reason,
      supporting_docs: supporting_docs ?? [],
      status: "PENDING",
      ...(contingent_id ? { contingent_id } : {}),
      ...(venue_id ? { venue_id } : {}),
      ...(team_id ? { team_id } : {}),
      created_at: now,
      updated_at: now,
    };
    fx.roleRequests.push(req);
    audit(actor.userId, "ROLE_REQUESTED", "role_requests", req.id, request_reason);
    return clone(req);
  },
  async cancelRoleRequest({ id, actor }) {
    assertActor(actor);
    const req = fx.roleRequests.find((r) => r.id === id);
    if (!req) throw new Error("Permintaan peran tidak ditemukan.");
    if (req.user_id !== actor.userId) throw new Error("Anda tidak memiliki izin ini.");
    if (req.status !== "PENDING")
      throw new Error("Hanya permintaan yang masih menunggu yang dapat dibatalkan.");
    req.status = "CANCELLED";
    req.updated_at = new Date().toISOString();
    audit(actor.userId, "ROLE_CANCELLED", "role_requests", req.id, "Dibatalkan pemohon.");
    return clone(req);
  },
  async approveRoleRequest({
    id,
    decision_note,
    contingent_id,
    venue_id,
    team_id,
    actor,
  }) {
    assertAdmin(actor, "role.manage");
    const req = fx.roleRequests.find((r) => r.id === id);
    if (!req) throw new Error("Permintaan peran tidak ditemukan.");
    if (req.status !== "PENDING") throw new Error("Permintaan ini sudah diproses.");
    const user = fx.users.find((u) => u.id === req.user_id);
    if (user && user.role !== req.requested_role) {
      user.role = req.requested_role as RoleKey;
      if (contingent_id) user.contingent_id = contingent_id;
      if (venue_id) user.venue_id = venue_id;
    }
    req.status = "APPROVED";
    req.reviewer_id = actor.userId;
    req.reviewed_at = new Date().toISOString();
    if (decision_note) req.decision_note = decision_note;
    if (contingent_id) req.contingent_id = contingent_id;
    if (venue_id) req.venue_id = venue_id;
    if (team_id) req.team_id = team_id;
    req.updated_at = req.reviewed_at;
    audit(
      actor.userId,
      "ROLE_ASSIGNED",
      "role_requests",
      req.id,
      `${req.requested_role} → ${user?.full_name ?? req.user_id}`,
    );
    return clone(req);
  },
  async rejectRoleRequest({ id, decision_note, actor }) {
    assertAdmin(actor, "role.manage");
    const req = fx.roleRequests.find((r) => r.id === id);
    if (!req) throw new Error("Permintaan peran tidak ditemukan.");
    if (req.status !== "PENDING") throw new Error("Permintaan ini sudah diproses.");
    if (!decision_note.trim() || decision_note.trim().length < 6)
      throw new Error("Catatan penolakan terlalu singkat.");
    req.status = "REJECTED";
    req.reviewer_id = actor.userId;
    req.reviewed_at = new Date().toISOString();
    req.decision_note = decision_note;
    req.updated_at = req.reviewed_at;
    audit(actor.userId, "ROLE_REJECTED", "role_requests", req.id, decision_note);
    return clone(req);
  },
  async revokeUserRole({ user_id, role, reason, actor }) {
    assertAdmin(actor, "role.manage");
    if (role === "PUBLIC") throw new Error("Peran PUBLIC tidak dapat dicabut.");
    const user = fx.users.find((u) => u.id === user_id);
    if (!user) throw new Error("Pengguna tidak ditemukan.");
    if (user.role !== role) return false;
    user.role = "PUBLIC";
    const related = fx.roleRequests.find(
      (r) => r.user_id === user_id && r.requested_role === role && r.status === "APPROVED",
    );
    if (related) {
      related.status = "REVOKED";
      related.reviewer_id = actor.userId;
      related.reviewed_at = new Date().toISOString();
      if (reason) related.decision_note = reason;
      related.updated_at = related.reviewed_at;
    }
    audit(actor.userId, "ROLE_REVOKED", "user_roles", user_id, reason ?? "Dicabut administrator.");
    return true;
  },
  async assignUserRole({ user_id, role, contingent_id, venue_id, team_id, actor }) {
    assertAdmin(actor, "role.manage");
    const user = fx.users.find((u) => u.id === user_id);
    if (!user) throw new Error("Pengguna tidak ditemukan.");
    user.role = role;
    if (contingent_id) user.contingent_id = contingent_id;
    if (venue_id) user.venue_id = venue_id;
    const now = new Date().toISOString();
    const existing = fx.roleRequests.find(
      (r) => r.user_id === user_id && r.requested_role === role,
    );
    if (existing) {
      if (existing.status === "PENDING") {
        existing.status = "APPROVED";
        existing.reviewer_id = actor.userId;
        existing.reviewed_at = now;
        existing.updated_at = now;
      }
    } else {
      fx.roleRequests.push({
        id: nextId("rr"),
        user_id,
        requested_role: role,
        request_reason: `Ditetapkan langsung oleh ${actorName(actor.userId)}.`,
        supporting_docs: [],
        status: "APPROVED",
        reviewer_id: actor.userId,
        reviewed_at: now,
        ...(contingent_id ? { contingent_id } : {}),
        ...(venue_id ? { venue_id } : {}),
        ...(team_id ? { team_id } : {}),
        created_at: now,
        updated_at: now,
      });
    }
    audit(actor.userId, "ROLE_ASSIGNED", "user_roles", user_id, role);
    return true;
  },
};
