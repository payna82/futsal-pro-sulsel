# TRAE Phase 2.5 - Team Registration QA + Authorization Readiness

## 1. Test Summary

The QA suite contains 9 tests: 4 existing Match Integrity tests and 5 Team Registration repository integration tests. Final focused result: **9 passed, 0 failed, 0 skipped**.

The tests execute through the in-memory repository boundary, not only isolated UI components. Deno needs `--sloppy-imports` because the application uses extensionless internal TypeScript imports.

## 2. Integration Test Results

Passed coverage includes team creation, account creation, duplicate username/account rejection, wrong credentials, disabled and suspended account denial, team player creation, document upload/replacement, admin review, missing-document approval rejection, and approved-player protection.

## 3. Ownership Test Results

Actor-bound commands deny Team A access to Team B profile, player creation, player update, and document upload. Team A can read and mutate its own supported resources through actor context. Direct repository list methods such as `listPlayers()` and `listTeamOfficials()` remain unscoped collection reads and are a Phase 3 authorization dependency.

## 4. Authorization Test Results

`ActorContext` is now available on registration commands and mutation hooks build it from the existing session and single permission catalog. Team actors cannot invoke review commands without `document.review`; admin actors with the existing permission catalog can review. This is authorization-readiness only: the actor itself is still client/session supplied until Phase 3 server authentication.

## 5. Registration State Test Results

`canTransitionRegistration()` rejects `APPROVED -> DRAFT` and `LOCKED -> DRAFT`. The centralized team profile lifecycle remains `DRAFT -> READY_FOR_SUBMISSION -> SUBMITTED -> UNDER_REVIEW`, with revision represented by `REVISION_REQUIRED` and resubmission through `SUBMITTED`.

The current model does not include `REJECTED` in `RegistrationStatus`, and Player has no separate registration status beyond `Player.status`. A rejected verification action is recorded in history/document status but does not provide a distinct player rejection/resubmission state. This is a real domain gap, not marked as passed.

## 6. Document Test Results

Documents use one centralized `DOCUMENT_TYPES` catalog, private `storage_ref` metadata, upload/replacement status, review status, reviewer fields, timestamps, and revision reason. Approval rejects incomplete required document sets. Replacement updates the current metadata row and preserves review history. No public document URL or binary payload is exposed.

## 7. Verification Test Results

Admin review supports approve, revision request, and reject for players and officials. Team actors are denied review. Verification history preserves actor, action, previous status, new status, timestamp, and reason. Approved players become `ELIGIBLE` because that relationship exists in the current domain; official approval remains conceptually separate.

## 8. Audit Test Results

Existing audit abstraction is used. New team, account, profile, player, official, document, review, and submission operations create audit records. Audit records are returned as clones and are not exposed through a Team mutation. Full action taxonomy coverage should be expanded in Phase 3, especially explicit PLAYER_SUBMITTED, PLAYER_RESUBMITTED, OFFICIAL_SUBMITTED, DOCUMENT_APPROVED, and TEAM_APPROVED events.

## 9. Security Findings

- **CRITICAL:** authentication remains demo/client-side; actor identity and permissions are not server-trusted.
- **HIGH:** collection reads (`listPlayers`, `listTeamOfficials`, and unrestricted document queries) do not accept actor scope and can expose cross-tenant data if called directly.
- **HIGH:** repository actor context is optional for backward compatibility, so callers that omit it bypass the new ownership guard.
- **MEDIUM:** Team account credential storage is intentionally demo-only and uses an in-memory demo digest, not production password hashing.
- **MEDIUM:** direct session role/team fields remain client-controlled until server authentication/RBAC.
- **LOW:** verification UI uses one shared reason field for multiple rows; production review should use a scoped dialog/command form.

## 10. Client Trust Findings

- `operator_id` is still supplied by match control and registration callers; Phase 2.5 only threads it into an explicit `ActorContext` boundary.
- `team_id` is supplied by Team portal commands; the adapter validates it against `ActorContext.teamId` when actor context is present.
- `role` and permission arrays are derived in the browser from the current demo session; they are not authoritative.
- Admin route guards and permission checks remain UX-layer checks; direct repository calls with omitted actor context remain possible in the demo.
- Team login returns a team account and creates a client session; it is not a production session.

## 11. Files Modified

- `src/domain/registration.ts`
- `src/data/repository.ts`
- `src/data/in-memory-repository.ts`
- `src/hooks/mutations.ts`
- `src/routes/admin.verification.tsx`
- `tests/team-registration.integration.test.ts`

## 12. Files Created

- `tests/deno.json`
- `TEAM-REGISTRATION-QA-REPORT.md`

## 13. Typecheck

`npx tsc --noEmit`: **PASS**.

## 14. ESLint

Focused ESLint on changed QA files: **PASS with the existing Fast Refresh warning** in `use-session.tsx`.

Full `npm run lint`: **FAILS on repository-wide existing CRLF/Prettier formatting errors**, including untouched legacy files. This is unrelated to the QA implementation and should be handled in a separate formatting cleanup.

## 15. Build

`npm run build`: **PASS**.

## 16. Route Regression

Previously verified HTTP smoke checks returned `200` with content for all new Team routes, admin verification/team routes, and `/match/mt-1/control`. Build route generation includes the new routes.

## 17. Match Center Regression

The existing 4 Match Integrity tests pass for valid goal, invalid event combinations, correction score behavior, and illegal status transition. No Match Center business logic was changed in Phase 2.5.

## 18. Remaining Phase 3 Dependencies

1. Replace demo session with verified production authentication.
2. Derive actor, role, team ownership, and permissions from the server session.
3. Make actor context mandatory for all registration commands and scope all collection reads.
4. Add server/RLS enforcement and private signed document access.
5. Define explicit player/official registration statuses including rejected and resubmission semantics.
6. Add complete review/submission command taxonomy and audit events.
7. Add a project-native integration test runner and full 24-scenario coverage.
8. Add browser route and interaction regression tests with a clean dependency/tooling setup.

## Final Security Matrix

| Operation           | Admin                             | Team A                  | Team B                  |
| ------------------- | --------------------------------- | ----------------------- | ----------------------- |
| Create Team         | ALLOW with actor                  | DENY                    | DENY                    |
| Edit Team A profile | ALLOW with actor                  | ALLOW with Team A actor | DENY                    |
| Edit Team B profile | ALLOW with actor                  | DENY                    | ALLOW with Team B actor |
| Create Player A     | ALLOW with actor                  | ALLOW with Team A actor | DENY                    |
| Edit Player A       | ALLOW with actor                  | ALLOW until approved    | DENY                    |
| Approve Player      | ALLOW with `document.review`      | DENY                    | DENY                    |
| Upload Document A   | ALLOW where command scope permits | ALLOW with Team A actor | DENY                    |
| Review Document     | ALLOW with `document.review`      | DENY                    | DENY                    |
| Submit Team A       | ALLOW with actor                  | ALLOW with Team A actor | DENY                    |

## Final Decision

**TEAM REGISTRATION WORKFLOW READY: NO**

The repository-level QA suite passes, but collection-read scoping, optional actor compatibility, separate rejected/resubmission player status, and production authentication remain unresolved.

**READY FOR PHASE 3 AUTHENTICATION + RBAC: NO**

This phase is authorization-readiness only. It does not provide production authentication, production password hashing, RLS, or server-trusted identity.
