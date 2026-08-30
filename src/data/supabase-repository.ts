import { supabase } from "@/integrations/supabase/client";
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
import type {
  AuditLog,
  Category,
  Contingent,
  Group,
  Match,
  MatchEvent,
  MatchLineupEntry,
  MatchOfficial,
  MatchOfficialRole,
  MatchStatus,
  Player,
  RoleKey,
  StandingRow,
  Team,
  TeamOfficial,
  TopScorerRow,
  Tournament,
  User,
  UUID,
  Venue,
} from "@/domain/types";
import {
  SELF_REQUESTABLE_ROLES,
  type ActorContext,
  type RoleRequest,
  type SupportingDoc,
} from "@/domain/registration";
import { inMemoryRepository } from "./in-memory-repository";
import type { CompetitionRepository } from "./repository";

/**
 * Adapter Lovable Cloud (PostgreSQL). Mengimplementasikan kontrak
 * CompetitionRepository yang sama dengan adapter in-memory, sehingga komponen,
 * hook query, dan domain tidak berubah sama sekali.
 *
 * Otorisasi sebenarnya ditegakkan oleh RLS di database; pengecekan di klien
 * hanya lapisan UX.
 */

type Row = Record<string, unknown>;

interface QueryResult {
  data: Row[] | Row | null;
  error: { message: string } | null;
}

/**
 * Pembungkus longgar untuk klien database. Tabel kompetisi memakai kunci
 * bertipe text yang sudah divalidasi oleh domain, sehingga pemetaan baris
 * dilakukan eksplisit lewat fungsi `to*` di bawah.
 */
interface TableQuery extends PromiseLike<QueryResult> {
  select(columns?: string): TableQuery;
  insert(values: unknown): TableQuery;
  update(values: unknown): TableQuery;
  eq(column: string, value: unknown): TableQuery;
  order(column: string, options?: { ascending?: boolean }): TableQuery;
  limit(count: number): TableQuery;
  single(): PromiseLike<QueryResult>;
  maybeSingle(): PromiseLike<QueryResult>;
}

const db = supabase as unknown as { from(table: string): TableQuery };

function unwrapRow(result: QueryResult): Row {
  if (result.error) throw new Error(result.error.message);
  if (!result.data || Array.isArray(result.data)) throw new Error("Data tidak ditemukan.");
  return result.data;
}

function unwrapRows(result: QueryResult): Row[] {
  if (result.error) throw new Error(result.error.message);
  if (!result.data) return [];
  return Array.isArray(result.data) ? result.data : [result.data];
}

const nextId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function optional<T>(key: string, value: T | null | undefined) {
  return value === null || value === undefined ? {} : { [key]: value };
}

function toMatch(row: Row): Match {
  return {
    id: row["id"] as string,
    tournament_id: row["tournament_id"] as string,
    category_id: row["category_id"] as string,
    ...optional("group_id", row["group_id"] as string | null),
    match_number: row["match_number"] as number,
    home_team_id: row["home_team_id"] as string,
    away_team_id: row["away_team_id"] as string,
    venue_id: row["venue_id"] as string,
    court: row["court"] as number,
    kickoff_at: row["kickoff_at"] as string,
    status: row["status"] as Match["status"],
    period: row["period"] as Match["period"],
    clock_seconds: row["clock_seconds"] as number,
    home_score: row["home_score"] as number,
    away_score: row["away_score"] as number,
    version: (row["version"] as number) ?? 0,
    stage: row["stage"] as Match["stage"],
  };
}

function toEvent(row: Row): MatchEvent {
  return {
    id: row["id"] as string,
    match_id: row["match_id"] as string,
    ...optional("command_id", row["command_id"] as string | null),
    ...optional("sequence_no", row["sequence_no"] as number | null),
    timestamp: row["timestamp"] as number,
    period: row["period"] as MatchEvent["period"],
    ...optional("team_id", row["team_id"] as string | null),
    ...optional("player_id", row["player_id"] as string | null),
    type: row["type"] as MatchEvent["type"],
    operator_id: row["operator_id"] as string,
    metadata: (row["metadata"] as MatchEvent["metadata"]) ?? {},
    created_at: row["created_at"] as string,
  };
}

