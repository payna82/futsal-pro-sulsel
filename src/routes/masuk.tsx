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
  const { signIn, signUp, isAuthenticated } = useSession();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"SIGN_IN" | "SIGN_UP">("SIGN_IN");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate({ to: "/admin", replace: true });
  }, [isAuthenticated, navigate]);

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
            SISTEM MANAJEMEN
            <br />
            PERTANDINGAN FUTSAL
          </h1>
          <p className="mt-4 max-w-md text-sm text-pitch-muted">
            Panel operasional resmi panitia pelaksana: penjadwalan, verifikasi peserta, pengendalian
            pertandingan, dan pengesahan hasil.
          </p>
        </div>
        <p className="text-xs text-pitch-muted">
          Seluruh aktivitas pada panel ini tercatat pada log audit.
        </p>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5">
          <div>
            <p className="label-caps text-primary">PORPROV Sulsel 2026</p>
            <h2 className="mt-1 text-3xl font-bold">Masuk Panel Panitia</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Gunakan akun petugas yang diterbitkan panitia pelaksana.
            </p>
          </div>

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
              autoComplete="current-password"
              required
              disabled={isLoading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Memeriksa…" : "Masuk"}
          </Button>

          <p className="text-xs text-muted-foreground">
            Kredensial diverifikasi backend. Peran dan izin dibaca dari data akun; seluruh
            perubahan status pertandingan dicatat atas nama akun yang sedang masuk.
          </p>


          <Link to="/" className="block text-center text-sm text-primary hover:underline">
            Kembali ke situs publik
          </Link>
        </form>
      </div>
    </div>
  );
}
