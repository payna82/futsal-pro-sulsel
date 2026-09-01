import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, CheckCircle2, ShieldAlert, Users, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminPage } from "@/components/admin/AdminPage";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useCompetitionData } from "@/hooks/use-competition-data";
import { contingentsQuery, playersQuery, teamOfficialsQuery, usersQuery } from "@/hooks/queries";
import { useActor } from "@/hooks/use-session";
import { useUpdateContingentStatus } from "@/hooks/mutations";
import { adminHead } from "@/lib/head";

export const Route = createFileRoute("/admin/contingents/$contingentId")({
  head: () =>
    adminHead(
      "Dashboard Kontingen — Panel Panitia",
      "Dashboard pengelolaan kontingen, verifikasi status, tim, akun admin, dan keputusan formal approval atau deactivation.",
    ),
  component: ContingentDashboardPage,
});

type ContingentStatus = "PENDING" | "VERIFIED" | "REJECTED" | "DEACTIVATED";

const statusLabel: Record<ContingentStatus, string> = {
  PENDING: "Menunggu Verifikasi",
  VERIFIED: "Disetujui / Aktif",
  REJECTED: "Ditolak",
  DEACTIVATED: "Dinonaktifkan",
};

const statusClass: Record<ContingentStatus, string> = {
  PENDING: "border-warning/40 bg-warning/10 text-warning-foreground",
  VERIFIED: "border-success/40 bg-success/10 text-success",
  REJECTED: "border-destructive/40 bg-destructive/10 text-destructive",
  DEACTIVATED: "border-muted-foreground/40 bg-muted text-muted-foreground",
};

const statusDescription: Record<ContingentStatus, string> = {
  PENDING: "Kontingen masih menunggu pemeriksaan data dan kelengkapan administrasi.",
  VERIFIED: "Kontingen telah disetujui dan dapat mengelola tim serta akses wilayahnya.",
  REJECTED: "Kontingen ditolak karena data belum memenuhi persyaratan yang ditentukan.",
  DEACTIVATED: "Kontingen dinonaktifkan sementara dan aksesnya ditutup oleh panitia.",
};