function toTeam(row: Row): Team {
  return {
    id: row["id"] as string,
    contingent_id: row["contingent_id"] as string,
    category_id: row["category_id"] as string,
    name: row["name"] as string,
    short_name: row["short_name"] as string,
    ...optional("group_id", row["group_id"] as string | null),
    status: row["status"] as Team["status"],
    primary_color: row["primary_color"] as string,
  };
}

function toPlayer(row: Row): Player {
  return {
    id: row["id"] as string,
    team_id: row["team_id"] as string,
    full_name: row["full_name"] as string,
    jersey_number: row["jersey_number"] as number,
    position: row["position"] as Player["position"],
    birth_date: row["birth_date"] as string,
    nik_verified: row["nik_verified"] as boolean,
    is_captain: row["is_captain"] as boolean,
    status: row["status"] as Player["status"],
    ...optional("registration_status", row["registration_status"] as Player["registration_status"]),
  };
}

function toOfficial(row: Row): TeamOfficial {
  return {
    id: row["id"] as string,
    team_id: row["team_id"] as string,
    full_name: row["full_name"] as string,
    role: row["role"] as TeamOfficial["role"],
    ...optional("license_number", row["license_number"] as string | null),
    ...optional(
      "registration_status",
      row["registration_status"] as TeamOfficial["registration_status"],
    ),
  };
}

function toMatchOfficial(row: Row): MatchOfficial {
  return {
    id: row["id"] as string,
    match_id: row["match_id"] as string,
    user_id: row["user_id"] as string,
    full_name: row["full_name"] as string,
    role: row["role"] as MatchOfficialRole,
    active: (row["active"] as boolean) ?? true,
    ...optional("effective_from", row["effective_from"] as string | null),
    ...optional("effective_to", row["effective_to"] as string | null),
  };
}

async function selectAll(table: string, columns = "*"): Promise<Row[]> {
  const { data, error } = await db.from(table).select(columns).limit(5000);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Row[];
}

async function fetchMatch(id: UUID): Promise<Match | null> {
  const { data, error } = await db.from("matches").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toMatch(data as Row) : null;
}

async function requireMatch(id: UUID): Promise<Match> {
  const match = await fetchMatch(id);
  if (!match) throw new Error("Pertandingan tidak ditemukan.");
  return match;
}

async function eventsOf(matchId: UUID): Promise<MatchEvent[]> {
  const { data, error } = await supabase
    .from("match_events")
    .select("*")
    .eq("match_id", matchId)
    .order("sequence_no", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => toEvent(row as Row));
}

function assertVersion(match: Match, expected?: number) {
  if (expected !== undefined && (match.version ?? 0) !== expected) {
    throw new Error("Pertandingan telah berubah. Muat ulang sebelum mencoba lagi.");
  }
}

async function audit(
  actorId: UUID,
  action: string,
  entity: string,
  entityId: UUID,
  summary: string,
  commandId?: UUID,
  result: "ACCEPTED" | "REPLAYED" = "ACCEPTED",
) {
  await db.from("audit_logs").insert({
    id: nextId("au"),
    actor_id: actorId,
    actor_name: "",
    action,
    entity,
    entity_id: entityId,
    summary,
    result,
    ...(commandId ? { command_id: commandId } : {}),
  });
}

async function appendEvent(input: NewMatchEventInput & { command_id: string }) {
  const existing = await eventsOf(input.match_id);
  const replay = existing.find((event) => event.command_id === input.command_id);
  if (replay) return { event: replay, replayed: true as const };
  const sequence = existing.reduce((max, event) => Math.max(max, event.sequence_no ?? 0), 0) + 1;
  const inserted = unwrapRow(
    await supabase
      .from("match_events")
      .insert({
        id: nextId("ev"),
        match_id: input.match_id,
        command_id: input.command_id,
        sequence_no: sequence,
        timestamp: Math.max(0, Math.round(input.timestamp)),
        period: input.period,
        type: input.type,
        operator_id: input.operator_id,
        metadata: input.metadata ?? {},
        ...(input.team_id ? { team_id: input.team_id } : {}),
        ...(input.player_id ? { player_id: input.player_id } : {}),
      })
      .select("*")
      .single(),
  );
  return { event: toEvent(inserted as Row), replayed: false as const };
}

