import { useQueries, useQuery } from "@tanstack/react-query";
import { useActor } from "@/hooks/use-session";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Activity, CircleDot, PauseCircle, RectangleVertical } from "lucide-react";
import { AdminPage } from "@/components/admin/AdminPage";
import { CategoryTabs } from "@/components/common/CategoryTabs";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatCard } from "@/components/common/StatCard";
import { repository } from "@/data";
import type { CategoryKey, StandingRow, TopScorerRow } from "@/domain/types";
import { playersQuery, standingsQuery } from "@/hooks/queries";
import { useCompetitionData } from "@/hooks/use-competition-data";
import { adminHead } from "@/lib/head";

export const Route = createFileRoute("/admin/statistics")({
  head: () =>
    adminHead(
      "Statistik Kompetisi — Panel Panitia Futsal PORPROV Sulsel 2026",
      "Statistik pertandingan, gol, kartu, pelanggaran, tim, dan pencetak gol futsal PORPROV Sulsel 2026.",
    ),
  component: AdminStatisticsRoute,
});

function AdminStatisticsRoute() {
  const data = useCompetitionData();
  const actor = useActor();
  const players = useQuery(playersQuery(actor));
  const [category, setCategory] = useState<CategoryKey>("MEN");
  const categoryId = data.categoryId(category);

  const standings = useQuery({ ...standingsQuery(categoryId), enabled: categoryId !== "" });
  const scorers = useQuery({
    queryKey: ["top-scorers", categoryId],
    queryFn: () => repository.listTopScorers(categoryId),
    enabled: categoryId !== "",
  });

  const eventQueries = useQueries({
    queries: data.matches.map((m) => ({
      queryKey: ["match-events", m.id],
      queryFn: () => repository.listMatchEvents(m.id),
    })),
  });
  const events = eventQueries.flatMap((q) => q.data ?? []);

  const playedMatches = data.matches.filter((m) =>
    ["FULL_TIME", "CONFIRMED", "PUBLISHED"].includes(m.status),
  );
  const goals = events.filter((e) => e.type === "GOAL").length;
  const fouls = events.filter((e) => e.type === "FOUL").length;
  const yellow = events.filter((e) => e.type === "CARD" && e.metadata["card"] === "YELLOW").length;
  const red = events.filter((e) => e.type === "CARD" && e.metadata["card"] === "RED").length;

  const playerName = (id: string) =>
    (players.data ?? []).find((p) => p.id === id)?.full_name ?? "—";

  const scorerColumns: Column<TopScorerRow>[] = [
    { key: "player", header: "Pemain", cell: (r) => playerName(r.player_id) },
    { key: "team", header: "Tim", cell: (r) => data.teamName(r.team_id) },
    { key: "goals", header: "Gol", cell: (r) => <span className="score-numeral">{r.goals}</span> },
  ];

  const teamColumns: Column<StandingRow>[] = [
    { key: "team", header: "Tim", cell: (r) => data.teamName(r.team_id) },
    { key: "played", header: "Main", cell: (r) => r.played },
    { key: "won", header: "Menang", cell: (r) => r.won },
    { key: "drawn", header: "Seri", cell: (r) => r.drawn },
    { key: "lost", header: "Kalah", cell: (r) => r.lost },
    { key: "gf", header: "Gol", cell: (r) => r.goals_for },
    { key: "ga", header: "Kemasukan", hideOnMobile: true, cell: (r) => r.goals_against },
    { key: "pts", header: "Poin", cell: (r) => <span className="score-numeral">{r.points}</span> },
  ];

  return (
    <AdminPage
      permission="statistic.view"
      title="Statistik"
      description="Agregasi statistik memakai logika domain yang telah ada."
      isLoading={data.isLoading}
    >
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Pertandingan Selesai" value={playedMatches.length} icon={Activity} />
        <StatCard label="Total Gol" value={goals} icon={CircleDot} tone="success" />
        <StatCard label="Total Pelanggaran" value={fouls} icon={PauseCircle} />
        <StatCard label="Kartu Kuning" value={yellow} icon={RectangleVertical} tone="warning" />
        <StatCard label="Kartu Merah" value={red} icon={RectangleVertical} tone="live" />
      </div>

      <div className="mt-8 space-y-4">
        <CategoryTabs value={category} onChange={setCategory} />

        <section className="space-y-3">
          <h2 className="text-lg font-bold">Pencetak Gol Terbanyak</h2>
          <DataTable
            rows={scorers.data ?? []}
            columns={scorerColumns}
            getRowId={(r) => r.player_id}
            emptyMessage="Belum ada gol tercatat."
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold">Statistik Tim</h2>
          <DataTable
            rows={standings.data ?? []}
            columns={teamColumns}
            getRowId={(r) => r.team_id}
            emptyMessage="Belum ada data tim."
          />
        </section>
      </div>
    </AdminPage>
  );
}
