import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Users } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Badge } from "@/components/ui/badge";
import { useCompetitionData } from "@/hooks/use-competition-data";
import { formatNumber } from "@/lib/format";

export const Route = createFileRoute("/venue")({
  head: () => ({
    meta: [
      { title: "Venue Pertandingan — Futsal PORPROV Sulsel 2026" },
      {
        name: "description",
        content:
          "Daftar venue dan lapangan pelaksanaan cabang olahraga futsal PORPROV Sulawesi Selatan 2026.",
      },
      { property: "og:title", content: "Venue Futsal PORPROV Sulsel 2026" },
      {
        property: "og:description",
        content: "Lokasi, kapasitas, dan jumlah lapangan setiap venue pertandingan.",
      },
    ],
  }),
  component: VenuePage,
});

function VenuePage() {
  const { venues, matches } = useCompetitionData();

  return (
    <PublicLayout>
      <PageHeader eyebrow="Fasilitas" title="Venue Pertandingan" />
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {venues.map((venue) => (
          <article key={venue.id} className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-xl font-bold">{venue.name}</h2>
              <Badge variant={venue.is_active ? "default" : "secondary"}>
                {venue.is_active ? "Aktif" : "Nonaktif"}
              </Badge>
            </div>
            <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
              {venue.address}, {venue.city}
            </p>
            <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
              <div>
                <dt className="label-caps text-muted-foreground">Kapasitas</dt>
                <dd className="score-numeral text-2xl">{formatNumber(venue.capacity)}</dd>
              </div>
              <div>
                <dt className="label-caps text-muted-foreground">Lapangan</dt>
                <dd className="score-numeral text-2xl">{venue.court_count}</dd>
              </div>
              <div>
                <dt className="label-caps text-muted-foreground">Match</dt>
                <dd className="score-numeral text-2xl">
                  {matches.filter((m) => m.venue_id === venue.id).length}
                </dd>
              </div>
            </dl>
            <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="size-3.5" aria-hidden /> Dikelola oleh manajer venue panitia
            </p>
          </article>
        ))}
      </div>
    </PublicLayout>
  );
}