async function resyncAndBump(match: Match, patch: Partial<Match> = {}): Promise<Match> {
  const events = await eventsOf(match.id);
  const score = deriveScore(events, match.home_team_id, match.away_team_id);
  const updated = unwrapRow(
    await db
      .from("matches")

      .update({
        ...patch,
        home_score: score.home,
        away_score: score.away,
        version: (match.version ?? 0) + 1,
      })
      .eq("id", match.id)
      .select("*")
      .single(),
  );
  return toMatch(updated as Row);
}

/* =============================== Registrasi =============================== */

function assertActor(actor: ActorContext | undefined): asserts actor is ActorContext {
  if (!actor) throw new Error("ActorContext diperlukan.");
}

function assertRead(actor: ActorContext, permission: PermissionKey) {
  assertActor(actor);
  if (!actor.permissions.includes(permission)) throw new Error("Akses data ditolak.");
}

function assertTeamAccess(
  actor: ActorContext | undefined,
  teamId: UUID,
  permission: PermissionKey,
) {
  assertActor(actor);
  if (
    !actor.permissions.includes(permission) ||
    (actor.teamId !== undefined && actor.teamId !== teamId)
  ) {
    throw new Error("Akses tim ditolak.");
  }
}

function assertAdmin(actor: ActorContext, permission: PermissionKey) {
  assertActor(actor);
  if (actor.teamId !== undefined) throw new Error("Akses verifikasi ditolak.");
  if (!actor.permissions.includes(permission)) throw new Error("Akses admin ditolak.");
}

function toTeamAccount(row: Row): TeamAccount {
  return {
    id: row["id"] as UUID,
    team_id: row["team_id"] as UUID,
    username: row["username"] as string,
    account_status: row["account_status"] as AccountStatus,
    created_at: row["created_at"] as string,
    updated_at: row["updated_at"] as string,
    ...optional("last_login_at", row["last_login_at"] as string | null),
  };
}

function toTeamProfile(row: Row): TeamProfile {
  const data = (row["data"] as Record<string, unknown>) ?? {};
  const text = (key: string) => (data[key] as string | undefined) ?? "";
  return {
    team_id: row["team_id"] as UUID,
    contact_person: text("contact_person"),
    contact_phone: text("contact_phone"),
    contact_email: text("contact_email"),
    address: text("address"),
    ...optional("training_venue", data["training_venue"] as string | undefined),
    registration_status:
      (data["registration_status"] as RegistrationStatus | undefined) ?? "DRAFT",
    updated_at: row["updated_at"] as string,
  };
}

function profileToJson(profile: TeamProfile): Record<string, unknown> {
  return {
    contact_person: profile.contact_person,
    contact_phone: profile.contact_phone,
    contact_email: profile.contact_email,
    address: profile.address,
    registration_status: profile.registration_status,
    ...(profile.training_venue ? { training_venue: profile.training_venue } : {}),
  };
}

function toDocument(row: Row): RegistrationDocument {
  return {
    id: row["id"] as UUID,
    entity_type: row["entity_type"] as RegistrationEntityType,
    entity_id: row["entity_id"] as UUID,
    type: row["type"] as DocumentType,
    file_name: row["file_name"] as string,
    storage_ref: (row["storage_path"] as string | null) ?? "",
    status: row["status"] as DocumentStatus,
    uploaded_at: row["uploaded_at"] as string,
    ...optional("reviewer_id", row["reviewed_by"] as UUID | null),
    ...optional("reviewed_at", row["reviewed_at"] as string | null),
    ...optional("revision_reason", row["reason"] as string | null),
  };
}

