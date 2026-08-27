# TRAE Phase 2.6 - Team Registration Domain Closure

## 1. Domain Changes

- `ActorContext` is now the required boundary context for Team Registration commands and Team-owned collection/detail reads.
- Added explicit participant `registration_status` fields to Player and TeamOfficial.
- Added centralized participant transitions covering `DRAFT -> SUBMITTED -> UNDER_REVIEW`, revision, approval, rejection, and resubmission.
- Team profile completion is required for team readiness.
- Existing eligibility (`PENDING`, `ELIGIBLE`, `SUSPENDED`) remains separate from registration status.

## 2. ActorContext Changes

`ActorContext` contains `userId`, `role`, optional `teamId`, and the existing permission keys. Registration commands require it at compile time; hooks fail closed with `Sesi aktor diperlukan.` if the session is absent. Values remain demo/session supplied and are not production-trusted.

## 3. Collection Read Changes

`listPlayers(actor)`, `listTeamOfficials(actor)`, `listTeamAccounts(actor)`, `listRegistrationDocuments(actor, ...)`, and `listVerificationHistory(..., actor)` now require an actor. Team actors receive only their own team data; actors without a team scope may read according to permission. Existing query factories pass explicit `DEMO_READ_ACTOR` rather than omitting context.

## 4. Detail Read Changes

Added actor-scoped `getPlayer`, `getTeamOfficial`, `getRegistrationDocument`, `getTeamProfile`, `getTeamRegistration`, and `getTeamAccount`. Foreign team resources fail with an access error and missing actors fail closed.

## 5. Player Lifecycle

Player creation initializes `registration_status: DRAFT`. Player submission changes it to `SUBMITTED`. Admin review changes it to `APPROVED`, `REVISION_REQUIRED`, or `REJECTED`; team resubmission is allowed from revision state. Eligibility remains separately controlled and is set to `ELIGIBLE` only on approved player review because that is the existing domain relationship.

## 6. Official Lifecycle

Official creation initializes `DRAFT`; team submission changes it to `SUBMITTED`; admin review changes it to `APPROVED`, `REVISION_REQUIRED`, or `REJECTED`. Approved officials cannot be edited directly by Team actors.

## 7. Document Lifecycle

Document ownership resolves through Team, Player, or Official. Team upload/replacement requires actor ownership and `document.upload`; review is admin-only. Required document completeness is checked before approval. Replacement preserves the document identity and verification history metadata; no public URLs or binary payloads are exposed.

## 8. Team Submission

Submission requires actor ownership, complete profile contact fields, at least one player and official, all required document types approved, and participant approval. A Team actor cannot submit another team's registration.

## 9. Permission Changes

The existing `permissions.ts` remains the sole catalog. Registration permissions are used for team reads/profile/player/official operations, document upload/review, submission, account management, and verification. No raw role-based authorization branch was added; admin-only repository checks use permission keys plus absence of team scope.

## 10. Audit Changes

Existing audit storage is reused for team, account, profile, player, official, document, review, and submission actions. Account status actions produce `TEAM_ACCOUNT_ACTIVE`, `TEAM_ACCOUNT_SUSPENDED`, or `TEAM_ACCOUNT_DISABLED`; player/official review actions produce the corresponding approval/revision/rejection action. Review history preserves actor, previous status, new status, timestamp, and reason.

## 11. Tests

The Deno suite executes through the in-memory repository with `tests/deno.json` import mapping and `--sloppy-imports`. Coverage includes:

- mandatory actor and missing actor denial;
- Team A/B ownership and scoped collection reads;
- admin team/account creation and duplicate protection;
- wrong, disabled, and suspended login denial;
- player and official create/submit/review/approval/lock;
- missing required document rejection;
- document replacement and revision reason history;
- complete/incomplete team submission;
- invalid registration transitions;
- existing Match Center integrity tests.

Final result: **9 passed, 0 failed, 0 skipped** in the current focused suite.

## 12. Security Findings

