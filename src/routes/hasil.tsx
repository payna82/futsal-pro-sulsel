import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CategoryTabs } from "@/components/common/CategoryTabs";
import { PageHeader } from "@/components/common/PageHeader";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { MatchList } from "@/components/match/MatchList";
import { useCompetitionData } from "@/hooks/use-competition-data";
import type { CategoryKey } from "@/domain/types";

export const Route = createFileRoute("/hasil")({
  head: () => ({
    meta: [
      { title: "Hasil Pertandingan — Futsal PORPROV Sulsel 2026" },
      {
        name: "description",
        content:
          "Hasil resmi pertandingan futsal PORPROV Sulawesi Selatan 2026 yang telah dikonfirmasi panitia.",
      },
      { property: "og:title", content: "Hasil Pertandingan Futsal PORPROV Sulsel 2026" },
      {
        property: "og:description",
        content: "Seluruh hasil akhir futsal putra dan putri PORPROV Sulsel 2026.",
      },
    ],
  }),
  component: ResultsPage,
});

const FINISHED = new Set(["FULL_TIME", "CONFIRMED", "PUBLISHED"]);

function ResultsPage() {
  const { matches, categoryId } = useCompetitionData();
  const [category, setCategory] = useState<CategoryKey>("MEN");
  const catId = categoryId(category);

  const results = matches.filter((m) => m.category_id === catId && FINISHED.has(m.status));

  return (
    <PublicLayout>
      <PageHeader
        eyebrow="Kompetisi"
        title="Hasil Pertandingan"
        description="Hanya menampilkan pertandingan yang telah selesai dan disahkan komisaris pertandingan."
        actions={<CategoryTabs value={category} onChange={setCategory} />}
      />
      <div className="mt-6">
        <MatchList matches={results} emptyMessage="Belum ada hasil pada nomor ini." />
      </div>
    </PublicLayout>
  );
}
