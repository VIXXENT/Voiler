# Plan B Code Review -- Triage Summary

**Triaged by:** Claude Opus 4.6 (Tech Lead)
**Date:** 2026-04-01
**Input:** 31 findings from Plan B code review

## Decision Summary

- **Day-zero (must fix before merge):** 3
- **Blocker (must fix before Plan C):** 4
- **Medium (create issue, fix soon):** 7
- **Discarded:** 17

## Triage Table

| #    | Finding                                 | Classification | Action                                                            |
| ---- | --------------------------------------- | -------------- | ----------------------------------------------------------------- |
| C-01 | Auth timing oracle leaks user existence | blocker        | Issue (combined with C-02)                                        |
| C-02 | Distinct error tags leak user existence | blocker        | Issue (combined with C-01)                                        |
| C-03 | No password max length -- Argon2 DoS    | day-zero       | Issue                                                             |
| C-04 | CORS empty origin in production         | trivial        | Discarded: no production deployment, Plan D defines origin        |
| C-05 | Argon2 defaults to argon2i not argon2id | day-zero       | Issue                                                             |
| C-06 | listUsers no pagination                 | medium         | Issue                                                             |
| I-01 | Rate limit trusts X-Forwarded-For       | medium         | Issue                                                             |
| I-02 | No brute-force rate limit on auth       | blocker        | Issue                                                             |
| I-03 | tRPC errors expose internals            | blocker        | Issue                                                             |
| I-04 | withAuditLog not wired in container     | blocker        | Issue                                                             |
| I-05 | createFindPasswordHash not in barrel    | trivial        | Discarded: refactored away in Plan C auth rewrite                 |
| I-06 | UserEntity.role typed as string         | medium         | Issue                                                             |
| I-07 | InfrastructureError.cause as unknown    | trivial        | Discarded: `unknown` is correct, formatting is nice-to-have       |
| I-08 | UserId uses wrong error type            | medium         | Issue                                                             |
| I-09 | cleanupAuditLog unhandled promise       | day-zero       | Issue                                                             |
| I-10 | Missing update/delete tRPC procedures   | trivial        | Discarded: unprotected CRUD worse than deferred, Plan C adds auth |
| S-01 | Duplicate test fixtures                 | trivial        | Discarded: normal test evolution                                  |
| S-02 | console.warn for info logs              | trivial        | Discarded: replaced by pino later                                 |
| S-03 | AuditLog table in wrong package         | medium         | Issue                                                             |
| S-04 | No listUsers tests                      | trivial        | Discarded: trivial delegation, mock test adds no value            |
| S-05 | No email edge case tests                | trivial        | Discarded: simple regex is intentional                            |
| S-06 | No tRPC integration tests               | medium         | Issue (consolidated with S-07, S-08)                              |
| S-07 | No DrizzleUserRepository tests          | medium         | Consolidated into S-06 issue                                      |
| S-08 | No Argon2/JWT adapter tests             | medium         | Consolidated into S-06 issue                                      |
| S-09 | tRPC context lacks user/session         | trivial        | Discarded: Plan C adds these, `unknown` placeholder is useless    |
| S-10 | Placeholder auth procedures             | trivial        | Discarded: documented as intentional                              |
| S-11 | Email regex overly permissive           | trivial        | Discarded: dual validation is fine, no real bug                   |
| S-12 | Module augmentation location            | trivial        | Discarded: cosmetic, works correctly                              |
| S-13 | Update use case missing from container  | trivial        | Discarded: same as I-10, deferred to Plan C                       |
| S-14 | Email error includes raw PII            | medium         | Issue                                                             |
| S-15 | No structured error logging for cleanup | trivial        | Discarded: subsumed by I-09 fix                                   |

## Plan Modification Notes

### Plan C (Auth with Better Auth) MUST address:

1. **C-01 + C-02:** Auth timing oracle and error enumeration. Better Auth's auth flow must use constant-time responses (dummy hash on user-not-found) and return identical error messages/codes for all auth failures.
2. **I-02:** Auth endpoint rate limiting (5 req/min) must be implemented as part of the auth middleware, not deferred further.
3. **I-04:** When Plan C wires auth middleware, also wire `withAuditLog` for all use cases through the container.

### No changes needed for Plans D-F.

## Issue Creation

Run `bash docs/reviews/plan-b-triage.sh` after `gh auth login` to create all 14 GitHub issues (3 day-zero, 4 blocker, 7 medium).
