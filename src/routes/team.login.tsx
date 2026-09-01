import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/team/login")({ component: TeamLoginPage });

function TeamLoginPage() {
  const navigate = useNavigate();
  const { signIn, isAuthenticated, isLoading, user } = useSession();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const target = user?.account_type === "TEAM" || user?.role === "TEAM_OFFICIAL" ? "/team" : "/admin";
      navigate({ to: target, replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, user]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await signIn({ email, password });
      toast.success("Berhasil masuk ke portal tim.");
      navigate({ to: "/team" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Email atau kata sandi tidak valid.");
      console.error("Login failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-pitch p-10 text-pitch-foreground lg:flex">
        <div>
          <span className="label-caps text-gold">Sulawesi Selatan • 2026</span>
          <h1 className="mt-3 text-5xl leading-none font-bold">
            PORTAL
            <br />
            REGISTRASI TIM
          </h1>
          <p className="mt-4 max-w-md text-sm text-pitch-muted">
            Kelola profil, pemain, ofisial, dokumen, dan pengajuan tim.
          </p>
        </div>
        <p className="text-xs text-pitch-muted">
          Gunakan email akun tim yang terdaftar pada panitia.
        </p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div>
            <p className="label-caps text-primary">PORPROV Sulsel 2026</p>
            <h2 className="mt-1 text-3xl font-bold">Masuk Portal Tim</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Jika Anda petugas panitia, gunakan akses panel panitia di halaman masuk resmi.
            </p>
          </div>

          <div className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Portal khusus tim</p>
            <p className="mt-1">Gunakan akun tim yang sudah terdaftar dan disetujui oleh panitia.</p>
            <Link to="/masuk" className="mt-2 inline-flex font-medium text-primary hover:underline">
              Masuk sebagai panitia
            </Link>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Tim</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Kata Sandi</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              disabled={isSubmitting}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Memeriksa…" : "Masuk"}
          </Button>
          <p className="text-xs text-muted-foreground">Gunakan email dan kata sandi akun tim Anda.</p>
        </form>
      </div>
    </div>
  );
}
