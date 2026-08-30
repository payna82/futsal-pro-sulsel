# PORPROV Sulsel 2026 Futsal

# 1. Executive Summary

Status audit: **NO-GO for production database migration without a hardening phase**.

The application has a sensible layered shape: TanStack Router routes render UI, TanStack Query supplies reads and mutations, a `CompetitionRepository` hides the current in-memory adapter, and match calculations live in the domain layer. No UI component directly mutates the fixture arrays; the observed write path is routed through repository methods.

The design is not yet production-safe for PostgreSQL/Supabase because the current adapter is trusted by the client, event validation is not enforced at the repository boundary, the `Match` record stores mutable score alongside event history, clock writes are client-authored and unaudited, and there is no server authentication, transaction, version check, or concurrency control. The fixtures also intentionally make the persisted score look authoritative, which weakens the event-sourcing invariant.

Most important risks:

- **CRITICAL:** no real authentication or server-side authorization; demo login accepts a selected account without checking the password.
- **HIGH:** repository `recordMatchEvent()` does not call `validateMatchEvent()` and accepts arbitrary operator IDs, event types, teams, players, timestamps, duplicates, and historical periods.
- **HIGH:** score is modeled as mutable `Match.home_score`/`away_score` and is rendered directly by public/admin views; only the control page derives score from events.
- **HIGH:** clock is a browser interval with manual client synchronization; it has no actor, event, version, lease, or conflict protection.
- **HIGH:** audit coverage is incomplete: clock and schedule mutations are not audited, and official replacement is an update rather than an immutable assignment history.
- **MEDIUM:** standings use stored match scores rather than deriving from the authoritative event stream; fair-play points are never aggregated.

# 2. Current Architecture

## Project layers

- Domain: [types.ts](src/domain/types.ts), [match-state.ts](src/domain/match-state.ts), [match-operations.ts](src/domain/match-operations.ts), [standings.ts](src/domain/standings.ts), and [permissions.ts](src/domain/permissions.ts).
- Data contract and adapter: [repository.ts](src/data/repository.ts), [in-memory-repository.ts](src/data/in-memory-repository.ts), and [index.ts](src/data/index.ts). The exported `repository` is always the in-memory implementation.
- Query/mutation access: [queries.ts](src/hooks/queries.ts), [mutations.ts](src/hooks/mutations.ts), and [use-competition-data.ts](src/hooks/use-competition-data.ts).
- Session: [use-session.tsx](src/hooks/use-session.tsx), mounted globally by [__root.tsx](src/routes/__root.tsx).
- UI: reusable match components under `src/components/match`, layouts under `src/components/layout`, and authorization wrapper [AdminPage.tsx](src/components/admin/AdminPage.tsx).
- Fixtures: [fixtures.ts](src/data/fixtures.ts) is the complete source of demo data and is mutated in place by the adapter.

## Route architecture

TanStack Router uses a root route and flat public routes plus an `/admin` parent with administrative children. Public routes cover dashboard, categories, schedule, results, live scores, standings, players, teams, top scorers, and venues. Administrative routes cover operational dashboards, tournaments, competitions, groups, venues, participants, users, roles, permissions, audit logs, reports, statistics, schedule, matches, and match officials. Match operation has a dedicated `/match/$matchId/control` route; public match detail is `/pertandingan/$matchId`.

The generated [routeTree.gen.ts](src/routeTree.gen.ts) is wiring only. Authorization is component-level, not route-loader or server middleware-level.

## Read and write flow

Reads use query options in [queries.ts](src/hooks/queries.ts), which call the repository. `useCompetitionData()` aggregates common lookup queries but contains no business rules. Writes use mutation hooks in [mutations.ts](src/hooks/mutations.ts), then invalidate related query keys. The match control route validates input in the browser before calling the mutation hook.

# 3. Domain Audit

Business logic is generally separated from UI. `canTransition()`, `allowedEvents()`, `periodForStatus()`, `deriveScore()`, and `computeStandings()` are deterministic pure functions. Event validation is centralized in `validateMatchEvent()`, but its enforcement point is not centralized: only the match control route calls it.

The domain model has an event-driven intention but is not fully event-sourced. `Match` contains both event-derived score and mutable score columns, and `clock_seconds` is mutable state. A production model should distinguish projections/snapshots from the event ledger and define which projection is authoritative.

Notable domain gaps:

- `validateMatchEvent()` checks basic type/team/player/card rules, but does not validate that the operator is authorized, active, assigned, or that the event is unique.
- `MATCH_CORRECTION` is allowed but has no correction schema or effect in `deriveScore()`; it cannot reverse or amend a goal.
- Timestamp validation is only `0..1200` and does not validate period-specific constraints or ordering.
- `periodForStatus()` and transition-generated events do not enforce a complete period event protocol.
- `nextStatuses()` returns the internal array directly, so callers can theoretically mutate the transition table through the returned value.

