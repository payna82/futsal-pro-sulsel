import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminPage } from "@/components/admin/AdminPage";
import { DataTable, type Column } from "@/components/common/DataTable";
import { CategoryTabs } from "@/components/common/CategoryTabs";
import type { CategoryKey, Player, PlayerPosition } from "@/domain/types";
import { playersQuery } from "@/hooks/queries";
import { useCompetitionData } from "@/hooks/use-competition-data";
import { adminHead } from "@/lib/head";

export const Route = createFileRoute("/admin/players")({
  head: () =>
    adminHead(
      "Pemain Terdaftar — Panel Panitia Futsal PORPROV Sulsel 2026",
      "Daftar pemain futsal PORPROV Sulsel 2026 beserta nomor punggung, posisi, dan status keabsahan.",
    ),
  component: AdminPlayersRoute,
});

const POSITION_LABEL: Record<PlayerPosition, string> = {
  GOALKEEPER: "Penjaga Gawang",
  ANCHOR: "Anchor",
  FLANK: "Flank",
  PIVOT: "Pivot",
};

const STATUS_LABEL: Record<Player["status"], string> = {
  ELIGIBLE: "Sah",
  PENDING: "Menunggu Verifikasi",
  SUSPENDED: "Sanksi",
};

function AdminPlayersRoute() {
  const data = useCompetitionData();
  const players = useQuery(playersQuery());
  const [category, setCategory] = useState<CategoryKey>("MEN");

  const categoryId = data.categoryId(category);
  const teamIds = new Set(data.teams.filter((t) => t.category_id === categoryId).map((t) => t.id));
  const rows = (players.data ?? []).filter((p) => teamIds.has(p.team_id));

  const columns: Column<Player>[] = [
    {
      key: "no",
      header: "No",
      cell: (p) => <span className="score-numeral">{p.jersey_number}</span>,
    },
    {
      key: "name",
      header: "Nama Pemain",
      cell: (p) => (
        <span className="font-medium">
          {p.full_name}
          {p.is_captain ? <span className="label-caps ml-2 text-primary">Kapten</span> : null}
        </span>
      ),
    },
    { key: "team", header: "Tim", cell: (p) => data.teamName(p.team_id) },
    {
      key: "category",
      header: "Nomor",
      hideOnMobile: true,
      cell: () => data.categories.find((c) => c.id === categoryId)?.name ?? "—",
    },
    {
      key: "position",
      header: "Posisi",
      hideOnMobile: true,
      cell: (p) => POSITION_LABEL[p.position],
    },
    {
      key: "eligibility",
      header: "Keabsahan",
      cell: (p) => (
        <span
          className={
            p.nik_verified ? "label-caps text-success" : "label-caps text-warning-foreground"
          }
        >
          {p.nik_verified ? "Terverifikasi" : "Belum Diverifikasi"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Registrasi",
      cell: (p) => <span className="label-caps">{STATUS_LABEL[p.status]}</span>,
    },
  ];

  return (
    <AdminPage
      permission="player.manage"
      title="Pemain"
      description="Data ringkas pemain untuk kebutuhan operasional. Data pribadi rinci tidak ditampilkan."
      isLoading={data.isLoading || players.isLoading}
      isError={players.isError}
    >
      <div className="mt-6 space-y-4">
        <CategoryTabs value={category} onChange={setCategory} />
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(p) => p.id}
          searchable
          searchPlaceholder="Cari pemain…"
          searchValue={(p) => `${p.full_name} ${data.teamName(p.team_id)}`}
          emptyMessage="Belum ada pemain terdaftar."
        />
      </div>
    </AdminPage>
  );
}
