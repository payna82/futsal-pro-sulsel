import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AdminPage } from "@/components/admin/AdminPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCompetitionData } from "@/hooks/use-competition-data";
import { useCreateTeam } from "@/hooks/mutations";

export const Route = createFileRoute("/admin/teams/new")({ component: CreateTeamPage });
function CreateTeamPage() {
  const data = useCompetitionData();
  const navigate = useNavigate();
  const create = useCreateTeam();
  const [name, setName] = useState("");
  const [short, setShort] = useState("");
  const [contingent, setContingent] = useState(data.teams[0]?.contingent_id ?? "");
  const [category, setCategory] = useState(data.categories[0]?.id ?? "");
  const [group, setGroup] = useState("");
  return (
    <AdminPage
      permission="team.create"
      title="Tambah Tim"
      description="Daftarkan tim peserta baru pada nomor pertandingan."
    >
      <div className="mt-6 max-w-2xl rounded-lg border border-border bg-card p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Nama Tim</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div>
            <Label>Singkatan</Label>
            <Input value={short} onChange={(event) => setShort(event.target.value)} />
          </div>
          <div>
            <Label>Kontingen</Label>
            <Select value={contingent} onValueChange={setContingent}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih kontingen" />
              </SelectTrigger>
              <SelectContent>
                {data.teams.map((team) => (
                  <SelectItem key={team.contingent_id} value={team.contingent_id}>
                    {team.contingent_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Kategori</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {data.categories.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Grup</Label>
            <Select value={group} onValueChange={setGroup}>
              <SelectTrigger>
                <SelectValue placeholder="Opsional" />
              </SelectTrigger>
              <SelectContent>
                {data.groups
                  .filter((item) => item.category_id === category)
                  .map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button
            disabled={create.isPending || !name || !short || !contingent || !category}
            onClick={() =>
              create.mutate(
                {
                  category_id: category,
                  contingent_id: contingent,
                  name,
                  short_name: short,
                  primary_color: "#8f1d1d",
                  ...(group ? { group_id: group } : {}),
                },
                {
                  onSuccess: (team) => {
                    toast.success("Tim berhasil dibuat.");
                    navigate({ to: "/admin/teams/$teamId", params: { teamId: team.id } });
                  },
                  onError: (error) =>
                    toast.error(error instanceof Error ? error.message : "Tim gagal dibuat."),
                },
              )
            }
          >
            Simpan Tim
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin/teams">Batal</Link>
          </Button>
        </div>
      </div>
    </AdminPage>
  );
}