# 4. Repository Audit

`CompetitionRepository` covers the currently visible reads and five match mutation families. All observed application writes route through it; direct mutations found are confined to the in-memory adapter and fixture initialization. No component directly pushes to or edits fixture collections.

The contract is a useful adapter boundary, but it is not sufficient as a production command API:

- `recordMatchEvent()` has no explicit expected match version, idempotency key, actor/session context, or validation result contract.
- `updateMatchClock()` has no actor/operator ID, command timestamp, expected version, or distinction between a clock command and a persisted clock snapshot.
- `updateMatchSchedule()` has no actor ID, validation contract, expected version, or conflict semantics.
- `assignMatchOfficial()` returns the complete assignment list and silently replaces an existing role; it has no unassign operation, effective period, or history semantics.
- `listStandings()` and `listTopScorers()` expose derived data as repository reads, but their derivation rules are not represented as explicit query parameters for stage/group/status policy.
- There are no repository methods for lineups, teams, players, schedules, or official management mutations even though the UI has management screens. Those screens are presently read-only or static.

The adapter returns mutable fixture object references. In a real adapter, callers must not be able to mutate repository state through returned objects.

# 5. Match Engine Audit

Status authority is correctly concentrated in `canTransition()` and the `TRANSITIONS` table. `transitionMatchStatus()` checks it before mutation and emits system events for LIVE, HALFTIME, and FULL_TIME. No duplicated status-transition table was found.

The implementation is incomplete as an engine boundary. The UI repeats `canTransition()` for UX, which is acceptable as a preflight, but the repository must remain authoritative. `transitionMatchStatus()` does not validate the actor, current version, period/event preconditions, or whether the required official roles are assigned.

The required operation names are present and used by the match control route: `recordMatchEvent()`, `transitionMatchStatus()`, `updateMatchClock()`, `updateMatchSchedule()`, and `assignMatchOfficial()`.

# 6. Permission Audit

[permissions.ts](src/domain/permissions.ts) is the single permission catalog and role-to-permission matrix. `AdminPage` uses permission keys for most admin pages, and match control uses permission keys for event, clock, manage, confirm, and publish actions.

Direct role checks exist in presentation/data-selection contexts:

- role counts in [admin.roles.tsx](src/routes/admin.roles.tsx);
- eligible match-official filtering in [admin.match-officials.tsx](src/routes/admin.match-officials.tsx);
- fixture/user display logic.

These are not duplicate authorization decisions, but official eligibility rules are partly embedded in the route instead of a domain policy. More importantly, all permission checks are client-side UX checks. The repository accepts `operator_id` but does not check its role or permission. There is no backend authorization boundary yet.

# 7. Event Integrity Audit

Events are append-only in the current adapter: `recordMatchEvent()` pushes to `fx.matchEvents`, and there are no update/delete methods. This is a good starting invariant.

However, append-only does not currently mean valid or immutable in a production sense:

- The repository appends without calling `validateMatchEvent()`.
- Duplicate submissions are possible; there is no client idempotency key or database unique constraint.
- Event ordering is not guaranteed by `listMatchEvents()`; it filters in fixture-array order. Fixtures sort by timestamp, but appends can arrive out of order.
- `created_at` is generated by the adapter, but the event's historical match timestamp is client-supplied and editable by any caller of the repository.
- `MATCH_CORRECTION` has no structured correction target, reason, or projection semantics.
- Event metadata is an unbounded key/value object with no per-event schema.

The event ledger needs a stable sequence, server creation time, immutable payload, actor identity from the authenticated session, and idempotency protection.

# 8. Score Integrity Audit

There are two score paths:

1. The match control route calls `deriveScore(eventList, home_team_id, away_team_id)` and displays that result.
2. Public pages and several admin/report/live views display `match.home_score` and `match.away_score` directly. `computeStandings()` also reads those fields.

The in-memory adapter resynchronizes mutable score after event recording and status transitions. Fixture creation, however, initializes scores first and then generates matching goal events, so the demo passes while preserving the dangerous dual-source model.

Conclusion: score is **not** universally derived only from events. A stale or concurrently modified score projection can disagree with the event ledger, and public users will see the projection while operators see the event calculation.

# 9. Standings Audit

There is one standings aggregation function, `computeStandings()`, called by `inMemoryRepository.listStandings()`. Public category/group views consume that query; no second standings algorithm was found.

