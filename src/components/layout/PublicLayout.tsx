import { Link } from "@tanstack/react-router";
import { Menu, Radio } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Beranda", exact: true },
  { to: "/putra", label: "Putra" },
  { to: "/putri", label: "Putri" },
  { to: "/jadwal", label: "Jadwal" },
  { to: "/hasil", label: "Hasil" },
  { to: "/klasemen", label: "Klasemen" },
  { to: "/tim", label: "Tim" },
  { to: "/pemain", label: "Pemain" },
  { to: "/top-skor", label: "Top Skor" },
  { to: "/venue", label: "Venue" },
] as const;

export function PublicLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-sm bg-gold text-gold-foreground">
              <span className="score-numeral text-lg">PS</span>
            </span>
            <span className="leading-tight">
              <span className="block font-display text-lg font-bold tracking-wide">
                PORPROV SULSEL 2026
              </span>
              <span className="label-caps block opacity-80">Cabor Futsal</span>
            </span>
          </Link>

          <nav className="ml-auto hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: "exact" in item }}
                className="rounded-sm px-3 py-2 text-sm font-medium opacity-80 transition-colors hover:bg-white/10 hover:opacity-100 data-[status=active]:bg-white/15 data-[status=active]:opacity-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 lg:ml-2">
            <Button asChild size="sm" className="bg-live text-live-foreground hover:bg-live/90">
              <Link to="/live">
                <Radio className="size-4" />
                <span className="hidden sm:inline">Live</span>
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="hidden border-white/30 bg-transparent text-primary-foreground hover:bg-white/10 hover:text-primary-foreground sm:inline-flex"
            >
              <Link to="/team/login">Portal Tim</Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="hidden border-white/30 bg-transparent text-primary-foreground hover:bg-white/10 hover:text-primary-foreground sm:inline-flex"
            >
              <Link to="/masuk">Masuk Panel</Link>
            </Button>

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="lg:hidden hover:bg-white/10"
                  aria-label="Buka menu"
                >
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetTitle className="px-4 pt-4">Navigasi</SheetTitle>
                <nav className="mt-2 flex flex-col p-2">
                  {NAV.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className="rounded-sm px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted data-[status=active]:bg-muted data-[status=active]:text-primary"
                    >
                      {item.label}
                    </Link>
                  ))}
                  <Link
                    to="/team/login"
                    onClick={() => setOpen(false)}
                    className="mt-2 rounded-sm bg-muted px-3 py-2.5 text-sm font-medium text-foreground"
                  >
                    Portal Tim
                  </Link>
                  <Link
                    to="/masuk"
                    onClick={() => setOpen(false)}
                    className="mt-2 rounded-sm bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground"
                  >
                    Masuk Panel
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className={cn("mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:py-8")}>{children}</main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Sistem Manajemen Pertandingan Futsal — PORPROV Sulawesi Selatan 2026, Makassar.</p>
          <p className="label-caps">Data resmi panitia pelaksana</p>
        </div>
      </footer>
    </div>
  );
}
