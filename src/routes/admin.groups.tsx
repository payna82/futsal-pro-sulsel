import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminPage } from "@/components/admin/AdminPage";
import { CategoryTabs } from "@/components/common/CategoryTabs";
import { StandingsTable } from "@/components/match/StandingsTable";
import type { CategoryKey } from "@/domain/types";
import { standingsQuery } from "@/hooks/queries";
import { useCompetitionData } from "@/hooks/use-competition-data";
import { adminHead } from "@/lib/head";

export const Route = createFileRoute("/admin/groups")({
  head: () =>
    adminHead(
      "Grup & Klasemen — Panel Panitia Futsal PORPROV Sulsel 2026",
      "Pembagian grup dan klasemen sementara cabang futsal PORPROV Sulsel 2026.",
    ),
  component: AdminGroupsRoute,
});

function AdminGroupsRoute() {
  const data = useCompetitionData();
  const [category, setCategory] = useState<CategoryKey>("MEN");
  const categoryId = data.categoryId(category);
  const standings = useQuery({ ...standingsQuery(categoryId), enabled: categoryId !== "" });

  const groups = data.groups.filter((g) => g.category_id === categoryId && g.stage === "GROUP");
  const rows = standings.data ?? [];

  return (
    <AdminPage
      permission="group.manage"
      title="Grup & Klasemen"
      description="Klasemen dihitung dari hasil pertandingan resmi memakai agregasi domain yang ada."
      isLoading={data.isLoading}
      isError={standings.isError}
    >
      <div className="mt-6 space-y-6">
        <CategoryTabs value={category} onChange={setCategory} />

        {groups.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Belum ada grup pada nomor ini.
          </p>
        ) : (
          groups.map((group) => {
            const groupRows = rows.filter((r) => r.group_id === group.id);
            const groupTeams = data.teams.filter((t) => t.group_id === group.id);
            const groupMatches = data.matches.filter((m) => m.group_id === group.id);
            return (
              <section key={group.id} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-bold">{group.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {groupTeams.length} tim • {groupMatches.length} pertandingan
                  </p>
                </div>
                {standings.isLoading ? (
                  <p className="text-sm text-muted-foreground">Memuat klasemen…</p>
                ) : (
                  <StandingsTable rows={groupRows} teamById={data.teamById} />
                )}
              </section>
            );
          })
        )}
      </div>
    </AdminPage>
  );
}
