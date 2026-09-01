import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
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
      return;
    }

    if (requiredPermission && user && !can(user.role, requiredPermission)) {
      navigate({ to: "/admin", replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, requiredPermission, user]);

  if (isLoading || !isAuthenticated || (requiredPermission && user && !can(user.role, requiredPermission))) {
    return (
      <div className="space-y-3 p-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}