function toVerification(row: Row): VerificationHistory {
  return {
    id: row["id"] as UUID,
    entity_type: row["entity_type"] as RegistrationEntityType,
    entity_id: row["entity_id"] as UUID,
    actor_id: row["actor_id"] as UUID,
    action: row["action"] as VerificationAction,
    previous_status: (row["previous_status"] as VerificationHistory["previous_status"]) ?? "DRAFT",
    new_status: (row["new_status"] as VerificationHistory["new_status"]) ?? "DRAFT",
    ...optional("reason", row["reason"] as string | null),
    created_at: row["created_at"] as string,
  };
}

/** Menentukan tim pemilik entitas registrasi lewat database. */
async function teamIdForEntity(
  entityType: RegistrationEntityType,
  entityId: UUID,
): Promise<UUID> {
  if (entityType === "TEAM") return entityId;
  const table = entityType === "PLAYER" ? "players" : "team_officials";
  const { data, error } = await db.from(table).select("team_id").eq("id", entityId).maybeSingle();
  if (error) throw new Error(error.message);
  return ((data as Row | null)?.["team_id"] as UUID | undefined) ?? "";
}

async function fetchTeamProfileRow(teamId: UUID): Promise<TeamProfile> {
  const { data, error } = await db
    .from("team_profiles")
    .select("*")
    .eq("team_id", teamId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Profil tim tidak ditemukan.");
  return toTeamProfile(data as Row);
}

async function saveTeamProfile(profile: TeamProfile): Promise<TeamProfile> {
  const updated_at = new Date().toISOString();
  const result = await db
    .from("team_profiles")
    .update({ data: profileToJson(profile), updated_at })
    .eq("team_id", profile.team_id)
    .select("*")
    .single();
  return toTeamProfile(unwrapRow(result));
}

export const supabaseRepository: CompetitionRepository = {


  async getTournament(): Promise<Tournament> {
    const rows = await selectAll("tournaments");
    const row = rows[0];
    if (!row) throw new Error("Turnamen belum dikonfigurasi.");
    return row as unknown as Tournament;
  },

  async listCategories(): Promise<Category[]> {
    return (await selectAll("categories")) as unknown as Category[];
  },

  async listContingents(): Promise<Contingent[]> {
    const rows = await selectAll("contingents");
    return (rows as unknown as Contingent[]).sort((a, b) => a.name.localeCompare(b.name));
  },

  async listGroups(): Promise<Group[]> {
    return (await selectAll("groups")) as unknown as Group[];
  },

  async listTeams(): Promise<Team[]> {
    return (await selectAll("teams")).map(toTeam).sort((a, b) => a.name.localeCompare(b.name));
  },

  async listPlayers(): Promise<Player[]> {
    return (await selectAll("players")).map(toPlayer);
  },

  async getPlayer(id: UUID): Promise<Player> {
    const row = unwrapRow(await db.from("players").select("*").eq("id", id).single());
    return toPlayer(row as Row);
  },

  async listTeamOfficials(): Promise<TeamOfficial[]> {
    return (await selectAll("team_officials")).map(toOfficial);
  },

  async getTeamOfficial(id: UUID): Promise<TeamOfficial> {
    const row = unwrapRow(await db.from("team_officials").select("*").eq("id", id).single());
    return toOfficial(row as Row);
  },

  async listVenues(): Promise<Venue[]> {
    return (await selectAll("venues")) as unknown as Venue[];
  },

  async listMatches(): Promise<Match[]> {
    return (await selectAll("matches"))
      .map(toMatch)
      .sort((a, b) => a.match_number - b.match_number);
  },

  async getMatch(id: UUID) {
    return fetchMatch(id);
  },

  async listMatchOfficials(matchId: UUID, options?: { includeHistory?: boolean }) {
    const rows = await selectAll("match_officials");
    return rows
      .filter((row) => row["match_id"] === matchId)
      .map(toMatchOfficial)
      .filter((official) => options?.includeHistory || official.active !== false);
  },

  async listLineup(matchId: UUID): Promise<MatchLineupEntry[]> {
    const { data, error } = await supabase
      .from("match_lineups")
      .select("*")
      .eq("match_id", matchId);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as MatchLineupEntry[];
  },

  async listMatchEvents(matchId: UUID) {
    return eventsOf(matchId);
  },

  async listStandings(categoryId: UUID): Promise<StandingRow[]> {
    const [teams, matches] = await Promise.all([
      selectAll("teams").then((rows) => rows.map(toTeam)),
      selectAll("matches").then((rows) => rows.map(toMatch)),
    ]);
    const scoped = teams.filter((team) => team.category_id === categoryId);
    const ids = new Set(scoped.map((team) => team.id));
    return computeStandings(
      scoped,
      matches.filter((match) => ids.has(match.home_team_id) && ids.has(match.away_team_id)),
    );
  },

  async listTopScorers(categoryId: UUID): Promise<TopScorerRow[]> {
    const [teams, events] = await Promise.all([
      selectAll("teams").then((rows) => rows.map(toTeam)),
      selectAll("match_events").then((rows) => rows.map(toEvent)),
    ]);
    const ids = new Set(
      teams.filter((team) => team.category_id === categoryId).map((team) => team.id),
    );
    const tally = new Map<string, TopScorerRow>();
    for (const event of events) {
      if (event.type !== "GOAL" || !event.player_id || !event.team_id) continue;
      if (!ids.has(event.team_id) || isEventVoided(event, events)) continue;
      const row = tally.get(event.player_id) ?? {
        player_id: event.player_id,
        team_id: event.team_id,
        goals: 0,
      };
      row.goals += 1;
      tally.set(event.player_id, row);
    }
    return [...tally.values()].sort((a, b) => b.goals - a.goals);
  },

  async listUsers(): Promise<User[]> {
    const profiles = await db.from("profiles").select("*").limit(1000);
    if (profiles.error) return [];
    const roles = await db.from("user_roles").select("*").limit(1000);
    const roleOf = new Map<string, RoleKey>();
    for (const row of unwrapRows({ data: roles.data ?? [], error: null })) {
      roleOf.set(row["user_id"] as string, row["role"] as RoleKey);
    }
    return unwrapRows(profiles).map((row) => ({
      id: row["id"] as string,
      full_name: (row["full_name"] as string) || (row["email"] as string),
      email: row["email"] as string,
      ...optional("phone", row["phone"]),
      role: roleOf.get(row["id"] as string) ?? "PUBLIC",
      ...optional("contingent_id", row["contingent_id"]),
      ...optional("venue_id", row["venue_id"]),
      is_active: (row["is_active"] as boolean) ?? true,
      ...optional("last_login_at", row["last_login_at"]),
      created_at: row["created_at"] as string,
    })) as User[];
  },

  async listAuditLogs(): Promise<AuditLog[]> {
    const result = await db
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (result.error) return [];
    return unwrapRows(result) as unknown as AuditLog[];
  },

  /* ------------------------------- Mutations ------------------------------ */

  async recordMatchEvent(input: NewMatchEventInput) {
    const match = await requireMatch(input.match_id);
    const id = input.command_id ?? nextId("cmd");
    const existing = await eventsOf(match.id);
    const replay = existing.find((event) => event.command_id === id);
    if (replay) {
      await audit(
        input.operator_id ?? "system",
        "MATCH_EVENT_CREATE",
        "match_events",
        replay.id,
        "Mengulang command event yang sudah diterima",
        id,
        "REPLAYED",
      );
      return replay;
    }
    assertVersion(match, input.expected_version);
    const lineup = await this.listLineup(match.id);
    const players = await selectAll("players").then((rows) => rows.map(toPlayer));
    const error = validateMatchEvent(
      { ...input, command_id: id },
      {
        status: match.status,
        homeTeamId: match.home_team_id,
        awayTeamId: match.away_team_id,
        playersOfTeam: (teamId) =>
          lineup.filter((entry) => entry.team_id === teamId).map((entry) => entry.player_id),
        playerEligible: (playerId) =>
          players.some((player) => player.id === playerId && player.status === "ELIGIBLE"),
        existingEvents: existing,
      },
    );
    if (error) throw new Error(error);
    const { event } = await appendEvent({ ...input, command_id: id });
    await resyncAndBump(match);
    await audit(
      input.operator_id ?? "system",
      "MATCH_EVENT_CREATE",
      "match_events",
      match.id,
      `Mencatat ${input.type} pada pertandingan #${match.match_number}`,
      id,
    );
    return event;
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
    const match = await requireMatch(match_id);
    const id = command_id ?? nextId("cmd");
    assertVersion(match, expected_version);
    if (!canTransition(match.status, to)) {
      throw new Error(`Transisi ${match.status} → ${to} tidak diizinkan.`);
    }
    const from = match.status;
    const period = periodForStatus(to, match.period);
    const resetClock = to === "LIVE" && (from === "READY" || from === "HALFTIME");
    const type = statusTransitionEvent(to);
    if (type) {
      await appendEvent({
        match_id,
        command_id: `${id}-period`,
        type,
        period,
        timestamp: resetClock ? 0 : match.clock_seconds,
        operator_id: operator_id ?? "system",
      });
      if (to === "LIVE" && from === "READY") {
        await appendEvent({
          match_id,
          command_id: `${id}-start`,
          type: "MATCH_START",
          period,
          timestamp: 0,
          operator_id: operator_id ?? "system",
        });
      }
    }
    const updated = await resyncAndBump(match, {
      status: to,
      period,
      ...(resetClock ? { clock_seconds: 0 } : {}),
    });
    await audit(
      operator_id ?? "system",
      "MATCH_STATUS_CHANGE",
      "matches",
      match.id,
      `Mengubah status ${from} menjadi ${to}`,
      id,
    );
    return updated;
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
    const match = await requireMatch(match_id);
    assertVersion(match, expected_version);
    if (!Number.isFinite(clock_seconds) || clock_seconds < 0 || clock_seconds > 1200) {
      throw new Error("Jam pertandingan tidak valid.");
    }
    const updated = await resyncAndBump(match, { clock_seconds: Math.round(clock_seconds) });
    await audit(
      operator_id ?? "system",
      "MATCH_CLOCK_UPDATE",
      "matches",
      match.id,
      `Memperbarui jam pertandingan menjadi ${Math.round(clock_seconds)} detik`,
      command_id ?? nextId("cmd"),
    );
    return updated;
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
    const match = await requireMatch(match_id);
    assertVersion(match, expected_version);
    if (match.status !== "SCHEDULED" && match.status !== "CHECK_IN") {
      throw new Error("Jadwal hanya dapat diubah sebelum pertandingan dimulai.");
    }
    const updated = await resyncAndBump(match, {
      ...(kickoff_at ? { kickoff_at } : {}),
      ...(venue_id ? { venue_id } : {}),
      ...(court ? { court } : {}),
    });
    await audit(
      operator_id ?? "system",
      "MATCH_SCHEDULE_UPDATE",
      "matches",
      match.id,
      `Memperbarui jadwal pertandingan #${match.match_number}`,
      command_id ?? nextId("cmd"),
    );
    return updated;
  },

  async assignMatchOfficial({
    match_id,
    role,
    user_id,
    operator_id,
    command_id,
  }: {
    match_id: UUID;
    role: MatchOfficialRole;
    user_id: UUID;
    operator_id?: UUID;
    command_id?: UUID;
  }) {
    await requireMatch(match_id);
    const rows = await selectAll("match_officials");
    const current = rows.map(toMatchOfficial).filter((item) => item.match_id === match_id);
    const conflict = current.find(
      (item) => item.active !== false && item.user_id === user_id && item.role !== role,
    );
    if (conflict) throw new Error("Perangkat sudah bertugas pada peran lain di pertandingan ini.");

    const now = new Date().toISOString();
    const previous = current.find((item) => item.role === role && item.active !== false);
    if (previous) {
      const { error } = await db
        .from("match_officials")
        .update({ active: false, effective_to: now })
        .eq("id", previous.id);
      if (error) throw new Error(error.message);
    }
    const profile = await db.from("profiles").select("*").eq("id", user_id).maybeSingle();
    const name =
      (!profile.error && !Array.isArray(profile.data)
        ? (profile.data?.["full_name"] as string | undefined)
        : undefined) ?? user_id;

    const { error } = await db.from("match_officials").insert({
      id: nextId("mo"),
      match_id,
      user_id,
      full_name: name,
      role,
      active: true,
      effective_from: now,
    });
    if (error) throw new Error(error.message);
    await audit(
      operator_id ?? "system",
      "MATCH_OFFICIAL_ASSIGN",
      "match_officials",
      match_id,
      `Menugaskan perangkat ${role}`,
      command_id ?? nextId("cmd"),
    );
    return this.listMatchOfficials(match_id);
  },

  /* -------------------------- Role Requests (RBAC) ------------------------- */

  async listRoleRequests(actor: ActorContext): Promise<RoleRequest[]> {
    void actor;
    const result = await db
      .from("role_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    return unwrapRows(result).map(toRoleRequest);
  },

  async listMyRoleRequests(actor: ActorContext): Promise<RoleRequest[]> {
    const result = await db
      .from("role_requests")
      .select("*")
      .eq("user_id", actor.userId)
      .order("created_at", { ascending: false })
      .limit(500);
    return unwrapRows(result).map(toRoleRequest);
  },

  async createRoleRequest({
    requested_role,
    request_reason,
    supporting_docs,
    contingent_id,
    venue_id,
    team_id,
    actor,
  }: {
    requested_role: RoleKey;
    request_reason: string;
    supporting_docs?: SupportingDoc[];
    contingent_id?: UUID;
    venue_id?: UUID;
    team_id?: UUID;
    actor: ActorContext;
  }): Promise<RoleRequest> {
    void actor;
    if (
      !SELF_REQUESTABLE_ROLES.includes(
        requested_role as (typeof SELF_REQUESTABLE_ROLES)[number],
      )
    ) {
      throw new Error("Peran ini tidak dapat diajukan secara mandiri.");
    }
    if (!request_reason.trim() || request_reason.trim().length < 10) {
      throw new Error("Alasan pengajuan terlalu singkat (minimal 10 karakter).");
    }
    const row = unwrapRow(
      await db
        .from("role_requests")
        .insert({
          id: nextId("rr"),
          user_id: actor.userId,
          requested_role,
          request_reason,
          supporting_docs: supporting_docs ?? [],
          status: "PENDING",
          ...optional("contingent_id", contingent_id),
          ...optional("venue_id", venue_id),
          ...optional("team_id", team_id),
        })
        .select("*")
        .single(),
    );
    return toRoleRequest(row);
  },

  async cancelRoleRequest({ id, actor }: { id: UUID; actor: ActorContext }): Promise<RoleRequest> {
    void actor;
    const row = unwrapRow(
      await db
        .from("role_requests")
        .update({ status: "CANCELLED" })
        .eq("id", id)
        .select("*")
        .single(),
    );
    return toRoleRequest(row);
  },

  async approveRoleRequest({
    id,
    decision_note,
    contingent_id,
    venue_id,
    team_id,
    actor,
  }: {
    id: UUID;
    decision_note?: string;
    contingent_id?: UUID;
    venue_id?: UUID;
    team_id?: UUID;
    actor: ActorContext;
  }): Promise<RoleRequest> {
    void actor;
    const { data, error } = await (
      supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>
    )("approve_role_request", {
      _request_id: id,
      _decision_note: decision_note ?? null,
      _contingent_id: contingent_id ?? null,
      _venue_id: venue_id ?? null,
      _team_id: team_id ?? null,
    });
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Gagal menyetujui permintaan peran.");
    return toRoleRequest(data as unknown as Row);
  },

  async rejectRoleRequest({
    id,
    decision_note,
    actor,
  }: {
    id: UUID;
    decision_note: string;
    actor: ActorContext;
  }): Promise<RoleRequest> {
    void actor;
    if (!decision_note.trim() || decision_note.trim().length < 6) {
      throw new Error("Catatan penolakan terlalu singkat.");
    }
    const { data, error } = await (
      supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>
    )("reject_role_request", {
      _request_id: id,
      _decision_note: decision_note,
    });
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Gagal menolak permintaan peran.");
    return toRoleRequest(data as unknown as Row);
  },

  async revokeUserRole({
    user_id,
    role,
    reason,
    actor,
  }: {
    user_id: UUID;
    role: RoleKey;
    reason?: string;
    actor: ActorContext;
  }): Promise<boolean> {
    void actor;
    if (role === "PUBLIC") throw new Error("Peran PUBLIC tidak dapat dicabut.");
    const { data, error } = await (
      supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>
    )("revoke_user_role", {
      _user_id: user_id,
      _role: role,
      _reason: reason ?? null,
    });
    if (error) throw new Error(error.message);
    return Boolean(data);
  },

  async assignUserRole({
    user_id,
    role,
    contingent_id,
    venue_id,
    team_id,
    actor,
  }: {
    user_id: UUID;
    role: RoleKey;
    contingent_id?: UUID;
    venue_id?: UUID;
    team_id?: UUID;
    actor: ActorContext;
  }): Promise<boolean> {
    void actor;
    const existing = await db
      .from("role_requests")
      .select("*")
      .eq("user_id", user_id)
      .eq("requested_role", role)
      .eq("status", "PENDING")
      .limit(1)
      .maybeSingle();
    if (existing.error) throw new Error(existing.error.message);
    const callRpcApprove = async (rid: UUID) => {
      const fn = supabase.rpc as unknown as (
        fnName: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
      return fn("approve_role_request", {
        _request_id: rid,
        _decision_note: "Penugasan langsung oleh administrator.",
        _contingent_id: contingent_id ?? null,
        _venue_id: venue_id ?? null,
        _team_id: team_id ?? null,
      });
    };
    if (existing.data) {
      const { error } = await callRpcApprove((existing.data as Row)["id"] as UUID);
      if (error) throw new Error(error.message);
      return true;
    }
    const pending = await db
      .from("role_requests")
      .insert({
        id: nextId("rr"),
        user_id,
        requested_role: role,
        request_reason: `Ditetapkan langsung oleh administrator.`,
        supporting_docs: [],
        status: "PENDING",
        ...optional("contingent_id", contingent_id),
        ...optional("venue_id", venue_id),
        ...optional("team_id", team_id),
      })
      .select("*")
      .single();
    if (pending.error) throw new Error(pending.error.message);
    const req = pending.data as unknown as Row;
    const { error: apvErr } = await callRpcApprove(req["id"] as UUID);
    if (apvErr) throw new Error(apvErr.message);
    return true;
  },
};

function toRoleRequest(row: Row): RoleRequest {
  return {
    id: row["id"] as UUID,
    user_id: row["user_id"] as UUID,
    requested_role: row["requested_role"] as RoleKey,
    request_reason: row["request_reason"] as string,
    supporting_docs: (row["supporting_docs"] as SupportingDoc[]) ?? [],
    status: row["status"] as RoleRequest["status"],
    ...optional("reviewer_id", row["reviewer_id"] as UUID | null),
    ...optional("reviewed_at", row["reviewed_at"] as string | null),
    ...optional("decision_note", row["decision_note"] as string | null),
    ...optional("contingent_id", row["contingent_id"] as UUID | null),
    ...optional("venue_id", row["venue_id"] as UUID | null),
    ...optional("team_id", row["team_id"] as UUID | null),
    created_at: row["created_at"] as string,
    updated_at: row["updated_at"] as string,
  };
}
