import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/masuk")({
  head: () => ({
    meta: [
      { title: "Masuk Panel Panitia — Futsal PORPROV Sulsel 2026" },
      {
        name: "description",
        content:
          "Halaman masuk panel panitia pelaksana cabang futsal PORPROV Sulawesi Selatan 2026 untuk admin, komisaris, wasit, dan pencatat skor.",
      },
      { property: "og:title", content: "Masuk Panel Panitia — PORPROV Sulsel 2026" },
      {
        property: "og:description",
        content: "Akses terbatas bagi petugas resmi kompetisi futsal.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn, signUp, isAuthenticated, isLoading: sessionLoading, user } = useSession();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<"PANITIA" | "TEAM">("PANITIA");
  const [mode, setMode] = useState<"SIGN_IN" | "SIGN_UP">("SIGN_IN");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!sessionLoading && isAuthenticated) {
      const target = user?.account_type === "TEAM" || user?.role === "TEAM_OFFICIAL" ? "/team" : "/admin";
      navigate({ to: target, replace: true });
    }
  }, [isAuthenticated, navigate, sessionLoading, user]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === "SIGN_UP") {
        await signUp({ email, password, full_name: fullName });
        toast.success("Akun dibuat. Periksa email untuk konfirmasi, lalu masuk.");
        setMode("SIGN_IN");
        return;
      }
      await signIn({ email, password });
      toast.success("Berhasil masuk.");
      navigate({ to: "/admin" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Email atau kata sandi tidak valid.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-pitch p-10 text-pitch-foreground lg:flex">
        <div>
          <span className="label-caps text-gold">Sulawesi Selatan • 2026</span>
          <h1 className="mt-3 text-5xl leading-none font-bold">
            PILIH
            <br />
            AKSES SISTEM
          </h1>
          <p className="mt-4 max-w-md text-sm text-pitch-muted">
            Akses masuk diatur berdasarkan peran: panitia pelaksana atau tim peserta. Setiap aktivitas
            pada panel resmi dicatat dalam log audit.
          </p>
        </div>
        <div className="space-y-3 text-sm text-pitch-muted">
          <p>• Panel Panitia: jadwal, verifikasi, hasil, dan pengelolaan kompetisi</p>
          <p>• Portal Tim: data pemain, ofisial, dokumen, dan pengajuan registrasi</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-5">
          <div>
            <p className="label-caps text-primary">PORPROV Sulsel 2026</p>
            <h2 className="mt-1 text-3xl font-bold">Pilih peran masuk</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Pilih akses yang sesuai dengan tugas Anda di turnamen.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setSelectedRole("PANITIA");
                setMode("SIGN_IN");
              }}
              className={
                selectedRole === "PANITIA"
                  ? "rounded-xl border border-primary bg-primary/10 p-4 text-left shadow-sm"
                  : "rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50"
              }
            >
              <p className="label-caps text-primary">Panel</p>
              <h3 className="mt-2 text-lg font-bold">Panitia</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Petugas resmi, wasit, dan pengelola pertandingan
              </p>
            </button>

            <Link
              to="/team/login"
              onClick={() => setSelectedRole("TEAM")}
              className={
                selectedRole === "TEAM"
                  ? "rounded-xl border border-primary bg-primary/10 p-4 text-left shadow-sm"
                  : "rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50"
              }
            >
              <p className="label-caps text-primary">Portal</p>
              <h3 className="mt-2 text-lg font-bold">Tim</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Pemain, ofisial, dokumen, dan status registrasi tim
              </p>
            </Link>
          </div>

          {selectedRole === "PANITIA" ? (
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                Akses untuk panitia pelaksana, admin kompetisi, wasit, dan petugas pertandingan.
              </div>

              {mode === "SIGN_UP" ? (
                <div className="space-y-2">
                  <Label htmlFor="full-name">Nama Lengkap</Label>
                  <Input
                    id="full-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                    required
                    disabled={isLoading}
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="email">Email Petugas</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@porprovsulsel.id"
                  autoComplete="email"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Kata Sandi</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === "SIGN_IN" ? "current-password" : "new-password"}
                  required
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Memproses…" : mode === "SIGN_IN" ? "Masuk panel panitia" : "Daftar akun panitia"}
              </Button>

              <button
                type="button"
                onClick={() => setMode(mode === "SIGN_IN" ? "SIGN_UP" : "SIGN_IN")}
                className="w-full text-sm text-primary hover:underline"
              >
                {mode === "SIGN_IN" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
              </button>

              <p className="text-xs text-muted-foreground">
                Kredensial diverifikasi backend. Peran dan izin dibaca dari data akun; seluruh perubahan
                status pertandingan dicatat atas nama akun yang sedang masuk.
              </p>
            </form>
          ) : (
            <div className="space-y-4 rounded-xl border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">
                Portal tim digunakan untuk mengelola profil, pemain, ofisial, dokumen, dan pengajuan
                registrasi.
              </p>
              <Button asChild className="w-full">
                <Link to="/team/login">Masuk ke portal tim</Link>
              </Button>
              <Link to="/" className="block text-center text-sm text-primary hover:underline">
                Kembali ke situs publik
              </Link>
            </div>
          )}

          {selectedRole === "PANITIA" ? (
            <Link to="/" className="block text-center text-sm text-primary hover:underline">
              Kembali ke situs publik
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
