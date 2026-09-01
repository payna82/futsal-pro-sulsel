import { assertEquals, assertRejects, assertStringIncludes } from "jsr:@std/assert@1";
import { inMemoryRepository } from "../src/data/in-memory-repository.ts";
import { PERMISSIONS } from "../src/domain/permissions.ts";
import type { ActorContext } from "../src/domain/registration.ts";
import {
  assertRegistrationTransition,
  canTransitionRegistration,
} from "../src/domain/registration.ts";

const admin: ActorContext = { userId: "usr-1", role: "SUPER_ADMIN", permissions: [...PERMISSIONS] };
const teamActor = (teamId: string): ActorContext => ({
  userId: `account-${teamId}`,
  role: "TEAM_OFFICIAL",
  teamId,
  permissions: [
    "team.view_own",
    "team.profile.read",
    "team.profile.update",
    "player.read",
    "player.create",
    "player.update",
    "player.submit",
    "official.read",
    "official.create",
    "official.update",
    "official.submit",
    "document.upload",
    "submission.submit",
    "report.view",
  ],
});

Deno.test("registration transition guard rejects invalid state changes", async () => {
  assertRegistrationTransition("DRAFT", "READY_FOR_SUBMISSION");
  await assertRejects(async () => {
    assertRegistrationTransition("APPROVED", "SUBMITTED");
  }, Error);
  await assertRejects(async () => {
    assertRegistrationTransition("DRAFT", "APPROVED");
  }, Error);
});

Deno.test("rejected or deactivated contingent blocks team access", async () => {
  const contingent = (await inMemoryRepository.listContingents())[0];
  const originalStatus = contingent.status;

  try {
    await inMemoryRepository.updateContingentStatus({
      contingent_id: contingent.id,
      status: "REJECTED",
      decision_note: "Kontingen ditolak karena datanya tidak memenuhi syarat.",
      actor: admin,
    });

    const team = await inMemoryRepository.createTeam({
      contingent_id: contingent.id,
      category_id: "cat-men",
      name: "Rejected Contingent Team",
      short_name: "RCT",
      primary_color: "#2f3b46",
      actor: admin,
    });

    const blocked: ActorContext = {
      userId: `team-${team.id}`,
      role: "TEAM_OFFICIAL",
      teamId: team.id,
      permissions: [
        "team.view_own",
        "team.profile.read",
        "team.profile.update",
        "player.read",
        "player.create",
        "player.update",
        "player.submit",
        "official.read",
        "official.create",
        "official.update",
        "official.submit",
        "document.upload",
        "submission.submit",
        "report.view",
      ],
    };

    await assertRejects(
      () => inMemoryRepository.getTeamProfile(team.id, blocked),
      Error,
      "belum aktif",
    );
    await assertRejects(
      () =>
        inMemoryRepository.createPlayer({
          team_id: team.id,
          full_name: "Blocked Player",
          jersey_number: 13,
          position: "FLANK",
          birth_date: "2000-01-01",
          is_captain: false,
          actor: blocked,
        }),
      Error,
      "belum aktif",
    );
  } finally {
    await inMemoryRepository.updateContingentStatus({
      contingent_id: contingent.id,
      status: originalStatus,
      decision_note: "Reset status kontingen agar data uji tidak memengaruhi test berikutnya.",
      actor: admin,
    });
  }
});

Deno.test(
  "team account creation, duplicate protection, login, disable, and credential privacy",
  async () => {
    const team = await inMemoryRepository.createTeam({
      contingent_id: "con-1",
      category_id: "cat-men",
      name: "QA Account Team",
      short_name: "QAT",
      primary_color: "#8f1d1d",
      actor: admin,
    });
    const account = await inMemoryRepository.createTeamAccount({
      team_id: team.id,
      username: "qa.account",
      password: "qa-password",
      actor: admin,
    });
    assertEquals(account.username, "qa.account");
    await assertRejects(
      () =>
        inMemoryRepository.createTeamAccount({
          team_id: team.id,
          username: "qa.account",
          password: "qa-password",
          actor: admin,
        }),
      Error,
      "sudah memiliki akun",
    );
    await assertRejects(
      () =>
        inMemoryRepository.createTeamAccount({
          team_id: "tm-m2",
          username: "qa.account",
          password: "qa-password",
          actor: admin,
        }),
      Error,
      "sudah digunakan",
    );
    assertEquals(
      (await inMemoryRepository.authenticateTeam("qa.account", "qa-password"))?.team_id,
      team.id,
    );
    assertEquals(await inMemoryRepository.authenticateTeam("qa.account", "wrong"), null);
    await inMemoryRepository.updateTeamAccountStatus({
      team_id: team.id,
      status: "DISABLED",
      actor: admin,
    });
    assertEquals(await inMemoryRepository.authenticateTeam("qa.account", "qa-password"), null);
    assertEquals(
      JSON.stringify(await inMemoryRepository.listTeamAccounts(admin)).includes("qa-password"),
      false,
    );
  },
);

