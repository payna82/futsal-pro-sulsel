import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/common/PageHeader";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Dasbor Panitia — Futsal PORPROV Sulsel 2026" },
      {
        name: "description",
        content:
          "Panel operasional panitia futsal PORPROV Sulsel 2026: jadwal, pertandingan, peserta, dan laporan.",
      },
      { property: "og:title", content: "Dasbor Panitia — Futsal PORPROV Sulsel 2026" },
      {
        property: "og:description",
        content: "Panel operasional panitia futsal PORPROV Sulsel 2026.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  return (
    <AdminLayout>
      <PageHeader
        eyebrow="Panel Panitia"
        title="Dasbor Operasional"
        description="Ringkasan operasional pertandingan futsal PORPROV Sulsel 2026."
      />
      <p className="mt-6 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Modul administrasi sedang disiapkan pada tahap berikutnya.
      </p>
    </AdminLayout>
  );
}
