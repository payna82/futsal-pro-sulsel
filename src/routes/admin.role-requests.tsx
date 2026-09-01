import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { UserCheck, UserX, ShieldAlert, Clock, CheckCircle, XCircle, Ban } from "lucide-react";
import { AdminPage } from "@/components/admin/AdminPage";
import { DecisionNoteField } from "@/components/admin/DecisionNoteField";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { ROLE_LABEL, type PermissionKey } from "@/domain/permissions";
import {
  ROLE_REQUEST_STATUS_LABEL,
  SELF_REQUESTABLE_ROLE_LABELS,
  type RoleRequest,
  type RoleRequestStatus,
} from "@/domain/registration";
import {
  roleRequestsQuery,
  contingentsQuery,
  venuesQuery,
  teamsQuery,
  usersQuery,
} from "@/hooks/queries";
import {
  useApproveRoleRequest,
  useRejectRoleRequest,
  useCancelRoleRequest,
} from "@/hooks/mutations";
import { useSession } from "@/hooks/use-session";
import { adminHead } from "@/lib/head";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/admin/role-requests")({
  head: () =>
    adminHead(
      "Permintaan Peran — Panel Panitia Futsal PORPROV Sulsel 2026",
      "Dasbor persetujuan dan penolakan permintaan peran (role) pengguna: wasit, ofisial, manajer venue, dan peran lainnya.",
    ),
  component: AdminRoleRequestsPage,
});

const STATUS_STYLE: Record<RoleRequestStatus, string> = {
  PENDING: "bg-warning/15 text-warning-foreground border-warning/40",
  APPROVED: "bg-success/12 text-success border-success/40",
  REJECTED: "bg-destructive/10 text-destructive border-destructive/30",
  REVOKED: "bg-destructive/10 text-destructive border-destructive/30",
  CANCELLED: "bg-muted text-muted-foreground border-border",
};

function RoleRequestStatusBadge({ status }: { status: RoleRequestStatus }) {
  return (
    <span
      className={cn(
        "label-caps inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 whitespace-nowrap",
        STATUS_STYLE[status],
      )}
    >
      {status === "PENDING" && <Clock className="size-3" aria-hidden />}
      {status === "APPROVED" && <CheckCircle className="size-3" aria-hidden />}
      {status === "REJECTED" && <XCircle className="size-3" aria-hidden />}
      {status === "REVOKED" && <Ban className="size-3" aria-hidden />}
      {ROLE_REQUEST_STATUS_LABEL[status]}
    </span>
  );
}

