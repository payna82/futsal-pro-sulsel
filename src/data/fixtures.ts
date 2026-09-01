/**
 * Data contoh sementara untuk mendemonstrasikan UI.
 * HANYA dipakai oleh adapter di layer data — komponen tidak boleh mengimpor file ini.
 * Akan digantikan oleh PostgreSQL/Supabase tanpa perubahan pada komponen.
 */
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
  Team,
  TeamOfficial,
  Tournament,
  User,
  Venue,
} from "@/domain/types";
import type {
  RoleRequest,
  RegistrationDocument,
  TeamAccount,
  TeamProfile,
  VerificationHistory,
} from "@/domain/registration";

const DAY = "2026-09-";

export const tournament: Tournament = {
  id: "trn-1",
  name: "PORPROV Sulsel 2026",
  season: 2026,
  host_city: "Makassar",
  start_date: "2026-09-05",
  end_date: "2026-09-19",
  status: "ACTIVE",
  description:
    "Pekan Olahraga Provinsi Sulawesi Selatan 2026 — Cabang Olahraga Futsal Putra dan Putri.",
};

export const categories: Category[] = [
  {
    id: "cat-men",
    tournament_id: "trn-1",
    key: "MEN",
    name: "Futsal Putra",
    team_count: 8,
    format: "2 grup penyisihan, semifinal, final",
  },
  {
    id: "cat-women",
    tournament_id: "trn-1",
    key: "WOMEN",
    name: "Futsal Putri",
    team_count: 6,
    format: "2 grup penyisihan, semifinal, final",
  },
];

const regions: Array<[string, string, string]> = [
  ["Kota Makassar", "MKS", "73.71"],
  ["Kabupaten Gowa", "GOW", "73.06"],
  ["Kabupaten Bone", "BON", "73.08"],
  ["Kota Parepare", "PRE", "73.72"],
  ["Kabupaten Luwu Timur", "LWT", "73.25"],
  ["Kabupaten Maros", "MRS", "73.09"],
  ["Kota Palopo", "PLP", "73.73"],
  ["Kabupaten Sinjai", "SNJ", "73.07"],
];

export const contingents: Contingent[] = regions.map(([name, short, code], i) => ({
  id: `con-${i + 1}`,
  tournament_id: "trn-1",
  name,
  short_name: short,
  region_code: code,
  manager_name: `Manajer Kontingen ${short}`,
  contact: `0812-3300-10${i + 1}`,
  status:
    i === 0
      ? "PENDING"
      : i === 4
        ? "REJECTED"
        : i === 7
          ? "DEACTIVATED"
          : "VERIFIED",
}));

export const groups: Group[] = [
  { id: "grp-ma", category_id: "cat-men", name: "Grup A", stage: "GROUP" },
  { id: "grp-mb", category_id: "cat-men", name: "Grup B", stage: "GROUP" },
  { id: "grp-wa", category_id: "cat-women", name: "Grup A", stage: "GROUP" },
  { id: "grp-wb", category_id: "cat-women", name: "Grup B", stage: "GROUP" },
];

const teamColors = [
  "#8f1d1d",
  "#123f7a",
  "#1c6b3c",
  "#a9761a",
  "#4a2472",
  "#0f6f7a",
  "#7a2f4f",
  "#2f3b46",
];

export const teams: Team[] = [
  ...contingents.map((c, i) => ({
    id: `tm-m${i + 1}`,
    contingent_id: c.id,
    category_id: "cat-men",
    name: `${c.name} Putra`,
    short_name: c.short_name,
    group_id: i % 2 === 0 ? "grp-ma" : "grp-mb",
    status: (i === 7 ? "REGISTERED" : "VERIFIED") as Team["status"],
    primary_color: teamColors[i]!,
  })),
  ...contingents.slice(0, 6).map((c, i) => ({
    id: `tm-w${i + 1}`,
    contingent_id: c.id,
    category_id: "cat-women",
    name: `${c.name} Putri`,
    short_name: c.short_name,
    group_id: i % 2 === 0 ? "grp-wa" : "grp-wb",
    status: "VERIFIED" as Team["status"],
    primary_color: teamColors[i]!,
  })),
];

