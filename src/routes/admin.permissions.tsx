import { createFileRoute } from "@tanstack/react-router";
import { Check, Minus } from "lucide-react";
import { AdminPage } from "@/components/admin/AdminPage";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PERMISSIONS, ROLE_LABEL, ROLE_PERMISSIONS, can } from "@/domain/permissions";
import { ROLES } from "@/domain/types";
import { adminHead } from "@/lib/head";

export const Route = createFileRoute("/admin/permissions")({
  head: () =>
    adminHead(
      "Matriks Izin Akses — Panel Panitia Futsal PORPROV Sulsel 2026",
      "Matriks izin akses per peran pada sistem manajemen pertandingan futsal PORPROV Sulsel 2026.",
    ),
  component: AdminPermissionsRoute,
});

function AdminPermissionsRoute() {
  return (
    <AdminPage
      permission="role.manage"
      title="Izin Akses"
      description="Matriks izin diambil langsung dari katalog domain. Penegakan akhir dilakukan backend."
    >
      <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface hover:bg-surface">
              <TableHead className="label-caps sticky left-0 bg-surface text-muted-foreground">
                Izin
              </TableHead>
              {ROLES.map((role) => (
                <TableHead key={role} className="label-caps text-center text-muted-foreground">
                  {ROLE_LABEL[role]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {PERMISSIONS.map((permission) => (
              <TableRow key={permission}>
                <TableCell className="sticky left-0 bg-card font-mono text-xs whitespace-nowrap">
                  {permission}
                </TableCell>
                {ROLES.map((role) => (
                  <TableCell key={role} className="text-center">
                    {can(role, permission) ? (
                      <Check className="mx-auto size-4 text-success" aria-label="Diizinkan" />
                    ) : (
                      <Minus
                        className="mx-auto size-4 text-muted-foreground/50"
                        aria-label="Tidak diizinkan"
                      />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {PERMISSIONS.length} izin • {ROLES.length} peran • total{" "}
        {ROLES.reduce((sum, r) => sum + ROLE_PERMISSIONS[r].length, 0)} pemetaan.
      </p>
    </AdminPage>
  );
}
