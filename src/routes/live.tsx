import { createFileRoute, Link } from "@tanstack/react-router";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Scoreboard } from "@/components/match/Scoreboard";
import { MatchList } from "@/components/match/MatchList";
import { useCompetitionData } from "@/hooks/use-competition-data";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Skor Langsung — Futsal PORPROV Sulsel 2026" },
      {
        name: "description",
        content:
          "Papan skor langsung seluruh pertandingan futsal PORPROV Sulawesi Selatan 2026 yang sedang berlangsung.",
      },
      { property: "og:title", content: "Skor Langsung Futsal PORPROV Sulsel 2026" },
      {
        property: "og:description",
        content: "Pantau skor, babak, dan waktu berjalan setiap pertandingan secara langsung.",
      },
    ],
  }),
  component: LivePage,
});

function LivePage() {
  const { matches, teamById, venueName } = useCompetitionData();
  const live = matches.filter((m) => m.status === "LIVE" || m.status === "HALFTIME");
  const soon = matches.filter((m) => m.status === "CHECK_IN" || m.status === "READY");

  return (
    <PublicLayout>
      <PageHeader
        eyebrow="Siaran Data"
        title="Skor Langsung"
        description="Data diperbarui oleh pencatat skor resmi di setiap lapangan."
      />

      {live.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Belum ada pertandingan live"
            description="Saat ini tidak ada laga yang sedang berjalan. Cek jadwal atau tunggu pertandingan berikutnya dimulai."
            action={
              <Link to="/jadwal" className="text-sm font-medium text-primary hover:underline">
                Lihat jadwal pertandingan
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {live.map((match) => (
            <div key={match.id}>
              <Link to="/pertandingan/$matchId" params={{ matchId: match.id }}>
                <Scoreboard
                  homeName={teamById.get(match.home_team_id)?.name ?? "—"}
                  awayName={teamById.get(match.away_team_id)?.name ?? "—"}
                  homeShort={teamById.get(match.home_team_id)?.short_name ?? "—"}
                  awayShort={teamById.get(match.away_team_id)?.short_name ?? "—"}
                  homeScore={match.home_score}
                  awayScore={match.away_score}
                  period={match.period}
                  status={match.status}
                  clockSeconds={match.clock_seconds}
                />
              </Link>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                {venueName(match.venue_id)} • Lapangan {match.court} • Match #{match.match_number}
              </p>
            </div>
          ))}
        </div>
      )}

      <section className="mt-10">
        <h2 className="mb-3 text-xl font-bold">Akan Segera Dimulai</h2>
        <MatchList matches={soon} emptyMessage="Belum ada pertandingan dalam tahap persiapan." />
      </section>
    </PublicLayout>
  );
}
