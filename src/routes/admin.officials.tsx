import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "@/components/admin/AdminPage";
import { DataTable, type Column } from "@/components/common/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ROLE_LABEL } from "@/domain/permissions";
import type { OfficialRole, RoleKey, TeamOfficial, User } from "@/domain/types";
import { teamOfficialsQuery, usersQuery } from "@/hooks/queries";
import { useCompetitionData } from "@/hooks/use-competition-data";
import { adminHead } from "@/lib/head";

export const Route = createFileRoute("/admin/officials")({
  head: () =>
    adminHead(
      "Ofisial — Panel Panitia Futsal PORPROV Sulsel 2026",
      "Data ofisial tim dan perangkat pertandingan futsal PORPROV Sulsel 2026.",
    ),
  component: AdminOfficialsRoute,
});

const TEAM_ROLE_LABEL: Record<OfficialRole, string> = {
  HEAD_COACH: "Pelatih Kepala",
  ASSISTANT_COACH: "Asisten Pelatih",
  MANAGER: "Manajer Tim",
  PHYSIO: "Fisioterapis",
  DOCTOR: "Dokter Tim",
};

const MATCH_ROLES: RoleKey[] = ["REFEREE", "TIMEKEEPER", "SCOREKEEPER", "MATCH_COMMISSIONER"];

function AdminOfficialsRoute() {
  const data = useCompetitionData();
  const officials = useQuery(teamOfficialsQuery());
  const users = useQuery(usersQuery());

  const teamColumns: Column<TeamOfficial>[] = [
    { key: "name", header: "Nama", cell: (o) => <span className="font-medium">{o.full_name}</span> },
    { key: "role", header: "Peran", cell: (o) => TEAM_ROLE_LABEL[o.role] },
    { key: "team", header: "Tim", cell: (o) => data.teamName(o.team_id) },
    { key: "license", header: "Lisensi", hideOnMobile: true, cell: (o) => o.license_number ?? "—" },
  ];

  const matchColumns: Column<User>[] = [
    { key: "name", header: "Nama", cell: (u) => <span className="font-medium">{u.full_name}</span> },
    { key: "role", header: "Peran", cell: (u) => ROLE_LABEL[u.role] },
    { key: "email", header: "Email", hideOnMobile: true, cell: (u) => u.email },
    {
      key: "status",
      header: "Status",
      cell: (u) => (
        <span className={u.is_active ? "label-caps text-success" : "label-caps text-muted-foreground"}>
          {u.is_active ? "Aktif" : "Non-aktif"}
        </span>
      ),
    },
  ];

  const matchOfficialUsers = (users.data ?? []).filter((u) => MATCH_ROLES.includes(u.role));

  return (
    <AdminPage
      permission="official.manage"
      title="Ofisial"
      description="Ofisial tim serta perangkat pertandingan (wasit, pencatat waktu, pencatat skor, komisaris)."
      isLoading={data.isLoading || officials.isLoading || users.isLoading}
      isError={officials.isError || users.isError}
    >
      <Tabs defaultValue="match" className="mt-6 space-y-4">
        <TabsList>
          <TabsTrigger value="match">Perangkat Pertandingan</TabsTrigger>
          <TabsTrigger value="team">Ofisial Tim</TabsTrigger>
        </TabsList>
        <TabsContent value="match">
          <DataTable
            rows={matchOfficialUsers}
            columns={matchColumns}
            getRowId={(u) => u.id}
            searchable
            searchPlaceholder="Cari perangkat…"
            searchValue={(u) => `${u.full_name} ${ROLE_LABEL[u.role]}`}
            emptyMessage="Belum ada perangkat pertandingan."
          />
        </TabsContent>
        <TabsContent value="team">
          <DataTable
            rows={officials.data ?? []}
            columns={teamColumns}
            getRowId={(o) => o.id}
            searchable
            searchPlaceholder="Cari ofisial tim…"
            searchValue={(o) => `${o.full_name} ${data.teamName(o.team_id)}`}
            emptyMessage="Belum ada ofisial tim."
          />
        </TabsContent>
      </Tabs>
    </AdminPage>
  );
}
