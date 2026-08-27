import { formatClock, MATCH_PERIOD_LABEL, MATCH_STATUS_LABEL } from "@/domain/match-state";
import type { MatchPeriod, MatchStatus } from "@/domain/types";
import { cn } from "@/lib/utils";

export interface ScoreboardProps {
  homeName: string;
  awayName: string;
  homeShort: string;
  awayShort: string;
  homeScore: number;
  awayScore: number;
  period: MatchPeriod;
  status: MatchStatus;
  clockSeconds: number;
  homeFouls?: number | undefined;
  awayFouls?: number | undefined;
  size?: "compact" | "full";
  className?: string;
}

export function Scoreboard({
  homeName,
  awayName,
  homeShort,
  awayShort,
  homeScore,
  awayScore,
  period,
  status,
  clockSeconds,
  homeFouls,
  awayFouls,
  size = "full",
  className,
}: ScoreboardProps) {
  const isLive = status === "LIVE";
  const scoreClass = size === "full" ? "text-7xl sm:text-8xl lg:text-9xl" : "text-5xl sm:text-6xl";

  return (
    <section
      className={cn(
        "rounded-xl border border-pitch-border bg-pitch text-pitch-foreground",
        className,
      )}
      aria-label="Papan skor"
    >
      <div className="flex items-center justify-center gap-3 border-b border-pitch-border px-4 py-2.5">
        <span
          className={cn(
            "label-caps rounded-sm px-2 py-1",
            isLive ? "bg-live text-live-foreground" : "bg-white/10 text-pitch-muted",
          )}
        >
          {isLive ? "● Langsung" : MATCH_STATUS_LABEL[status]}
        </span>
        <span className="label-caps text-pitch-muted">{MATCH_PERIOD_LABEL[period]}</span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-6 sm:gap-6 sm:px-8 sm:py-10">
        <TeamSide name={homeName} short={homeShort} fouls={homeFouls} align="left" />

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-3 sm:gap-6">
            <span className={cn("score-numeral tabular-nums", scoreClass)}>{homeScore}</span>
            <span className={cn("score-numeral text-pitch-muted", scoreClass)}>:</span>
            <span className={cn("score-numeral tabular-nums", scoreClass)}>{awayScore}</span>
          </div>
          <div
            className={cn(
              "clock-numeral mt-3 rounded-md px-4 py-1.5 text-2xl sm:mt-4 sm:text-4xl",
              isLive ? "bg-live/15 text-live" : "bg-white/8 text-pitch-muted",
            )}
          >
            {formatClock(clockSeconds)}
          </div>
        </div>

        <TeamSide name={awayName} short={awayShort} fouls={awayFouls} align="right" />
      </div>
    </section>
  );
}

function TeamSide({
  name,
  short,
  fouls,
  align,
}: {
  name: string;
  short: string;
  fouls?: number | undefined;
  align: "left" | "right";
}) {
  return (
    <div className={cn("min-w-0", align === "right" ? "text-right" : "text-left")}>
      <p className="score-numeral text-2xl sm:text-4xl">{short}</p>
      <p className="mt-1 truncate text-xs text-pitch-muted sm:text-sm">{name}</p>
      {typeof fouls === "number" ? (
        <p
          className={cn(
            "label-caps mt-2 inline-block rounded-sm px-2 py-1",
            fouls >= 5 ? "bg-live/20 text-live" : "bg-white/8 text-pitch-muted",
          )}
        >
          Foul {fouls}/5
        </p>
      ) : null}
    </div>
  );
}
