import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "@/components/admin/AdminPage";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import type { Venue } from "@/domain/types";
import { useCompetitionData } from "@/hooks/use-competition-data";
import { adminHead } from "@/lib/head";

export const Route = createFileRoute("/admin/venues")({
  head: () =>
    adminHead(
      "Venue Pertandingan — Panel Panitia Futsal PORPROV Sulsel 2026",
      "Data venue dan lapangan pertandingan futsal PORPROV Sulsel 2026 beserta beban jadwal.",
    ),
  component: AdminVenuesRoute,
});

function AdminVenuesRoute() {
  const data = useCompetitionData();

  const matchesOf = (id: string) => data.matches.filter((m) => m.venue_id === id);
  const currentMatch = (id: string) =>
    matchesOf(id).find((m) => m.status === "LIVE" || m.status === "HALFTIME") ?? null;

  const columns: Column<Venue>[] = [
    {
      key: "venue",
      header: "Venue",
      cell: (v) => (
        <div>
          <p className="font-semibold">{v.name}</p>
          <p className="text-xs text-muted-foreground">{v.address}</p>
        </div>
      ),
    },
    { key: "city", header: "Kota", hideOnMobile: true, cell: (v) => v.city },
    { key: "court", header: "Lapangan", cell: (v) => v.court_count },
    { key: "capacity", header: "Kapasitas", hideOnMobile: true, cell: (v) => v.capacity },
    { key: "matches", header: "Jumlah Laga", cell: (v) => matchesOf(v.id).length },
    {
      key: "current",
      header: "Laga Berjalan",
      cell: (v) => {
        const m = currentMatch(v.id);
        if (!m) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex items-center gap-2">
            <span className="truncate">
              {data.teamShort(m.home_team_id)} vs {data.teamShort(m.away_team_id)}
            </span>
            <StatusBadge status={m.status} />
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (v) => (
        <span
          className={v.is_active ? "label-caps text-success" : "label-caps text-muted-foreground"}
        >
          {v.is_active ? "Aktif" : "Non-aktif"}
        </span>
      ),
    },
  ];

  return (
    <AdminPage
      permission="venue.manage"
      title="Venue"
      description="Venue dan lapangan yang digunakan pada cabang futsal."
      isLoading={data.isLoading}
    >
      <div className="mt-6">
        <DataTable
          rows={data.venues}
          columns={columns}
          getRowId={(v) => v.id}
          searchable
          searchPlaceholder="Cari venue…"
          searchValue={(v) => `${v.name} ${v.city}`}
          emptyMessage="Belum ada venue."
        />
      </div>
    </AdminPage>
  );
}
