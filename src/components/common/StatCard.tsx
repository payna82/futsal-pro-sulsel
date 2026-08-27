import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "live" | "success" | "warning";
}) {
  const toneClass = {
    default: "text-foreground",
    live: "text-live",
    success: "text-success",
    warning: "text-warning-foreground",
  }[tone];

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="label-caps text-muted-foreground">{label}</p>
        {Icon ? <Icon className={cn("size-4", toneClass)} aria-hidden /> : null}
      </div>
      <p className={cn("score-numeral mt-3 text-4xl", toneClass)}>{value}</p>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