const firstNames = [
  "Andi",
  "Muh.",
  "Rifky",
  "Ahmad",
  "Fajar",
  "Rian",
  "Yusuf",
  "Bahar",
  "Ilham",
  "Reza",
  "Dedi",
  "Arya",
  "Nur",
  "Sitti",
  "Aulia",
];
const lastNames = [
  "Pratama",
  "Ramadhan",
  "Saputra",
  "Maulana",
  "Hidayat",
  "Kurniawan",
  "Sanjaya",
  "Alamsyah",
  "Wijaya",
  "Fadillah",
  "Nugraha",
  "Halim",
  "Syahputra",
  "Amelia",
  "Ashari",
];
const positions: Player["position"][] = ["GOALKEEPER", "ANCHOR", "FLANK", "FLANK", "PIVOT"];

export const players: Player[] = teams.flatMap((team, ti) =>
  Array.from({ length: 12 }, (_, pi) => ({
    id: `pl-${team.id}-${pi + 1}`,
    team_id: team.id,
    full_name: `${firstNames[(ti + pi) % firstNames.length]} ${
      lastNames[(ti * 3 + pi) % lastNames.length]
    }`,
    jersey_number: pi + 1,
    position: positions[pi % positions.length]!,
    birth_date: `${2000 + ((ti + pi) % 6)}-0${(pi % 9) + 1}-1${pi % 9}`,
    nik_verified: pi % 7 !== 0,
    is_captain: pi === 3,
    status: (pi % 11 === 0 ? "PENDING" : "ELIGIBLE") as Player["status"],
  })),
);

export const teamOfficials: TeamOfficial[] = teams.flatMap((team, i) => [
  {
    id: `of-${team.id}-1`,
    team_id: team.id,
    full_name: `Pelatih ${team.short_name}`,
    role: "HEAD_COACH" as const,
    license_number: `AFC-D/${2400 + i}`,
  },
  {
    id: `of-${team.id}-2`,
    team_id: team.id,
    full_name: `Manajer ${team.short_name}`,
    role: "MANAGER" as const,
  },
]);

export const venues: Venue[] = [
  {
    id: "ven-1",
    name: "GOR Sudiang",
    city: "Makassar",
    address: "Jl. Poros Sudiang, Makassar",
    capacity: 2500,
    court_count: 2,
    is_active: true,
  },
  {
    id: "ven-2",
    name: "Futsal Center Panakkukang",
    city: "Makassar",
    address: "Jl. Boulevard, Panakkukang",
    capacity: 1200,
    court_count: 3,
    is_active: true,
  },
  {
    id: "ven-3",
    name: "GOR Mattoanging Gowa",
    city: "Gowa",
    address: "Jl. Sultan Hasanuddin, Sungguminasa",
    capacity: 900,
    court_count: 1,
    is_active: false,
  },
];

function iso(day: number, hour: number, minute = 0): string {
  return `2026-09-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(
    minute,
  ).padStart(2, "0")}:00+08:00`;
}

const menTeams = teams.filter((t) => t.category_id === "cat-men");
const womenTeams = teams.filter((t) => t.category_id === "cat-women");

let matchNo = 0;
function makeMatch(
  home: Team,
  away: Team,
  day: number,
  hour: number,
  status: Match["status"],
  home_score: number,
  away_score: number,
  extra?: Partial<Match>,
): Match {
  matchNo += 1;
  return {
    id: `mt-${matchNo}`,
    tournament_id: "trn-1",
    category_id: home.category_id,
    group_id: home.group_id,
    match_number: matchNo,
    home_team_id: home.id,
    away_team_id: away.id,
    venue_id: matchNo % 2 === 0 ? "ven-2" : "ven-1",
    court: (matchNo % 2) + 1,
    kickoff_at: iso(day, hour),
    status,
    period: status === "LIVE" ? "SECOND_HALF" : status === "SCHEDULED" ? "PRE_MATCH" : "ENDED",
    clock_seconds: status === "LIVE" ? 1114 : 0,
    home_score,
    away_score,
    version: 0,
    stage: "GROUP",
    ...extra,
  };
}

