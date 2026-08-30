import { useQuery } from "@tanstack/react-query";
import { useActor } from "@/hooks/use-session";
import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "@/components/admin/AdminPage";
import { DataTable, type Column } from "@/components/common/DataTable";
import type { Contingent } from "@/domain/types";
import { contingentsQuery, playersQuery, teamOfficialsQuery } from "@/hooks/queries";
import { useCompetitionData } from "@/hooks/use-competition-data";
import { adminHead } from "@/lib/head";

export const Route = createFileRoute("/admin/contingents")({
  head: () =>
    adminHead(
      "Kontingen — Panel Panitia Futsal PORPROV Sulsel 2026",
      "Data kontingen kabupaten/kota peserta cabang futsal PORPROV Sulsel 2026.",
    ),
  component: AdminContingentsRoute,
});

function AdminContingentsRoute() {
  const contingents = useQuery(contingentsQuery());
  const actor = useActor();
  const players = useQuery(playersQuery(actor));
  const officials = useQuery(teamOfficialsQuery(actor));
  const { teams, isLoading } = useCompetitionData();

  const rows = contingents.data ?? [];

  const teamsOf = (id: string) => teams.filter((t) => t.contingent_id === id);
  const playerCount = (id: string) => {
    const ids = new Set(teamsOf(id).map((t) => t.id));
    return (players.data ?? []).filter((p) => ids.has(p.team_id)).length;
  };
  const officialCount = (id: string) => {
    const ids = new Set(teamsOf(id).map((t) => t.id));
    return (officials.data ?? []).filter((o) => ids.has(o.team_id)).length;
  };

  const columns: Column<Contingent>[] = [
    {
      key: "name",
      header: "Kontingen",
      cell: (c) => <span className="font-semibold">{c.name}</span>,
    },
    { key: "region", header: "Kode Wilayah", hideOnMobile: true, cell: (c) => c.region_code },
    { key: "teams", header: "Tim", cell: (c) => teamsOf(c.id).length },
    { key: "players", header: "Pemain", cell: (c) => playerCount(c.id) },
    { key: "officials", header: "Ofisial", hideOnMobile: true, cell: (c) => officialCount(c.id) },
    { key: "manager", header: "Manajer", hideOnMobile: true, cell: (c) => c.manager_name },
    {
      key: "status",
      header: "Status",
      cell: (c) =>
        teamsOf(c.id).length > 0 ? (
          <span className="label-caps text-success">Terverifikasi</span>
        ) : (
          <span className="label-caps text-muted-foreground">Belum ada tim</span>
        ),
    },
  ];

  return (
    <AdminPage
      permission="contingent.manage"
      title="Kontingen"
      description="Kontingen kabupaten/kota peserta cabang olahraga futsal."
      isLoading={isLoading || contingents.isLoading}
      isError={contingents.isError}
    >
      <div className="mt-6">
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(c) => c.id}
          searchable
          searchPlaceholder="Cari kontingen…"
          searchValue={(c) => `${c.name} ${c.short_name} ${c.region_code}`}
          emptyMessage="Belum ada kontingen terdaftar."
        />
      </div>
    </AdminPage>
  );
}
