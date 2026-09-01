import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { TeamCrest } from "@/components/common/TeamCrest";
import { TeamLayout } from "@/components/layout/TeamLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DOCUMENT_STATUS_LABEL,
  DOCUMENT_TYPES,
  REGISTRATION_STATUS_LABEL,
} from "@/domain/registration";
import type { PlayerPosition } from "@/domain/types";
import type { TeamProfile, TeamRegistrationSummary } from "@/domain/registration";
import { useCompetitionData } from "@/hooks/use-competition-data";
import {
  useCreatePlayer,
  useCreateTeamOfficial,
  useSubmitRegistration,
  useUpdateTeamProfile,
  useUploadDocument,
} from "@/hooks/mutations";
import {
  playersQuery,
  registrationDocumentsQuery,
  teamRegistrationQuery,
  teamProfileQuery,
  teamOfficialsQuery,
} from "@/hooks/queries";
import { useSession, useActor } from "@/hooks/use-session";

type PortalView =
  "overview" | "profile" | "players" | "new-player" | "officials" | "documents" | "submission";

export function TeamPortalPage({ view }: { view: PortalView }) {
  const navigate = useNavigate();
  const session = useSession();
  const teamId = session.user?.team_id ?? "";

  useEffect(() => {
    if (session.isLoading) return;
    if (!session.isAuthenticated || !teamId) {
      navigate({ to: "/team/login", replace: true });
    }
  }, [navigate, session.isAuthenticated, session.isLoading, teamId]);

  const data = useCompetitionData();
  const actor = useActor();
  const registration = useQuery({
    ...teamRegistrationQuery(teamId, actor),
    enabled: Boolean(teamId),
  });
  const profile = useQuery({ ...teamProfileQuery(teamId, actor), enabled: Boolean(teamId) });
  const players = useQuery(playersQuery(actor));
  const officials = useQuery(teamOfficialsQuery(actor));
  const documents = useQuery(registrationDocumentsQuery(actor));
  const team = data.teams.find((item) => item.id === teamId);

  if (session.isLoading) {
    return (
      <TeamLayout>
        <EmptyState
          title="Memuat portal tim"
          description="Sedang mengambil data akun, profil, dan status registrasi tim Anda."
        />
      </TeamLayout>
    );
  }

  if (!session.isAuthenticated || !teamId) {
    return (
      <TeamLayout>
        <EmptyState
          title="Silakan masuk ke portal tim"
          description="Akses tim memerlukan login akun yang terhubung ke tim Anda."
          action={
            <Link to="/team/login" className="text-sm font-medium text-primary hover:underline">
              Ke halaman masuk tim
            </Link>
          }
        />
      </TeamLayout>
    );
  }

  if (!team || !registration.data || !profile.data)
    return (
      <TeamLayout>
        <EmptyState
          title="Sesi akun tim tidak tersedia"
          description="Data tim tidak ditemukan untuk akun saat ini. Silakan masuk kembali atau hubungi panitia."
          action={
            <Link to="/team/login" className="text-sm font-medium text-primary hover:underline">
              Masuk ulang
            </Link>
          }
        />
      </TeamLayout>
    );
  const summary = registration.data;
  const ownPlayers = (players.data ?? []).filter((item) => item.team_id === teamId);
  const ownOfficials = (officials.data ?? []).filter((item) => item.team_id === teamId);
  const ownDocuments = (documents.data ?? []).filter(
    (item) =>
      item.entity_id === teamId ||
      ownPlayers.some((p) => p.id === item.entity_id) ||
      ownOfficials.some((o) => o.id === item.entity_id),
  );
  return (
    <TeamLayout>
      {view === "overview" ? <Overview team={team} summary={summary} /> : null}
      {view === "profile" ? <Profile teamId={teamId} profile={profile.data} /> : null}
      {view === "players" || view === "new-player" ? (
        <Players
          teamId={teamId}
          players={ownPlayers}
          documents={ownDocuments}
          create={view === "new-player"}
        />
      ) : null}
      {view === "officials" ? <Officials teamId={teamId} officials={ownOfficials} /> : null}
      {view === "documents" ? <Documents documents={ownDocuments} /> : null}
      {view === "submission" ? <Submission teamId={teamId} summary={summary} /> : null}
    </TeamLayout>
  );
}

