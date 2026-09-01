import { useQuery } from "@tanstack/react-query";
import { useActor } from "@/hooks/use-session";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AdminPage } from "@/components/admin/AdminPage";
import { DecisionNoteField } from "@/components/admin/DecisionNoteField";
import { ApprovalActions } from "@/components/admin/ApprovalActions";
import { DataTable, type Column } from "@/components/common/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const actor = useActor();
  const players = useQuery(playersQuery(actor));
  const officials = useQuery(teamOfficialsQuery(actor));
  const documents = useQuery(registrationDocumentsQuery(actor));
  const review = useReviewRegistration();
  const [reason, setReason] = useState("");
  const [pendingReview, setPendingReview] = useState<{
    entityType: "PLAYER" | "OFFICIAL";
    entityId: string;
    entityName: string;
    action: "APPROVED" | "REVISION_REQUESTED" | "REJECTED";
  } | null>(null);

  const pendingPlayers = (players.data ?? []).filter(
    (player) =>
      player.status === "PENDING" ||
      documents.data?.some(
        (document) =>
          document.entity_id === player.id &&
          ["UPLOADED", "REVISION_REQUIRED"].includes(document.status),
      ),
  );
  const actions = (entityType: "PLAYER" | "OFFICIAL", entityId: string, entityName: string) => (
    <ApprovalActions
      onApprove={() => setPendingReview({ entityType, entityId, entityName, action: "APPROVED" })}
      onReject={() => setPendingReview({ entityType, entityId, entityName, action: "REJECTED" })}
      onCancel={() => setPendingReview({ entityType, entityId, entityName, action: "REVISION_REQUESTED" })}
      isPending={review.isPending}
      approveLabel="Setujui"
      rejectLabel="Tolak"
      cancelLabel="Minta Revisi"
      rejectVariant="destructive"
    />
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
    { key: "actions", header: "Aksi", cell: (player) => actions("PLAYER", player.id, player.full_name) },
  ];
  const officialColumns: Column<TeamOfficial>[] = [
    { key: "name", header: "Ofisial", cell: (official) => official.full_name },
    { key: "team", header: "Tim", cell: (official) => data.teamName(official.team_id) },
    { key: "role", header: "Peran", cell: (official) => official.role },
    { key: "actions", header: "Aksi", cell: (official) => actions("OFFICIAL", official.id, official.full_name) },
  ];
  return (
    <AdminPage
      permission="player.verify"
      title="Pusat Verifikasi"
      description="Periksa pemain, ofisial, dan dokumen sebelum persetujuan."
      isLoading={data.isLoading || players.isLoading || officials.isLoading}
    >
      <div className="mt-6 space-y-6">
        <section>
          <h2 className="mb-3 text-lg font-bold">Pemain</h2>
          <DataTable
            rows={pendingPlayers}
            columns={playerColumns}
            getRowId={(player) => player.id}
            searchable
            searchPlaceholder="Cari pemain atau tim..."
            searchValue={(player) => `${player.full_name} ${data.teamName(player.team_id)}`}
            emptyMessage="Belum ada pemain menunggu verifikasi."
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

      {/* Confirmation Dialog */}
      <AlertDialog open={pendingReview !== null} onOpenChange={() => setPendingReview(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Keputusan Verifikasi</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingReview?.action === "APPROVED" && (
                <>Anda akan menyetujui verifikasi data <strong>{pendingReview.entityName}</strong>.</>
              )}
              {pendingReview?.action === "REVISION_REQUESTED" && (
                <>Anda akan meminta revisi data <strong>{pendingReview.entityName}</strong>. Pastikan alasan sudah dicatat.</>
              )}
              {pendingReview?.action === "REJECTED" && (
                <>Anda akan menolak verifikasi data <strong>{pendingReview.entityName}</strong>. Alasan penolakan diperlukan.</>
              )}
              <br />
              <br />
              Aksi ini tidak dapat dibatalkan dan akan tercatat dalam audit.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {(pendingReview?.action === "REVISION_REQUESTED" || pendingReview?.action === "REJECTED") && (
            <div className="py-2">
              <DecisionNoteField
                value={reason}
                onChange={setReason}
                label={pendingReview.action === "REVISION_REQUESTED" ? "Alasan Revisi" : "Alasan Penolakan"}
                placeholder={
                  pendingReview.action === "REVISION_REQUESTED"
                    ? "Jelaskan dokumen/data apa yang perlu diperbaiki..."
                    : "Jelaskan alasan penolakan verifikasi..."
                }
                minLength={10}
                required={true}
                disabled={review.isPending}
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={review.isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={
                review.isPending ||
                (pendingReview?.action !== "APPROVED" && reason.trim().length < 10)
              }
              onClick={() => {
                if (!pendingReview) return;
                review.mutate(
                  {
                    entityType: pendingReview.entityType,
                    entityId: pendingReview.entityId,
                    action: pendingReview.action,
                    reason: reason.trim().length > 0 ? reason : undefined,
                  },
                  {
                    onSuccess: () => {
                      setReason("");
                      setPendingReview(null);
                      const actionText =
                        pendingReview.action === "APPROVED"
                          ? "disetujui"
                          : pendingReview.action === "REVISION_REQUESTED"
                            ? "diminta revisi"
                            : "ditolak";
                      toast.success(`Data ${actionText}.`);
                    },
                  },
                );
              }}
            >
              Ya, Lanjutkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPage>
  );
}
