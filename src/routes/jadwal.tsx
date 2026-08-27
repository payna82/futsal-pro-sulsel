import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { CategoryTabs } from "@/components/common/CategoryTabs";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { MatchList } from "@/components/match/MatchList";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCompetitionData } from "@/hooks/use-competition-data";
import type { CategoryKey } from "@/domain/types";
import { dateKey, formatDate } from "@/lib/format";

export const Route = createFileRoute("/jadwal")({
  head: () => ({
    meta: [
      { title: "Jadwal Pertandingan — Futsal PORPROV Sulsel 2026" },
      {
        name: "description",
        content:
          "Jadwal lengkap pertandingan futsal PORPROV Sulawesi Selatan 2026 per hari, venue, dan lapangan.",
      },
      { property: "og:title", content: "Jadwal Pertandingan Futsal PORPROV Sulsel 2026" },
      {
        property: "og:description",
        content: "Jadwal harian futsal putra dan putri beserta venue dan lapangan.",
      },
    ],
  }),
  component: SchedulePage,
});

function SchedulePage() {
  const { matches, categoryId, venues } = useCompetitionData();
  const [category, setCategory] = useState<CategoryKey>("MEN");
  const [day, setDay] = useState("ALL");
  const [venue, setVenue] = useState("ALL");

  const catId = categoryId(category);
  const days = [...new Set(matches.map((m) => dateKey(m.kickoff_at)))].sort();

  const filtered = matches.filter(
    (m) =>
      m.category_id === catId &&
      (day === "ALL" || dateKey(m.kickoff_at) === day) &&
      (venue === "ALL" || m.venue_id === venue),
  );

  return (
    <PublicLayout>
      <PageHeader
        eyebrow="Kompetisi"
        title="Jadwal Pertandingan"
        description="Jadwal resmi dapat berubah sesuai keputusan panitia pelaksana."
        actions={<CategoryTabs value={category} onChange={setCategory} />}
      />

      <div className="mt-5 flex flex-wrap gap-3">
        <Select value={day} onValueChange={setDay}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Semua hari" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua hari</SelectItem>
            {days.map((d) => (
              <SelectItem key={d} value={d}>
                {formatDate(`${d}T00:00:00+08:00`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={venue} onValueChange={setVenue}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Semua venue" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua venue</SelectItem>
            {venues.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6">
        <MatchList matches={filtered} emptyMessage="Tidak ada pertandingan pada filter ini." />
      </div>
    </PublicLayout>
  );
}
