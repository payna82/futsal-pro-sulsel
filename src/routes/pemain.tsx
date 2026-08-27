import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CategoryTabs } from "@/components/common/CategoryTabs";
import { DataTable, type Column } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import { TeamCrest } from "@/components/common/TeamCrest";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Badge } from "@/components/ui/badge";
import { playersQuery } from "@/hooks/queries";
import { useCompetitionData } from "@/hooks/use-competition-data";
import type { CategoryKey, Player } from "@/domain/types";

const POSITION_LABEL = {
  GOALKEEPER: "Penjaga Gawang",
  ANCHOR: "Anchor",
  FLANK: "Flank",
  PIVOT: "Pivot",
} as const;

export const Route = createFileRoute("/pemain")({
  head: () => ({
    meta: [
      { title: "Daftar Pemain — Futsal PORPROV Sulsel 2026" },
      {
        name: "description",
        content:
          "Database pemain futsal PORPROV Sulawesi Selatan 2026 lengkap dengan tim, nomor punggung, dan posisi.",
      },
      { property: "og:title", content: "Daftar Pemain Futsal PORPROV Sulsel 2026" },
      {
        property: "og:description",
        content: "Pencarian pemain berdasarkan nama dan kontingen.",
      },
    ],
  }),
  component: PlayersPage,
});

function PlayersPage() {
  const { teamById, teams, categoryId } = useCompetitionData();
  const { data: players = [] } = useQuery(playersQuery());
  const [category, setCategory] = useState<CategoryKey>("MEN");
  const catId = categoryId(category);
  const teamIds = new Set(teams.filter((t) => t.category_id === catId).map((t) => t.id));
  const rows = players.filter((p) => teamIds.has(p.team_id));

  const columns: Column<Player>[] = [
    {
      key: "no",
      header: "No",
      cell: (p) => <span className="score-numeral text-lg">{p.jersey_number}</span>,
      className: "w-14",
    },
    { key: "name", header: "Nama Pemain", cell: (p) => <span className="font-medium">{p.full_name}</span> },
    {
      key: "team",
      header: "Tim",
      cell: (p) => (
        <div className="flex items-center gap-2">
          <TeamCrest
            shortName={teamById.get(p.team_id)?.short_name ?? "—"}
            color={teamById.get(p.team_id)?.primary_color}
            size="sm"
          />
          <span className="truncate">{teamById.get(p.team_id)?.name ?? "—"}</span>
        </div>
      ),
    },
    {
      key: "pos",
      header: "Posisi",
      cell: (p) => POSITION_LABEL[p.position],
      hideOnMobile: true,
    },
    {
      key: "status",
      header: "Status",
      cell: (p) => (
        <Badge variant={p.status === "ELIGIBLE" ? "default" : "secondary"}>
          {p.status === "ELIGIBLE" ? "Sah" : p.status === "PENDING" ? "Verifikasi" : "Sanksi"}
        </Badge>
      ),
      hideOnMobile: true,
    },
  ];

  return (
    <PublicLayout>
      <PageHeader
        eyebrow="Peserta"
        title="Daftar Pemain"
        actions={<CategoryTabs value={category} onChange={setCategory} />}
      />
      <div className="mt-6">
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(p) => p.id}
          searchable
          searchPlaceholder="Cari nama pemain…"
          searchValue={(p) => `${p.full_name} ${teamById.get(p.team_id)?.name ?? ""}`}
        />
      </div>
    </PublicLayout>
  );
}
