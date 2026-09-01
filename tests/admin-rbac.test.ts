import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { getAdminRedirectRoute, can } from "../src/domain/permissions.ts";

Deno.test("unauthorized role gets redirected away from protected admin route", () => {
  assertEquals(can("PUBLIC", "team.manage"), false);
  assertEquals(getAdminRedirectRoute("PUBLIC", "team.manage"), "/admin");
  assertEquals(getAdminRedirectRoute("TOURNAMENT_ADMIN", "role.manage"), "/admin");
  assertEquals(getAdminRedirectRoute("SUPER_ADMIN", "role.manage"), null);
});
