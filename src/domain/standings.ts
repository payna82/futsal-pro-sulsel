import type { Match, StandingRow, Team, UUID } from "./types";

const POINTS_WIN = 3;
const POINTS_DRAW = 1;

function emptyRow(team_id: UUID, group_id: UUID): StandingRow {
  return {
    team_id,
    group_id,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goals_for: 0,
    goals_against: 0,
    goal_difference: 0,
    points: 0,
    fair_play_points: 0,
  };
}

const COUNTED_STATUSES = new Set(["FULL_TIME", "CONFIRMED", "PUBLISHED"]);

/** Agregasi klasemen dari hasil pertandingan yang telah selesai. */
export function computeStandings(teams: Team[], matches: Match[]): StandingRow[] {
  const rows = new Map<UUID, StandingRow>();
  for (const team of teams) {
    rows.set(team.id, emptyRow(team.id, team.group_id ?? ""));
  }

  for (const match of matches) {
    if (!COUNTED_STATUSES.has(match.status)) continue;
    const home = rows.get(match.home_team_id);
    const away = rows.get(match.away_team_id);
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;
    home.goals_for += match.home_score;
    home.goals_against += match.away_score;
    away.goals_for += match.away_score;
    away.goals_against += match.home_score;

    if (match.home_score > match.away_score) {
      home.won += 1;
      away.lost += 1;
      home.points += POINTS_WIN;
    } else if (match.home_score < match.away_score) {
      away.won += 1;
      home.lost += 1;
      away.points += POINTS_WIN;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += POINTS_DRAW;
      away.points += POINTS_DRAW;
    }
  }

  const result = [...rows.values()].map((row) => ({
    ...row,
    goal_difference: row.goals_for - row.goals_against,
  }));

  return result.sort(
    (a, b) =>
      b.points - a.points ||
      b.goal_difference - a.goal_difference ||
      b.goals_for - a.goals_for ||
      a.fair_play_points - b.fair_play_points,
  );
}