export const matches: Match[] = [
  makeMatch(menTeams[0]!, menTeams[2]!, 6, 9, "PUBLISHED", 4, 2),
  makeMatch(menTeams[4]!, menTeams[6]!, 6, 11, "PUBLISHED", 1, 1),
  makeMatch(menTeams[1]!, menTeams[3]!, 6, 13, "PUBLISHED", 3, 5),
  makeMatch(womenTeams[0]!, womenTeams[2]!, 6, 15, "PUBLISHED", 2, 0),
  makeMatch(menTeams[0]!, menTeams[4]!, 7, 9, "CONFIRMED", 2, 2),
  makeMatch(womenTeams[1]!, womenTeams[3]!, 7, 11, "PUBLISHED", 3, 1),
  makeMatch(menTeams[2]!, menTeams[6]!, 7, 13, "LIVE", 3, 2),
  makeMatch(womenTeams[4]!, womenTeams[0]!, 7, 15, "LIVE", 1, 1, {
    period: "FIRST_HALF",
    clock_seconds: 486,
  }),
  makeMatch(menTeams[1]!, menTeams[5]!, 7, 17, "CHECK_IN", 0, 0),
  makeMatch(menTeams[3]!, menTeams[7]!, 7, 19, "SCHEDULED", 0, 0),
  makeMatch(womenTeams[2]!, womenTeams[4]!, 8, 9, "SCHEDULED", 0, 0),
  makeMatch(menTeams[4]!, menTeams[2]!, 8, 11, "SCHEDULED", 0, 0),
  makeMatch(menTeams[6]!, menTeams[0]!, 8, 13, "SCHEDULED", 0, 0),
  makeMatch(womenTeams[3]!, womenTeams[5]!, 8, 15, "SCHEDULED", 0, 0),
  makeMatch(menTeams[5]!, menTeams[3]!, 9, 9, "SCHEDULED", 0, 0),
  makeMatch(menTeams[7]!, menTeams[1]!, 9, 11, "SCHEDULED", 0, 0),
];

export const matchOfficials: MatchOfficial[] = matches.flatMap((m, i) => [
  {
    id: `mo-${m.id}-1`,
    match_id: m.id,
    user_id: "usr-ref-1",
    full_name: "Andi Muharram",
    role: "REFEREE_1" as const,
    active: true,
    effective_from: m.kickoff_at,
  },
  {
    id: `mo-${m.id}-2`,
    match_id: m.id,
    user_id: "usr-ref-2",
    full_name: "Hasbi Rahman",
    role: "REFEREE_2" as const,
    active: true,
    effective_from: m.kickoff_at,
  },
  {
    id: `mo-${m.id}-3`,
    match_id: m.id,
    user_id: "usr-tk-1",
    full_name: "Rusdi Tahir",
    role: "TIMEKEEPER" as const,
    active: true,
    effective_from: m.kickoff_at,
  },
  {
    id: `mo-${m.id}-4`,
    match_id: m.id,
    user_id: "usr-cm-1",
    full_name: `Komisaris ${i + 1}`,
    role: "COMMISSIONER" as const,
    active: true,
    effective_from: m.kickoff_at,
  },
]);

export const lineups: MatchLineupEntry[] = matches.flatMap((m) =>
  [m.home_team_id, m.away_team_id].flatMap((teamId) =>
    players
      .filter((p) => p.team_id === teamId)
      .slice(0, 12)
      .map((p, idx) => ({
        id: `ln-${m.id}-${p.id}`,
        match_id: m.id,
        team_id: teamId,
        player_id: p.id,
        is_starting: idx < 5,
        shirt_number: p.jersey_number,
      })),
  ),
);

function teamPlayer(teamId: string, index: number): string {
  return players.filter((p) => p.team_id === teamId)[index]!.id;
}