function ContingentDashboardPage() {
  const { contingentId } = Route.useParams();
  const data = useCompetitionData();
  const actor = useActor();
  const contingents = useQuery(contingentsQuery());
  const players = useQuery(playersQuery(actor));
  const officials = useQuery(teamOfficialsQuery(actor));
  const users = useQuery(usersQuery());

  const contingent = contingents.data?.find((item) => item.id === contingentId);

  const updateStatus = useUpdateContingentStatus();
  const teamRows = useMemo(
    () => data.teams.filter((team) => team.contingent_id === contingentId),
    [data.teams, contingentId],
  );

  const teamPlayerCount = (teamId: string) =>
    (players.data ?? []).filter((player) => player.team_id === teamId).length;

  const teamOfficialCount = (teamId: string) =>
    (officials.data ?? []).filter((official) => official.team_id === teamId).length;

  const adminAccounts = useMemo(
    () =>
      (users.data ?? []).filter(
        (user) => user.contingent_id === contingentId && user.role !== "PUBLIC",
      ),
    [contingentId, users.data],
  );

  const verifiedTeams = teamRows.filter((team) => team.status === "VERIFIED").length;
  const pendingTeams = teamRows.filter((team) => team.status !== "VERIFIED").length;

  const [status, setStatus] = useState<ContingentStatus>(() => contingent?.status ?? "PENDING");
  const [decisionNote, setDecisionNote] = useState(
    "Status kontingen telah diperiksa dan siap ditinjau oleh otoritas kompetisi.",
  );
  const [pendingDecision, setPendingDecision] = useState<ContingentStatus | null>(null);

  if (!contingent) {
    return (
      <AdminPage permission="contingent.manage" title="Dashboard Kontingen" description="Kontingen tidak ditemukan.">
        <div className="mt-6 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Tidak ada data kontingen untuk ID ini. Kembali ke daftar kontingen untuk memilih data yang valid.
        </div>
      </AdminPage>
    );
  }

  const submitStatus = (nextStatus: ContingentStatus) => {
    const nextDecision =
      nextStatus === "VERIFIED"
        ? "Kontingen disetujui dan dashboard aktif untuk pengelolaan tim sesuai wilayahnya."
        : nextStatus === "REJECTED"
          ? "Kontingen ditolak. Data administrasi perlu dilengkapi sebelum dapat diaktifkan kembali."
          : "Kontingen dinonaktifkan. Hak akses tim dan dashboard ditutup sementara oleh otoritas.";

    updateStatus.mutate(
      { contingent_id: contingent.id, status: nextStatus, decision_note: decisionNote || nextDecision },
      {
        onSuccess: () => {
          setStatus(nextStatus);
          setDecisionNote(nextDecision);
          setPendingDecision(null);
          if (nextStatus === "VERIFIED") toast.success("Kontingen disetujui.");
          else if (nextStatus === "REJECTED") toast.warning("Kontingen ditolak.");
          else toast.error("Kontingen dinonaktifkan.");
        },
        onError: (error) => {
          setPendingDecision(null);
          toast.error(error instanceof Error ? error.message : "Gagal memperbarui status kontingen.");
        },
      },
    );
  };

  const confirmPendingDecision = () => {
    if (!pendingDecision) return;
    submitStatus(pendingDecision);
  };

  const handleApprove = () => setPendingDecision("VERIFIED");

  const handleReject = () => setPendingDecision("REJECTED");

  const handleDeactivate = () => setPendingDecision("DEACTIVATED");

  const teamColumns: Column<(typeof teamRows)[number]>[] = [
    {
      key: "team",
      header: "Tim",
      cell: (team) => (
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
            {team.short_name}
          </span>
          <div>
            <p className="font-semibold">{team.name}</p>
            <p className="text-xs text-muted-foreground">{team.short_name}</p>
          </div>
        </div>
      ),
    },
    {
      key: "nomor",
      header: "Nomor",
      cell: (team) => data.categories.find((category) => category.id === team.category_id)?.name ?? "—",
    },
    {
      key: "players",
      header: "Pemain",
      cell: (team) => teamPlayerCount(team.id),
    },
    {
      key: "officials",
      header: "Ofisial",
      cell: (team) => teamOfficialCount(team.id),
    },
    {
      key: "status",
      header: "Status Tim",
      cell: (team) => <Badge variant={team.status === "VERIFIED" ? "default" : "secondary"}>{team.status}</Badge>,
    },
  ];

  const adminColumns: Column<(typeof adminAccounts)[number]>[] = [
    {
      key: "name",
      header: "Nama",
      cell: (user) => (
        <div>
          <p className="font-semibold">{user.full_name}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Peran",
      cell: (user) => user.role,
    },
    {
      key: "status",
      header: "Status",
      cell: (user) => (
        <span className={user.is_active ? "label-caps text-success" : "label-caps text-muted-foreground"}>
          {user.is_active ? "Aktif" : "Non-aktif"}
        </span>
      ),
    },
    {
      key: "last",
      header: "Terakhir Login",
      cell: (user) => user.last_login_at ?? "Belum pernah masuk",
    },
  ];

  return (
    <AdminPage
      permission="contingent.manage"
      title={contingent.name}
      eyebrow="Dashboard Kontingen"
      description={`Manajemen kontingen ${contingent.short_name} dan tim yang berada di bawah wilayahnya.`}
      actions={
        <Button asChild variant="outline">
          <Link to="/admin/contingents">Kembali ke daftar kontingen</Link>
        </Button>
      }
      isLoading={contingents.isLoading || data.isLoading || players.isLoading || officials.isLoading}
    >
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="size-4" /> Kontingen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{contingent.name}</p>
            <p className="mt-2 text-sm text-muted-foreground">{contingent.region_code} • {contingent.short_name}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="size-4" /> Tim
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{teamRows.length}</p>
            <p className="mt-2 text-sm text-muted-foreground">{verifiedTeams} tim terverifikasi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4" /> Pemain
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{(players.data ?? []).filter((player) => teamRows.some((team) => team.id === player.team_id)).length}</p>
            <p className="mt-2 text-sm text-muted-foreground">Total pemain terdaftar dalam kontingen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldAlert className="size-4" /> Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass[status]}`}>
              {statusLabel[status]}
            </span>
            <p className="mt-2 text-sm text-muted-foreground">{statusDescription[status]}</p>
            <p className="mt-2 text-xs text-muted-foreground">{pendingTeams} tim menunggu keputusan</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Status Verifikasi Kontingen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              {[
                "1. Pendaftaran Mandiri",
                "2. Validasi Data",
                "3. Persetujuan Super Admin",
                "4. Dashboard Aktif",
              ].map((step, index) => (
                <div
                  key={step}
                  className={
                    "rounded-lg border p-3 text-sm " +
                    (index <= (status === "VERIFIED" ? 3 : status === "REJECTED" ? 1 : status === "DEACTIVATED" ? 0 : 2)
                      ? "border-primary/40 bg-primary/5 text-foreground"
                      : "border-border bg-muted/30 text-muted-foreground")
                  }
                >
                  {step}
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="label-caps text-muted-foreground">Catatan keputusan</p>
              <Textarea
                value={decisionNote}
                onChange={(event) => setDecisionNote(event.target.value)}
                className="mt-3 min-h-[120px]"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleApprove}>Setujui Kontingen</Button>
              <Button variant="outline" onClick={handleReject}>Tolak Kontingen</Button>
              <Button variant="destructive" onClick={handleDeactivate}>Nonaktifkan</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manajemen Akun Admin Kontingen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {adminAccounts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                Belum ada akun admin kontingen yang ditetapkan untuk wilayah ini.
              </div>
            ) : (
              <div className="space-y-2">
                {adminAccounts.map((user) => (
                  <div key={user.id} className="rounded-lg border border-border bg-muted/20 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{user.full_name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <Badge variant={user.is_active ? "default" : "secondary"}>
                        {user.is_active ? "Aktif" : "Non-aktif"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Peran: {user.role}</p>
                  </div>
                ))}
              </div>
            )}
            <Button asChild variant="outline" className="w-full">
              <Link to="/admin/users">Kelola semua pengguna</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold">Daftar Tim per Kontingen</h2>
        <DataTable
          rows={teamRows}
          columns={teamColumns}
          getRowId={(team) => team.id}
          searchable
          searchPlaceholder="Cari tim dalam kontingen…"
          searchValue={(team) => `${team.name} ${team.short_name}`}
          emptyMessage="Belum ada tim yang terdaftar di kontingen ini."
        />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold">Akun Admin Kontingen</h2>
        <DataTable
          rows={adminAccounts}
          columns={adminColumns}
          getRowId={(user) => user.id}
          searchable
          searchPlaceholder="Cari admin kontingen…"
          searchValue={(user) => `${user.full_name} ${user.email} ${user.role}`}
          emptyMessage="Belum ada akun admin kontingen yang ditetapkan."
        />
      </section>

      <AlertDialog open={pendingDecision !== null} onOpenChange={(open) => !open && setPendingDecision(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDecision === "VERIFIED"
                ? "Setujui kontingen ini?"
                : pendingDecision === "REJECTED"
                  ? "Tolak kontingen ini?"
                  : "Nonaktifkan kontingen ini?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDecision === "VERIFIED"
                ? "Kontingen akan diaktifkan dan semua tim dalam wilayahnya dapat melanjutkan proses verifikasi dan kompetisi."
                : pendingDecision === "REJECTED"
                  ? "Status kontingen akan berubah jadi ditolak. Tim dan admin di bawahnya perlu melengkapi data sebelum bisa diajukan ulang."
                  : "Kontingen akan dinonaktifkan sementara. Akses administratif dan status keanggotaan dalam wilayah ini akan ditutup."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateStatus.isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPendingDecision} disabled={updateStatus.isPending}>
              {updateStatus.isPending ? "Memproses…" : "Ya, Lanjutkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPage>
  );
}
