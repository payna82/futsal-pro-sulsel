import { Link } from "@tanstack/react-router";
import { LogOut, Menu } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useSession } from "@/hooks/use-session";

const NAV = [
  ["/team", "Ringkasan"],
  ["/team/profile", "Profil Tim"],
  ["/team/players", "Pemain"],
  ["/team/officials", "Ofisial"],
  ["/team/documents", "Dokumen"],
  ["/team/submission", "Pengajuan"],
] as const;

export function TeamLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useSession();
  const navigation = (
    <nav className="flex flex-col gap-1 p-3">
      {NAV.map(([to, label]) => (
        <Link
          key={to}
          to={to}
          activeOptions={{ exact: to === "/team" }}
          onClick={() => setOpen(false)}
          className="rounded-sm px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[status=active]:bg-sidebar-primary data-[status=active]:text-sidebar-primary-foreground"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 overflow-y-auto bg-sidebar lg:block">
        <Link
          to="/team"
          className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4"
        >
          <span className="flex size-9 items-center justify-center rounded-sm bg-sidebar-primary text-sidebar-primary-foreground">
            <span className="score-numeral">PS</span>
          </span>
          <span className="font-display font-bold text-sidebar-foreground">PORTAL TIM</span>
        </Link>
        {navigation}
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card px-4">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button size="icon" variant="ghost" className="lg:hidden" aria-label="Buka menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-0">
              <SheetTitle className="px-4 pt-4 text-sidebar-foreground">Portal Tim</SheetTitle>
              {navigation}
            </SheetContent>
          </Sheet>
          <div className="min-w-0">
            <p className="label-caps text-muted-foreground">PORPROV Sulsel 2026</p>
            <p className="truncate text-sm font-semibold">Portal Registrasi Tim</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm font-medium sm:block">
              {user?.full_name ?? "Akun Tim"}
            </span>
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
