import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminPage } from "@/components/admin/AdminPage";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import type { Match } from "@/domain/types";
import { useCompetitionData } from "@/hooks/use-competition-data";
import { adminHead } from "@/lib/head";
import { formatShortDate, formatTime } from "@/lib/format";

export const Route = createFileRoute("/admin/matches")({
  head: () =>
    adminHead(
      "Daftar Pertandingan — Panel Panitia Futsal PORPROV Sulsel 2026",
      "Daftar seluruh pertandingan futsal PORPROV Sulsel 2026 beserta status, skor, dan akses Match Center.",
    ),
  component: AdminMatchesRoute,
});

function AdminMatchesRoute() {
  const data = useCompetitionData();

  const columns: Column<Match>[] = [
    {
      key: "no",
      header: "No",
      cell: (m) => <span className="score-numeral">#{m.match_number}</span>,
    },
    {
      key: "category",
      header: "Nomor",
      hideOnMobile: true,
      cell: (m) => data.categories.find((c) => c.id === m.category_id)?.name ?? "—",
    },
    { key: "stage", header: "Babak", hideOnMobile: true, cell: (m) => data.groupName(m.group_id) },
    { key: "home", header: "Tuan Rumah", cell: (m) => data.teamName(m.home_team_id) },
    { key: "away", header: "Tamu", cell: (m) => data.teamName(m.away_team_id) },
    {
      key: "date",
      header: "Tanggal",
      hideOnMobile: true,
      cell: (m) => formatShortDate(m.kickoff_at),
    },
    { key: "time", header: "Jam", hideOnMobile: true, cell: (m) => formatTime(m.kickoff_at) },
    {
      key: "venue",
      header: "Venue",
      hideOnMobile: true,
      cell: (m) => `${data.venueName(m.venue_id)} • Lap. ${m.court}`,
    },
    { key: "status", header: "Status", cell: (m) => <StatusBadge status={m.status} /> },
    {
      key: "score",
      header: "Skor",
      cell: (m) =>
        m.status === "SCHEDULED" || m.status === "CHECK_IN" ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className="score-numeral">
            {m.home_score} : {m.away_score}
          </span>
        ),
    },
    {
      key: "actions",
      header: "Aksi",
      cell: (m) => (
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="ghost">
            <Link to="/pertandingan/$matchId" params={{ matchId: m.id }}>
              Lihat
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/match/$matchId/control" params={{ matchId: m.id }}>
              Kendali
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/admin/schedule">Jadwal</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/admin/reports">Laporan</Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminPage
      permission="match.manage"
      title="Pertandingan"
      description="Seluruh pertandingan pada turnamen ini beserta status operasionalnya."
      isLoading={data.isLoading}
    >
      <div className="mt-6">
        <DataTable
          rows={[...data.matches].sort((a, b) => a.match_number - b.match_number)}
          columns={columns}
          getRowId={(m) => m.id}
          searchable
          searchPlaceholder="Cari pertandingan…"
          searchValue={(m) =>
            `${m.match_number} ${data.teamName(m.home_team_id)} ${data.teamName(m.away_team_id)} ${data.venueName(m.venue_id)}`
          }
          emptyMessage="Belum ada pertandingan."
        />
      </div>
    </AdminPage>
  );
}
