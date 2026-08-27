import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminPage } from "@/components/admin/AdminPage";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MATCH_STATUS_LABEL } from "@/domain/match-state";
import { MATCH_STATUSES, type Match } from "@/domain/types";
import { useUpdateMatchSchedule } from "@/hooks/mutations";
import { useCompetitionData } from "@/hooks/use-competition-data";
import { adminHead } from "@/lib/head";
import { dateKey, formatShortDate, formatTime } from "@/lib/format";

export const Route = createFileRoute("/admin/schedule")({
  head: () =>
    adminHead(
      "Jadwal Pertandingan — Panel Panitia Futsal PORPROV Sulsel 2026",
      "Kelola jadwal pertandingan futsal PORPROV Sulsel 2026: tanggal, jam, venue, dan lapangan.",
    ),
  component: AdminScheduleRoute,
});

const ALL = "ALL";

function AdminScheduleRoute() {
  const data = useCompetitionData();
  const updateSchedule = useUpdateMatchSchedule();
  const [category, setCategory] = useState(ALL);
  const [venue, setVenue] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [day, setDay] = useState(ALL);
  const [editing, setEditing] = useState<Match | null>(null);

  const days = useMemo(
    () => [...new Set(data.matches.map((m) => dateKey(m.kickoff_at)))].sort(),
    [data.matches],
  );

  const rows = data.matches
    .filter((m) => category === ALL || m.category_id === category)
    .filter((m) => venue === ALL || m.venue_id === venue)
    .filter((m) => status === ALL || m.status === status)
    .filter((m) => day === ALL || dateKey(m.kickoff_at) === day)
    .sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at));

  const columns: Column<Match>[] = [
    { key: "no", header: "No", cell: (m) => <span className="score-numeral">#{m.match_number}</span> },
    {
      key: "category",
      header: "Nomor",
      hideOnMobile: true,
      cell: (m) => data.categories.find((c) => c.id === m.category_id)?.name ?? "—",
    },
    { key: "stage", header: "Babak", hideOnMobile: true, cell: (m) => data.groupName(m.group_id) },
    { key: "date", header: "Tanggal", cell: (m) => formatShortDate(m.kickoff_at) },
    { key: "time", header: "Jam", cell: (m) => formatTime(m.kickoff_at) },
    {
      key: "venue",
      header: "Venue",
      hideOnMobile: true,
      cell: (m) => `${data.venueName(m.venue_id)} • Lap. ${m.court}`,
    },
    { key: "home", header: "Tuan Rumah", cell: (m) => data.teamName(m.home_team_id) },
    { key: "away", header: "Tamu", cell: (m) => data.teamName(m.away_team_id) },
    { key: "status", header: "Status", cell: (m) => <StatusBadge status={m.status} /> },
    {
      key: "actions",
      header: "Aksi",
      cell: (m) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditing(m)}>
            Ubah
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link to="/pertandingan/$matchId" params={{ matchId: m.id }}>
              Lihat
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminPage
      permission="schedule.manage"
      title="Jadwal Pertandingan"
      description="Atur tanggal, jam, venue, dan lapangan setiap pertandingan."
      isLoading={data.isLoading}
    >
      <div className="mt-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <FilterSelect label="Nomor" value={category} onChange={setCategory} options={[{ value: ALL, label: "Semua nomor" }, ...data.categories.map((c) => ({ value: c.id, label: c.name }))]} />
        <FilterSelect label="Venue" value={venue} onChange={setVenue} options={[{ value: ALL, label: "Semua venue" }, ...data.venues.map((v) => ({ value: v.id, label: v.name }))]} />
        <FilterSelect label="Status" value={status} onChange={setStatus} options={[{ value: ALL, label: "Semua status" }, ...MATCH_STATUSES.map((s) => ({ value: s, label: MATCH_STATUS_LABEL[s] }))]} />
        <FilterSelect label="Tanggal" value={day} onChange={setDay} options={[{ value: ALL, label: "Semua tanggal" }, ...days.map((d) => ({ value: d, label: formatShortDate(d) }))]} />
      </div>

      <div className="mt-4">
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(m) => m.id}
          searchable
          searchPlaceholder="Cari tim…"
          searchValue={(m) => `${data.teamName(m.home_team_id)} ${data.teamName(m.away_team_id)}`}
          emptyMessage="Tidak ada pertandingan sesuai filter."
        />
      </div>

      <EditScheduleDialog
        match={editing}
        onClose={() => setEditing(null)}
        venues={data.venues.map((v) => ({ id: v.id, name: v.name, courts: v.court_count }))}
        isPending={updateSchedule.isPending}
        onSubmit={(input) => {
          updateSchedule.mutate(input, {
            onSuccess: () => {
              toast.success("Jadwal diperbarui.");
              setEditing(null);
            },
            onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal memperbarui jadwal."),
          });
        }}
      />
    </AdminPage>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-1">
      <Label className="label-caps text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function EditScheduleDialog({
  match,
  onClose,
  venues,
  isPending,
  onSubmit,
}: {
  match: Match | null;
  onClose: () => void;
  venues: Array<{ id: string; name: string; courts: number }>;
  isPending: boolean;
  onSubmit: (input: { match_id: string; kickoff_at?: string; venue_id?: string; court?: number }) => void;
}) {
  const [kickoff, setKickoff] = useState("");
  const [venueId, setVenueId] = useState("");
  const [court, setCourt] = useState("1");

  const open = match !== null;
  const initial = match?.kickoff_at.slice(0, 16) ?? "";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
        else if (match) {
          setKickoff(match.kickoff_at.slice(0, 16));
          setVenueId(match.venue_id);
          setCourt(String(match.court));
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ubah Jadwal #{match?.match_number}</DialogTitle>
          <DialogDescription>
            Perubahan jadwal dicatat melalui repository dan log audit.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="kickoff">Waktu kick-off</Label>
            <Input
              id="kickoff"
              type="datetime-local"
              value={kickoff || initial}
              onChange={(e) => setKickoff(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Venue</Label>
            <Select value={venueId || (match?.venue_id ?? "")} onValueChange={setVenueId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih venue" />
              </SelectTrigger>
              <SelectContent>
                {venues.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="court">Lapangan</Label>
            <Input
              id="court"
              type="number"
              min={1}
              value={court}
              onChange={(e) => setCourt(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            disabled={isPending || !match}
            onClick={() => {
              if (!match) return;
              const iso = kickoff || initial;
              onSubmit({
                match_id: match.id,
                kickoff_at: new Date(iso).toISOString(),
                venue_id: venueId || match.venue_id,
                court: Number(court) || match.court,
              });
            }}
          >
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
