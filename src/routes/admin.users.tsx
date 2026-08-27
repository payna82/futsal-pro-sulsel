import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "@/components/admin/AdminPage";
import { DataTable, type Column } from "@/components/common/DataTable";
import { ROLE_LABEL } from "@/domain/permissions";
import type { User } from "@/domain/types";
import { usersQuery } from "@/hooks/queries";
import { adminHead } from "@/lib/head";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/admin/users")({
  head: () =>
    adminHead(
      "Pengguna Sistem — Panel Panitia Futsal PORPROV Sulsel 2026",
      "Daftar pengguna sistem manajemen pertandingan futsal PORPROV Sulsel 2026 beserta peran dan status akun.",
    ),
  component: AdminUsersRoute,
});

function AdminUsersRoute() {
  const users = useQuery(usersQuery());

  const columns: Column<User>[] = [
    {
      key: "user",
      header: "Pengguna",
      cell: (u) => (
        <div>
          <p className="font-semibold">{u.full_name}</p>
          <p className="text-xs text-muted-foreground">{u.email}</p>
        </div>
      ),
    },
    { key: "role", header: "Peran", cell: (u) => ROLE_LABEL[u.role] },
    {
      key: "status",
      header: "Status",
      cell: (u) => (
        <span className={u.is_active ? "label-caps text-success" : "label-caps text-muted-foreground"}>
          {u.is_active ? "Aktif" : "Non-aktif"}
        </span>
      ),
    },
    {
      key: "last",
      header: "Aktivitas Terakhir",
      hideOnMobile: true,
      cell: (u) => (u.last_login_at ? formatDateTime(u.last_login_at) : "Belum pernah masuk"),
    },
  ];

  return (
    <AdminPage
      permission="user.manage"
      title="Pengguna"
      description="Akun operator sistem manajemen pertandingan."
      isLoading={users.isLoading}
      isError={users.isError}
    >
      <div className="mt-6">
        <DataTable
          rows={users.data ?? []}
          columns={columns}
          getRowId={(u) => u.id}
          searchable
          searchPlaceholder="Cari pengguna…"
          searchValue={(u) => `${u.full_name} ${u.email} ${ROLE_LABEL[u.role]}`}
          emptyMessage="Belum ada pengguna."
        />
      </div>
    </AdminPage>
  );
}