The aggregation is deterministic for its inputs and counts only FULL_TIME, CONFIRMED, and PUBLISHED matches. It nevertheless consumes mutable match score fields instead of deriving each match result from valid goal events. `fair_play_points` is initialized but never calculated, and there is no explicit group/stage filtering inside the function beyond the supplied team list. Tie-break policy is limited to points, goal difference, goals for, then fair-play points.

# 10. Clock Audit

The authoritative-looking field is `Match.clock_seconds`, stored in the in-memory match object. The operator UI creates a separate local clock via [use-match-clock.ts](src/hooks/use-match-clock.ts), increments it with `setInterval`, and writes it only when the operator presses “Simpan Jam”. The repository clamps and rounds the submitted value.

Clock writes are not audited and have no operator ID. The clock is not persisted across reloads in the demo; in production, persistence behavior is undefined by the interface. Multiple operators can overwrite one another, and a stale browser can write an older value after a newer write. There is no server elapsed-time calculation, lease, heartbeat, version check, or authoritative pause/resume event.

Historical event timestamps are immutable after append in the current adapter, but they are client-supplied at creation and are not tied to a server clock snapshot. A clock correction therefore has no auditable relationship to events already recorded.

# 11. Audit Log Audit

The adapter automatically creates audit rows for:

- match event creation;
- match status changes;
- match official assignment, including replacement.

Audit rows are stored in `fx.auditLogs` and read by `listAuditLogs()`.

Missing audit records include clock updates and schedule updates. There is no audit for login/sign-out, failed authorization, failed mutation attempts, correction approval, or changes to non-match entities because those mutation APIs do not exist. Audit actor identity is caller-supplied through `operator_id`; it is not derived from authenticated server context. Audit logs themselves have no repository immutability or pagination contract.

# 12. Authentication Audit

Authentication is explicitly demo-only. `SessionProvider` starts with a hard-coded `SUPER_ADMIN` user. The login route loads the public in-memory user list, lets the user select an account, ignores the password value, and calls `signIn()` with the selected role. Session state is React memory only: there is no cookie, token, refresh, persistence, session expiry, MFA, account status check at sign-in, or server session.

Admin access is gated in the browser by `AdminPage` and match control checks, but direct route/API access is not protected by a server boundary. The source comments correctly acknowledge that backend authentication and authorization are still absent. This is acceptable for a demo and unacceptable for production operations.

# 13. PostgreSQL Readiness

The repository interface gives a reasonable injection point, but it is not migration-ready by itself.

## Recommended relational entities

Use normalized tables for tournaments, categories, contingents, teams, players, team officials, venues, groups, matches, match lineups, match officials, match events, users/roles/permissions, and audit logs. Treat standings, top scorers, and current score as projections or views, not independent user-editable facts.

## Required constraints

- UUID primary keys and foreign keys for every relationship.
- Unique `(tournament_id, category_key)`, team/category membership, match number within its competition scope, and `(match_id, role)` for officials.
- Unique `(match_id, idempotency_key)` for submitted commands/events.
- Check constraints for score/clock non-negative values, valid court, valid timestamp range, distinct home/away teams, and valid event payload shape.
- Restrict event update/delete privileges; use append-only inserts plus correction events.
- Ensure assigned officials are active, eligible for the slot, and not duplicated for a match.
- Row-level security tied to authenticated user role and competition/venue/team scope.

## Transaction boundaries

- Event insert plus score/projection update must be one transaction.
- Status change plus generated system events plus projection update plus audit row must be one transaction.
- Clock command/snapshot and its audit/event record must be one transaction.
- Official assignment replacement plus audit history must be one transaction.
- Schedule change plus collision validation and audit must be one transaction.

# 14. Concurrency Risks

| Mutation                  | Atomic requirement                                                                                             | Lock/version                                                                             | Unique/append-only rule                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `recordMatchEvent()`      | Validate current match, insert one immutable event, update/rebuild score projection, and audit together.       | Lock match row or use optimistic `version`; reject stale status/version.                 | Unique idempotency key per match; event ledger append-only; stable per-match sequence.             |
| `transitionMatchStatus()` | Check current status, update status/period/clock, insert all generated events, projection, and audit together. | `SELECT ... FOR UPDATE` or conditional `UPDATE ... WHERE version = ?`.                   | Enforce legal transition in server/domain function; generated event batch cannot partially commit. |
| `updateMatchClock()`      | Apply a clock command/snapshot only if it is newer and valid, then audit it.                                   | Match row lock or optimistic version; preferably one authoritative clock operator/lease. | Unique command ID; do not let stale clients overwrite newer clock state.                           |
| `assignMatchOfficial()`   | Validate eligibility and current assignment, replace or append history, and audit together.                    | Lock `(match_id, role)` or use conditional upsert/version.                               | Unique `(match_id, role)` and prevent duplicate user assignment per match.                         |

