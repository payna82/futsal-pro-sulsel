import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "@/components/admin/AdminPage";
import { DataTable, type Column } from "@/components/common/DataTable";
import { ROLE_LABEL, ROLE_PERMISSIONS } from "@/domain/permissions";
import { ROLES, type RoleKey } from "@/domain/types";
import { usersQuery } from "@/hooks/queries";
import { adminHead } from "@/lib/head";

export const Route = createFileRoute("/admin/roles")({
  head: () =>
    adminHead(
      "Peran Pengguna — Panel Panitia Futsal PORPROV Sulsel 2026",
      "Sebelas peran pengguna pada sistem manajemen pertandingan futsal PORPROV Sulsel 2026.",
    ),
  component: AdminRolesRoute,
});

function AdminRolesRoute() {
  const users = useQuery(usersQuery());

  const rows: RoleKey[] = [...ROLES];

  const columns: Column<RoleKey>[] = [
    { key: "role", header: "Peran", cell: (r) => <span className="font-semibold">{ROLE_LABEL[r]}</span> },
    { key: "key", header: "Kunci", hideOnMobile: true, cell: (r) => <code className="font-mono text-xs">{r}</code> },
    { key: "count", header: "Jumlah Izin", cell: (r) => ROLE_PERMISSIONS[r].length },
    {
      key: "users",
      header: "Pengguna",
      cell: (r) => (users.data ?? []).filter((u) => u.role === r).length,
    },
    {
      key: "permissions",
      header: "Contoh Izin",
      hideOnMobile: true,
      cell: (r) => (
        <span className="text-xs text-muted-foreground">
          {ROLE_PERMISSIONS[r].slice(0, 4).join(", ") || "Tidak ada izin"}
          {ROLE_PERMISSIONS[r].length > 4 ? "…" : ""}
        </span>
      ),
    },
  ];

  return (
    <AdminPage
      permission="role.manage"
      title="Peran"
      description="Katalog peran resmi sistem. Peran didefinisikan pada lapisan domain dan tidak dapat diubah dari UI."
      isLoading={users.isLoading}
    >
      <div className="mt-6">
        <DataTable rows={rows} columns={columns} getRowId={(r) => r} emptyMessage="Tidak ada peran." />
      </div>
    </AdminPage>
  );
}
