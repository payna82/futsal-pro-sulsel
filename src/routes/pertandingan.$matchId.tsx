import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { EventTimeline } from "@/components/match/EventTimeline";
import { Scoreboard } from "@/components/match/Scoreboard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MATCH_STATUS_LABEL } from "@/domain/match-state";
import {
  lineupQuery,
  matchEventsQuery,
  matchOfficialsQuery,
  matchQuery,
  playersQuery,
} from "@/hooks/queries";
import { useCompetitionData } from "@/hooks/use-competition-data";
import { formatDateTime } from "@/lib/format";

const OFFICIAL_LABEL = {
  COMMISSIONER: "Komisaris Pertandingan",
  REFEREE_1: "Wasit 1",
  REFEREE_2: "Wasit 2",
  THIRD_REFEREE: "Wasit 3",
  TIMEKEEPER: "Pencatat Waktu",
  SCOREKEEPER: "Pencatat Skor",
} as const;

export const Route = createFileRoute("/pertandingan/$matchId")({
  head: () => ({
    meta: [
      { title: "Detail Pertandingan — Futsal PORPROV Sulsel 2026" },
      {
        name: "description",
        content:
          "Skor, susunan pemain, kejadian pertandingan, dan perangkat pertandingan futsal PORPROV Sulsel 2026.",
      },
      { property: "og:title", content: "Detail Pertandingan Futsal PORPROV Sulsel 2026" },
      {
        property: "og:description",
        content: "Linimasa gol, kartu, pelanggaran, dan pergantian pemain.",
      },
    ],
  }),
  component: MatchDetailPage,
});

function MatchDetailPage() {
  const { matchId } = Route.useParams();
  const { data: match } = useQuery(matchQuery(matchId));
  const { data: events = [] } = useQuery(matchEventsQuery(matchId));
  const { data: lineup = [] } = useQuery(lineupQuery(matchId));
  const { data: officials = [] } = useQuery(matchOfficialsQuery(matchId));
  const { data: players = [] } = useQuery(playersQuery());
  const { teamById, venueName, groupName } = useCompetitionData();

  const playerById = new Map(players.map((p) => [p.id, p]));

  if (!match) {
    return (
      <PublicLayout>
        <p className="py-20 text-center text-muted-foreground">Pertandingan tidak ditemukan.</p>
      </PublicLayout>
    );
  }

  const home = teamById.get(match.home_team_id);
  const away = teamById.get(match.away_team_id);
  const fouls = (teamId: string) =>
    events.filter((e) => e.type === "FOUL" && e.team_id === teamId).length;

  return (
    <PublicLayout>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="label-caps text-muted-foreground">
          Match #{match.match_number} • {groupName(match.group_id)} •{" "}
          {MATCH_STATUS_LABEL[match.status]}
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/match/$matchId/control" params={{ matchId: match.id }}>
            Buka Match Center
          </Link>
        </Button>
      </div>

      <Scoreboard
        className="mt-3"
        homeName={home?.name ?? "—"}
        awayName={away?.name ?? "—"}
        homeShort={home?.short_name ?? "—"}
        awayShort={away?.short_name ?? "—"}
        homeScore={match.home_score}
        awayScore={match.away_score}
        period={match.period}
        status={match.status}
        clockSeconds={match.clock_seconds}
        homeFouls={fouls(match.home_team_id)}
        awayFouls={fouls(match.away_team_id)}
      />

      <p className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>{formatDateTime(match.kickoff_at)}</span>
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3" aria-hidden /> {venueName(match.venue_id)} • Lapangan{" "}
          {match.court}
        </span>
      </p>

      <Tabs defaultValue="linimasa" className="mt-8">
        <TabsList className="flex-wrap">
          <TabsTrigger value="linimasa">Linimasa</TabsTrigger>
          <TabsTrigger value="lineup">Susunan Pemain</TabsTrigger>
          <TabsTrigger value="perangkat">Perangkat</TabsTrigger>
        </TabsList>

        <TabsContent value="linimasa" className="mt-5 rounded-lg border border-border bg-card px-4">
          <EventTimeline
            events={events}
            teamShort={(id) => (id ? (teamById.get(id)?.short_name ?? "—") : "—")}
            playerName={(id) => (id ? (playerById.get(id)?.full_name ?? "—") : "—")}
          />
        </TabsContent>

        <TabsContent value="lineup" className="mt-5 grid gap-4 md:grid-cols-2">
          {[match.home_team_id, match.away_team_id].map((teamId) => (
            <section key={teamId} className="rounded-lg border border-border bg-card p-4">
              <h3 className="font-bold">{teamById.get(teamId)?.name ?? "—"}</h3>
              {(["starting", "bench"] as const).map((kind) => (
                <div key={kind} className="mt-4">
                  <p className="label-caps text-muted-foreground">
                    {kind === "starting" ? "Pemain Inti" : "Cadangan"}
                  </p>
                  <ul className="mt-2 divide-y divide-border">
                    {lineup
                      .filter(
                        (l) => l.team_id === teamId && l.is_starting === (kind === "starting"),
                      )
                      .map((entry) => (
                        <li key={entry.id} className="flex items-center gap-3 py-2 text-sm">
                          <span className="score-numeral w-7 text-lg text-muted-foreground">
                            {entry.shirt_number}
                          </span>
                          <span className="truncate">
                            {playerById.get(entry.player_id)?.full_name ?? "—"}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </TabsContent>

        <TabsContent value="perangkat" className="mt-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {officials.map((official) => (
              <div key={official.id} className="rounded-lg border border-border bg-card p-4">
                <p className="label-caps text-primary">{OFFICIAL_LABEL[official.role]}</p>
                <p className="mt-1 font-medium">{official.full_name}</p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </PublicLayout>
  );
}
