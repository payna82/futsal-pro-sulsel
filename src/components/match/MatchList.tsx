import { EmptyState } from "@/components/common/EmptyState";
import { MatchCard } from "@/components/match/MatchCard";
import { useCompetitionData } from "@/hooks/use-competition-data";
import type { Match } from "@/domain/types";
import { dateKey, formatDate } from "@/lib/format";

/** Daftar pertandingan yang dikelompokkan per tanggal. */
export function MatchList({
  matches,
  emptyMessage = "Belum ada pertandingan.",
}: {
  matches: Match[];
  emptyMessage?: string;
}) {
  const { teamById, venueName, groupName } = useCompetitionData();

  if (matches.length === 0) {
    return <EmptyState title={emptyMessage} description="Cek kembali nanti untuk data pertandingan terbaru." />;
  }

  const byDate = new Map<string, Match[]>();
  for (const match of [...matches].sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at))) {
    const key = dateKey(match.kickoff_at);
    byDate.set(key, [...(byDate.get(key) ?? []), match]);
  }

  return (
    <div className="space-y-8">
      {[...byDate.entries()].map(([day, dayMatches]) => (
        <section key={day}>
          <h3 className="label-caps mb-3 text-primary">{formatDate(dayMatches[0]!.kickoff_at)}</h3>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {dayMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                homeName={teamById.get(match.home_team_id)?.name ?? "—"}
                awayName={teamById.get(match.away_team_id)?.name ?? "—"}
                homeShort={teamById.get(match.home_team_id)?.short_name ?? "—"}
                awayShort={teamById.get(match.away_team_id)?.short_name ?? "—"}
                homeColor={teamById.get(match.home_team_id)?.primary_color}
                awayColor={teamById.get(match.away_team_id)?.primary_color}
                venueName={venueName(match.venue_id)}
                groupName={groupName(match.group_id)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
