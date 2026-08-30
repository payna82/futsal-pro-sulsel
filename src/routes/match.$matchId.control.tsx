import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowLeftRight,
  CircleDot,
  Pause,
  PauseCircle,
  Play,
  RectangleVertical,
  RotateCcw,
  ShieldAlert,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EventTimeline } from "@/components/match/EventTimeline";
import { MatchEventDialog, type EventDialogType } from "@/components/match/MatchEventDialog";
import { Scoreboard } from "@/components/match/Scoreboard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MATCH_PERIOD_LABEL,
  MATCH_STATUS_LABEL,
  allowedEvents,
  canTransition,
  formatClock,
  nextStatuses,
} from "@/domain/match-state";
import {
  countFouls,
  deriveScore,
  periodForStatus,
  validateMatchEvent,
  type NewMatchEventInput,
} from "@/domain/match-operations";
import type { MatchStatus, Player, UUID } from "@/domain/types";
import {
  lineupQuery,
  matchEventsQuery,
  matchOfficialsQuery,
  matchQuery,
  playersQuery,
} from "@/hooks/queries";
import {
  useRecordMatchEvent,
  useTransitionMatchStatus,
  useUpdateMatchClock,
} from "@/hooks/mutations";
import { useCompetitionData } from "@/hooks/use-competition-data";
import { useMatchClock } from "@/hooks/use-match-clock";
import {useSession, useActor } from "@/hooks/use-session";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/match/$matchId/control")({
  head: () => ({
    meta: [
      { title: "Match Center — Kendali Pertandingan Futsal PORPROV Sulsel 2026" },
      {
        name: "description",
        content:
          "Pusat kendali operator pertandingan futsal PORPROV Sulsel 2026: jam pertandingan, gol, kartu, pelanggaran, pergantian pemain, dan transisi status.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Match Center — Futsal PORPROV Sulsel 2026" },
      {
        property: "og:description",
        content: "Pusat kendali operator pertandingan futsal PORPROV Sulsel 2026.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MatchControlRoute,
});

const STATUS_ACTION_LABEL: Record<MatchStatus, string> = {
  SCHEDULED: "Kembali ke Terjadwal",
  CHECK_IN: "Check-in",
  LINEUP: "Susunan Pemain",
  READY: "Tandai Siap",
  LIVE: "Mulai / Lanjutkan",
  HALFTIME: "Turun Minum",
  FULL_TIME: "Akhiri Pertandingan",
  CONFIRMED: "Konfirmasi Hasil",
  PUBLISHED: "Publikasikan",
};

function MatchControlRoute() {
  const { matchId } = Route.useParams();
  const session = useSession();
  const data = useCompetitionData();

  const match = useQuery(matchQuery(matchId));
  const events = useQuery(matchEventsQuery(matchId));
  const lineup = useQuery(lineupQuery(matchId));
  const officials = useQuery(matchOfficialsQuery(matchId));
  const actor = useActor();
  const players = useQuery(playersQuery(actor));

  const recordEvent = useRecordMatchEvent(matchId);
  const transition = useTransitionMatchStatus(matchId);
  const updateClock = useUpdateMatchClock(matchId);

  const [dialogType, setDialogType] = useState<EventDialogType | null>(null);
  const [pendingStatus, setPendingStatus] = useState<MatchStatus | null>(null);

  const m = match.data;
  const clock = useMatchClock(m?.clock_seconds ?? 0, false);
  const { reset: resetClock } = clock;

  useEffect(() => {
    if (m) resetClock(m.clock_seconds);
  }, [m?.id, m?.status, resetClock, m]);

  const eventList = useMemo(() => events.data ?? [], [events.data]);
  const playerById = useMemo(
    () => new Map((players.data ?? []).map((p) => [p.id, p])),
    [players.data],
  );

  const squadOf = useMemo(() => {
    const entries = lineup.data ?? [];
    return (teamId: UUID): Player[] => {
      const fromLineup = entries
        .filter((e) => e.team_id === teamId)
        .map((e) => playerById.get(e.player_id))
        .filter((p): p is Player => Boolean(p));
      if (fromLineup.length > 0) return fromLineup;
      return (players.data ?? []).filter((p) => p.team_id === teamId);
    };
  }, [lineup.data, playerById, players.data]);

  const canRecord = session.can("match.record_event");
  const canOperateClock = session.can("match.operate_clock");
  const canManage = session.can("match.manage");
  const canConfirm = session.can("match.confirm");
  const canPublish = session.can("match.publish");

  if (match.isLoading || data.isLoading) {
    return (
      <main className="min-h-screen bg-background p-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="mt-4 h-64 w-full" />
      </main>
    );
  }

  if (!m) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-6 text-center">
        <h1 className="text-xl font-bold">Pertandingan tidak ditemukan</h1>
        <Button asChild variant="outline">
          <Link to="/admin/matches">Kembali ke Daftar Pertandingan</Link>
        </Button>
      </main>
    );
  }

  if (!session.canAny(["match.record_event", "match.operate_clock", "match.manage"])) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-6 text-center">
        <ShieldAlert className="size-8 text-destructive" aria-hidden />
        <h1 className="text-xl font-bold">Akses Ditolak</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Akun Anda tidak memiliki izin untuk mengoperasikan Match Center. Hubungi Admin Turnamen.
        </p>
        <Button asChild variant="outline">
          <Link to="/pertandingan/$matchId" params={{ matchId }}>
            Lihat Halaman Publik
          </Link>
        </Button>
      </main>
    );
  }

  const score = deriveScore(eventList, m.home_team_id, m.away_team_id);
  const period = periodForStatus(m.status, m.period);
  const homeFouls = countFouls(eventList, m.home_team_id, period);
  const awayFouls = countFouls(eventList, m.away_team_id, period);
  const permittedEvents = allowedEvents(m.status);

  const statusPermission = (to: MatchStatus) =>
    to === "CONFIRMED" ? canConfirm : to === "PUBLISHED" ? canPublish : canManage;

  const submitEvent = (
    input: Omit<NewMatchEventInput, "match_id" | "operator_id" | "command_id">,
  ) => {
    if (!session.user) return;
    if (!canRecord) {
      toast.error("Anda tidak memiliki izin mencatat kejadian.");
      return;
    }
    const payload: NewMatchEventInput = {
      ...input,
      match_id: matchId,
      operator_id: session.user.id,
      command_id: `event-${matchId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
    };
    const error = validateMatchEvent(payload, {
      status: m.status,
      homeTeamId: m.home_team_id,
      awayTeamId: m.away_team_id,
      playersOfTeam: (teamId) => squadOf(teamId).map((p) => p.id),
    });
    if (error) {
      toast.error(error);
      return;
    }
    recordEvent.mutate(payload, {
      onSuccess: () => {
        setDialogType(null);
        toast.success("Kejadian tercatat.");
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : "Gagal mencatat kejadian."),
    });
  };

  const confirmTransition = () => {
    if (!pendingStatus || !session.user) return;
    if (!canTransition(m.status, pendingStatus) || !statusPermission(pendingStatus)) {
      toast.error("Transisi status tidak diizinkan.");
      setPendingStatus(null);
      return;
    }
    transition.mutate(
      { to: pendingStatus, operator_id: session.user.id },
      {
        onSuccess: () => {
          toast.success(`Status menjadi ${MATCH_STATUS_LABEL[pendingStatus]}.`);
          setPendingStatus(null);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Transisi gagal.");
          setPendingStatus(null);
        },
      },
    );
  };

  const syncClock = () => {
    updateClock.mutate(clock.seconds, {
      onSuccess: () => toast.success("Jam pertandingan tersimpan."),
      onError: () => toast.error("Jam pertandingan gagal disimpan."),
    });
  };

  const eventButtons: { type: EventDialogType; label: string; icon: typeof CircleDot }[] = [
    { type: "GOAL", label: "Gol", icon: CircleDot },
    { type: "CARD", label: "Kartu", icon: RectangleVertical },
    { type: "FOUL", label: "Pelanggaran", icon: PauseCircle },
    { type: "SUBSTITUTION", label: "Pergantian", icon: ArrowLeftRight },
    { type: "TIMEOUT", label: "Time-out", icon: Timer },
  ];

  return (
    <main className="min-h-screen bg-background pb-10">
      <header className="border-b border-border bg-surface px-4 py-3">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
          <Button asChild size="sm" variant="ghost">
            <Link to="/admin/matches">
              <ArrowLeft className="size-4" aria-hidden /> Daftar
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="label-caps text-muted-foreground">
              PORPROV Sulsel 2026 • Partai #{m.match_number} • {m.stage}
            </p>
            <h1 className="truncate text-lg font-bold">
              {data.teamName(m.home_team_id)} vs {data.teamName(m.away_team_id)}
            </h1>
            <p className="text-xs text-muted-foreground">
              {data.venueName(m.venue_id)} • Lapangan {m.court} • {formatDateTime(m.kickoff_at)}
            </p>
          </div>
          <StatusBadge status={m.status} />
        </div>
      </header>

      <div className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-7xl">
          <Scoreboard
            homeName={data.teamName(m.home_team_id)}
            awayName={data.teamName(m.away_team_id)}
            homeShort={data.teamShort(m.home_team_id)}
            awayShort={data.teamShort(m.away_team_id)}
            homeScore={score.home}
            awayScore={score.away}
            period={period}
            status={m.status}
            clockSeconds={clock.seconds}
            homeFouls={homeFouls}
            awayFouls={awayFouls}
          />
        </div>
      </div>

      <div className="mx-auto mt-4 grid max-w-7xl gap-4 px-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="label-caps text-muted-foreground">Kendali Status</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {nextStatuses(m.status).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Pertandingan telah dipublikasikan. Tidak ada transisi lanjutan.
                </p>
              ) : (
                nextStatuses(m.status).map((to) => (
                  <Button
                    key={to}
                    className="h-14 min-w-40 flex-1 text-base"
                    variant={to === "LIVE" ? "default" : "outline"}
                    disabled={!statusPermission(to) || transition.isPending}
                    onClick={() => setPendingStatus(to)}
                  >
                    {STATUS_ACTION_LABEL[to]}
                  </Button>
                ))
              )}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Transisi mengikuti mesin status resmi. Validasi akhir dilakukan backend.
            </p>
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="label-caps text-muted-foreground">Jam Pertandingan</h2>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="clock-numeral text-4xl">{formatClock(clock.seconds)}</span>
              <div className="flex flex-wrap gap-2">
                <Button
                  className="h-12"
                  variant={clock.running ? "outline" : "default"}
                  disabled={!canOperateClock || m.status !== "LIVE"}
                  onClick={clock.toggle}
                >
                  {clock.running ? (
                    <>
                      <Pause className="size-4" aria-hidden /> Jeda
                    </>
                  ) : (
                    <>
                      <Play className="size-4" aria-hidden /> Jalankan
                    </>
                  )}
                </Button>
                <Button
                  className="h-12"
                  variant="outline"
                  disabled={!canOperateClock}
                  onClick={() => clock.adjust(-60)}
                >
                  -1 mnt
                </Button>
                <Button
                  className="h-12"
                  variant="outline"
                  disabled={!canOperateClock}
                  onClick={() => clock.adjust(60)}
                >
                  +1 mnt
                </Button>
                <Button
                  className="h-12"
                  variant="ghost"
                  disabled={!canOperateClock}
                  onClick={() => clock.reset(0)}
                >
                  <RotateCcw className="size-4" aria-hidden /> Reset
                </Button>
                <Button
                  className="h-12"
                  disabled={!canOperateClock || updateClock.isPending}
                  onClick={syncClock}
                >
                  {updateClock.isPending ? "Menyimpan…" : "Simpan Jam"}
                </Button>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="label-caps text-muted-foreground">Input Kejadian</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {eventButtons.map(({ type, label, icon: Icon }) => {
                const allowed = permittedEvents.includes(type);
                return (
                  <Button
                    key={type}
                    className="h-20 flex-col gap-1 text-base"
                    variant={type === "GOAL" ? "default" : "outline"}
                    disabled={!canRecord || !allowed || recordEvent.isPending}
                    onClick={() => setDialogType(type)}
                  >
                    <Icon className="size-5" aria-hidden />
                    {label}
                  </Button>
                );
              })}
            </div>
            {!canRecord ? (
              <p className="mt-3 text-xs text-destructive">
                Anda tidak memiliki izin mencatat kejadian pertandingan.
              </p>
            ) : permittedEvents.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Kejadian hanya dapat dicatat saat pertandingan berlangsung.
              </p>
            ) : null}
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="label-caps text-muted-foreground">Linimasa Kejadian</h2>
            <EventTimeline
              events={eventList}
              teamShort={(id) => (id ? data.teamShort(id) : "")}
              playerName={(id) => (id ? (playerById.get(id)?.full_name ?? "—") : "—")}
            />
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="label-caps text-muted-foreground">Informasi Pertandingan</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Periode</dt>
                <dd className="font-medium">{MATCH_PERIOD_LABEL[period]}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-medium">{MATCH_STATUS_LABEL[m.status]}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Grup</dt>
                <dd className="font-medium">{data.groupName(m.group_id)}</dd>
              </div>
            </dl>
            <h3 className="label-caps mt-4 text-muted-foreground">Perangkat Pertandingan</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {(officials.data ?? []).length === 0 ? (
                <li className="text-muted-foreground">Belum ada penugasan.</li>
              ) : (
                (officials.data ?? []).map((o) => (
                  <li key={o.id} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">{o.role}</span>
                    <span className="font-medium">{o.full_name}</span>
                  </li>
                ))
              )}
            </ul>
          </section>

          {[m.home_team_id, m.away_team_id].map((teamId) => {
            const entries = (lineup.data ?? []).filter((e) => e.team_id === teamId);
            const starters = entries.filter((e) => e.is_starting);
            const subs = entries.filter((e) => !e.is_starting);
            return (
              <section key={teamId} className="rounded-lg border border-border bg-card p-4">
                <h2 className="font-bold">{data.teamName(teamId)}</h2>
                <LineupList title="Starting Five" entries={starters} playerById={playerById} />
                <LineupList title="Cadangan" entries={subs} playerById={playerById} />
              </section>
            );
          })}
        </aside>
      </div>

      <MatchEventDialog
        type={dialogType}
        onOpenChange={(open) => setDialogType(open ? dialogType : null)}
        homeTeamId={m.home_team_id}
        awayTeamId={m.away_team_id}
        teamName={data.teamName}
        squadOf={squadOf}
        period={period}
        clockSeconds={clock.seconds}
        isPending={recordEvent.isPending}
        onSubmit={submitEvent}
      />

      <AlertDialog open={pendingStatus !== null} onOpenChange={(o) => !o && setPendingStatus(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Ubah status ke {pendingStatus ? MATCH_STATUS_LABEL[pendingStatus] : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Perubahan status pertandingan tercatat pada log audit dan tidak dapat dibatalkan
              secara bebas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={transition.isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmTransition} disabled={transition.isPending}>
              {transition.isPending ? "Memproses…" : "Ya, Ubah Status"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function LineupList({
  title,
  entries,
  playerById,
}: {
  title: string;
  entries: { id: string; player_id: string; shirt_number: number }[];
  playerById: Map<string, Player>;
}) {
  return (
    <div className="mt-3">
      <h3 className="label-caps text-muted-foreground">{title}</h3>
      {entries.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">Belum ada data.</p>
      ) : (
        <ul className="mt-1 divide-y divide-border">
          {entries.map((e) => {
            const player = playerById.get(e.player_id);
            return (
              <li key={e.id} className="flex items-center gap-3 py-2">
                <span className="score-numeral w-8 text-center text-lg">{e.shirt_number}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {player?.full_name ?? "—"}
                </span>
                <span className="label-caps text-muted-foreground">{player?.position ?? ""}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
