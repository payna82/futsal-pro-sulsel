import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, MapPin, Radio, Trophy, Users } from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { MatchList } from "@/components/match/MatchList";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { useCompetitionData } from "@/hooks/use-competition-data";
import { playersQuery, tournamentQuery } from "@/hooks/queries";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PORPROV Sulsel 2026 — Futsal Putra & Putri" },
      {
        name: "description",
        content:
          "Portal resmi cabang olahraga futsal PORPROV Sulawesi Selatan 2026: jadwal pertandingan, hasil, klasemen, dan skor langsung dari seluruh venue.",
      },
      { property: "og:title", content: "PORPROV Sulsel 2026 — Futsal Putra & Putri" },
      {
        property: "og:description",
        content: "Jadwal, hasil, klasemen, dan skor langsung futsal PORPROV Sulsel 2026.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { data: tournament } = useQuery(tournamentQuery());
  const { data: players = [] } = useQuery(playersQuery());
  const { matches, teams, venues } = useCompetitionData();

  const live = matches.filter((m) => m.status === "LIVE");
  const upcoming = matches
    .filter((m) => m.status === "SCHEDULED" || m.status === "CHECK_IN")
    .slice(0, 6);
  const latest = matches
    .filter((m) => m.status === "PUBLISHED" || m.status === "CONFIRMED")
    .slice(-6);

  return (
    <PublicLayout>
      <section className="overflow-hidden rounded-xl border border-pitch-border bg-pitch p-6 text-pitch-foreground sm:p-10">
        <p className="label-caps text-gold">
          {tournament ? `${tournament.host_city} • ${tournament.season}` : "Sulawesi Selatan"}
        </p>
        <h1 className="mt-2 text-4xl leading-none font-bold sm:text-6xl">
          PEKAN OLAHRAGA PROVINSI
          <br />
          SULAWESI SELATAN 2026
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-pitch-muted sm:text-base">
          Cabang olahraga futsal putra dan putri.{" "}
          {tournament
            ? `${formatDate(tournament.start_date)} – ${formatDate(tournament.end_date)}.`
            : ""}{" "}
          Seluruh data pertandingan dikelola langsung oleh panitia pelaksana.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild className="bg-live text-live-foreground hover:bg-live/90">
            <Link to="/live">
              <Radio className="size-4" /> Skor Langsung
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-white/25 bg-transparent text-pitch-foreground hover:bg-white/10 hover:text-pitch-foreground"
          >
            <Link to="/jadwal">
              <CalendarDays className="size-4" /> Jadwal Pertandingan
            </Link>
          </Button>
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <Link
          to="/jadwal"
          className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary"
        >
          <p className="label-caps text-primary">Pengunjung</p>
          <h2 className="mt-2 text-xl font-bold">Lihat pertandingan</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Cek jadwal, hasil, dan skor langsung dari seluruh venue pertandingan.
          </p>
        </Link>

        <Link
          to="/team/login"
          className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary"
        >
          <p className="label-caps text-primary">Tim</p>
          <h2 className="mt-2 text-xl font-bold">Portal manajemen tim</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Kelola profil tim, pemain, ofisial, dokumen, dan status registrasi.
          </p>
        </Link>

        <Link
          to="/masuk"
          className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary"
        >
          <p className="label-caps text-primary">Panitia</p>
          <h2 className="mt-2 text-xl font-bold">Masuk panel operasional</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Akses jadwal, verifikasi peserta, pengelolaan hasil, dan log audit resmi.
          </p>
        </Link>
      </section>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pertandingan Berlangsung" value={live.length} icon={Radio} tone="live" />
        <StatCard label="Tim Peserta" value={teams.length} icon={Users} />
        <StatCard label="Pemain Terdaftar" value={players.length} icon={Trophy} />
        <StatCard
          label="Venue Aktif"
          value={venues.filter((v) => v.is_active).length}
          icon={MapPin}
        />
      </div>

      {live.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-bold">
            <span className="size-2 animate-pulse rounded-full bg-live" aria-hidden />
            Sedang Berlangsung
          </h2>
          <MatchList matches={live} />
        </section>
      ) : null}

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">Pertandingan Berikutnya</h2>
          <Link to="/jadwal" className="text-sm font-medium text-primary hover:underline">
            Lihat semua jadwal
          </Link>
        </div>
        <MatchList matches={upcoming} />
      </section>

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">Hasil Terkini</h2>
          <Link to="/hasil" className="text-sm font-medium text-primary hover:underline">
            Lihat semua hasil
          </Link>
        </div>
        <MatchList matches={latest} />
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        <Link
          to="/putra"
          className="rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary"
        >
          <p className="label-caps text-primary">Nomor Pertandingan</p>
          <h3 className="mt-1 text-2xl font-bold">Futsal Putra</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            8 kontingen, 2 grup penyisihan, semifinal dan final.
          </p>
        </Link>
        <Link
          to="/putri"
          className="rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary"
        >
          <p className="label-caps text-primary">Nomor Pertandingan</p>
          <h3 className="mt-1 text-2xl font-bold">Futsal Putri</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            6 kontingen, 2 grup penyisihan, semifinal dan final.
          </p>
        </Link>
      </section>
    </PublicLayout>
  );
}
