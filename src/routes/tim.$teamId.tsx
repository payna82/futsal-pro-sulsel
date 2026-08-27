import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { TeamCrest } from "@/components/common/TeamCrest";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { MatchList } from "@/components/match/MatchList";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { playersQuery, teamOfficialsQuery } from "@/hooks/queries";
import { useCompetitionData } from "@/hooks/use-competition-data";

const POSITION_LABEL = {
  GOALKEEPER: "Penjaga Gawang",
  ANCHOR: "Anchor",
  FLANK: "Flank",
  PIVOT: "Pivot",
} as const;

const OFFICIAL_LABEL = {
  HEAD_COACH: "Pelatih Kepala",
  ASSISTANT_COACH: "Asisten Pelatih",
  MANAGER: "Manajer Tim",
  PHYSIO: "Fisioterapis",
  DOCTOR: "Dokter Tim",
} as const;

export const Route = createFileRoute("/tim/$teamId")({
  head: () => ({
    meta: [
      { title: "Profil Tim — Futsal PORPROV Sulsel 2026" },
      {
        name: "description",
        content:
          "Skuad pemain, ofisial tim, dan jadwal pertandingan kontingen pada cabang futsal PORPROV Sulsel 2026.",
      },
      { property: "og:title", content: "Profil Tim Futsal PORPROV Sulsel 2026" },
      {
        property: "og:description",
        content: "Daftar pemain, nomor punggung, posisi, dan jadwal tim kontingen.",
      },
    ],
  }),
  component: TeamDetailPage,
});

function TeamDetailPage() {
  const { teamId } = Route.useParams();
  const { teams, matches, groupName } = useCompetitionData();
  const { data: players = [] } = useQuery(playersQuery());
  const { data: officials = [] } = useQuery(teamOfficialsQuery());

  const team = teams.find((t) => t.id === teamId);
  const squad = players.filter((p) => p.team_id === teamId);
  const staff = officials.filter((o) => o.team_id === teamId);
  const teamMatches = matches.filter((m) => m.home_team_id === teamId || m.away_team_id === teamId);

  if (!team) {
    return (
      <PublicLayout>
        <p className="py-20 text-center text-muted-foreground">Tim tidak ditemukan.</p>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="flex items-center gap-4">
        <TeamCrest shortName={team.short_name} color={team.primary_color} size="lg" />
        <PageHeader eyebrow={groupName(team.group_id)} title={team.name} />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-bold">Skuad Pemain</h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-surface hover:bg-surface">
                <TableHead className="label-caps w-14 text-muted-foreground">No</TableHead>
                <TableHead className="label-caps text-muted-foreground">Nama Pemain</TableHead>
                <TableHead className="label-caps text-muted-foreground">Posisi</TableHead>
                <TableHead className="label-caps text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {squad.map((player) => (
                <TableRow key={player.id}>
                  <TableCell className="score-numeral text-lg">{player.jersey_number}</TableCell>
                  <TableCell className="text-sm font-medium">
                    {player.full_name}
                    {player.is_captain ? (
                      <Badge variant="outline" className="ml-2">
                        Kapten
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm">{POSITION_LABEL[player.position]}</TableCell>
                  <TableCell>
                    <Badge variant={player.status === "ELIGIBLE" ? "default" : "secondary"}>
                      {player.status === "ELIGIBLE"
                        ? "Sah"
                        : player.status === "PENDING"
                          ? "Verifikasi"
                          : "Sanksi"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-bold">Ofisial Tim</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((official) => (
            <div key={official.id} className="rounded-lg border border-border bg-card p-4">
              <p className="label-caps text-primary">{OFFICIAL_LABEL[official.role]}</p>
              <p className="mt-1 font-medium">{official.full_name}</p>
              {official.license_number ? (
                <p className="text-xs text-muted-foreground">Lisensi {official.license_number}</p>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-bold">Jadwal & Hasil Tim</h2>
        <MatchList matches={teamMatches} />
      </section>
    </PublicLayout>
  );
}
