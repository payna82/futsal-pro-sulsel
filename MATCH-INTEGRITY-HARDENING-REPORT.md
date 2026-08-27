# TRAE Phase 2 - Match Integrity Hardening Report

## 1. Files modified

- `src/domain/types.ts`
- `src/domain/match-operations.ts`
- `src/data/repository.ts`
- `src/data/in-memory-repository.ts`
- `src/data/fixtures.ts`
- `src/hooks/mutations.ts`
- `src/components/match/MatchEventDialog.tsx`
- `src/routes/match.$matchId.control.tsx`

## 2. Files created

- `tests/match-integrity.test.ts`
- `MATCH-INTEGRITY-HARDENING-REPORT.md`

No PostgreSQL, Supabase, authentication, server API, RLS, or UI redesign was added.

## 3. Domain changes

- Added command metadata, optional expected match version, event sequence metadata, correction metadata conventions, official assignment history fields, and audit result metadata.
- `validateMatchEvent()` remains the single validation implementation and now validates status-specific periods, eligible players, and structured `MATCH_CORRECTION` payloads.
- `deriveScore()` ignores goals voided by a `MATCH_CORRECTION` event and never mutates the original goal.
- `canTransition()` remains the only state-transition authority.

## 4. Repository changes

- `recordMatchEvent()` now validates before append, checks expected version, deduplicates by command ID, assigns per-match sequence numbers, synchronizes score, and returns a clone.
- Status, clock, schedule, and official commands also deduplicate command IDs in the in-memory adapter and return their original result on retry.
- Match, event, official, audit, and list results are cloned before returning where the adapter path was hardened.
- Match reads and standings reads rebuild score through the same event-derived projection helper.
- Top-scorer aggregation excludes goals voided by correction events.
- Clock and schedule commands accept command/operator/version metadata and advance the match version.
- Official role eligibility is validated; active duplicate users are rejected; replacement deactivates the previous assignment and preserves its effective end time.

## 5. Event integrity changes

- Accepted events have adapter-generated server creation time, stable per-match sequence number, and command ID.
- `listMatchEvents()` orders by sequence, then creation time, then ID.
- Existing event objects are never updated or deleted by repository operations.
- Replayed event commands return the original event and create a `REPLAYED` audit record.

## 6. Score source-of-truth changes

- The repository projection used by `listMatches()`, `getMatch()`, and standings rebuilds score from accepted match events.
- The existing `Match.home_score` and `Match.away_score` fields remain as a projection for UI compatibility; they are not edited directly by UI code.
- Goal correction is represented as an append-only correction event rather than mutation of the goal.

## 7. Clock changes

- Clock updates support command ID and expected version semantics, reject stale versions, advance match version, and create audit records.
- Clock values are finite, bounded to the official period duration, and accepted only for active match statuses.
- Existing Match Center clock interaction remains unchanged.
- Schedule updates validate timestamps, active venue/court bounds, and venue/court kickoff collisions.
- Browser elapsed time is still a client-side convenience until the authentication/server phase; it is not treated as a multi-operator authoritative clock implementation yet.

## 8. Official assignment changes

- Role eligibility is enforced in the repository.
- A user cannot hold two active roles in one match.
- Reassignments preserve the previous row with `active: false` and `effective_to`; the new row is active.

## 9. Tests added

`tests/match-integrity.test.ts` covers:

- valid goal and score derivation;
- invalid goal team/player/state/period;
- correction target and score voiding;
- illegal status transition.

The requested repository-level double-click, duplicate idempotency, event ordering, official replacement, stale clock, schedule, and audit integration cases are represented by the hardened implementation but could not be executed in this environment because the project has no installed test runner or dependencies. They should be added to the project test runner before migration.

## 10. Typecheck result

- `deno check src/domain/types.ts src/domain/match-state.ts src/domain/match-operations.ts src/domain/standings.ts tests/match-integrity.test.ts`: **PASS**.
- `bunx tsgo --noEmit`: **BLOCKED**. `bunx` attempted to download the `tsgo` package manifest and the connection was refused.

## 11. Lint result

- `bun run lint`: **NOT RUN**. Project dependencies are not installed, so the configured executable is unavailable.

## 12. Build result

- `bun run build`: **BLOCKED**. `vite` was not found because `node_modules` is absent.

## 13. Remaining risks

- Authentication and server-side authorization remain client/demo-only by explicit phase scope.
- In-memory mutations are synchronous but still do not model cross-process database transactions or row locks.
- Clock elapsed time remains browser-driven; command/version safeguards are prepared but authoritative server time is deferred.
- Event and audit fields are optional for legacy fixture compatibility and should become required in the database adapter/schema.
- Full repository integration tests and all browser regression checks remain pending until dependencies/test tooling are available.

## Final decision

**READY FOR AUTHENTICATION/RBAC PHASE: NO.**

The integrity hardening is implemented for the domain and in-memory adapter, but the required production validation suite could not be run, and the remaining client-trusted authentication/server authorization risk is intentionally deferred to the next phase.