function Overview({
  team,
  summary,
}: {
  team: NonNullable<ReturnType<typeof useCompetitionData>["teams"]>[number];
  summary: TeamRegistrationSummary;
}) {
  return (
    <>
      <PageHeader
        eyebrow="Portal Tim"
        title="Ringkasan Registrasi"
        description="Pantau kelengkapan profil, pemain, ofisial, dan dokumen tim."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Tim</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <TeamCrest shortName={team.short_name} color={team.primary_color} size="sm" />
            <span className="font-semibold">{team.name}</span>
          </CardContent>
        </Card>
        <Metric title="Pemain" value={summary.players.length} />
        <Metric title="Ofisial" value={summary.officials.length} />
        <Metric title="Pemain disetujui" value={summary.approved_player_count} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Status Registrasi</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <StatusBadge status={team.status === "VERIFIED" ? "PUBLISHED" : "SCHEDULED"} />
          <span className="font-medium">
            {REGISTRATION_STATUS_LABEL[summary.profile.registration_status]}
          </span>
          <span className="text-sm text-muted-foreground">
            {summary.pending_count} menunggu pemeriksaan, {summary.revision_count} perlu revisi.
          </span>
        </CardContent>
      </Card>
    </>
  );
}
function Metric({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <span className="score-numeral text-4xl text-primary">{value}</span>
      </CardContent>
    </Card>
  );
}