export const matchEvents: MatchEvent[] = matches.flatMap((m) => {
  if (m.status === "SCHEDULED" || m.status === "CHECK_IN") return [];
  const base: MatchEvent[] = [
    {
      id: `ev-${m.id}-0`,
      match_id: m.id,
      timestamp: 0,
      period: "FIRST_HALF",
      type: "MATCH_START",
      operator_id: "usr-sk-1",
      metadata: {},
      created_at: m.kickoff_at,
    },
  ];
  const goals: MatchEvent[] = [];
  for (let i = 0; i < m.home_score; i++) {
    goals.push({
      id: `ev-${m.id}-h${i}`,
      match_id: m.id,
      timestamp: 120 + i * 240,
      period: i % 2 === 0 ? "FIRST_HALF" : "SECOND_HALF",
      team_id: m.home_team_id,
      player_id: teamPlayer(m.home_team_id, (i + 5) % 12),
      type: "GOAL",
      operator_id: "usr-sk-1",
      metadata: { assist: null, shot_type: i % 3 === 0 ? "OPEN_PLAY" : "SET_PIECE" },
      created_at: m.kickoff_at,
    });
  }
  for (let i = 0; i < m.away_score; i++) {
    goals.push({
      id: `ev-${m.id}-a${i}`,
      match_id: m.id,
      timestamp: 200 + i * 260,
      period: i % 2 === 0 ? "FIRST_HALF" : "SECOND_HALF",
      team_id: m.away_team_id,
      player_id: teamPlayer(m.away_team_id, (i + 2) % 12),
      type: "GOAL",
      operator_id: "usr-sk-1",
      metadata: { assist: null, shot_type: "OPEN_PLAY" },
      created_at: m.kickoff_at,
    });
  }
  const cards: MatchEvent[] = [
    {
      id: `ev-${m.id}-c1`,
      match_id: m.id,
      timestamp: 640,
      period: "FIRST_HALF",
      team_id: m.away_team_id,
      player_id: teamPlayer(m.away_team_id, 6),
      type: "CARD",
      operator_id: "usr-sk-1",
      metadata: { card: "YELLOW", reason: "Protes keputusan wasit" },
      created_at: m.kickoff_at,
    },
    {
      id: `ev-${m.id}-f1`,
      match_id: m.id,
      timestamp: 500,
      period: "FIRST_HALF",
      team_id: m.home_team_id,
      type: "FOUL",
      operator_id: "usr-sk-1",
      metadata: { accumulated: 3 },
      created_at: m.kickoff_at,
    },
    {
      id: `ev-${m.id}-t1`,
      match_id: m.id,
      timestamp: 900,
      period: "FIRST_HALF",
      team_id: m.home_team_id,
      type: "TIMEOUT",
      operator_id: "usr-tk-1",
      metadata: {},
      created_at: m.kickoff_at,
    },
  ];
  return [...base, ...goals, ...cards].sort((a, b) => a.timestamp - b.timestamp);
});

export const users: User[] = [
  {
    id: "usr-1",
    full_name: "Andi Baso Mappasessu",
    email: "superadmin@porprovsulsel.id",
    role: "SUPER_ADMIN",
    is_active: true,
    created_at: `${DAY}01T08:00:00+08:00`,
    last_login_at: `${DAY}07T07:10:00+08:00`,
  },
  {
    id: "usr-2",
    full_name: "Nurhayati Salam",
    email: "admin@porprovsulsel.id",
    role: "TOURNAMENT_ADMIN",
    is_active: true,
    created_at: `${DAY}01T08:10:00+08:00`,
  },
  {
    id: "usr-3",
    full_name: "Rahmat Hidayat",
    email: "kompetisi@porprovsulsel.id",
    role: "COMPETITION_MANAGER",
    is_active: true,
    created_at: `${DAY}01T08:20:00+08:00`,
  },
  {
    id: "usr-4",
    full_name: "Sitti Marlina",
    email: "venue.sudiang@porprovsulsel.id",
    role: "VENUE_MANAGER",
    venue_id: "ven-1",
    is_active: true,
    created_at: `${DAY}02T08:00:00+08:00`,
  },
  {
    id: "usr-cm-1",
    full_name: "Muhammad Iqbal",
    email: "komisaris1@porprovsulsel.id",
    role: "MATCH_COMMISSIONER",
    is_active: true,
    created_at: `${DAY}02T08:00:00+08:00`,
  },
  {
    id: "usr-ref-1",
    full_name: "Andi Muharram",
    email: "wasit1@porprovsulsel.id",
    role: "REFEREE",
    is_active: true,
    created_at: `${DAY}02T09:00:00+08:00`,
  },
  {
    id: "usr-tk-1",
    full_name: "Rusdi Tahir",
    email: "timekeeper1@porprovsulsel.id",
    role: "TIMEKEEPER",
    is_active: true,
    created_at: `${DAY}02T09:10:00+08:00`,
  },
  {
    id: "usr-sk-1",
    full_name: "Fitrah Ramadhan",
    email: "scorer1@porprovsulsel.id",
    role: "SCOREKEEPER",
    is_active: true,
    created_at: `${DAY}02T09:20:00+08:00`,
  },
  {
    id: "usr-to-1",
    full_name: "Manajer Kontingen MKS",
    email: "official.mks@porprovsulsel.id",
    role: "TEAM_OFFICIAL",
    contingent_id: "con-1",
    is_active: true,
    created_at: `${DAY}03T09:00:00+08:00`,
  },
  {
    id: "usr-md-1",
    full_name: "Redaksi Sulsel Sport",
    email: "media@porprovsulsel.id",
    role: "MEDIA",
    is_active: false,
    created_at: `${DAY}03T10:00:00+08:00`,
  },
];

