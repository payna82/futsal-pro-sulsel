import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { MATCH_EVENT_LABEL, formatClock } from "@/domain/match-state";
import type { NewMatchEventInput } from "@/domain/match-operations";
import type { MatchEventType, MatchPeriod, Player, UUID } from "@/domain/types";

export type EventDialogType = Extract<
  MatchEventType,
  "GOAL" | "CARD" | "FOUL" | "SUBSTITUTION" | "TIMEOUT"
>;

export interface MatchEventDialogProps {
  type: EventDialogType | null;
  onOpenChange: (open: boolean) => void;
  homeTeamId: UUID;
  awayTeamId: UUID;
  teamName: (id: UUID) => string;
  squadOf: (teamId: UUID) => Player[];
  period: MatchPeriod;
  clockSeconds: number;
  isPending: boolean;
  onSubmit: (input: Omit<NewMatchEventInput, "match_id" | "operator_id">) => void;
}

/** Formulir input kejadian. Validasi akhir tetap di lapisan domain/repository. */
export function MatchEventDialog({
  type,
  onOpenChange,
  homeTeamId,
  awayTeamId,
  teamName,
  squadOf,
  period,
  clockSeconds,
  isPending,
  onSubmit,
}: MatchEventDialogProps) {
  const [teamId, setTeamId] = useState<UUID>(homeTeamId);
  const [playerId, setPlayerId] = useState<UUID>("");
  const [playerIn, setPlayerIn] = useState<UUID>("");
  const [card, setCard] = useState<"YELLOW" | "RED">("YELLOW");
  const [minute, setMinute] = useState(Math.floor(clockSeconds / 60));
  const [second, setSecond] = useState(clockSeconds % 60);

  useEffect(() => {
    if (!type) return;
    setTeamId(homeTeamId);
    setPlayerId("");
    setPlayerIn("");
    setCard("YELLOW");
    setMinute(Math.floor(clockSeconds / 60));
    setSecond(clockSeconds % 60);
  }, [type, homeTeamId, clockSeconds]);

  const squad = useMemo(() => squadOf(teamId), [squadOf, teamId]);
  const needsPlayer = type === "GOAL" || type === "CARD" || type === "SUBSTITUTION";
  const timestamp = minute * 60 + second;

  const submit = () => {
    if (!type) return;
    const metadata: Record<string, string> = {};
    if (type === "CARD") metadata['card'] = card;
    if (type === "SUBSTITUTION") metadata['player_in'] = playerIn;
    onSubmit({
      type,
      period,
      timestamp,
      team_id: teamId,
      ...(needsPlayer || (type === "FOUL" && playerId) ? { player_id: playerId } : {}),
      ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
    });
  };

  const disabled =
    isPending ||
    !teamId ||
    (needsPlayer && !playerId) ||
    (type === "SUBSTITUTION" && (!playerIn || playerIn === playerId));

  return (
    <Dialog open={type !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Catat {type ? MATCH_EVENT_LABEL[type] : ""}</DialogTitle>
          <DialogDescription>
            Kejadian akan dicatat permanen pada waktu {formatClock(timestamp)}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tim</Label>
            <div className="grid grid-cols-2 gap-2">
              {[homeTeamId, awayTeamId].map((id) => (
                <Button
                  key={id}
                  type="button"
                  variant={teamId === id ? "default" : "outline"}
                  className="h-12"
                  onClick={() => {
                    setTeamId(id);
                    setPlayerId("");
                    setPlayerIn("");
                  }}
                >
                  {teamName(id)}
                </Button>
              ))}
            </div>
          </div>

          {type === "CARD" ? (
            <div className="space-y-2">
              <Label>Jenis Kartu</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={card === "YELLOW" ? "default" : "outline"}
                  className="h-12"
                  onClick={() => setCard("YELLOW")}
                >
                  Kartu Kuning
                </Button>
                <Button
                  type="button"
                  variant={card === "RED" ? "destructive" : "outline"}
                  className="h-12"
                  onClick={() => setCard("RED")}
                >
                  Kartu Merah
                </Button>
              </div>
            </div>
          ) : null}

          {type !== "TIMEOUT" ? (
            <div className="space-y-2">
              <Label htmlFor="event-player">
                {type === "SUBSTITUTION" ? "Pemain Keluar" : "Pemain"}
                {type === "FOUL" ? " (opsional)" : ""}
              </Label>
              <Select value={playerId} onValueChange={setPlayerId}>
                <SelectTrigger id="event-player" className="h-12">
                  <SelectValue placeholder="Pilih pemain" />
                </SelectTrigger>
                <SelectContent>
                  {squad.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      #{p.jersey_number} {p.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {type === "SUBSTITUTION" ? (
            <div className="space-y-2">
              <Label htmlFor="event-player-in">Pemain Masuk</Label>
              <Select value={playerIn} onValueChange={setPlayerIn}>
                <SelectTrigger id="event-player-in" className="h-12">
                  <SelectValue placeholder="Pilih pemain" />
                </SelectTrigger>
                <SelectContent>
                  {squad
                    .filter((p) => p.id !== playerId)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        #{p.jersey_number} {p.full_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="event-minute">Menit</Label>
              <Input
                id="event-minute"
                type="number"
                min={0}
                max={20}
                className="clock-numeral h-12 text-lg"
                value={minute}
                onChange={(e) => setMinute(Math.max(0, Math.min(20, Number(e.target.value))))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-second">Detik</Label>
              <Input
                id="event-second"
                type="number"
                min={0}
                max={59}
                className="clock-numeral h-12 text-lg"
                value={second}
                onChange={(e) => setSecond(Math.max(0, Math.min(59, Number(e.target.value))))}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            Batal
          </Button>
          <Button onClick={submit} disabled={disabled}>
            {isPending ? "Menyimpan…" : "Simpan Kejadian"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
