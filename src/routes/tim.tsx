import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CategoryTabs } from "@/components/common/CategoryTabs";
import { PageHeader } from "@/components/common/PageHeader";
import { TeamCrest } from "@/components/common/TeamCrest";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { useCompetitionData } from "@/hooks/use-competition-data";
import type { CategoryKey } from "@/domain/types";

export const Route = createFileRoute("/tim")({
  head: () => ({
    meta: [
      { title: "Tim Peserta — Futsal PORPROV Sulsel 2026" },
      {
        name: "description",
        content:
          "Daftar tim kontingen kabupaten/kota peserta cabang futsal PORPROV Sulawesi Selatan 2026.",
      },
      { property: "og:title", content: "Tim Peserta Futsal PORPROV Sulsel 2026" },
      {
        property: "og:description",
        content: "Kontingen kabupaten/kota yang berlaga pada nomor putra dan putri.",
      },
    ],
  }),
  component: TeamsPage,
});

function TeamsPage() {
  const { teams, groupName, categoryId } = useCompetitionData();
  const [category, setCategory] = useState<CategoryKey>("MEN");
  const catId = categoryId(category);

  return (
    <PublicLayout>
      <PageHeader
        eyebrow="Peserta"
        title="Tim Peserta"
        actions={<CategoryTabs value={category} onChange={setCategory} />}
      />
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {teams
          .filter((t) => t.category_id === catId)
          .map((team) => (
            <Link
              key={team.id}
              to="/tim/$teamId"
              params={{ teamId: team.id }}
              className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary"
            >
              <TeamCrest shortName={team.short_name} color={team.primary_color} size="lg" />
              <div className="min-w-0">
                <p className="truncate font-semibold">{team.name}</p>
                <p className="label-caps text-muted-foreground">{groupName(team.group_id)}</p>
              </div>
            </Link>
          ))}
      </div>
    </PublicLayout>
  );
}
