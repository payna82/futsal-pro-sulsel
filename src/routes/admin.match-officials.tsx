import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AdminPage } from "@/components/admin/AdminPage";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ROLE_LABEL } from "@/domain/permissions";
import type { MatchOfficialRole, RoleKey } from "@/domain/types";
import { useAssignMatchOfficial } from "@/hooks/mutations";
import { matchOfficialsQuery, usersQuery } from "@/hooks/queries";
import { useCompetitionData } from "@/hooks/use-competition-data";
import { useSession } from "@/hooks/use-session";
import { adminHead } from "@/lib/head";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/admin/match-officials")({
  head: () =>
    adminHead(
      "Penugasan Perangkat — Panel Panitia Futsal PORPROV Sulsel 2026",
      "Penugasan wasit, pencatat waktu, pencatat skor, dan komisaris pertandingan futsal PORPROV Sulsel 2026.",
    ),
  component: AdminMatchOfficialsRoute,
});

const ASSIGNMENT_ROLES: Array<{ role: MatchOfficialRole; label: string; eligible: RoleKey[] }> = [
  { role: "COMMISSIONER", label: "Komisaris Pertandingan", eligible: ["MATCH_COMMISSIONER"] },
  { role: "REFEREE_1", label: "Wasit 1", eligible: ["REFEREE"] },
  { role: "REFEREE_2", label: "Wasit 2", eligible: ["REFEREE"] },
  { role: "THIRD_REFEREE", label: "Wasit Ketiga", eligible: ["REFEREE"] },
  { role: "TIMEKEEPER", label: "Pencatat Waktu", eligible: ["TIMEKEEPER"] },
  { role: "SCOREKEEPER", label: "Pencatat Skor", eligible: ["SCOREKEEPER"] },
];

function AdminMatchOfficialsRoute() {
  const data = useCompetitionData();
  const users = useQuery(usersQuery());
  const { user } = useSession();
  const [matchId, setMatchId] = useState("");

  const sortedMatches = [...data.matches].sort((a, b) => a.match_number - b.match_number);
  const activeId = matchId || sortedMatches[0]?.id || "";
  const match = sortedMatches.find((m) => m.id === activeId) ?? null;
  const assignments = useQuery({ ...matchOfficialsQuery(activeId), enabled: activeId !== "" });
  const assign = useAssignMatchOfficial();

  const assigned = assignments.data ?? [];
  const usedUserIds = new Set(assigned.map((a) => a.user_id));

  return (
    <AdminPage
      permission="official.manage"
      title="Perangkat Pertandingan"
      description="Tugaskan wasit, pencatat waktu, pencatat skor, dan komisaris untuk setiap pertandingan."
      isLoading={data.isLoading || users.isLoading}
      isError={users.isError}
    >
      <div className="mt-6 space-y-6">
        <div className="max-w-md space-y-1">
          <Label className="label-caps text-muted-foreground">Pertandingan</Label>
          <Select value={activeId} onValueChange={setMatchId}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih pertandingan" />
            </SelectTrigger>
            <SelectContent>
              {sortedMatches.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  #{m.match_number} • {data.teamShort(m.home_team_id)} vs {data.teamShort(m.away_team_id)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {match ? (
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="score-numeral text-lg">#{match.match_number}</span>
              <span className="font-semibold">
                {data.teamName(match.home_team_id)} vs {data.teamName(match.away_team_id)}
              </span>
              <StatusBadge status={match.status} />
              <span className="text-sm text-muted-foreground">
                {formatDateTime(match.kickoff_at)} • {data.venueName(match.venue_id)} • Lap. {match.court}
              </span>
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          {ASSIGNMENT_ROLES.map((slot) => {
            const current = assigned.find((a) => a.role === slot.role) ?? null;
            const candidates = (users.data ?? []).filter(
              (u) =>
                u.is_active &&
                slot.eligible.includes(u.role) &&
                (!usedUserIds.has(u.id) || current?.user_id === u.id),
            );
            return (
              <div key={slot.role} className="space-y-2 rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="label-caps text-muted-foreground">{slot.label}</p>
                  <p className="text-sm font-semibold">{current?.full_name ?? "Belum ditugaskan"}</p>
                </div>
                <Select
                  value={current?.user_id ?? ""}
                  onValueChange={(userId) => {
                    if (!user) {
                      toast.error("Sesi operator tidak ditemukan.");
                      return;
                    }
                    assign.mutate(
                      { match_id: activeId, role: slot.role, user_id: userId, operator_id: user.id },
                      {
                        onSuccess: () => toast.success(`${slot.label} diperbarui.`),
                        onError: (err) =>
                          toast.error(err instanceof Error ? err.message : "Penugasan gagal."),
                      },
                    );
                  }}
                  disabled={assign.isPending || activeId === ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Pilih ${slot.label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.length === 0 ? (
                      <SelectItem value="none" disabled>
                        Tidak ada petugas tersedia
                      </SelectItem>
                    ) : (
                      candidates.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.full_name} • {ROLE_LABEL[u.role]}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          Petugas yang sudah ditugaskan pada pertandingan ini tidak dapat dipilih untuk peran lain.
          Validasi akhir tetap dilakukan backend.
        </p>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => assignments.refetch()} disabled={assignments.isFetching}>
            Muat Ulang Penugasan
          </Button>
        </div>
      </div>
    </AdminPage>
  );
}
