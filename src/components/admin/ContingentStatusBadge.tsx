import { cn } from "@/lib/utils";
import type { Contingent } from "@/domain/types";

const statusLabels: Record<Contingent["status"], string> = {
  PENDING: "Menunggu Verifikasi",
  VERIFIED: "Disetujui / Aktif",
  REJECTED: "Ditolak",
  DEACTIVATED: "Dinonaktifkan",
};

const statusClasses: Record<Contingent["status"], string> = {
  PENDING: "inline-flex items-center rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning-foreground",
  VERIFIED: "inline-flex items-center rounded-full border border-success/40 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success-foreground",
  REJECTED: "inline-flex items-center rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive-foreground",
  DEACTIVATED: "inline-flex items-center rounded-full border border-muted/40 bg-muted/10 px-2.5 py-1 text-xs font-semibold text-muted-foreground",
};

export interface ContingentStatusBadgeProps {
  status: Contingent["status"];
  showLabel?: boolean;
  className?: string;
}

export function ContingentStatusBadge({
  status,
  showLabel = true,
  className,
}: ContingentStatusBadgeProps) {
  return (
    <span className={cn(statusClasses[status], className)}>
      {showLabel && statusLabels[status]}
    </span>
  );
}
