# M2 Milestone Triage — Memberships + Permissions

**Branch:** `feat/taskforge`
**Date:** 2026-04-09
**Source review:** `docs/reviews/m2-membership-permissions-review.md`

## Classification Summary

| # | Finding | Classification | Decision |
|---|---------|---------------|----------|
| 1.1 | Owner can invite themselves as member | medium | GitHub issue |
| 1.2 | assign-to-task does not verify target is project member | medium | GitHub issue |
| 1.3 | listUserProjects omits member-of projects | medium | GitHub issue |
| 2.1 | transferOwnership is non-atomic | medium | GitHub issue |
| 2.2 | transferOwnership missing old-owner duplicate guard | medium | GitHub issue |
| 2.3 | Wrong error tag in updateMemberRole (CannotRemoveOwner) | trivial | GitHub issue (low effort) |
| 2.4 | removeMember silently succeeds on 0-row delete | **day-zero** | Fixed in this branch |
| 3.1 | `let` mutation in update-task.ts | **day-zero** | Fixed in this branch |
| 3.2 | Lossy role mapping in adapter | medium | GitHub issue |
| 4.1 | No test: invite owner as member | trivial | GitHub issue |
| 4.2 | No test: self-transfer ownership | trivial | GitHub issue |
| 4.3 | No tests for permission checks in M1 use-cases | medium | GitHub issue |
| 4.4 | No auth guard test for deleteUserData | medium | GitHub issue |

## Day-Zero Fixes Applied

### 3.1 — `let` mutation in update-task.ts
**File:** `apps/api/src/use-cases/task/update-task.ts`

Replaced the `let validatedTitle` + imperative `if`-block with a `const titleResult` ternary
pattern that calls `validateTaskTitle` once and uses optional chaining to extract the value.
No behavior change — the early-return guard on `isErr()` is preserved.

### 2.4 — removeMember silent success on 0-row delete
**File:** `apps/api/src/adapters/db/drizzle-project-member-repository.ts`

Changed `.delete().where(...).map(() => undefined)` to `.delete().where(...).returning()`
followed by an `.andThen` that returns `errAsync(infrastructureError(...))` when `rows.length === 0`.
This closes the TOCTOU window: if the row was already deleted concurrently, the caller receives
an `InfrastructureError` instead of a silent `Ok`.

## Discards

None — all trivial findings were promoted to GitHub issues because they are genuine
(untested behavior, wrong error tag) and low-effort to track.

## GitHub Issues Created

| # | Issue | URL |
|---|-------|-----|
| 1.1 | Owner can invite themselves as member | https://github.com/VIXXENT/Voiler/issues/102 |
| 1.2 | assign-to-task missing assignee membership check | https://github.com/VIXXENT/Voiler/issues/103 |
| 1.3 | listUserProjects omits member-of projects | https://github.com/VIXXENT/Voiler/issues/104 |
| 2.1 | transferOwnership non-atomic | https://github.com/VIXXENT/Voiler/issues/105 |
| 2.2 | transferOwnership missing old-owner duplicate guard | https://github.com/VIXXENT/Voiler/issues/106 |
| 2.3 | Wrong error tag in updateMemberRole | https://github.com/VIXXENT/Voiler/issues/107 |
| 3.2 | Lossy role mapping in adapter | https://github.com/VIXXENT/Voiler/issues/108 |
| 4.1–4.4 | Missing test coverage (M2 permission paths + M1 upgrades) | https://github.com/VIXXENT/Voiler/issues/109 |
