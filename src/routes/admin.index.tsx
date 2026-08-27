import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  Building2,
  CalendarCheck,
  CalendarDays,
  CircleCheck,
  MapPin,
  Users,
  UsersRound,
} from "lucide-react";
import { AdminPage } from "@/components/admin/AdminPage";
import { MatchGrid } from "@/components/admin/MatchGrid";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { isMatchToday } from "@/domain/match-operations";
import { contingentsQuery, playersQuery } from "@/hooks/queries";
import { useCompetitionData } from "@/hooks/use-competition-data";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Dasbor Operasional — Panel Panitia Futsal PORPROV Sulsel 2026" },
      {
        name: "description",
        content:
          "Ringkasan operasional harian futsal PORPROV Sulsel 2026: pertandingan hari ini, laga langsung, peserta, dan venue aktif.",
      },
      { property: "og:title", content: "Dasbor Operasional — Panel Panitia Futsal PORPROV" },
      {
        property: "og:description",
        content: "Ringkasan operasional harian pertandingan futsal PORPROV Sulsel 2026.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminDashboardRoute,
});

function AdminDashboardRoute() {
  const data = useCompetitionData();
  const contingents = useQuery(contingentsQuery());
  const players = useQuery(playersQuery());

  const matches = data.matches;
  const today = matches.filter((m) => isMatchToday(m));
  const live = matches.filter((m) => m.status === "LIVE" || m.status === "HALFTIME");
  const upcoming = matches
    .filter((m) => ["SCHEDULED", "CHECK_IN", "LINEUP", "READY"].includes(m.status))
    .sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at));
  const finished = matches
    .filter((m) => ["FULL_TIME", "CONFIRMED", "PUBLISHED"].includes(m.status))
    .sort((a, b) => b.kickoff_at.localeCompare(a.kickoff_at));

  const alerts = [
    ...matches
      .filter((m) => m.status === "FULL_TIME")
      .map((m) => ({
        id: `confirm-${m.id}`,
        tone: "warning" as const,
        text: `Pertandingan #${m.match_number} menunggu konfirmasi hasil.`,
        matchId: m.id,
      })),
    ...matches
      .filter((m) => m.status === "CONFIRMED")
      .map((m) => ({
        id: `publish-${m.id}`,
        tone: "info" as const,
        text: `Hasil pertandingan #${m.match_number} siap dipublikasikan.`,
        matchId: m.id,
      })),
    ...data.venues
      .filter((v) => !v.is_active)
      .map((v) => ({
        id: `venue-${v.id}`,
        tone: "warning" as const,
        text: `Venue ${v.name} berstatus non-aktif.`,
        matchId: null,
      })),
  ];

  return (
    <AdminPage
      permission="match.manage"
      title="Dasbor Operasional"
      description="Ringkasan operasional pertandingan futsal PORPROV Sulsel 2026."
      isLoading={data.isLoading}
      actions={
        <Button asChild size="sm">
          <Link to="/admin/schedule">Kelola Jadwal</Link>
        </Button>
      }
    >
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pertandingan Hari Ini" value={today.length} icon={CalendarDays} />
        <StatCard label="Sedang Berlangsung" value={live.length} icon={Activity} tone="live" />
        <StatCard label="Akan Datang" value={upcoming.length} icon={CalendarCheck} />
        <StatCard
          label="Selesai"
          value={finished.length}
          icon={CircleCheck}
          tone="success"
        />
        <StatCard label="Kontingen" value={contingents.data?.length ?? 0} icon={Building2} />
        <StatCard label="Tim Terdaftar" value={data.teams.length} icon={UsersRound} />
        <StatCard label="Pemain Terdaftar" value={players.data?.length ?? 0} icon={Users} />
        <StatCard
          label="Venue Aktif"
          value={data.venues.filter((v) => v.is_active).length}
          icon={MapPin}
        />
      </div>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-bold">Pertandingan Langsung</h2>
        <MatchGrid matches={live} emptyMessage="Tidak ada pertandingan yang sedang berlangsung." />
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-bold">Pertandingan Berikutnya</h2>
        <MatchGrid matches={upcoming.slice(0, 6)} emptyMessage="Belum ada jadwal berikutnya." />
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-bold">Hasil Terbaru</h2>
        <MatchGrid matches={finished.slice(0, 6)} emptyMessage="Belum ada hasil pertandingan." />
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-bold">Peringatan Operasional</h2>
        {alerts.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Tidak ada peringatan operasional.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {alerts.map((alert) => (
              <li key={alert.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
                <span
                  className={
                    alert.tone === "warning"
                      ? "size-2 rounded-full bg-warning"
                      : "size-2 rounded-full bg-success"
                  }
                  aria-hidden
                />
                <span className="min-w-0 flex-1">{alert.text}</span>
                {alert.matchId ? (
                  <Button asChild size="sm" variant="outline">
                    <Link to="/match/$matchId/control" params={{ matchId: alert.matchId }}>
                      Buka Match Center
                    </Link>
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-bold">Agenda Hari Ini</h2>
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {today.length === 0 ? (
            <li className="p-6 text-center text-sm text-muted-foreground">
              Tidak ada pertandingan pada tanggal hari ini.
            </li>
          ) : (
            today.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
                <span className="score-numeral">#{m.match_number}</span>
                <span className="min-w-0 flex-1 truncate">
                  {data.teamName(m.home_team_id)} vs {data.teamName(m.away_team_id)}
                </span>
                <span className="text-muted-foreground">{formatDateTime(m.kickoff_at)}</span>
                <StatusBadge status={m.status} />
              </li>
            ))
          )}
        </ul>
      </section>
    </AdminPage>
  );
}
