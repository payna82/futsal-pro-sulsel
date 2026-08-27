import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, FileBarChart, Printer } from "lucide-react";
import { toast } from "sonner";
import { AdminPage } from "@/components/admin/AdminPage";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Match } from "@/domain/types";
import { useCompetitionData } from "@/hooks/use-competition-data";
import { adminHead } from "@/lib/head";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/admin/reports")({
  head: () =>
    adminHead(
      "Laporan Kompetisi — Panel Panitia Futsal PORPROV Sulsel 2026",
      "Laporan pertandingan, kompetisi, disiplin, gol, tim, dan pemain futsal PORPROV Sulsel 2026.",
    ),
  component: AdminReportsRoute,
});

const REPORT_KINDS = [
  { key: "match", label: "Laporan Pertandingan", description: "Berita acara per pertandingan." },
  { key: "competition", label: "Laporan Kompetisi", description: "Rekap keseluruhan turnamen." },
  { key: "discipline", label: "Laporan Disiplin", description: "Rekap kartu dan sanksi." },
  { key: "scoring", label: "Laporan Gol", description: "Rekap gol dan pencetak gol." },
  { key: "team", label: "Laporan Tim", description: "Rekap performa tim." },
  { key: "player", label: "Laporan Pemain", description: "Rekap performa pemain." },
];

function AdminReportsRoute() {
  const data = useCompetitionData();

  const notReady = () => toast.info("Ekspor akan tersedia setelah layanan backend aktif.");

  const columns: Column<Match>[] = [
    {
      key: "no",
      header: "No",
      cell: (m) => <span className="score-numeral">#{m.match_number}</span>,
    },
    {
      key: "teams",
      header: "Pertandingan",
      cell: (m) => `${data.teamName(m.home_team_id)} vs ${data.teamName(m.away_team_id)}`,
    },
    { key: "time", header: "Waktu", hideOnMobile: true, cell: (m) => formatDateTime(m.kickoff_at) },
    { key: "status", header: "Status", cell: (m) => <StatusBadge status={m.status} /> },
    {
      key: "score",
      header: "Skor",
      cell: (m) => (
        <span className="score-numeral">
          {m.home_score} : {m.away_score}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Aksi",
      cell: (m) => (
        <div className="flex gap-2">
          <Button asChild size="sm" variant="ghost">
            <Link to="/pertandingan/$matchId" params={{ matchId: m.id }}>
              Pratinjau
            </Link>
          </Button>
          <Button size="sm" variant="outline" onClick={notReady}>
            <Printer className="size-4" aria-hidden /> Cetak
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminPage
      permission="report.view"
      title="Laporan"
      description="Pusat laporan operasional. Ekspor berkas menyusul setelah backend tersedia."
      isLoading={data.isLoading}
      actions={
        <Button variant="outline" onClick={notReady}>
          <Download className="size-4" aria-hidden /> Ekspor Semua
        </Button>
      }
    >
      <Tabs defaultValue="match" className="mt-6 space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="match">Pertandingan</TabsTrigger>
          <TabsTrigger value="other">Laporan Lain</TabsTrigger>
        </TabsList>
        <TabsContent value="match">
          <DataTable
            rows={[...data.matches].sort((a, b) => a.match_number - b.match_number)}
            columns={columns}
            getRowId={(m) => m.id}
            searchable
            searchPlaceholder="Cari pertandingan…"
            searchValue={(m) =>
              `${m.match_number} ${data.teamName(m.home_team_id)} ${data.teamName(m.away_team_id)}`
            }
            emptyMessage="Belum ada pertandingan."
          />
        </TabsContent>
        <TabsContent value="other">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {REPORT_KINDS.filter((r) => r.key !== "match").map((report) => (
              <div key={report.key} className="rounded-lg border border-border bg-card p-4">
                <FileBarChart className="size-5 text-primary" aria-hidden />
                <p className="mt-3 font-semibold">{report.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{report.description}</p>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" onClick={notReady}>
                    Cetak
                  </Button>
                  <Button size="sm" variant="ghost" onClick={notReady}>
                    Ekspor
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </AdminPage>
  );
}
