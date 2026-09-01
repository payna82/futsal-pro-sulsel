import { Link } from "@tanstack/react-router";
import {
  Activity,
  Building2,
  CalendarDays,
  ClipboardList,
  FileBarChart,
  Flag,
  Gauge,
  Grid2x2,
  KeyRound,
  ListChecks,
  LogOut,
  MapPin,
  Menu,
  ScrollText,
  Shield,
  Trophy,
  UserCog,
  Users,
  UsersRound,
  Megaphone,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ROLE_LABEL } from "@/domain/permissions";
import { useSession } from "@/hooks/use-session";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Gauge;
  badge?: number;
}

const NAV_SECTIONS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "Operasional",
    items: [
      { to: "/admin", label: "Dasbor", icon: Gauge },
      { to: "/admin/committee-dashboard", label: "Persetujuan Menunggu", icon: Gauge },
      { to: "/admin/schedule", label: "Jadwal", icon: CalendarDays },
      { to: "/admin/matches", label: "Pertandingan", icon: Activity },
      { to: "/admin/verification", label: "Verifikasi", icon: ClipboardList },
      { to: "/admin/match-officials", label: "Perangkat Pertandingan", icon: Megaphone },
    ],
  },
  {
    title: "Kompetisi",
    items: [
      { to: "/admin/tournaments", label: "Turnamen", icon: Trophy },
      { to: "/admin/competitions", label: "Nomor Pertandingan", icon: Flag },
      { to: "/admin/groups", label: "Grup", icon: Grid2x2 },
      { to: "/admin/venues", label: "Venue", icon: MapPin },
    ],
  },
  {
    title: "Peserta",
    items: [
      { to: "/admin/contingents", label: "Kontingen", icon: Building2 },
      { to: "/admin/teams", label: "Tim", icon: UsersRound },
      { to: "/admin/players", label: "Pemain", icon: Users },
      { to: "/admin/officials", label: "Ofisial Tim", icon: ClipboardList },
    ],
  },
  {
    title: "Laporan",
    items: [
      { to: "/admin/reports", label: "Laporan", icon: FileBarChart },
      { to: "/admin/statistics", label: "Statistik", icon: ListChecks },
    ],
  },
  {
    title: "Sistem",
    items: [
      { to: "/admin/users", label: "Pengguna", icon: UserCog },
      { to: "/admin/roles", label: "Peran", icon: Shield },
      { to: "/admin/permissions", label: "Izin Akses", icon: KeyRound },
      { to: "/admin/audit-logs", label: "Log Audit", icon: ScrollText },
    ],
  },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-6 p-3">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="label-caps px-3 pb-2 text-sidebar-foreground/50">{section.title}</p>
          <div className="flex flex-col gap-0.5">
            {section.items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/admin" }}
                onClick={onNavigate}
                className="flex items-center justify-between gap-3 rounded-sm px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[status=active]:bg-sidebar-primary data-[status=active]:text-sidebar-primary-foreground"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="size-4 shrink-0" aria-hidden />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-auto flex items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useSession();
  const accountMode = user?.account_type === "TEAM" ? "Akses Tim" : "Akses Panitia";

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 overflow-y-auto bg-sidebar lg:block">
        <Link
          to="/admin"
          className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4"
        >
          <span className="flex size-9 items-center justify-center rounded-sm bg-sidebar-primary text-sidebar-primary-foreground">
            <span className="score-numeral text-base">PS</span>
          </span>
          <span className="leading-tight text-sidebar-foreground">
            <span className="block font-display font-bold">PANEL PANITIA</span>
            <span className="label-caps block opacity-60">Futsal 2026</span>
          </span>
        </Link>
        <SidebarNav />
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card px-4">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="lg:hidden"
                aria-label="Buka menu admin"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 overflow-y-auto bg-sidebar p-0">
              <SheetTitle className="px-4 pt-4 text-sidebar-foreground">Panel Panitia</SheetTitle>
              <SidebarNav onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="min-w-0">
            <p className="label-caps text-muted-foreground">PORPROV Sulsel 2026</p>
            <p className="truncate text-sm font-semibold">Manajemen Pertandingan Futsal</p>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <Button asChild variant="outline" size="sm">
              <Link to="/">Situs Publik</Link>
            </Button>
            <div className="hidden items-center gap-2 rounded-full border border-border bg-muted/40 px-2.5 py-1 sm:flex">
              <span className="size-2 rounded-full bg-success" aria-hidden />
              <div className="text-left">
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {accountMode}
                </p>
                <p className="text-xs font-medium">{ROLE_LABEL[user?.role ?? "PUBLIC"]}</p>
              </div>
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{user?.full_name ?? "Tamu"}</p>
              <p className="label-caps text-muted-foreground">
                {ROLE_LABEL[user?.role ?? "PUBLIC"]}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={signOut}>
              <LogOut className="size-4" /> Keluar
            </Button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