Deno.test(
  "team ownership denies cross-tenant profile, player, document, and submission access",
  async () => {
    const teamA = teamActor("tm-m1");
    const teamB = teamActor("tm-m2");
    await assertRejects(() => inMemoryRepository.getTeamProfile("tm-m2", teamA), Error, "ditolak");
    await assertRejects(
      () =>
        inMemoryRepository.createPlayer({
          team_id: "tm-m2",
          full_name: "Cross Tenant",
          jersey_number: 99,
          position: "FLANK",
          birth_date: "2000-01-01",
          is_captain: false,
          actor: teamA,
        }),
      Error,
      "ditolak",
    );
    const player = await inMemoryRepository.createPlayer({
      team_id: "tm-m1",
      full_name: "Owned Player",
      jersey_number: 99,
      position: "FLANK",
      birth_date: "2000-01-01",
      is_captain: false,
      actor: teamA,
    });
    await assertRejects(
      () =>
        inMemoryRepository.updatePlayer({
          id: player.id,
          changes: { full_name: "Hijacked" },
          actor: teamB,
        }),
      Error,
      "ditolak",
    );
    await assertRejects(
      () =>
        inMemoryRepository.uploadRegistrationDocument({
          entityType: "PLAYER",
          entityId: player.id,
          type: "IDENTITY",
          file_name: "x.pdf",
          actor: teamB,
        }),
      Error,
      "ditolak",
    );
    assertEquals((await inMemoryRepository.getTeamRegistration("tm-m1", teamA)).team.id, "tm-m1");
    assertEquals(
      (await inMemoryRepository.listPlayers(teamA)).every((player) => player.team_id === "tm-m1"),
      true,
    );
    await assertRejects(
      () => inMemoryRepository.getTeamProfile("tm-m1", undefined as unknown as ActorContext),
      Error,
      "diperlukan",
    );
  },
);

Deno.test(
  "team cannot review; approval requires all documents; approved player is locked",
  async () => {
    const team = teamActor("tm-m2");
    const player = await inMemoryRepository.createPlayer({
      team_id: "tm-m2",
      full_name: "Verified Player",
      jersey_number: 98,
      position: "PIVOT",
      birth_date: "2000-01-01",
      is_captain: false,
      actor: team,
    });
    await assertRejects(
      () =>
        inMemoryRepository.reviewRegistration({
          entityType: "PLAYER",
          entityId: player.id,
          action: "APPROVED",
          actor: team,
        }),
      Error,
      "verifikasi ditolak",
    );
    await inMemoryRepository.submitRegistration({
      entityType: "PLAYER",
      entityId: player.id,
      actor: team,
    });
    await assertRejects(
      () =>
        inMemoryRepository.reviewRegistration({
          entityType: "PLAYER",
          entityId: player.id,
          action: "APPROVED",
          actor: admin,
        }),
      Error,
      "dokumen wajib",
    );
    for (const type of ["IDENTITY", "REGISTRATION", "MEDICAL"] as const)
      await inMemoryRepository.uploadRegistrationDocument({
        entityType: "PLAYER",
        entityId: player.id,
        type,
        file_name: `${type}.pdf`,
        actor: team,
      });
    await inMemoryRepository.reviewRegistration({
      entityType: "PLAYER",
      entityId: player.id,
      action: "APPROVED",
      actor: admin,
    });
    assertEquals(
      (await inMemoryRepository.listVerificationHistory("PLAYER", player.id, admin)).length,
      1,
    );
    await assertRejects(
      () =>
        inMemoryRepository.updatePlayer({
          id: player.id,
          changes: { full_name: "Changed" },
          actor: team,
        }),
      Error,
      "tidak dapat diubah",
    );
  },
);

Deno.test("revision reason, replacement, and audit are preserved", async () => {
  const team = teamActor("tm-m3");
  const player = await inMemoryRepository.createPlayer({
    team_id: "tm-m3",
    full_name: "Revision Player",
    jersey_number: 97,
    position: "ANCHOR",
    birth_date: "2000-01-01",
    is_captain: false,
    actor: team,
  });
  await inMemoryRepository.uploadRegistrationDocument({
    entityType: "PLAYER",
    entityId: player.id,
    type: "IDENTITY",
    file_name: "bad.pdf",
    actor: team,
  });
  await inMemoryRepository.submitRegistration({
    entityType: "PLAYER",
    entityId: player.id,
    actor: team,
  });
  await inMemoryRepository.reviewRegistration({
    entityType: "PLAYER",
    entityId: player.id,
    action: "REVISION_REQUESTED",
    reason: "Dokumen buram",
    actor: admin,
  });
  await inMemoryRepository.uploadRegistrationDocument({
    entityType: "PLAYER",
    entityId: player.id,
    type: "IDENTITY",
    file_name: "replacement.pdf",
    actor: team,
  });
  const docs = await inMemoryRepository.listRegistrationDocuments(team, "PLAYER", player.id);
  assertEquals(docs[0]?.file_name, "replacement.pdf");
  assertStringIncludes(docs[0]?.status ?? "", "UPLOADED");
  assertEquals(
    (await inMemoryRepository.listVerificationHistory("PLAYER", player.id, admin))[0]?.reason,
    "Dokumen buram",
  );
  assertEquals(
    (await inMemoryRepository.listAuditLogs()).some((log) => log.action === "DOCUMENT_REPLACED"),
    true,
  );
});

