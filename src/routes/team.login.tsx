import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/team/login")({ component: TeamLoginPage });

function TeamLoginPage() {
  const navigate = useNavigate();
  const { signIn } = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      await signIn({ username, password });
      toast.success("Berhasil masuk ke portal tim.");
      navigate({ to: "/team" });
    } catch (error) {
      toast.error("Username atau kata sandi tidak valid.");
      console.error("Login failed:", error);
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
            PORTAL
            <br />
            REGISTRASI TIM
          </h1>
          <p className="mt-4 max-w-md text-sm text-pitch-muted">
            Kelola profil, pemain, ofisial, dokumen, dan pengajuan tim.
          </p>
        </div>
        <p className="text-xs text-pitch-muted">
          Mode demo in-memory. Kredensial produksi belum aktif.
        </p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div>
            <p className="label-caps text-primary">PORPROV Sulsel 2026</p>
            <h2 className="mt-1 text-3xl font-bold">Masuk Portal Tim</h2>
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              disabled={isLoading}
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
              disabled={isLoading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Memeriksa…" : "Masuk"}
          </Button>
          <p className="text-xs text-muted-foreground">Demo: `makassar.putra` / `makassar2026`</p>
        </form>
      </div>
    </div>
  );
}
