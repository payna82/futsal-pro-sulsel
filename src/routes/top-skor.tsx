import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CategoryTabs } from "@/components/common/CategoryTabs";
import { PageHeader } from "@/components/common/PageHeader";
import { TeamCrest } from "@/components/common/TeamCrest";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { playersQuery, topScorersQuery } from "@/hooks/queries";
import { useCompetitionData } from "@/hooks/use-competition-data";
import type { CategoryKey } from "@/domain/types";

export const Route = createFileRoute("/top-skor")({
  head: () => ({
    meta: [
      { title: "Top Skor — Futsal PORPROV Sulsel 2026" },
      {
        name: "description",
        content:
          "Daftar pencetak gol terbanyak cabang futsal PORPROV Sulawesi Selatan 2026 nomor putra dan putri.",
      },
      { property: "og:title", content: "Top Skor Futsal PORPROV Sulsel 2026" },
      {
        property: "og:description",
        content: "Peringkat pencetak gol terbanyak yang dihitung dari kejadian gol resmi.",
      },
    ],
  }),
  component: TopScorersPage,
});

function TopScorersPage() {
  const { teamById, categoryId } = useCompetitionData();
  const [category, setCategory] = useState<CategoryKey>("MEN");
  const catId = categoryId(category);
  const { data: scorers = [] } = useQuery({ ...topScorersQuery(catId), enabled: Boolean(catId) });
  const { data: players = [] } = useQuery(playersQuery());
  const playerById = new Map(players.map((p) => [p.id, p]));

  return (
    <PublicLayout>
      <PageHeader
        eyebrow="Statistik"
        title="Top Skor"
        description="Dihitung otomatis dari kejadian GOAL yang tercatat pada laporan pertandingan."
        actions={<CategoryTabs value={category} onChange={setCategory} />}
      />
      <ol className="mt-6 divide-y divide-border rounded-lg border border-border bg-card">
        {scorers.map((row, i) => (
          <li key={row.player_id} className="flex items-center gap-3 p-4">
            <span className="score-numeral w-8 text-xl text-muted-foreground">{i + 1}</span>
            <TeamCrest
              shortName={teamById.get(row.team_id)?.short_name ?? "—"}
              color={teamById.get(row.team_id)?.primary_color}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {playerById.get(row.player_id)?.full_name ?? "—"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {teamById.get(row.team_id)?.name ?? "—"}
              </p>
            </div>
            <span className="score-numeral text-3xl text-primary">{row.goals}</span>
          </li>
        ))}
        {scorers.length === 0 ? (
          <li className="p-8 text-center text-sm text-muted-foreground">Belum ada gol tercatat.</li>
        ) : null}
      </ol>
    </PublicLayout>
  );
}