Deno.test("suspended account is denied and invalid registration transitions fail", async () => {
  const team = await inMemoryRepository.createTeam({
    contingent_id: "con-1",
    category_id: "cat-women",
    name: "QA Suspended Team",
    short_name: "QST",
    primary_color: "#123f7a",
    actor: admin,
  });
  await inMemoryRepository.createTeamAccount({
    team_id: team.id,
    username: "qa.suspended",
    password: "qa-password",
    actor: admin,
  });
  await inMemoryRepository.updateTeamAccountStatus({
    team_id: team.id,
    status: "SUSPENDED",
    actor: admin,
  });
  assertEquals(await inMemoryRepository.authenticateTeam("qa.suspended", "qa-password"), null);
  assertEquals(canTransitionRegistration("APPROVED", "DRAFT"), false);
  assertEquals(canTransitionRegistration("LOCKED", "DRAFT"), false);
});

Deno.test("official lifecycle uses explicit submission and admin review", async () => {
  const team = teamActor("tm-m3");
  const official = await inMemoryRepository.createTeamOfficial({
    team_id: "tm-m3",
    full_name: "QA Official",
    role: "MANAGER",
    actor: team,
  });
  assertEquals(official.registration_status, "DRAFT");
  await inMemoryRepository.submitRegistration({
    entityType: "OFFICIAL",
    entityId: official.id,
    actor: team,
  });
  for (const type of ["IDENTITY", "REGISTRATION", "MEDICAL"] as const)
    await inMemoryRepository.uploadRegistrationDocument({
      entityType: "OFFICIAL",
      entityId: official.id,
      type,
      file_name: `${type}.pdf`,
      actor: team,
    });
  await inMemoryRepository.reviewRegistration({
    entityType: "OFFICIAL",
    entityId: official.id,
    action: "APPROVED",
    actor: admin,
  });
  assertEquals(
    (await inMemoryRepository.getTeamOfficial(official.id, team)).registration_status,
    "APPROVED",
  );
  await assertRejects(
    () =>
      inMemoryRepository.updateTeamOfficial({
        id: official.id,
        changes: { full_name: "Changed" },
        actor: team,
      }),
    Error,
    "tidak dapat diubah",
  );
});

Deno.test(
  "complete team submission is actor-scoped and incomplete submission is blocked",
  async () => {
    const created = await inMemoryRepository.createTeam({
      contingent_id: "con-1",
      category_id: "cat-men",
      name: "QA Submission Team",
      short_name: "QSUB",
      primary_color: "#1c6b3c",
      actor: admin,
    });
    const team = teamActor(created.id);
    await assertRejects(
      () =>
        inMemoryRepository.submitRegistration({
          entityType: "TEAM",
          entityId: created.id,
          actor: team,
        }),
      Error,
      "belum memenuhi",
    );
    await inMemoryRepository.updateTeamProfile({
      team_id: created.id,
      profile: {
        contact_person: "QA Manager",
        contact_phone: "08120000",
        contact_email: "qa@team.demo",
        address: "Makassar",
        registration_status: "DRAFT",
      },
      actor: team,
    });
    const player = await inMemoryRepository.createPlayer({
      team_id: created.id,
      full_name: "Submission Player",
      jersey_number: 1,
      position: "GOALKEEPER",
      birth_date: "2000-01-01",
      is_captain: true,
      actor: team,
    });
    const official = await inMemoryRepository.createTeamOfficial({
      team_id: created.id,
      full_name: "Submission Official",
      role: "MANAGER",
      actor: team,
    });
    for (const entityId of [player.id, official.id]) {
      await inMemoryRepository.submitRegistration({
        entityType: entityId === player.id ? "PLAYER" : "OFFICIAL",
        entityId,
        actor: team,
      });
      for (const type of ["IDENTITY", "REGISTRATION", "MEDICAL"] as const)
        await inMemoryRepository.uploadRegistrationDocument({
          entityType: entityId === player.id ? "PLAYER" : "OFFICIAL",
          entityId,
          type,
          file_name: `${entityId}-${type}.pdf`,
          actor: team,
        });
      await inMemoryRepository.reviewRegistration({
        entityType: entityId === player.id ? "PLAYER" : "OFFICIAL",
        entityId,
        action: "APPROVED",
        actor: admin,
      });
    }
    await inMemoryRepository.submitRegistration({
      entityType: "TEAM",
      entityId: created.id,
      actor: team,
    });
    assertEquals(
      (await inMemoryRepository.getTeamRegistration(created.id, team)).profile.registration_status,
      "SUBMITTED",
    );
    await assertRejects(
      () =>
        inMemoryRepository.submitRegistration({
          entityType: "TEAM",
          entityId: "tm-m1",
          actor: team,
        }),
      Error,
      "ditolak",
    );
  },
);
