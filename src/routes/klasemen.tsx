import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CategoryTabs } from "@/components/common/CategoryTabs";
import { PageHeader } from "@/components/common/PageHeader";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { StandingsTable } from "@/components/match/StandingsTable";
import { standingsQuery } from "@/hooks/queries";
import { useCompetitionData } from "@/hooks/use-competition-data";
import type { CategoryKey } from "@/domain/types";

export const Route = createFileRoute("/klasemen")({
  head: () => ({
    meta: [
      { title: "Klasemen Grup — Futsal PORPROV Sulsel 2026" },
      {
        name: "description",
        content:
          "Klasemen sementara grup penyisihan futsal putra dan putri PORPROV Sulawesi Selatan 2026.",
      },
      { property: "og:title", content: "Klasemen Futsal PORPROV Sulsel 2026" },
      {
        property: "og:description",
        content: "Perolehan poin, selisih gol, dan peringkat setiap grup penyisihan.",
      },
    ],
  }),
  component: StandingsPage,
});

function StandingsPage() {
  const { groups, teamById, categoryId } = useCompetitionData();
  const [category, setCategory] = useState<CategoryKey>("MEN");
  const catId = categoryId(category);
  const { data: standings = [] } = useQuery({ ...standingsQuery(catId), enabled: Boolean(catId) });

  return (
    <PublicLayout>
      <PageHeader
        eyebrow="Kompetisi"
        title="Klasemen Grup"
        description="Urutan ditentukan oleh poin, selisih gol, gol memasukkan, lalu nilai fair play."
        actions={<CategoryTabs value={category} onChange={setCategory} />}
      />

      <div className="mt-6 space-y-8">
        {groups
          .filter((g) => g.category_id === catId)
          .map((group) => (
            <section key={group.id}>
              <h2 className="label-caps mb-2 text-primary">{group.name}</h2>
              <StandingsTable
                rows={standings.filter((row) => row.group_id === group.id)}
                teamById={teamById}
              />
            </section>
          ))}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Baris berlatar hijau menandakan posisi lolos ke babak semifinal.
      </p>
    </PublicLayout>
  );
}