All four operations currently mutate shared in-memory objects without locking, versioning, or transaction semantics. JavaScript's single event loop does not model the multi-process and multi-operator races expected after migration.

# 15. Security Risks

- Client-controlled role and `operator_id` allow impersonation in the current architecture.
- The demo login exposes all user accounts and accepts any password.
- No server-side RLS/API authorization exists yet; UI permission checks are bypassable.
- Public and admin views expose full player names and other operational data without a documented privacy policy or scope model.
- Audit actor names are looked up from mutable fixture data and are not cryptographically tied to an authenticated principal.
- Arbitrary event metadata is an injection/data-quality surface unless schema-validated and size-limited.
- Error reporting calls `console.error`; production logging and sensitive-data redaction policy are not established.

# 16. Critical Issues

## CRITICAL

1. **Authentication and authorization are client-trusted.** Hard-coded demo session, selectable-account login, ignored password, and no server enforcement mean an unauthorized client can impersonate any role and submit mutations.

## HIGH

1. **Repository accepts unvalidated events.** `recordMatchEvent()` bypasses `validateMatchEvent()`, allowing invalid or unauthorized event data through any future adapter/API call.
2. **Dual score authority.** Some views use derived event score while public/admin/standings use mutable match score.
3. **Clock race and missing audit.** Client interval plus manual save can overwrite another operator and leaves no actor/history record.
4. **Mutation transactions are absent.** Status changes, generated events, score resync, official assignment, and audit writes can partially apply after migration unless explicitly transactional.
5. **No idempotency or duplicate-event protection.** Retries/double clicks can create duplicate goals and corrupt score.

## MEDIUM

1. Schedule and clock repository commands lack actor, version, and validation semantics.
2. Event ordering is not guaranteed by the read contract.
3. Correction events are modeled but have no defined projection behavior.
4. Standings consume score snapshots and do not implement fair-play aggregation.
5. Official replacement overwrites the current row, losing assignment history.
6. The repository returns mutable in-memory references, unlike an isolated database adapter.
7. Route-level authorization is not a server route guard.

## LOW

1. `nextStatuses()` exposes its internal transition array.
2. Query invalidation is broad and lacks mutation-specific version reconciliation.
3. Repository list methods have no pagination, filtering, or ordering guarantees for production-scale data.

# 17. Recommended PostgreSQL Architecture

1. Put authenticated commands behind server functions/API handlers. Derive actor identity from the verified session, never from a client-provided trusted ID.
2. Keep domain functions as shared validation policy, but execute them server-side before the transaction. The UI may retain preflight validation for usability.
3. Store immutable `match_events` with a server-generated sequence, server `created_at`, immutable payload, actor, and idempotency key. Represent corrections as explicit events referencing the corrected event.
4. Make `matches` a controlled projection: status/period/clock may be current state, but score must be rebuilt from accepted events or updated only in the same transaction as the event insert. Public queries should use one projection/view.
5. Model clock control as commands or start/pause/resume events plus a projection, with optimistic versioning and an operator lease if multiple courts/operators are possible.
6. Preserve official assignment history with effective timestamps and a current-role uniqueness constraint.
7. Add database constraints, RLS policies, audit triggers or transactional audit inserts, and migration tests before switching the adapter.
8. Extend the repository contract with explicit command context/version/idempotency semantics and complete CRUD only where the UI genuinely needs it.

# 18. Recommended Implementation Order

1. Define production authentication/session and server authorization/RLS policy.
2. Resolve the source-of-truth model: event ledger, correction semantics, score projection, and standings policy.
3. Strengthen domain command inputs and validation, including actor eligibility, event schemas, period rules, and idempotency.
4. Add PostgreSQL schema, foreign keys, unique/check constraints, append-only permissions, and transaction functions.
5. Implement transactional repository methods with optimistic version or row-lock behavior.
6. Replace client clock saving with authoritative clock commands/events and complete audit coverage.
7. Migrate public/admin reads to a single score/standings projection path.
8. Add concurrency, authorization, duplicate submission, correction, transition, and audit completeness tests.
9. Run the existing typecheck, lint, production build, browser route checks, and runtime/console validation against the migrated adapter.

## Final decision

**READY FOR DATABASE MIGRATION: NO.**

The adapter boundary and domain separation are a good foundation, but migration should wait until authentication is server-trusted, event validation is enforced at the command boundary, score/standings have one authoritative projection, and the four match mutations have transaction, idempotency, audit, and concurrency semantics.
