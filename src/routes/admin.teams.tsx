import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { AdminPage } from "@/components/admin/AdminPage";
import { DataTable, type Column } from "@/components/common/DataTable";
import { TeamCrest } from "@/components/common/TeamCrest";
import type { Team } from "@/domain/types";
import { contingentsQuery, playersQuery, teamOfficialsQuery } from "@/hooks/queries";
import { useCompetitionData } from "@/hooks/use-competition-data";
import { adminHead } from "@/lib/head";

export const Route = createFileRoute("/admin/teams")({
  head: () =>
    adminHead(
      "Tim Peserta — Panel Panitia Futsal PORPROV Sulsel 2026",
      "Daftar tim futsal putra dan putri PORPROV Sulsel 2026 beserta kontingen dan jumlah pemain.",
    ),
  component: AdminTeamsRoute,
});

const TEAM_STATUS_LABEL: Record<Team["status"], string> = {
  REGISTERED: "Terdaftar",
  VERIFIED: "Terverifikasi",
  DISQUALIFIED: "Didiskualifikasi",
};

function AdminTeamsRoute() {
  const data = useCompetitionData();
  const contingents = useQuery(contingentsQuery());
  const players = useQuery(playersQuery(actor));
  const officials = useQuery(teamOfficialsQuery(actor));

  const contingentName = (id: string) => contingents.data?.find((c) => c.id === id)?.name ?? "—";

  const columns: Column<Team>[] = [
    {
      key: "team",
      header: "Tim",
      cell: (t) => (
        <div className="flex items-center gap-3">
          <TeamCrest shortName={t.short_name} color={t.primary_color} size="sm" />
          <span className="font-semibold">{t.name}</span>
        </div>
      ),
    },
    {
      key: "contingent",
      header: "Kontingen",
      hideOnMobile: true,
      cell: (t) => contingentName(t.contingent_id),
    },
    {
      key: "category",
      header: "Nomor",
      cell: (t) => data.categories.find((c) => c.id === t.category_id)?.name ?? "—",
    },
    { key: "group", header: "Grup", hideOnMobile: true, cell: (t) => data.groupName(t.group_id) },
    {
      key: "players",
      header: "Pemain",
      cell: (t) => (players.data ?? []).filter((p) => p.team_id === t.id).length,
    },
    {
      key: "officials",
      header: "Ofisial",
      hideOnMobile: true,
      cell: (t) => (officials.data ?? []).filter((o) => o.team_id === t.id).length,
    },
    {
      key: "status",
      header: "Status",
      cell: (t) => <span className="label-caps">{TEAM_STATUS_LABEL[t.status]}</span>,
    },
    {
      key: "actions",
      header: "Aksi",
      cell: (t) => (
        <Button asChild size="sm" variant="outline">
          <Link to="/admin/teams/$teamId" params={{ teamId: t.id }}>
            Detail
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <AdminPage
      permission="team.manage"
      title="Tim Peserta"
      description="Tim futsal putra dan putri yang terdaftar pada turnamen."
      actions={
        <Button asChild>
          <Link to="/admin/teams/new">Tambah Tim</Link>
        </Button>
      }
      isLoading={data.isLoading}
    >
      <div className="mt-6">
        <DataTable
          rows={data.teams}
          columns={columns}
          getRowId={(t) => t.id}
          searchable
          searchPlaceholder="Cari tim…"
          searchValue={(t) => `${t.name} ${t.short_name} ${contingentName(t.contingent_id)}`}
          emptyMessage="Belum ada tim terdaftar."
        />
      </div>
    </AdminPage>
  );
}
