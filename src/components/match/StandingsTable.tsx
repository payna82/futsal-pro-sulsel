import { TeamCrest } from "@/components/common/TeamCrest";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { StandingRow, Team } from "@/domain/types";
import { cn } from "@/lib/utils";

export function StandingsTable({
  rows,
  teamById,
  qualifyCount = 2,
}: {
  rows: StandingRow[];
  teamById: Map<string, Team>;
  qualifyCount?: number;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-surface hover:bg-surface">
            <TableHead className="label-caps w-10 text-muted-foreground">#</TableHead>
            <TableHead className="label-caps text-muted-foreground">Tim</TableHead>
            <TableHead className="label-caps text-center text-muted-foreground">M</TableHead>
            <TableHead className="label-caps text-center text-muted-foreground">M</TableHead>
            <TableHead className="label-caps text-center text-muted-foreground">S</TableHead>
            <TableHead className="label-caps text-center text-muted-foreground">K</TableHead>
            <TableHead className="label-caps hidden text-center text-muted-foreground sm:table-cell">
              GM
            </TableHead>
            <TableHead className="label-caps hidden text-center text-muted-foreground sm:table-cell">
              GK
            </TableHead>
            <TableHead className="label-caps text-center text-muted-foreground">SG</TableHead>
            <TableHead className="label-caps text-center text-muted-foreground">Poin</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => {
            const team = teamById.get(row.team_id);
            return (
              <TableRow key={row.team_id} className={cn(index < qualifyCount && "bg-success/5")}>
                <TableCell className="score-numeral text-base">{index + 1}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <TeamCrest
                      shortName={team?.short_name ?? "—"}
                      color={team?.primary_color}
                      size="sm"
                    />
                    <span className="truncate text-sm font-medium">{team?.name ?? "—"}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center text-sm">{row.played}</TableCell>
                <TableCell className="text-center text-sm">{row.won}</TableCell>
                <TableCell className="text-center text-sm">{row.drawn}</TableCell>
                <TableCell className="text-center text-sm">{row.lost}</TableCell>
                <TableCell className="hidden text-center text-sm sm:table-cell">
                  {row.goals_for}
                </TableCell>
                <TableCell className="hidden text-center text-sm sm:table-cell">
                  {row.goals_against}
                </TableCell>
                <TableCell className="text-center text-sm">
                  {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                </TableCell>
                <TableCell className="score-numeral text-center text-lg text-primary">
                  {row.points}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
