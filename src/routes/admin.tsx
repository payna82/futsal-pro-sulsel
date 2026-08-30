import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Skeleton } from "@/components/ui/skeleton";
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
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}
