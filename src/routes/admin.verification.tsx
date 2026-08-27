import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AdminPage } from "@/components/admin/AdminPage";
import { DataTable, type Column } from "@/components/common/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Player, TeamOfficial } from "@/domain/types";
import { useReviewRegistration } from "@/hooks/mutations";
import { playersQuery, registrationDocumentsQuery, teamOfficialsQuery } from "@/hooks/queries";
import { useCompetitionData } from "@/hooks/use-competition-data";
import { adminHead } from "@/lib/head";

export const Route = createFileRoute("/admin/verification")({
  head: () =>
    adminHead("Pusat Verifikasi - Panel Panitia", "Pemeriksaan pemain, ofisial, dan dokumen."),
  component: VerificationPage,
});

function VerificationPage() {
  const data = useCompetitionData();
  const players = useQuery(playersQuery());
  const officials = useQuery(teamOfficialsQuery());
  const documents = useQuery(registrationDocumentsQuery());
  const review = useReviewRegistration();
  const [reason, setReason] = useState("");
  const pendingPlayers = (players.data ?? []).filter(
    (player) =>
      player.status === "PENDING" ||
      documents.data?.some(
        (document) =>
          document.entity_id === player.id &&
          ["UPLOADED", "REVISION_REQUIRED"].includes(document.status),
      ),
  );
  const actions = (entityType: "PLAYER" | "OFFICIAL", entityId: string) => (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        disabled={review.isPending}
        onClick={() =>
          review.mutate(
            { entityType, entityId, action: "APPROVED" },
            { onSuccess: () => toast.success("Data disetujui.") },
          )
        }
      >
        Setujui
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={review.isPending || reason.trim().length < 3}
        onClick={() =>
          review.mutate(
            { entityType, entityId, action: "REVISION_REQUESTED", reason },
            {
              onSuccess: () => {
                setReason("");
                toast.success("Revisi diminta.");
              },
            },
          )
        }
      >
        Minta Revisi
      </Button>
      <Button
        size="sm"
        variant="destructive"
        disabled={review.isPending || reason.trim().length < 3}
        onClick={() =>
          review.mutate(
            { entityType, entityId, action: "REJECTED", reason },
            {
              onSuccess: () => {
                setReason("");
                toast.success("Data ditolak.");
              },
            },
          )
        }
      >
        Tolak
      </Button>
    </div>
  );
  const playerColumns: Column<Player>[] = [
    { key: "name", header: "Pemain", cell: (player) => player.full_name },
    { key: "team", header: "Tim", cell: (player) => data.teamName(player.team_id) },
    {
      key: "status",
      header: "Status",
      cell: (player) => (
        <Badge variant={player.status === "ELIGIBLE" ? "default" : "secondary"}>
          {player.status}
        </Badge>
      ),
    },
    { key: "actions", header: "Aksi", cell: (player) => actions("PLAYER", player.id) },
  ];
  const officialColumns: Column<TeamOfficial>[] = [
    { key: "name", header: "Ofisial", cell: (official) => official.full_name },
    { key: "team", header: "Tim", cell: (official) => data.teamName(official.team_id) },
    { key: "role", header: "Peran", cell: (official) => official.role },
    { key: "actions", header: "Aksi", cell: (official) => actions("OFFICIAL", official.id) },
  ];
  return (
    <AdminPage
      permission="player.verify"
      title="Pusat Verifikasi"
      description="Periksa pemain, ofisial, dan dokumen sebelum persetujuan."
      isLoading={data.isLoading || players.isLoading || officials.isLoading}
    >
      <div className="mt-6 space-y-6">
        <Textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Alasan revisi atau penolakan"
        />
        <section>
          <h2 className="mb-3 text-lg font-bold">Pemain</h2>
          <DataTable
            rows={pendingPlayers}
            columns={playerColumns}
            getRowId={(player) => player.id}
            searchable
            searchPlaceholder="Cari pemain atau tim..."
            searchValue={(player) => `${player.full_name} ${data.teamName(player.team_id)}`}
            emptyMessage="Tidak ada pemain menunggu verifikasi."
          />
        </section>
        <section>
          <h2 className="mb-3 text-lg font-bold">Ofisial Tim</h2>
          <DataTable
            rows={officials.data ?? []}
            columns={officialColumns}
            getRowId={(official) => official.id}
            searchable
            searchPlaceholder="Cari ofisial atau tim..."
            searchValue={(official) => `${official.full_name} ${data.teamName(official.team_id)}`}
            emptyMessage="Belum ada ofisial tim."
          />
        </section>
      </div>
    </AdminPage>
  );
}