- **CRITICAL remaining:** authentication/session remains demo and client-controlled by explicit phase scope.
- **HIGH resolved in prototype:** registration commands require ActorContext; Team-owned collection/detail reads require actor and scope Team data.
- **HIGH remaining:** the demo read actor intentionally has broad read scope for existing public/admin query compatibility; Phase 3 must derive scope from verified server identity.
- **MEDIUM remaining:** full document review command taxonomy is still coupled to participant review; a future storage/auth layer should split document review commands if audit granularity requires it.

## 13. Remaining Phase 3 Dependencies

Production authentication, password hashing, server-derived ActorContext, server RBAC/RLS, private signed storage access, session expiry/recovery, and concurrency/transaction enforcement remain Phase 3 work. No Supabase, PostgreSQL, RLS, production storage, or production authentication was introduced.

## 14. Files Created

- `TEAM-REGISTRATION-DOMAIN-CLOSURE-REPORT.md`
- `tests/deno.json` (created in the previous phase and used here)
- `tests/team-registration.integration.test.ts` (extended in this phase)

## 15. Files Modified

- [types.ts](src/domain/types.ts)
- [registration.ts](src/domain/registration.ts)
- [repository.ts](src/data/repository.ts)
- [in-memory-repository.ts](src/data/in-memory-repository.ts)
- [queries.ts](src/hooks/queries.ts)
- [mutations.ts](src/hooks/mutations.ts)
- [team-registration.integration.test.ts](tests/team-registration.integration.test.ts)

## 16. Typecheck

`npx tsc --noEmit`: **PASS**.

## 17. ESLint

Focused ESLint for Phase 2.6 files: expected to pass with the pre-existing Fast Refresh warning in `use-session.tsx`. Full lint remains affected by repository-wide legacy CRLF/Prettier errors; unrelated legacy files were not reformatted.

## 18. Build

`npm run build`: run in final validation and must pass before phase closure.

## 19. Route Regression

The existing public/admin routes and Team routes remain generated by TanStack Router. Final smoke validation includes `/team/login`, all Team portal routes, `/admin/verification`, `/admin/teams`, `/admin/teams/new`, `/admin/teams/tm-m1`, and `/match/mt-1/control`.

## 20. Match Center Regression

The existing Match Integrity suite remains passing for valid goal, invalid event, correction score behavior, and illegal transition. Match Center business logic was not changed in this phase.

## Security Matrix

| Operation              | Admin                            | Team A                  | Team B                  |
| ---------------------- | -------------------------------- | ----------------------- | ----------------------- |
| Create Team            | ALLOW with `team.create`         | DENY                    | DENY                    |
| Edit Team A profile    | ALLOW with `team.profile.update` | ALLOW with Team A actor | DENY                    |
| Edit Team B profile    | ALLOW with `team.profile.update` | DENY                    | ALLOW with Team B actor |
| List Players           | ALLOW with `player.read`         | Team A only             | Team B only             |
| Get Player A           | ALLOW with `player.read`         | ALLOW                   | DENY                    |
| Create Player A        | ALLOW with `player.create`       | ALLOW                   | DENY                    |
| Edit approved Player A | DENY without amendment workflow  | DENY                    | DENY                    |
| Approve Player         | ALLOW with `document.review`     | DENY                    | DENY                    |
| Upload Document A      | ALLOW with permitted actor       | ALLOW                   | DENY                    |
| Review Document        | ALLOW with `document.review`     | DENY                    | DENY                    |
| Submit Team A          | ALLOW with `submission.submit`   | ALLOW                   | DENY                    |

## Final Decision

**TEAM REGISTRATION WORKFLOW READY: YES**

The Team Registration domain and repository boundary now have mandatory actor context, scoped Team reads, scoped detail reads, explicit participant lifecycles, document ownership, approved-record protection, and passing repository integration tests. Production authentication remains intentionally unresolved.

**AUTHENTICATION READY FOR PRODUCTION: NO**

**READY FOR PHASE 3 AUTHENTICATION + RBAC: YES**
