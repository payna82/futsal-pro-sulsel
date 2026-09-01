import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useActor } from "@/hooks/use-session";
import { AdminPage } from "@/components/admin/AdminPage";
import { DataTable, type Column } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import type { Contingent } from "@/domain/types";
import { contingentsQuery, playersQuery, teamOfficialsQuery } from "@/hooks/queries";
import { useCompetitionData } from "@/hooks/use-competition-data";
import { adminHead } from "@/lib/head";

const contingentStatusLabel: Record<Contingent["status"], string> = {
  PENDING: "Menunggu Verifikasi",
  VERIFIED: "Disetujui / Aktif",
  REJECTED: "Ditolak",
  DEACTIVATED: "Dinonaktifkan",
};

const contingentStatusClass: Record<Contingent["status"], string> = {
  PENDING: "label-caps text-warning-foreground",
  VERIFIED: "label-caps text-success",
  REJECTED: "label-caps text-destructive",
  DEACTIVATED: "label-caps text-muted-foreground",
};

export const Route = createFileRoute("/admin/contingents")({
  head: () =>
    adminHead(
      "Kontingen — Panel Panitia Futsal PORPROV Sulsel 2026",
      "Data kontingen kabupaten/kota peserta cabang futsal PORPROV Sulsel 2026.",
    ),
  component: AdminContingentsRoute,
});

function AdminContingentsRoute() {
  const contingents = useQuery(contingentsQuery());
  const actor = useActor();
  const players = useQuery(playersQuery(actor));
  const officials = useQuery(teamOfficialsQuery(actor));
  const { teams, isLoading } = useCompetitionData();

  const rows = contingents.data ?? [];
  const active = rows.filter((c) => c.status === "VERIFIED").length;
  const pending = rows.filter((c) => c.status === "PENDING").length;
  const rejected = rows.filter((c) => c.status === "REJECTED").length;
  const deactivated = rows.filter((c) => c.status === "DEACTIVATED").length;

  const teamsOf = (id: string) => teams.filter((t) => t.contingent_id === id);
  const playerCount = (id: string) => {
    const ids = new Set(teamsOf(id).map((t) => t.id));
    return (players.data ?? []).filter((p) => ids.has(p.team_id)).length;
  };
  const officialCount = (id: string) => {
    const ids = new Set(teamsOf(id).map((t) => t.id));
    return (officials.data ?? []).filter((o) => ids.has(o.team_id)).length;
  };

  const columns: Column<Contingent>[] = [
    {
      key: "name",
      header: "Kontingen",
      cell: (c) => <span className="font-semibold">{c.name}</span>,
    },
    { key: "region", header: "Kode Wilayah", hideOnMobile: true, cell: (c) => c.region_code },
    { key: "teams", header: "Tim", cell: (c) => teamsOf(c.id).length },
    { key: "players", header: "Pemain", cell: (c) => playerCount(c.id) },
    { key: "officials", header: "Ofisial", hideOnMobile: true, cell: (c) => officialCount(c.id) },
    { key: "manager", header: "Manajer", hideOnMobile: true, cell: (c) => c.manager_name },
    {
      key: "status",
      header: "Status",
      cell: (c) => <span className={contingentStatusClass[c.status]}>{contingentStatusLabel[c.status]}</span>,
    },
    {
      key: "actions",
      header: "Aksi",
      cell: (c) => (
        <Button asChild size="sm" variant="outline">
          <Link to="/admin/contingents/$contingentId" params={{ contingentId: c.id }}>
            Buka dashboard
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <AdminPage
      permission="contingent.manage"
      title="Kontingen"
      description="Daftar kontingen, status pendaftaran, dan dashboard pengelolaan tim per kontingen."
      isLoading={isLoading || contingents.isLoading}
      isError={contingents.isError}
    >
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="label-caps text-muted-foreground">Pendaftaran mandiri</p>
          <p className="mt-2 text-3xl font-bold">{rows.length}</p>
          <p className="mt-2 text-sm text-muted-foreground">Total kontingen terdaftar dalam sistem.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="label-caps text-muted-foreground">Menunggu Verifikasi</p>
          <p className="mt-2 text-3xl font-bold">{pending}</p>
          <p className="mt-2 text-sm text-muted-foreground">Kontingen yang menunggu pemeriksaan Super Admin.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="label-caps text-muted-foreground">Disetujui / Aktif</p>
          <p className="mt-2 text-3xl font-bold">{active}</p>
          <p className="mt-2 text-sm text-muted-foreground">Kontingen yang sudah diaktifkan dan dapat mengelola tim.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="label-caps text-muted-foreground">Dinonaktifkan</p>
          <p className="mt-2 text-3xl font-bold">{deactivated}</p>
          <p className="mt-2 text-sm text-muted-foreground">Kontingen yang aksesnya ditutup sementara oleh otoritas.</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        <h3 className="text-lg font-bold">Alur kerja kontingen</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {[
            "1. Pendaftaran mandiri kontingen",
            "2. Verifikasi dokumen & data oleh Super Admin",
            "3. Dashboard kontingen aktif dibuka",
            "4. Admin tim hanya mengelola tim dalam kontingennya",
          ].map((step) => (
            <div key={step} className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
              {step}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(c) => c.id}
          searchable
          searchPlaceholder="Cari kontingen…"
          searchValue={(c) => `${c.name} ${c.short_name} ${c.region_code}`}
          emptyMessage="Belum ada kontingen terdaftar."
        />
      </div>
    </AdminPage>
  );
}
