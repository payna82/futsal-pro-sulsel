import type { Match, MatchEvent, MatchEventType, MatchPeriod, MatchStatus, UUID } from "./types";
import { allowedEvents, PERIOD_DURATION_SECONDS } from "./match-state";

/** Masukan pembuatan event. Id dan created_at ditentukan lapisan data. */
export interface NewMatchEventInput {
  match_id: UUID;
  type: MatchEventType;
  period: MatchPeriod;
  timestamp: number;
  operator_id: UUID;
  team_id?: UUID | undefined;
  player_id?: UUID | undefined;
  metadata?: Record<string, string | number | boolean | null> | undefined;
}

export interface EventValidationContext {
  status: MatchStatus;
  homeTeamId: UUID;
  awayTeamId: UUID;
  /** Pemain yang sah untuk tim tertentu (dari lineup). */
  playersOfTeam: (teamId: UUID) => UUID[];
}

/** Validasi sisi klien. Backend akan menegakkan aturan yang sama nantinya. */
export function validateMatchEvent(
  input: NewMatchEventInput,
  ctx: EventValidationContext,
): string | null {
  if (!allowedEvents(ctx.status).includes(input.type)) {
    return "Jenis kejadian tidak diizinkan pada status pertandingan saat ini.";
  }
  if (input.timestamp < 0 || input.timestamp > PERIOD_DURATION_SECONDS) {
    return "Waktu pertandingan di luar durasi babak.";
  }
  const needsTeam: MatchEventType[] = ["GOAL", "CARD", "FOUL", "SUBSTITUTION", "TIMEOUT"];
  if (needsTeam.includes(input.type)) {
    if (!input.team_id) return "Tim wajib dipilih.";
    if (input.team_id !== ctx.homeTeamId && input.team_id !== ctx.awayTeamId) {
      return "Tim tidak ikut serta dalam pertandingan ini.";
    }
  }
  const needsPlayer: MatchEventType[] = ["GOAL", "CARD", "SUBSTITUTION"];
  if (needsPlayer.includes(input.type) && !input.player_id) {
    return "Pemain wajib dipilih.";
  }
  if (input.team_id && input.player_id) {
    const squad = ctx.playersOfTeam(input.team_id);
    if (!squad.includes(input.player_id)) return "Pemain bukan bagian dari tim yang dipilih.";
    const playerIn = input.metadata?.["player_in"];
    if (input.type === "SUBSTITUTION") {
      if (typeof playerIn !== "string" || playerIn.length === 0) {
        return "Pemain masuk wajib dipilih.";
      }
      if (!squad.includes(playerIn)) return "Pemain masuk bukan bagian dari tim yang dipilih.";
      if (playerIn === input.player_id) return "Pemain keluar dan masuk tidak boleh sama.";
    }
  }
  if (input.type === "CARD") {
    const card = input.metadata?.["card"];
    if (card !== "YELLOW" && card !== "RED") return "Jenis kartu tidak valid.";
  }
  return null;
}

/** Skor selalu diturunkan dari event GOAL, tidak pernah ditulis manual. */
export function deriveScore(
  events: MatchEvent[],
  homeTeamId: UUID,
  awayTeamId: UUID,
): { home: number; away: number } {
  let home = 0;
  let away = 0;
  for (const ev of events) {
    if (ev.type !== "GOAL") continue;
    if (ev.team_id === homeTeamId) home += 1;
    else if (ev.team_id === awayTeamId) away += 1;
  }
  return { home, away };
}

/** Akumulasi foul per tim pada satu periode (aturan futsal: 5 foul). */
export function countFouls(events: MatchEvent[], teamId: UUID, period: MatchPeriod): number {
  return events.filter((e) => e.type === "FOUL" && e.team_id === teamId && e.period === period)
    .length;
}

export function countCards(events: MatchEvent[], teamId: UUID, card: "YELLOW" | "RED"): number {
  return events.filter(
    (e) => e.type === "CARD" && e.team_id === teamId && e.metadata["card"] === card,
  ).length;
}

/** Periode yang mengikuti status pertandingan. */
export function periodForStatus(status: MatchStatus, current: MatchPeriod): MatchPeriod {
  switch (status) {
    case "LIVE":
      return current === "SECOND_HALF" || current === "HALF_TIME" ? "SECOND_HALF" : "FIRST_HALF";
    case "HALFTIME":
      return "HALF_TIME";
    case "FULL_TIME":
    case "CONFIRMED":
    case "PUBLISHED":
      return "ENDED";
    default:
      return "PRE_MATCH";
  }
}

/** Event sistem yang menyertai perpindahan status. */
export function statusTransitionEvent(to: MatchStatus): MatchEventType | null {
  switch (to) {
    case "LIVE":
      return "PERIOD_START";
    case "HALFTIME":
      return "HALFTIME";
    case "FULL_TIME":
      return "MATCH_END";
    default:
      return null;
  }
}

export function isMatchToday(match: Match, reference: Date = new Date()): boolean {
  return match.kickoff_at.slice(0, 10) === reference.toISOString().slice(0, 10);
}
