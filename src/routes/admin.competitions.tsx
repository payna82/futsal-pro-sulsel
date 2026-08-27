import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "@/components/admin/AdminPage";
import { DataTable, type Column } from "@/components/common/DataTable";
import type { Category } from "@/domain/types";
import { categoriesQuery } from "@/hooks/queries";
import { useCompetitionData } from "@/hooks/use-competition-data";
import { adminHead } from "@/lib/head";

export const Route = createFileRoute("/admin/competitions")({
  head: () =>
    adminHead(
      "Nomor Pertandingan — Panel Panitia Futsal PORPROV Sulsel 2026",
      "Pengaturan nomor pertandingan futsal putra dan putri PORPROV Sulsel 2026.",
    ),
  component: AdminCompetitionsRoute,
});

function AdminCompetitionsRoute() {
  const categories = useQuery(categoriesQuery());
  const data = useCompetitionData();

  const columns: Column<Category>[] = [
    { key: "name", header: "Nomor", cell: (c) => <span className="font-semibold">{c.name}</span> },
    { key: "key", header: "Kunci", hideOnMobile: true, cell: (c) => <code className="font-mono text-xs">{c.key}</code> },
    { key: "format", header: "Format", cell: (c) => c.format },
    { key: "quota", header: "Kuota Tim", cell: (c) => c.team_count },
    {
      key: "teams",
      header: "Tim Terdaftar",
      cell: (c) => data.teams.filter((t) => t.category_id === c.id).length,
    },
    {
      key: "groups",
      header: "Grup",
      hideOnMobile: true,
      cell: (c) => data.groups.filter((g) => g.category_id === c.id && g.stage === "GROUP").length,
    },
    {
      key: "matches",
      header: "Pertandingan",
      cell: (c) => data.matches.filter((m) => m.category_id === c.id).length,
    },
  ];

  return (
    <AdminPage
      permission="competition.manage"
      title="Nomor Pertandingan"
      description="Nomor pertandingan putra dan putri beserta format kompetisinya."
      isLoading={categories.isLoading || data.isLoading}
      isError={categories.isError}
    >
      <div className="mt-6">
        <DataTable
          rows={categories.data ?? []}
          columns={columns}
          getRowId={(c) => c.id}
          emptyMessage="Belum ada nomor pertandingan."
        />
      </div>
    </AdminPage>
  );
}
