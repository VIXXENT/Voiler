# M2: Memberships + Permissions -- Milestone Review

**Reviewer:** Claude Opus 4.6 (Senior Code Review)
**Date:** 2026-04-09
**Branch:** feat/taskforge
**Verification:** lint 0 errors, typecheck 0 errors, 117/117 tests passing

---

## 1. Security Issues

### 1.1 Owner can invite themselves as a member (invite-to-project.ts:51)

The use case checks `project.ownerId !== userId` to gate permissions but never checks
`targetUserId === project.ownerId`. The owner can invite themselves, creating a redundant
membership row. This is not a privilege escalation but creates confusing state: the owner
would appear as both owner and a member/viewer in the `project_member` table.

**File:** `apps/api/src/use-cases/project/invite-to-project.ts:60-66`

### 1.2 assign-to-task does NOT verify target user is a project member (assign-to-task.ts)

The `assignToTask` use case checks that the **caller** (`userId`) has mutate permission
on the project, but never checks that the **target** (`targetUserId`) is a member of the
project. This means any authenticated member can assign a task to any user ID in the
system -- even users who have no access to the project.

**File:** `apps/api/src/use-cases/task/assign-to-task.ts:51-104`

### 1.3 listUserProjects only returns owned projects, not member-of projects

`listUserProjects` calls `projectRepository.findByOwner({ ownerId: userId })` and
returns only projects the user owns. After M2, users can be members of projects they
don't own, but there is no way for them to discover those projects. This is a functional
gap -- members invited to a project have no endpoint to list projects they belong to.

**File:** `apps/api/src/use-cases/project/list-user-projects.ts:30`

---

## 2. Business Logic Issues

### 2.1 transferOwnership is non-atomic with dangerous intermediate states (transfer-ownership.ts:64-81)

The transfer does 3 sequential mutations: `removeMember(newOwner)` -> `addMember(oldOwner)` ->
`update(project.ownerId)`. If `addMember` fails after `removeMember` succeeds, the new owner
has been removed from the members table but is not yet the project owner. The project is left
in an inconsistent state.

The JSDoc acknowledges this (`@remarks`), which is good. However, the intermediate state is
specifically dangerous: the new owner loses all access.

**File:** `apps/api/src/use-cases/project/transfer-ownership.ts:64-81`

### 2.2 transferOwnership does not check whether old owner already has a membership row

At line 67-74, the use case calls `addMember` for the old owner without first checking if
the old owner already has a membership record (which should be impossible in normal flow but
could occur from a previous partial failure). If a membership already exists, the DB unique
constraint would cause an infrastructure error rather than a clean domain error.

**File:** `apps/api/src/use-cases/project/transfer-ownership.ts:67-74`

### 2.3 updateMemberRole reuses cannotRemoveOwner error for a non-removal scenario (update-member-role.ts:57)

When the owner tries to change their own role, the error is
`cannotRemoveOwner('Cannot change the role of the project owner')`. The error tag
`CannotRemoveOwner` is semantically incorrect -- the user is not trying to remove
anyone. A more accurate error would be `insufficientPermission` or a dedicated
`CannotChangeOwnerRole` error.

**File:** `apps/api/src/use-cases/project/update-member-role.ts:57`

### 2.4 removeMember silently succeeds if DB delete affects 0 rows (drizzle adapter)

In `drizzle-project-member-repository.ts:58-69`, `removeMember` calls `.delete().where(...)`
and maps the result to `undefined` regardless of how many rows were actually deleted. If the
row was concurrently deleted, the operation silently succeeds. The use case guards this with
a `findMembership` check beforehand, but there is a TOCTOU window.

**File:** `apps/api/src/adapters/db/drizzle-project-member-repository.ts:58-69`

---

## 3. Type Safety Issues

### 3.1 `let` mutation in update-task.ts:51

The code uses `let validatedTitle: string | undefined` and reassigns it inside an `if` block.
This violates the project mandate "const over let, no mutation" from CLAUDE.md.

**File:** `apps/api/src/use-cases/task/update-task.ts:51-58`

**Fix:** Extract title validation into its own early-return pattern or use a ternary with
`const`.

### 3.2 Adapter role mapping is lossy (drizzle-project-member-repository.ts:17)

