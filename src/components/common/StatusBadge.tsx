import { cn } from "@/lib/utils";
import { MATCH_STATUS_LABEL } from "@/domain/match-state";
import type { MatchStatus } from "@/domain/types";

const STYLES: Record<MatchStatus, string> = {
  SCHEDULED: "bg-scheduled/10 text-scheduled border-scheduled/30",
  CHECK_IN: "bg-warning/15 text-warning-foreground border-warning/40",
  LINEUP: "bg-warning/15 text-warning-foreground border-warning/40",
  READY: "bg-accent text-accent-foreground border-gold/40",
  LIVE: "bg-live text-live-foreground border-live",
  HALFTIME: "bg-live/15 text-live border-live/40",
  FULL_TIME: "bg-muted text-muted-foreground border-border",
  CONFIRMED: "bg-success/12 text-success border-success/40",
  PUBLISHED: "bg-success text-success-foreground border-success",
};

export function StatusBadge({ status, className }: { status: MatchStatus; className?: string }) {
  return (
    <span
      className={cn(
        "label-caps inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 whitespace-nowrap",
        STYLES[status],
        className,
      )}
    >
      {status === "LIVE" && (
        <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden />
      )}
      {MATCH_STATUS_LABEL[status]}
    </span>
  );
}
