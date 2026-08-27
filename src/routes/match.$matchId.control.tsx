import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";

export const Route = createFileRoute("/match/$matchId/control")({
  head: () => ({
    meta: [
      { title: "Match Center — Futsal PORPROV Sulsel 2026" },
      {
        name: "description",
        content:
          "Pusat kendali pertandingan futsal PORPROV Sulsel 2026: jam pertandingan, gol, kartu, foul, dan pergantian pemain.",
      },
      { property: "og:title", content: "Match Center — Futsal PORPROV Sulsel 2026" },
      {
        property: "og:description",
        content: "Pusat kendali pertandingan futsal PORPROV Sulsel 2026.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MatchControl,
});

function MatchControl() {
  const { matchId } = Route.useParams();

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6">
      <PageHeader
        eyebrow="Match Center"
        title="Pusat Kendali Pertandingan"
        description={`Kendali pertandingan ${matchId}. Modul pencatatan langsung sedang disiapkan.`}
      />
      <p className="mt-6 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Panel jam pertandingan, input kejadian, dan transisi status akan tersedia pada tahap
        berikutnya.
      </p>
    </main>
  );
}
