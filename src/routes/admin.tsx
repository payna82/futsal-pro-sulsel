import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, LogOut, ShieldAlert } from "lucide-react";
import { useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { can, getAdminRoutePermission } from "@/domain/permissions";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Panel Panitia — Futsal PORPROV Sulsel 2026" },
      {
        name: "description",
        content:
          "Panel operasional panitia futsal PORPROV Sulsel 2026: jadwal, pertandingan, peserta, dan laporan.",
      },
      { property: "og:title", content: "Panel Panitia — Futsal PORPROV Sulsel 2026" },
      {
        property: "og:description",
        content: "Panel operasional panitia futsal PORPROV Sulsel 2026.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminRouteLayout,
});

function AdminRouteLayout() {
  const { isAuthenticated, isLoading, user } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const requiredPermission = getAdminRoutePermission(location.pathname);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      navigate({ to: "/masuk", replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="space-y-3 p-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <ShieldAlert className="size-6" />
          </div>
          <h1 className="mt-5 text-2xl font-bold">Silakan masuk ke panel panitia</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Anda perlu masuk dengan akun petugas resmi untuk mengakses area panel administrasi.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild>
              <Link to="/masuk">
                <ArrowLeft className="size-4" /> Masuk sekarang
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">Ke situs publik</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (requiredPermission && user && !can(user.role, requiredPermission)) {
    const isTeamAccount = user.account_type === "TEAM";

    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-xl border border-destructive/30 bg-card p-8 text-center shadow-sm">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-100 text-red-700">
            <AlertTriangle className="size-6" />
          </div>
          <h1 className="mt-5 text-2xl font-bold">Akses panel dibatasi</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Akun Anda saat ini menggunakan peran <span className="font-semibold text-foreground">{user.role}</span>,
            namun halaman ini membutuhkan izin <span className="font-mono text-foreground">{requiredPermission}</span>.
          </p>
          <div className="mt-4 rounded-md border border-border bg-muted/40 p-3 text-left text-sm text-muted-foreground">
            {isTeamAccount ? (
              <p>Sepertinya akun Anda masuk sebagai tim. Gunakan portal tim untuk mengelola data peserta dan dokumen tim.</p>
            ) : (
              <p>Untuk membuka bagian ini, Anda perlu masuk dengan akun petugas resmi atau minta akses dari admin turnamen.</p>
            )}
          </div>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild>
              <Link to={isTeamAccount ? "/team" : "/admin"}>
                <ArrowLeft className="size-4" /> {isTeamAccount ? "Ke portal tim" : "Kembali ke dasbor"}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={isTeamAccount ? "/team/login" : "/masuk"}>Pilih akun lain</Link>
            </Button>
            <Button variant="outline" onClick={() => navigate({ to: "/", replace: true })}>
              <LogOut className="size-4" /> Beranda
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}