function Profile({ teamId, profile }: { teamId: string; profile: TeamProfile }) {
  const update = useUpdateTeamProfile(teamId);
  const [contact, setContact] = useState(profile.contact_person);
  const [phone, setPhone] = useState(profile.contact_phone);
  const [email, setEmail] = useState(profile.contact_email);
  const [address, setAddress] = useState(profile.address);
  return (
    <>
      <PageHeader
        eyebrow="Portal Tim"
        title="Profil Tim"
        description="Lengkapi informasi kontak tim untuk pengajuan registrasi."
      />
      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
          <Field label="Kontak Person" value={contact} onChange={setContact} />
          <Field label="Telepon" value={phone} onChange={setPhone} />
          <Field label="Email" value={email} onChange={setEmail} />
          <Field label="Alamat" value={address} onChange={setAddress} />
          <div className="sm:col-span-2">
            <Button
              disabled={update.isPending}
              onClick={() =>
                update.mutate({
                  contact_person: contact,
                  contact_phone: phone,
                  contact_email: email,
                  address,
                  ...(profile.training_venue ? { training_venue: profile.training_venue } : {}),
                  registration_status: profile.registration_status,
                })
              }
            >
              Simpan Profil
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
function Players({
  teamId,
  players,
  documents,
  create,
}: {
  teamId: string;
  players: Awaited<ReturnType<typeof import("@/data").repository.listPlayers>>;
  documents: Awaited<ReturnType<typeof import("@/data").repository.listRegistrationDocuments>>;
  create: boolean;
}) {
  const createPlayer = useCreatePlayer();
  const [name, setName] = useState("");
  const [number, setNumber] = useState("1");
  const [position, setPosition] = useState<PlayerPosition>("FLANK");
  return (
    <>
      <PageHeader
        eyebrow="Portal Tim"
        title="Pemain"
        actions={
          <Button asChild>
            <Link to="/team/players/new">Tambah Pemain</Link>
          </Button>
        }
      />
      <div className="grid gap-3">
        {create ? (
          <Card>
            <CardHeader>
              <CardTitle>Pemain Baru</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <Field label="Nama Lengkap" value={name} onChange={setName} />
              <Field label="Nomor Punggung" value={number} onChange={setNumber} type="number" />
              <div>
                <Label>Posisi</Label>
                <Select
                  value={position}
                  onValueChange={(value) => setPosition(value as PlayerPosition)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["GOALKEEPER", "ANCHOR", "FLANK", "PIVOT"].map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() =>
                  createPlayer.mutate({
                    team_id: teamId,
                    full_name: name,
                    jersey_number: Number(number),
                    position,
                    birth_date: "2000-01-01",
                    is_captain: false,
                  })
                }
              >
                Simpan Pemain
              </Button>
            </CardContent>
          </Card>
        ) : null}
        {players.map((player) => (
          <Card key={player.id}>
            <CardContent className="flex flex-wrap items-center gap-3 pt-6">
              <span className="score-numeral text-2xl">{player.jersey_number}</span>
              <span className="min-w-40 flex-1 font-semibold">{player.full_name}</span>
              <span className="text-sm text-muted-foreground">{player.position}</span>
              <StatusBadge status={player.status === "ELIGIBLE" ? "PUBLISHED" : "SCHEDULED"} />
              <span className="text-xs text-muted-foreground">
                {documents
                  .filter((doc) => doc.entity_id === player.id)
                  .map((doc) => doc.status)
                  .join(", ") || "Dokumen belum ada"}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
function Officials({
  teamId,
  officials,
}: {
  teamId: string;
  officials: Awaited<ReturnType<typeof import("@/data").repository.listTeamOfficials>>;
}) {
  const create = useCreateTeamOfficial();
  const [name, setName] = useState("");
  const [role, setRole] = useState<
    "HEAD_COACH" | "ASSISTANT_COACH" | "MANAGER" | "PHYSIO" | "DOCTOR"
  >("MANAGER");
  return (
    <>
      <PageHeader
        eyebrow="Portal Tim"
        title="Ofisial"
        actions={
          <Button asChild>
            <Link to="/team/officials/new">Tambah Ofisial</Link>
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Tambah Ofisial</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Field label="Nama Lengkap" value={name} onChange={setName} />
          <div>
            <Label>Peran</Label>
            <Select value={role} onValueChange={(value) => setRole(value as typeof role)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["HEAD_COACH", "ASSISTANT_COACH", "MANAGER", "PHYSIO", "DOCTOR"].map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => create.mutate({ team_id: teamId, full_name: name, role })}
            disabled={create.isPending}
          >
            Simpan Ofisial
          </Button>
        </CardContent>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        {officials.map((official) => (
          <Card key={official.id}>
            <CardContent className="pt-6">
              <p className="label-caps text-primary">{official.role}</p>
              <p className="mt-1 font-semibold">{official.full_name}</p>
              <p className="text-sm text-muted-foreground">
                {official.license_number ?? "Lisensi belum diisi"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
function Documents({
  documents,
}: {
  documents: Awaited<ReturnType<typeof import("@/data").repository.listRegistrationDocuments>>;
}) {
  const upload = useUploadDocument();
  const [entityId, setEntityId] = useState("");
  const [type, setType] = useState<(typeof DOCUMENT_TYPES)[number]["key"]>("IDENTITY");
  const [file, setFile] = useState("");
  return (
    <>
      <PageHeader
        eyebrow="Portal Tim"
        title="Dokumen"
        description="Dokumen disimpan sebagai metadata private demo dan siap dipindahkan ke storage terautentikasi."
      />
      <Card>
        <CardContent className="grid gap-3 pt-6 sm:grid-cols-4">
          <Field label="ID Pemain/Ofisial" value={entityId} onChange={setEntityId} />
          <div>
            <Label>Jenis</Label>
            <Select value={type} onValueChange={(value) => setType(value as typeof type)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((item) => (
                  <SelectItem key={item.key} value={item.key}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Field label="Nama File" value={file} onChange={setFile} />
          <Button
            onClick={() => upload.mutate({ entityType: "PLAYER", entityId, type, file_name: file })}
          >
            Unggah
          </Button>
        </CardContent>
      </Card>
      <div className="grid gap-3">
        {documents.map((doc) => (
          <Card key={doc.id}>
            <CardContent className="flex flex-wrap justify-between gap-2 pt-6">
              <span>{doc.file_name}</span>
              <span className="text-sm text-muted-foreground">
                {DOCUMENT_STATUS_LABEL[doc.status]}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
function Submission({
  teamId,
  summary,
}: {
  teamId: string;
  summary: {
    is_ready: boolean;
    profile: { registration_status: string };
    players: unknown[];
    officials: unknown[];
    pending_count: number;
  };
}) {
  const submit = useSubmitRegistration();
  return (
    <>
      <PageHeader
        eyebrow="Portal Tim"
        title="Pengajuan Registrasi"
        description="Kirim data tim untuk pemeriksaan panitia."
      />
      <Card>
        <CardContent className="space-y-3 pt-6">
          <p>Profil: {summary.profile.registration_status}</p>
          <p>Pemain: {summary.players.length}</p>
          <p>Ofisial: {summary.officials.length}</p>
          <p>Menunggu pemeriksaan: {summary.pending_count}</p>
          <Button
            disabled={!summary.is_ready || submit.isPending}
            onClick={() => submit.mutate({ entityType: "TEAM", entityId: teamId })}
          >
            Kirim Pengajuan
          </Button>
          {!summary.is_ready ? (
            <p className="text-sm text-warning-foreground">
              Lengkapi dokumen wajib sebelum mengirim.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
