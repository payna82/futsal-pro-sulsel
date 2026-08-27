import type { MatchEventType, MatchPeriod, MatchStatus } from "./types";

/** Transisi status yang sah. Backend akan menegakkan aturan yang sama. */
const TRANSITIONS: Record<MatchStatus, MatchStatus[]> = {
  SCHEDULED: ["CHECK_IN"],
  CHECK_IN: ["LINEUP", "SCHEDULED"],
  LINEUP: ["READY", "CHECK_IN"],
  READY: ["LIVE", "LINEUP"],
  LIVE: ["HALFTIME", "FULL_TIME"],
  HALFTIME: ["LIVE"],
  FULL_TIME: ["CONFIRMED"],
  CONFIRMED: ["PUBLISHED"],
  PUBLISHED: [],
};

export function nextStatuses(current: MatchStatus): MatchStatus[] {
  return TRANSITIONS[current];
}

export function canTransition(from: MatchStatus, to: MatchStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export const MATCH_STATUS_LABEL: Record<MatchStatus, string> = {
  SCHEDULED: "Terjadwal",
  CHECK_IN: "Check-in",
  LINEUP: "Susunan Pemain",
  READY: "Siap Main",
  LIVE: "Berlangsung",
  HALFTIME: "Turun Minum",
  FULL_TIME: "Selesai",
  CONFIRMED: "Dikonfirmasi",
  PUBLISHED: "Dipublikasikan",
};

export const MATCH_PERIOD_LABEL: Record<MatchPeriod, string> = {
  PRE_MATCH: "Sebelum Kick-off",
  FIRST_HALF: "Babak 1",
  HALF_TIME: "Turun Minum",
  SECOND_HALF: "Babak 2",
  ENDED: "Pertandingan Berakhir",
};

export const MATCH_EVENT_LABEL: Record<MatchEventType, string> = {
  MATCH_START: "Kick-off",
  PERIOD_START: "Mulai Babak",
  GOAL: "Gol",
  CARD: "Kartu",
  FOUL: "Pelanggaran",
  SUBSTITUTION: "Pergantian",
  TIMEOUT: "Time-out",
  PERIOD_END: "Akhir Babak",
  HALFTIME: "Turun Minum",
  MATCH_END: "Akhir Pertandingan",
  MATCH_CORRECTION: "Koreksi Data",
};

/** Durasi resmi futsal: 2 x 20 menit waktu bersih. */
export const PERIOD_DURATION_SECONDS = 20 * 60;

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function isLiveStatus(status: MatchStatus): boolean {
  return status === "LIVE" || status === "HALFTIME";
}

/** Event yang boleh diinput pada periode tertentu. */
export function allowedEvents(status: MatchStatus): MatchEventType[] {
  if (status === "LIVE") {
    return ["GOAL", "CARD", "FOUL", "SUBSTITUTION", "TIMEOUT", "MATCH_CORRECTION"];
  }
  if (status === "HALFTIME") return ["SUBSTITUTION", "CARD", "MATCH_CORRECTION"];
  if (status === "FULL_TIME") return ["MATCH_CORRECTION"];
  return [];
}
