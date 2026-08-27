import {
  ArrowLeftRight,
  CircleDot,
  Flag,
  PauseCircle,
  PencilLine,
  RectangleVertical,
  Timer,
} from "lucide-react";
import { formatClock, MATCH_EVENT_LABEL, MATCH_PERIOD_LABEL } from "@/domain/match-state";
import type { MatchEvent, MatchEventType } from "@/domain/types";
import { cn } from "@/lib/utils";

const ICONS: Record<MatchEventType, typeof Flag> = {
  MATCH_START: Flag,
  PERIOD_START: Flag,
  GOAL: CircleDot,
  CARD: RectangleVertical,
  FOUL: PauseCircle,
  SUBSTITUTION: ArrowLeftRight,
  TIMEOUT: Timer,
  PERIOD_END: Flag,
  HALFTIME: PauseCircle,
  MATCH_END: Flag,
  MATCH_CORRECTION: PencilLine,
};

export function EventTimeline({
  events,
  teamShort,
  playerName,
  emptyMessage = "Belum ada kejadian tercatat.",
}: {
  events: MatchEvent[];
  teamShort: (id?: string) => string;
  playerName: (id?: string) => string;
  emptyMessage?: string;
}) {
  if (events.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ol className="relative space-y-0">
      {[...events]
        .sort((a, b) => b.timestamp - a.timestamp)
        .map((event) => {
          const Icon = ICONS[event.type];
          const isGoal = event.type === "GOAL";
          const card = event.metadata['card'];
          return (
            <li
              key={event.id}
              className="flex items-start gap-3 border-b border-border py-3 last:border-b-0"
            >
              <span className="clock-numeral w-12 shrink-0 pt-0.5 text-sm text-muted-foreground">
                {formatClock(event.timestamp)}
              </span>
              <span
                className={cn(
                  "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-sm",
                  isGoal
                    ? "bg-primary text-primary-foreground"
                    : card === "RED"
                      ? "bg-destructive text-destructive-foreground"
                      : card === "YELLOW"
                        ? "bg-warning text-warning-foreground"
                        : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {MATCH_EVENT_LABEL[event.type]}
                  {event.team_id ? (
                    <span className="ml-2 text-muted-foreground">{teamShort(event.team_id)}</span>
                  ) : null}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {event.player_id ? `${playerName(event.player_id)} • ` : ""}
                  {MATCH_PERIOD_LABEL[event.period]}
                  {typeof card === "string" ? ` • Kartu ${card === "RED" ? "Merah" : "Kuning"}` : ""}
                  {typeof event.metadata['reason'] === "string" ? ` • ${event.metadata['reason']}` : ""}
                </p>
              </div>
            </li>
          );
        })}
    </ol>
  );
}