export const auditLogs: AuditLog[] = [
  {
    id: "au-1",
    actor_id: "usr-sk-1",
    actor_name: "Fitrah Ramadhan",
    action: "MATCH_EVENT_CREATE",
    entity: "match_events",
    entity_id: "mt-7",
    summary: "Mencatat GOAL untuk MKS pada menit 18:34",
    created_at: `${DAY}07T13:18:34+08:00`,
  },
  {
    id: "au-2",
    actor_id: "usr-cm-1",
    actor_name: "Muhammad Iqbal",
    action: "MATCH_STATUS_CHANGE",
    entity: "matches",
    entity_id: "mt-5",
    summary: "Mengubah status FULL_TIME menjadi CONFIRMED",
    created_at: `${DAY}07T11:05:12+08:00`,
  },
  {
    id: "au-3",
    actor_id: "usr-3",
    actor_name: "Rahmat Hidayat",
    action: "SCHEDULE_UPDATE",
    entity: "matches",
    entity_id: "mt-10",
    summary: "Memindahkan jadwal ke GOR Sudiang lapangan 1",
    created_at: `${DAY}07T09:44:02+08:00`,
  },
  {
    id: "au-4",
    actor_id: "usr-2",
    actor_name: "Nurhayati Salam",
    action: "PLAYER_VERIFY",
    entity: "players",
    entity_id: "pl-tm-m1-4",
    summary: "Memverifikasi keabsahan dokumen pemain",
    created_at: `${DAY}06T16:20:00+08:00`,
  },
];

// DEMO ONLY: credentials are represented by a non-production digest in memory.
export const teamAccounts: Array<TeamAccount & { credential_digest: string }> = [
  {
    id: "ta-1",
    team_id: "tm-m1",
    username: "makassar.putra",
    account_status: "ACTIVE",
    credential_digest: "demo:makassar2026",
    created_at: `${DAY}01T09:00:00+08:00`,
    updated_at: `${DAY}01T09:00:00+08:00`,
  },
  {
    id: "ta-2",
    team_id: "tm-w1",
    username: "makassar.putri",
    account_status: "ACTIVE",
    credential_digest: "demo:putri2026",
    created_at: `${DAY}01T09:10:00+08:00`,
    updated_at: `${DAY}01T09:10:00+08:00`,
  },
];

export const teamProfiles: TeamProfile[] = teams.map((team) => ({
  team_id: team.id,
  contact_person: `Manajer ${team.short_name}`,
  contact_phone: "0812-0000-2026",
  contact_email: `${team.short_name.toLowerCase()}@porprov.demo`,
  address: "Makassar, Sulawesi Selatan",
  training_venue: "GOR Sudiang",
  registration_status: team.id === "tm-m1" ? "UNDER_REVIEW" : "DRAFT",
  updated_at: `${DAY}07T10:00:00+08:00`,
}));

export const registrationDocuments: RegistrationDocument[] = teams.flatMap((team) => {
  const player = players.find((item) => item.team_id === team.id);
  if (!player) return [];
  return [
    {
      id: `doc-${team.id}-1`,
      entity_type: "PLAYER",
      entity_id: player.id,
      type: "IDENTITY",
      file_name: `${player.full_name.replaceAll(" ", "-")}-identitas.pdf`,
      storage_ref: `demo-private/${player.id}/identity.pdf`,
      status: team.id === "tm-m1" ? "APPROVED" : "REVISION_REQUIRED",
      uploaded_at: `${DAY}07T10:30:00+08:00`,
      ...(team.id !== "tm-m1"
        ? { revision_reason: "Dokumen identitas tidak terbaca. Silakan unggah ulang." }
        : {}),
    } satisfies RegistrationDocument,
  ];
});

export const verificationHistory: VerificationHistory[] = [];

export const roleRequests: RoleRequest[] = [];
