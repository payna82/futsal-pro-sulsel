import { assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { inMemoryRepository } from "../src/data/in-memory-repository.ts";
import { GUEST_ACTOR } from "../src/domain/registration.ts";
import { PERMISSIONS } from "../src/domain/permissions.ts";

Deno.test("match mutation rejects unauthorized actors before mutating state", async () => {
  await assertRejects(
    async () =>
      await inMemoryRepository.recordMatchEvent({
        match_id: "match-1",
        command_id: "unauthorized-event",
        type: "GOAL",
        period: "FIRST_HALF",
        timestamp: 12,
        operator_id: "user-1",
        team_id: "team-home",
        player_id: "player-1",
        actor: GUEST_ACTOR,
      } as any),
    Error,
    "Akses pertandingan ditolak.",
  );
});

Deno.test("role request mutation rejects unauthorized actors before mutating state", async () => {
  const unauthorized = {
    userId: "user-unauthorized",
    role: "TEAM_OFFICIAL",
    permissions: [...PERMISSIONS.filter((permission) => permission !== "role.manage")],
  };

  await assertRejects(
    () =>
      inMemoryRepository.createRoleRequest({
        requested_role: "REFEREE",
        request_reason: "Butuh akses wasit untuk menjadi official.",
        actor: GUEST_ACTOR,
      }),
    Error,
    "Akun publik",
  );

  await assertRejects(
    () =>
      inMemoryRepository.approveRoleRequest({
        id: "rr-1",
        actor: unauthorized as any,
      }),
    Error,
    "Akses admin ditolak",
  );

  await assertRejects(
    () =>
      inMemoryRepository.assignUserRole({
        user_id: "user-2",
        role: "REFEREE",
        actor: unauthorized as any,
      }),
    Error,
    "Akses admin ditolak",
  );
});