function AdminRoleRequestsPage() {
  const { user, can } = useSession();
  const roleRequests = useQuery(
    roleRequestsQuery({
      userId: user?.id ?? "",
      role: user?.role ?? "PUBLIC",
      permissions: [] as PermissionKey[],
    }),
  );
  const users = useQuery(usersQuery());
  const contingents = useQuery(contingentsQuery());
  const venues = useQuery(venuesQuery());
  const teams = useQuery(teamsQuery());

  const approve = useApproveRoleRequest();
  const reject = useRejectRoleRequest();
  const cancel = useCancelRoleRequest();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [bindContingent, setBindContingent] = useState<string>("");
  const [bindVenue, setBindVenue] = useState<string>("");
  const [bindTeam, setBindTeam] = useState<string>("");
  const [filter, setFilter] = useState<RoleRequestStatus | "ALL">("PENDING");
  const [pendingApproval, setPendingApproval] = useState<{
    action: "APPROVE" | "REJECT";
  } | null>(null);

  const requestorName = (userId: string) => {
    const u = (users.data ?? []).find((x) => x.id === userId);
    return u ? u.full_name : userId;
  };
  const requestorEmail = (userId: string) => {
    const u = (users.data ?? []).find((x) => x.id === userId);
    return u?.email ?? "-";
  };
  const contingentName = (id?: string) => contingents.data?.find((c) => c.id === id)?.name;
  const venueName = (id?: string) => venues.data?.find((v) => v.id === id)?.name;
  const teamName = (id?: string) => teams.data?.find((t) => t.id === id)?.name;

  const stats = useMemo(() => {
    const rows = roleRequests.data ?? [];
    return {
      all: rows.length,
      pending: rows.filter((r) => r.status === "PENDING").length,
      approved: rows.filter((r) => r.status === "APPROVED").length,
      rejected: rows.filter((r) => r.status === "REJECTED").length,
    };
  }, [roleRequests.data]);

  const filteredRows = useMemo(() => {
    const rows = roleRequests.data ?? [];
    return filter === "ALL" ? rows : rows.filter((r) => r.status === filter);
  }, [roleRequests.data, filter]);

  const selected = (roleRequests.data ?? []).find((r) => r.id === selectedId) ?? null;

  const canManage = can("role.manage");

  const confirmApproval = () => {
    const row = selected;
    if (!row || !canManage) return;
    approve.mutate(
      {
        id: row.id,
        ...(decisionNote.trim() ? { decision_note: decisionNote.trim() } : {}),
        ...(bindContingent ? { contingent_id: bindContingent } : {}),
        ...(bindVenue ? { venue_id: bindVenue } : {}),
        ...(bindTeam ? { team_id: bindTeam } : {}),
      },
      {
        onSuccess: () => {
          toast.success(
            `Peran ${ROLE_LABEL[row.requested_role]} disetujui untuk ${requestorName(row.user_id)}.`,
          );
          setPendingApproval(null);
          setSelectedId(null);
          setDecisionNote("");
          setBindContingent("");
          setBindVenue("");
          setBindTeam("");
        },
        onError: (e) => toast.error((e as Error).message ?? "Gagal menyetujui permintaan."),
      },
    );
  };

  const confirmReject = () => {
    const row = selected;
    if (!row || !canManage) return;
    reject.mutate(
      { id: row.id, decision_note: decisionNote.trim() },
      {
        onSuccess: () => {
          toast.success("Permintaan peran ditolak.");
          setPendingApproval(null);
          setSelectedId(null);
          setDecisionNote("");
        },
        onError: (e) => toast.error((e as Error).message ?? "Gagal menolak permintaan."),
      },
    );
  };

  const runCancel = (row: RoleRequest) => {
    cancel.mutate(
      { id: row.id },
      {
        onSuccess: () => {
          toast.success("Permintaan peran dibatalkan.");
          if (selectedId === row.id) setSelectedId(null);
        },
        onError: (e) => toast.error((e as Error).message ?? "Gagal membatalkan."),
      },
    );
  };

  const filters: (RoleRequestStatus | "ALL")[] = [
    "ALL",
    "PENDING",
    "APPROVED",
    "REJECTED",
    "CANCELLED",
    "REVOKED",
  ];

  const columns: Column<RoleRequest>[] = [
    {
      key: "requestor",
      header: "Pemohon",
      cell: (r) => (
        <div>
          <p className="font-semibold">{requestorName(r.user_id)}</p>
          <p className="text-xs text-muted-foreground">{requestorEmail(r.user_id)}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Peran Diajukan",
      cell: (r) => (
        <span className="font-medium">
          {(SELF_REQUESTABLE_ROLE_LABELS as Record<string, string>)[r.requested_role] ??
            ROLE_LABEL[r.requested_role]}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => <RoleRequestStatusBadge status={r.status} />,
    },
    {
      key: "context",
      header: "Konteks",
      hideOnMobile: true,
      cell: (r) => (
        <div className="text-xs text-muted-foreground space-y-0.5">
          {r.contingent_id ? (
            <p>Kontingen: {contingentName(r.contingent_id) ?? r.contingent_id}</p>
          ) : null}
          {r.venue_id ? <p>Venue: {venueName(r.venue_id) ?? r.venue_id}</p> : null}
          {r.team_id ? <p>Tim: {teamName(r.team_id) ?? r.team_id}</p> : null}
          {!r.contingent_id && !r.venue_id && !r.team_id ? <p>—</p> : null}
        </div>
      ),
    },
    {
      key: "dates",
      header: "Tanggal",
      hideOnMobile: true,
      cell: (r) => (
        <div className="text-xs text-muted-foreground">
          <p>{formatDateTime(r.created_at)}</p>
          {r.reviewed_at ? <p>Ditinjau: {formatDateTime(r.reviewed_at)}</p> : null}
        </div>
      ),
    },
    {
      key: "actions",
      header: "Aksi",
      cell: (r) => (
        <div className="flex flex-wrap gap-2">
          {r.status === "PENDING" ? (
            <>
              {canManage ? (
                <>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedId(r.id);
                      setDecisionNote("");
                      setBindContingent(r.contingent_id ?? "");
                      setBindVenue(r.venue_id ?? "");
                      setBindTeam(r.team_id ?? "");
                    }}
                    disabled={approve.isPending || reject.isPending}
                  >
                    <UserCheck className="mr-1 size-3.5" /> Proses
                  </Button>
                </>
              ) : null}
              {user?.id === r.user_id ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => runCancel(r)}
                  disabled={cancel.isPending}
                >
                  <Ban className="mr-1 size-3.5" /> Batal
                </Button>
              ) : null}
            </>
          ) : null}
          {r.reviewer_id && canManage ? (
            <p className="text-xs text-muted-foreground">
              Ditinjau: {requestorName(r.reviewer_id)}
            </p>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <AdminPage
      permission="role.manage"
      title="Permintaan Peran Pengguna"
      description="Tinjau, setujui, atau tolak permintaan peran operator dan ofisial pertandingan."
      isLoading={roleRequests.isLoading}
      isError={roleRequests.isError}
    >
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Total Permintaan"
          value={stats.all}
          hint="Seluruh riwayat permintaan peran"
        />
        <StatCard
          label="Menunggu"
          value={stats.pending}
          tone="warning"
          icon={Clock}
          hint="Perlu tindakan panitia"
        />
        <StatCard
          label="Disetujui"
          value={stats.approved}
          tone="success"
          icon={UserCheck}
          hint="Peran sudah aktif"
        />
        <StatCard
          label="Ditolak"
          value={stats.rejected}
          tone="default"
          icon={UserX}
          hint="Permintaan ditolak atau dicabut"
        />
      </div>

      {selected && selected.status === "PENDING" && canManage ? (
        <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 size-5 text-primary" aria-hidden />
            <div className="flex-1">
              <h3 className="font-semibold">
                Proses Permintaan: {requestorName(selected.user_id)} &rarr;{" "}
                {ROLE_LABEL[selected.requested_role]}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Alasan pengajuan: <span className="italic">{selected.request_reason}</span>
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedId(null)}
              aria-label="Tutup panel proses"
            >
              Tutup
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label htmlFor="bind-contingent">Kontingen (opsional)</Label>
              <select
                id="bind-contingent"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={bindContingent}
                onChange={(e) => setBindContingent(e.target.value)}
              >
                <option value="">— Tidak ada —</option>
                {(contingents.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="bind-venue">Venue (opsional)</Label>
              <select
                id="bind-venue"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={bindVenue}
                onChange={(e) => setBindVenue(e.target.value)}
              >
                <option value="">— Tidak ada —</option>
                {(venues.data ?? []).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="bind-team">Tim (opsional)</Label>
              <select
                id="bind-team"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={bindTeam}
                onChange={(e) => setBindTeam(e.target.value)}
              >
                <option value="">— Tidak ada —</option>
                {(teams.data ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <DecisionNoteField
              value={decisionNote}
              onChange={setDecisionNote}
              label="Catatan Keputusan"
              placeholder={
                selected.requested_role === "REFEREE"
                  ? "Contoh: Sertifikat wasit terverifikasi, nomor lisensi A-123."
                  : "Contoh: Disetujui sesuai rekomendasi panitia teknis."
              }
              minLength={0}
              required={false}
              disabled={approve.isPending || reject.isPending}
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              onClick={() => setPendingApproval({ action: "APPROVE" })}
              disabled={approve.isPending || reject.isPending}
            >
              <UserCheck className="mr-1.5 size-4" />
              Setujui Peran
            </Button>
            <Button
              variant="destructive"
              onClick={() => setPendingApproval({ action: "REJECT" })}
              disabled={reject.isPending || approve.isPending || decisionNote.trim().length < 6}
            >
              <UserX className="mr-1.5 size-4" />
              Tolak Permintaan
            </Button>
          </div>
        </div>
      ) : null}

      {/* Approval Confirmation Dialog */}
      <AlertDialog open={pendingApproval !== null} onOpenChange={() => setPendingApproval(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Keputusan Permintaan Peran</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingApproval?.action === "APPROVE" && (
                <>
                  Anda akan menyetujui permintaan peran <strong>{ROLE_LABEL[selected?.requested_role]}</strong> untuk{" "}
                  <strong>{requestorName(selected?.user_id)}</strong>.
                </>
              )}
              {pendingApproval?.action === "REJECT" && (
                <>
                  Anda akan menolak permintaan peran <strong>{ROLE_LABEL[selected?.requested_role]}</strong> untuk{" "}
                  <strong>{requestorName(selected?.user_id)}</strong>. Catatan penolakan diperlukan.
                </>
              )}
              <br />
              <br />
              {bindContingent && <p>📍 Kontingen: {contingentName(bindContingent)}</p>}
              {bindVenue && <p>📍 Venue: {venueName(bindVenue)}</p>}
              {bindTeam && <p>📍 Tim: {teamName(bindTeam)}</p>}
              <br />
              Aksi ini tidak dapat dibatalkan dan akan tercatat dalam audit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={approve.isPending || reject.isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={
                approve.isPending ||
                reject.isPending ||
                (pendingApproval?.action === "REJECT" && decisionNote.trim().length < 6)
              }
              onClick={pendingApproval?.action === "APPROVE" ? confirmApproval : confirmReject}
            >
              Ya, Lanjutkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mt-6">
        <DataTable
          rows={filteredRows}
          columns={columns}
          getRowId={(r) => r.id}
          searchable
          searchPlaceholder="Cari pemohon / catatan / peran…"
          searchValue={(r) =>
            `${requestorName(r.user_id)} ${requestorEmail(r.user_id)} ${
              ROLE_LABEL[r.requested_role]
            } ${r.request_reason} ${r.decision_note ?? ""}`
          }
          emptyMessage={
            filter === "PENDING"
              ? "Belum ada permintaan peran yang menunggu tindakan."
              : "Belum ada riwayat permintaan peran."
          }
          toolbar={
            <div className="flex flex-wrap gap-2">
              {filters.map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? "default" : "outline"}
                  onClick={() => setFilter(f)}
                >
                  {f === "ALL" ? "Semua" : ROLE_REQUEST_STATUS_LABEL[f as RoleRequestStatus]}
                </Button>
              ))}
            </div>
          }
        />
      </div>
    </AdminPage>
  );
}
