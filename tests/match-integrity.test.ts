import {
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { deriveScore, validateMatchEvent } from "../src/domain/match-operations.ts";
import { canTransition } from "../src/domain/match-state.ts";
import type { MatchEvent } from "../src/domain/types.ts";

const base = {
  match_id: "match-1",
  command_id: "command-1",
  type: "GOAL" as const,
  period: "FIRST_HALF" as const,
  timestamp: 120,
  operator_id: "operator-1",
  team_id: "home",
  player_id: "player-1",
};

const context = {
  status: "LIVE" as const,
  homeTeamId: "home",
  awayTeamId: "away",
  playersOfTeam: (teamId: string) => (teamId === "home" ? ["player-1"] : ["player-2"]),
  playerEligible: () => true,
};

Deno.test("valid goal is accepted and score derives from events", () => {
  assertEquals(validateMatchEvent(base, context), null);
  const event = {
    ...base,
    id: "event-1",
    created_at: "2026-08-27T00:00:00Z",
    metadata: {},
  } satisfies MatchEvent;
  assertEquals(deriveScore([event], "home", "away"), { home: 1, away: 0 });
});

Deno.test("invalid goal team/player and state are rejected", () => {
  assertStringIncludes(
    validateMatchEvent({ ...base, team_id: "other" }, context) ?? "",
    "Tim tidak",
  );
  assertStringIncludes(
    validateMatchEvent({ ...base, player_id: "other" }, context) ?? "",
    "Pemain",
  );
  assertStringIncludes(validateMatchEvent({ ...base, period: "ENDED" }, context) ?? "", "Periode");
  assertStringIncludes(
    validateMatchEvent({ ...base, type: "GOAL" }, { ...context, status: "READY" }) ?? "",
    "status",
  );
});

Deno.test("correction requires a target and voids a goal without mutating it", () => {
  const goal = {
    ...base,
    id: "event-1",
    created_at: "2026-08-27T00:00:00Z",
    metadata: {},
  } satisfies MatchEvent;
  const { team_id: _teamId, player_id: _playerId, ...correctionBase } = base;
  const correction = {
    ...correctionBase,
    type: "MATCH_CORRECTION" as const,
    metadata: { target_event_id: goal.id, reason: "Salah input", correction: "VOID" },
  };
  assertEquals(validateMatchEvent(correction, { ...context, existingEvents: [goal] }), null);
  assertEquals(
    deriveScore(
      [goal, { ...correction, id: "event-2", created_at: "2026-08-27T00:00:01Z" }],
      "home",
      "away",
    ),
    { home: 0, away: 0 },
  );
});

Deno.test("illegal status transition is rejected", () => {
  assertEquals(canTransition("SCHEDULED", "LIVE"), false);
  assertThrows(
    () => {
      if (!canTransition("FULL_TIME", "LIVE")) throw new Error("illegal transition");
    },
    Error,
    "illegal transition",
  );
});
