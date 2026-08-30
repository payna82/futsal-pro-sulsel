import { useQuery } from "@tanstack/react-query";
import { useActor } from "@/hooks/use-session";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AdminPage } from "@/components/admin/AdminPage";
import { TeamCrest } from "@/components/common/TeamCrest";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { teamAccountsQuery, teamRegistrationQuery } from "@/hooks/queries";
import { useCreateTeamAccount, useUpdateTeamProfile } from "@/hooks/mutations";
import { useCompetitionData } from "@/hooks/use-competition-data";
import { adminHead } from "@/lib/head";

export const Route = createFileRoute("/admin/teams/$teamId")({
  head: () =>
    adminHead(
      "Detail Tim — Panel Panitia",
      "Profil, akun, pemain, dokumen, dan progres registrasi tim.",
    ),
  component: TeamAdminDetail,
});
function TeamAdminDetail() {
  const { teamId } = Route.useParams();
  const data = useCompetitionData();
  const team = data.teams.find((item) => item.id === teamId);
  const actor = useActor();
  const registration = useQuery(teamRegistrationQuery(teamId, actor));
  const accounts = useQuery(teamAccountsQuery(actor));
  const create = useCreateTeamAccount();
  const updateProfile = useUpdateTeamProfile(teamId);
  const account = accounts.data?.find((item) => item.team_id === teamId);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  if (!team || !registration.data)
    return (
      <AdminPage permission="team.read" title="Detail Tim" description="Tim tidak ditemukan.">
        <p>Tim tidak ditemukan.</p>
      </AdminPage>
    );
  return (
    <AdminPage
      permission="team.read"
      title={team.name}
      description="Detail peserta dan akun portal tim."
    >
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <TeamCrest shortName={team.short_name} color={team.primary_color} size="sm" />
              {team.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Kontingen: {data.teams.find((item) => item.id === team.id)?.contingent_id}</p>
            <p>Pemain: {registration.data.players.length}</p>
            <p>Ofisial: {registration.data.officials.length}</p>
            <p>
              Status: <Badge>{registration.data.profile.registration_status}</Badge>
            </p>
            <Button asChild variant="outline">
              <Link to="/admin/verification">Buka Pusat Verifikasi</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Akun Tim</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {account ? (
              <>
                <p className="text-sm">
                  Username: <strong>{account.username}</strong>
                </p>
                <p className="text-sm">Status: {account.account_status}</p>
              </>
            ) : (
              <>
                <div>
                  <Label>Username</Label>
                  <Input value={username} onChange={(event) => setUsername(event.target.value)} />
                </div>
                <div>
                  <Label>Kredensial demo sementara</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
                <Button
                  disabled={create.isPending}
                  onClick={() =>
                    create.mutate(
                      { team_id: teamId, username, password },
                      {
                        onSuccess: () => {
                          setPassword("");
                          toast.success("Akun tim dibuat.");
                        },
                        onError: (error) =>
                          toast.error(
                            error instanceof Error ? error.message : "Akun gagal dibuat.",
                          ),
                      },
                    )
                  }
                >
                  Buat Akun Tim
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminPage>
  );
}
