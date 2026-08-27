import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { CategoryOverview } from "@/components/public/CategoryOverview";

export const Route = createFileRoute("/putri")({
  head: () => ({
    meta: [
      { title: "Futsal Putri — PORPROV Sulsel 2026" },
      {
        name: "description",
        content:
          "Jadwal, hasil, klasemen grup, daftar tim, dan top skor nomor futsal putri PORPROV Sulawesi Selatan 2026.",
      },
      { property: "og:title", content: "Futsal Putri — PORPROV Sulsel 2026" },
      {
        property: "og:description",
        content: "Klasemen dan hasil lengkap futsal putri PORPROV Sulsel 2026.",
      },
    ],
  }),
  component: () => (
    <PublicLayout>
      <CategoryOverview categoryKey="WOMEN" />
    </PublicLayout>
  ),
});
