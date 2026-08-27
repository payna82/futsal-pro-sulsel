import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { AdminPage } from "@/components/admin/AdminPage";
import { DataTable, type Column } from "@/components/common/DataTable";
import type { AuditLog } from "@/domain/types";
import { auditLogsQuery } from "@/hooks/queries";
import { adminHead } from "@/lib/head";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/admin/audit-logs")({
  head: () =>
    adminHead(
      "Log Audit — Panel Panitia Futsal PORPROV Sulsel 2026",
      "Catatan audit tidak dapat diubah untuk seluruh aksi operasional futsal PORPROV Sulsel 2026.",
    ),
  component: AdminAuditLogsRoute,
});

function AdminAuditLogsRoute() {
  const logs = useQuery(auditLogsQuery());

  const columns: Column<AuditLog>[] = [
    { key: "time", header: "Waktu", cell: (l) => formatDateTime(l.created_at) },
    { key: "actor", header: "Aktor", cell: (l) => l.actor_name },
    {
      key: "action",
      header: "Aksi",
      cell: (l) => <code className="font-mono text-xs">{l.action}</code>,
    },
    { key: "entity", header: "Sumber Daya", hideOnMobile: true, cell: (l) => l.entity },
    {
      key: "entity_id",
      header: "ID",
      hideOnMobile: true,
      cell: (l) => <code className="font-mono text-xs">{l.entity_id}</code>,
    },
    { key: "summary", header: "Hasil", cell: (l) => l.summary },
  ];

  const rows = [...(logs.data ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <AdminPage
      permission="audit.view"
      title="Log Audit"
      description="Riwayat aksi operasional pada sistem."
      isLoading={logs.isLoading}
      isError={logs.isError}
    >
      <div className="mt-6 space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4">
          <Lock className="mt-0.5 size-4 text-primary" aria-hidden />
          <p className="text-sm text-muted-foreground">
            Catatan audit bersifat <strong>append-only</strong> dan tidak dapat diubah maupun
            dihapus, termasuk oleh Super Admin. Setiap koreksi data tercatat sebagai entri baru.
          </p>
        </div>
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(l) => l.id}
          searchable
          searchPlaceholder="Cari aksi atau aktor…"
          searchValue={(l) => `${l.actor_name} ${l.action} ${l.entity} ${l.summary}`}
          emptyMessage="Belum ada catatan audit."
        />
      </div>
    </AdminPage>
  );
}
