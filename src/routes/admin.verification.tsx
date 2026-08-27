import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AdminPage } from "@/components/admin/AdminPage";
import { DataTable, type Column } from "@/components/common/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { playersQuery, registrationDocumentsQuery, teamOfficialsQuery } from "@/hooks/queries";
import { useReviewRegistration } from "@/hooks/mutations";
import { useCompetitionData } from "@/hooks/use-competition-data";
import { adminHead } from "@/lib/head";
import type { Player, TeamOfficial } from "@/domain/types";

export const Route = createFileRoute("/admin/verification")({
  head: () =>
    adminHead(
      "Pusat Verifikasi — Panel Panitia",
      "Pemeriksaan dokumen pemain dan status registrasi.",
    ),
  component: VerificationPage,
});

function VerificationPage() {
  const data = useCompetitionData();
  const players = useQuery(playersQuery());
  const officials = useQuery(teamOfficialsQuery());
  const docs = useQuery(registrationDocumentsQuery("PLAYER"));
  const review = useReviewRegistration();
  const [reason, setReason] = useState("");
  const rows = (players.data ?? []).filter(
    (player) =>
      player.status === "PENDING" ||
      docs.data?.some(
        (doc) =>
          doc.entity_id === player.id && ["REVISION_REQUIRED", "UPLOADED"].includes(doc.status),
      ),
  );
  const columns: Column<Player>[] = [
    {
      key: "name",
      header: "Pemain",
      cell: (player) => <span className="font-medium">{player.full_name}</span>,
    },
    { key: "team", header: "Tim", cell: (player) => data.teamName(player.team_id) },
    { key: "position", header: "Posisi", cell: (player) => player.position },
    {
      key: "status",
      header: "Status",
      cell: (player) => (
        <Badge variant={player.status === "ELIGIBLE" ? "default" : "secondary"}>
          {player.status}
        </Badge>
      ),
    },
    {
      key: "documents",
      header: "Dokumen",
      cell: (player) =>
        docs.data
          ?.filter((doc) => doc.entity_id === player.id)
          .map((doc) => doc.status)
          .join(", ") || "Belum ada",
    },
    {
      key: "actions",
      header: "Aksi",
      cell: (player) => (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={review.isPending}
            onClick={() =>
              review.mutate(
                { entityType: "PLAYER", entityId: player.id, action: "APPROVED" },
                {
                  onSuccess: () => toast.success("Pemain disetujui."),
                  onError: (error) =>
                    toast.error(error instanceof Error ? error.message : "Persetujuan gagal."),
                },
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
                { entityType: "PLAYER", entityId: player.id, action: "REVISION_REQUESTED", reason },
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
                { entityType: "PLAYER", entityId: player.id, action: "REJECTED", reason },
                {
                  onSuccess: () => {
                    setReason("");
                    toast.success("Pemain ditolak.");
                  },
                },
              )
            }
          >
            Tolak
          </Button>
        </div>
      ),
    },
  ];
  return (
    <AdminPage
      permission="player.verify"
      title="Pusat Verifikasi"
      description="Periksa pemain dan dokumen sebelum persetujuan."
      isLoading={data.isLoading || players.isLoading}
    >
      <div className="mt-6 space-y-4">
        <Textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Alasan revisi atau penolakan"
        />
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(player) => player.id}
          searchable
          searchPlaceholder="Cari pemain atau tim…"
          searchValue={(player) => `${player.full_name} ${data.teamName(player.team_id)}`}
          emptyMessage="Tidak ada data menunggu verifikasi."
        />
      </div>
    </AdminPage>
  );
  const officialRows = officials.data ?? [];
  const officialColumns: Column<TeamOfficial>[] = [
    {
      key: "name",
      header: "Ofisial",
      cell: (official) => <span className="font-medium">{official.full_name}</span>,
    },
    { key: "team", header: "Tim", cell: (official) => data.teamName(official.team_id) },
    { key: "role", header: "Peran", cell: (official) => official.role },
    {
      key: "actions",
      header: "Aksi",
      cell: (official) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() =>
              review.mutate(
                { entityType: "OFFICIAL", entityId: official.id, action: "APPROVED" },
                { onSuccess: () => toast.success("Ofisial disetujui.") },
              )
            }
          >
            Setujui
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={reason.trim().length < 3}
            onClick={() =>
              review.mutate(
                {
                  entityType: "OFFICIAL",
                  entityId: official.id,
                  action: "REVISION_REQUESTED",
                  reason,
                },
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
        </div>
      ),
    },
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
            rows={rows}
            columns={columns}
            getRowId={(player) => player.id}
            searchable
            searchPlaceholder="Cari pemain atau tim…"
            searchValue={(player) => `${player.full_name} ${data.teamName(player.team_id)}`}
            emptyMessage="Tidak ada pemain menunggu verifikasi."
          />
        </section>
        <section>
          <h2 className="mb-3 text-lg font-bold">Ofisial Tim</h2>
          <DataTable
            rows={officialRows}
            columns={officialColumns}
            getRowId={(official) => official.id}
            searchable
            searchPlaceholder="Cari ofisial atau tim…"
            searchValue={(official) => `${official.full_name} ${data.teamName(official.team_id)}`}
            emptyMessage="Belum ada ofisial tim."
          />
        </section>
      </div>
    </AdminPage>
  );
}
