import type { ReactNode } from "react";
import { ShieldAlert, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import type { PermissionKey } from "@/domain/permissions";
import { useSession } from "@/hooks/use-session";

/**
 * Pembungkus halaman admin. Otorisasi memakai katalog izin yang sudah ada
 * (src/domain/permissions.ts). Penyembunyian UI hanya lapisan UX;
 * backend tetap menjadi otoritas.
 */
export function AdminPage({
  permission,
  eyebrow = "Panel Panitia",
  title,
  description,
  actions,
  isLoading = false,
  isError = false,
  errorMessage = "Data gagal dimuat. Silakan muat ulang halaman.",
  children,
}: {
  permission: PermissionKey;
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  children: ReactNode;
}) {
  const { can } = useSession();

  if (!can(permission)) {
    return (
      <>
        <PageHeader eyebrow={eyebrow} title={title} />
        <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-10 text-center">
          <ShieldAlert className="size-8 text-destructive" aria-hidden />
          <h2 className="text-lg font-bold">Akses Ditolak</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Akun Anda tidak memiliki izin <code className="font-mono">{permission}</code> untuk
            membuka modul ini. Hubungi Admin Turnamen bila membutuhkan akses.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        {...(description ? { description } : {})}
        {...(actions ? { actions } : {})}
      />
      {isError ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-border p-10 text-center">
          <TriangleAlert className="size-7 text-warning-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        children
      )}
    </>
  );
}
