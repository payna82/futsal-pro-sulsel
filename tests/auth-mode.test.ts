import { assertEquals, assertThrows } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { DemoAuthenticationAdapter } from "../src/domain/demo-authentication-adapter.ts";
import { getRuntimeAuthMode, isDemoAuthEnabled } from "../src/domain/authentication-runtime.ts";

Deno.test("runtime auth defaults to Supabase and disables demo mode by default", () => {
  assertEquals(getRuntimeAuthMode(), "supabase");
  assertEquals(isDemoAuthEnabled(), false);
});

Deno.test("demo adapter requires explicit opt-in", () => {
  assertThrows(
    () => new DemoAuthenticationAdapter(),
    Error,
    "Demo authentication is disabled by default",
  );
});
