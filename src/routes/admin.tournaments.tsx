import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "@/components/admin/AdminPage";
import { StatCard } from "@/components/common/StatCard";
import { CalendarDays, MapPin, Trophy, UsersRound } from "lucide-react";
import { contingentsQuery, tournamentQuery } from "@/hooks/queries";
import { useCompetitionData } from "@/hooks/use-competition-data";
import { adminHead } from "@/lib/head";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/tournaments")({
  head: () =>
    adminHead(
      "Pengaturan Turnamen — Panel Panitia Futsal PORPROV Sulsel 2026",
      "Informasi dan pengaturan turnamen futsal PORPROV Sulsel 2026.",
    ),
  component: AdminTournamentsRoute,
});

const STATUS_LABEL = {
  DRAFT: "Draf",
  ACTIVE: "Berjalan",
  COMPLETED: "Selesai",
} as const;

function AdminTournamentsRoute() {
  const tournament = useQuery(tournamentQuery());
  const contingents = useQuery(contingentsQuery());
  const data = useCompetitionData();
  const t = tournament.data;

  return (
    <AdminPage
      permission="tournament.manage"
      title="Turnamen"
      description="Data utama penyelenggaraan cabang olahraga futsal."
      isLoading={tournament.isLoading || data.isLoading}
      isError={tournament.isError}
    >
      {t ? (
        <div className="mt-6 space-y-6">
          <div className="rounded-lg border border-border bg-card p-5">
            <p className="label-caps text-primary">Musim {t.season}</p>
            <h2 className="mt-1 text-2xl font-bold">{t.name}</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t.description}</p>
            <dl className="mt-5 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="label-caps text-muted-foreground">Tuan Rumah</dt>
                <dd className="mt-1 text-sm font-medium">{t.host_city}</dd>
              </div>
              <div>
                <dt className="label-caps text-muted-foreground">Periode</dt>
                <dd className="mt-1 text-sm font-medium">
                  {formatDate(t.start_date)} – {formatDate(t.end_date)}
                </dd>
              </div>
              <div>
                <dt className="label-caps text-muted-foreground">Status</dt>
                <dd className="mt-1 text-sm font-medium">{STATUS_LABEL[t.status]}</dd>
              </div>
            </dl>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Nomor Pertandingan" value={data.categories.length} icon={Trophy} />
            <StatCard label="Kontingen" value={contingents.data?.length ?? 0} icon={UsersRound} />
            <StatCard label="Venue" value={data.venues.length} icon={MapPin} />
            <StatCard label="Total Pertandingan" value={data.matches.length} icon={CalendarDays} />
          </div>

          <p className="text-xs text-muted-foreground">
            Perubahan data turnamen akan tersedia setelah layanan backend aktif.
          </p>
        </div>
      ) : null}
    </AdminPage>
  );
}
