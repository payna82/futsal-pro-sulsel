import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Users,
  Building2,
} from "lucide-react";
import { useActor } from "@/hooks/use-session";
import { AdminPage } from "@/components/admin/AdminPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { contingentsQuery } from "@/hooks/queries";
import { useCompetitionData } from "@/hooks/use-competition-data";
import { adminHead } from "@/lib/head";
import { repository } from "@/data";
import { can, type Role } from "@/domain/permissions";

export const Route = createFileRoute("/admin/committee-dashboard")({
  head: () =>
    adminHead(
      "Dasbor Panitia — Panel Panitia Futsal PORPROV Sulsel 2026",
      "Tampilan terpusat untuk persetujuan dan keputusan yang menunggu.",
    ),
  component: AdminCommitteeDashboardRoute,
});

function AdminCommitteeDashboardRoute() {
  const actor = useActor();
  const userRole = actor.role as Role;
  
  // Queries
  const contingents = useQuery(contingentsQuery());
  const roleRequests = useQuery({
    queryKey: ["role-requests"],
    queryFn: () => repository.listRoleRequests(actor),
  });
  const { teams } = useCompetitionData();

  // Stats
  const pendingContingents = (contingents.data ?? []).filter(
    (c) => c.status === "PENDING"
  );
  const pendingRoleRequests = (roleRequests.data ?? []).filter(
    (r) => r.status === "PENDING"
  );

  // Only show if user has relevant permissions
  const canApproveContingents = can(userRole, "contingent.manage");
  const canApproveRoles = can(userRole, "role.manage");
  const canVerifyPlayers = can(userRole, "player.verify");

  const hasAnyApprovals =
    (canApproveContingents && pendingContingents.length > 0) ||
    (canApproveRoles && pendingRoleRequests.length > 0);

  return (
    <AdminPage title="Dasbor Panitia" permission={undefined}>
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Menunggu Persetujuan Kontingen
              </CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingContingents.length}</div>
              <p className="text-xs text-muted-foreground">
                {canApproveContingents
                  ? "Tindakan Anda diperlukan"
                  : "Belum ada akses persetujuan"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Menunggu Persetujuan Peran
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingRoleRequests.length}</div>
              <p className="text-xs text-muted-foreground">
                {canApproveRoles
                  ? "Tindakan Anda diperlukan"
                  : "Belum ada akses persetujuan"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Peran Anda
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{actor.role}</div>
              <p className="text-xs text-muted-foreground">
                {actor.contingent_id ? `Kontingen: ${actor.contingent_id.substring(0, 8)}` : "Tidak terikat kontingen"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Contingents */}
        {canApproveContingents && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning" />
                Kontingen Menunggu Verifikasi ({pendingContingents.length})
              </CardTitle>
              <CardDescription>
                Kontingen yang sedang menunggu keputusan Anda untuk disetujui atau ditolak.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingContingents.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Semua kontingen telah diverifikasi!
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingContingents.map((contingent) => {
                    const contingentTeams = teams.filter(
                      (t) => t.contingent_id === contingent.id
                    );
                    return (
                      <div
                        key={contingent.id}
                        className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{contingent.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {contingent.short_name} • {contingentTeams.length} tim
                          </p>
                        </div>
                        <Link
                          to="/admin/contingents/$contingentId"
                          params={{ contingentId: contingent.id }}
                          className="inline-flex"
                        >
                          <Button size="sm" variant="outline">
                            Tinjau & Putuskan
                          </Button>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Pending Role Requests */}
        {canApproveRoles && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Permintaan Peran Menunggu ({pendingRoleRequests.length})
              </CardTitle>
              <CardDescription>
                Pengguna yang meminta peran untuk diaktifkan atau didelegasikan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRoleRequests.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Semua permintaan peran telah diproses!
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRoleRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
                    >
                      <div className="flex-1">
                        <p className="font-medium capitalize">{request.requested_role}</p>
                        <p className="text-sm text-muted-foreground">
                          dari {request.actor_name || "Pengguna"}
                        </p>
                      </div>
                      <Link
                        to="/admin/role-requests"
                        className="inline-flex"
                      >
                        <Button size="sm" variant="outline">
                          Tinjau Semua
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Verification Workflow Link */}
        {canVerifyPlayers && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-500" />
                Verifikasi Pemain & Ofisial
              </CardTitle>
              <CardDescription>
                Tinjau dokumen dan verifikasi kelayakan pemain dan ofisial tim.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/admin/verification">
                <Button className="w-full" variant="outline">
                  Buka Verifikasi Dokumen
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!hasAnyApprovals && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
                Belum Ada Persetujuan yang Menunggu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Belum ada item yang memerlukan keputusan Anda saat ini. Semua tugas telah selesai!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminPage>
  );
}
