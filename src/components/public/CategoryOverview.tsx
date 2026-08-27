import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { TeamCrest } from "@/components/common/TeamCrest";
import { MatchList } from "@/components/match/MatchList";
import { StandingsTable } from "@/components/match/StandingsTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { standingsQuery, topScorersQuery, playersQuery } from "@/hooks/queries";
import { useCompetitionData } from "@/hooks/use-competition-data";
import type { CategoryKey } from "@/domain/types";

export function CategoryOverview({ categoryKey }: { categoryKey: CategoryKey }) {
  const { matches, teams, teamById, groups, categoryId } = useCompetitionData();
  const catId = categoryId(categoryKey);
  const { data: standings = [] } = useQuery({ ...standingsQuery(catId), enabled: Boolean(catId) });
  const { data: scorers = [] } = useQuery({ ...topScorersQuery(catId), enabled: Boolean(catId) });
  const { data: players = [] } = useQuery(playersQuery());

  const categoryMatches = matches.filter((m) => m.category_id === catId);
  const categoryTeams = teams.filter((t) => t.category_id === catId);
  const categoryGroups = groups.filter((g) => g.category_id === catId);
  const playerById = new Map(players.map((p) => [p.id, p]));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Nomor Pertandingan"
        title={categoryKey === "MEN" ? "Futsal Putra" : "Futsal Putri"}
        description={`${categoryTeams.length} tim kontingen kabupaten/kota, ${categoryGroups.length} grup penyisihan, dilanjutkan babak gugur.`}
      />

      <Tabs defaultValue="jadwal">
        <TabsList className="flex-wrap">
          <TabsTrigger value="jadwal">Jadwal & Hasil</TabsTrigger>
          <TabsTrigger value="klasemen">Klasemen</TabsTrigger>
          <TabsTrigger value="tim">Tim</TabsTrigger>
          <TabsTrigger value="skor">Top Skor</TabsTrigger>
        </TabsList>

        <TabsContent value="jadwal" className="mt-5">
          <MatchList matches={categoryMatches} />
        </TabsContent>

        <TabsContent value="klasemen" className="mt-5 space-y-6">
          {categoryGroups.map((group) => (
            <section key={group.id}>
              <h3 className="label-caps mb-2 text-primary">{group.name}</h3>
              <StandingsTable
                rows={standings.filter((row) => row.group_id === group.id)}
                teamById={teamById}
              />
            </section>
          ))}
        </TabsContent>

        <TabsContent value="tim" className="mt-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categoryTeams.map((team) => (
              <Link
                key={team.id}
                to="/tim/$teamId"
                params={{ teamId: team.id }}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary"
              >
                <TeamCrest shortName={team.short_name} color={team.primary_color} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{team.name}</p>
                  <p className="label-caps text-muted-foreground">
                    {categoryGroups.find((g) => g.id === team.group_id)?.name ?? "Tanpa grup"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="skor" className="mt-5">
          <ol className="divide-y divide-border rounded-lg border border-border bg-card">
            {scorers.slice(0, 15).map((row, i) => (
              <li key={row.player_id} className="flex items-center gap-3 p-3">
                <span className="score-numeral w-6 text-lg text-muted-foreground">{i + 1}</span>
                <TeamCrest
                  shortName={teamById.get(row.team_id)?.short_name ?? "—"}
                  color={teamById.get(row.team_id)?.primary_color}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {playerById.get(row.player_id)?.full_name ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {teamById.get(row.team_id)?.name ?? "—"}
                  </p>
                </div>
                <span className="score-numeral text-2xl text-primary">{row.goals}</span>
              </li>
            ))}
          </ol>
        </TabsContent>
      </Tabs>
    </div>
  );
}
