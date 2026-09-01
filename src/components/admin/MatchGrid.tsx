import { EmptyState } from "@/components/common/EmptyState";
import { MatchCard } from "@/components/match/MatchCard";
import type { Match } from "@/domain/types";
import { useCompetitionData } from "@/hooks/use-competition-data";

/** Presentasi murni: merangkai MatchCard dari lookup yang sudah ada. */
export function MatchGrid({
  matches,
  emptyMessage = "Tidak ada pertandingan.",
}: {
  matches: Match[];
  emptyMessage?: string;
}) {
  const { teamById, teamName, teamShort, venueName, groupName } = useCompetitionData();

  if (matches.length === 0) {
    return (
      <EmptyState
        title={emptyMessage}
        description="Data pertandingan belum tersedia untuk kondisi saat ini. Silakan cek kembali nanti."
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {matches.map((match) => (
        <MatchCard
          key={match.id}
          match={match}
          homeName={teamName(match.home_team_id)}
          awayName={teamName(match.away_team_id)}
          homeShort={teamShort(match.home_team_id)}
          awayShort={teamShort(match.away_team_id)}
          homeColor={teamById.get(match.home_team_id)?.primary_color}
          awayColor={teamById.get(match.away_team_id)?.primary_color}
          venueName={venueName(match.venue_id)}
          groupName={groupName(match.group_id)}
        />
      ))}
    </div>
  );
}