```typescript
const role = row.role === 'viewer' ? row.role : 'member'
```

This coerces any unexpected DB role value to `'member'`. If the DB somehow contains a
corrupted or future role value, it would silently become `'member'` rather than surfacing
an error. This masks data integrity issues.

**File:** `apps/api/src/adapters/db/drizzle-project-member-repository.ts:17`

---

## 4. Test Coverage Gaps

### 4.1 No test for inviting the owner as a member

No test verifies what happens when `targetUserId === project.ownerId`. Related to issue 1.1.

### 4.2 No test for self-transfer in transferOwnership

No test covers the case where `userId === newOwnerId` (owner tries to transfer to
themselves). The current code would: find the owner's membership (null, since owners
are not in the members table), then return `MemberNotFound`. This is correct behavior
but untested.

### 4.3 No tests for upgraded M1 use-cases with permission checks

The task use-cases (`create-task`, `update-task`, `transition-task-status`, `delete-task`,
`assign-to-task`, `unassign-from-task`, `list-project-tasks`) and the project use-case
`get-project` were all upgraded with permission checks, but the existing test files for
these were not found or not updated for the new membership/permission paths. If their
pre-existing tests did not mock `memberRepository`, they may not be exercising the new
permission code.

### 4.4 No test for deleteUserData with no auth check

`deleteUserData` has no authorization check -- any userId can be passed in. This is
presumably intentional (admin/system operation), but there is no test verifying that
any userId works, and no guard preventing a regular user from calling it via the router.
Need to verify how it is exposed (does the tRPC router restrict it to admin?).

---

## 5. Code Standards

### 5.1 All exported functions have JSDoc -- PASS

Every exported factory function, interface, and mapper has JSDoc comments.

### 5.2 No semicolons -- PASS

Zero semicolons found in any of the reviewed files.

### 5.3 No `as` casting outside tests -- PASS

The only `as` usage found is in test files using `as unknown as 'member'` pattern,
which is the allowed exception.

### 5.4 Arrow functions only, max 1 param -- PASS

All functions follow the single-object-param pattern.

### 5.5 No `throw`/`try-catch` in business logic -- PASS

All error handling uses neverthrow throughout.

---

## 6. Architecture

### 6.1 Domain layer has zero infra imports -- PASS

`permission-validation.ts` and `member-validation.ts` only import from `neverthrow`
and sibling domain modules.

### 6.2 Port interface properly defined in core -- PASS

`IProjectMemberRepository` is defined in `packages/core` with all 7 methods returning
`ResultAsync`.

### 6.3 Container wiring is complete -- PASS

All 6 new use-cases and all 8 upgraded use-cases receive `memberRepository` in the
container.

### 6.4 Hexagonal boundaries maintained -- PASS

No infra leaks into domain or core. Adapter is the only file importing Drizzle.

---

## Summary of Findings

| #   | Issue                                                           | Location                                   |
| --- | --------------------------------------------------------------- | ------------------------------------------ |
| 1.1 | Owner can invite self as member                                 | invite-to-project.ts:60                    |
| 1.2 | assign-to-task does not verify target is project member         | assign-to-task.ts:94-104                   |
| 1.3 | listUserProjects does not include member-of projects            | list-user-projects.ts:30                   |
| 2.1 | transferOwnership non-atomic (acknowledged in JSDoc)            | transfer-ownership.ts:64-81                |
| 2.2 | transferOwnership does not guard old-owner duplicate membership | transfer-ownership.ts:67-74                |
| 2.3 | Wrong error tag (CannotRemoveOwner) for role-change scenario    | update-member-role.ts:57                   |
| 2.4 | removeMember silent success on 0-row delete (TOCTOU)            | drizzle-project-member-repository.ts:58-69 |
| 3.1 | `let` mutation violates project mandate                         | update-task.ts:51                          |
| 3.2 | Lossy role mapping masks data corruption                        | drizzle-project-member-repository.ts:17    |
| 4.1 | No test: invite owner as member                                 | invite-to-project.test.ts                  |
| 4.2 | No test: self-transfer ownership                                | transfer-ownership.test.ts                 |
| 4.3 | No tests for permission checks in upgraded M1 use-cases         | various test files                         |
| 4.4 | No auth guard test for deleteUserData                           | delete-user-data.test.ts                   |
