import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { TeamCrest } from "@/components/common/TeamCrest";
import { formatClock } from "@/domain/match-state";
import type { Match } from "@/domain/types";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function MatchCard({
  match,
  homeName,
  awayName,
  homeShort,
  awayShort,
  homeColor,
  awayColor,
  venueName,
  groupName,
}: {
  match: Match;
  homeName: string;
  awayName: string;
  homeShort: string;
  awayShort: string;
  homeColor?: string | undefined;
  awayColor?: string | undefined;
  venueName: string;
  groupName: string;
}) {
  const showScore = match.status !== "SCHEDULED" && match.status !== "CHECK_IN";
  const isLive = match.status === "LIVE";

  return (
    <Link
      to="/pertandingan/$matchId"
      params={{ matchId: match.id }}
      className={cn(
        "block rounded-lg border bg-card p-4 transition-colors hover:border-primary/50",
        isLive ? "border-live/50" : "border-border",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="label-caps text-muted-foreground">
          #{match.match_number} • {groupName}
        </span>
        <StatusBadge status={match.status} />
      </div>

      <div className="mt-3 space-y-2">
        <TeamRow
          name={homeName}
          short={homeShort}
          color={homeColor}
          score={showScore ? match.home_score : undefined}
          winner={showScore && match.home_score > match.away_score}
        />
        <TeamRow
          name={awayName}
          short={awayShort}
          color={awayColor}
          score={showScore ? match.away_score : undefined}
          winner={showScore && match.away_score > match.home_score}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
        <span>{formatDateTime(match.kickoff_at)}</span>
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3" aria-hidden />
          {venueName} • Lap. {match.court}
        </span>
        {isLive ? (
          <span className="clock-numeral ml-auto text-live">
            {formatClock(match.clock_seconds)}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

function TeamRow({
  name,
  short,
  color,
  score,
  winner,
}: {
  name: string;
  short: string;
  color?: string | undefined;
  score?: number | undefined;
  winner: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <TeamCrest shortName={short} color={color} size="sm" />
      <span className={cn("min-w-0 flex-1 truncate text-sm", winner && "font-bold")}>{name}</span>
      <span className={cn("score-numeral text-2xl", winner ? "text-primary" : "text-foreground")}>
        {typeof score === "number" ? score : "–"}
      </span>
    </div>
  );
}
