# TaskForge — Implementation Context

This file provides everything needed to implement TaskForge on top of the Voiler boilerplate.

## Project State

**Boilerplate scope:** `@voiler` (not renamed)
**Payments module:** active (stub service wired in container)
**Email module:** removed

**Worktree:** `/home/vixx/Proyectos/voiler-taskforge` on branch `feat/taskforge`
**Origin repo:** `/home/vixx/Proyectos/voiler`

## What TaskForge Is

A project management SaaS with paid subscription plans. Built to stress-test every layer of the Voiler boilerplate.

## Design Spec

Full spec: `docs/superpowers/specs/2026-04-05-taskforge-design.md` and `-es.md`

## Coding Rules (from CLAUDE.md)

- **No semicolons**
- **Arrow functions only**, max 1 param (wrap in object)
- **`as` casting forbidden**
- **`throw`/`try-catch` forbidden** — use neverthrow `Result`/`ResultAsync`
- **Domain has zero infra imports** (hexagonal)
- **JSDoc** on all exported functions
- `const` over `let`, no mutation

## Codebase Patterns

**Table definition** (`packages/schema/src/entities/user.ts`):
- `pgTable('name', { col: text('col').notNull() })`
- `// eslint-disable-next-line @typescript-eslint/typedef` before every inferred `const`
- `createSelectSchema(Table)` + `createInsertSchema(Table, { overrides })` via drizzle-zod

**Use-case factory** (`apps/api/src/use-cases/user/create-user.ts`):
```typescript
export const createFoo: (deps: FooDeps) => (params: FooParams) => ResultAsync<FooResult, AppError>
= (deps) => (params) => { ... }
```

**Repository adapter** (`apps/api/src/adapters/db/drizzle-user-repository.ts`):
- `ResultAsync.fromPromise(db.query, errorMapper).andThen(...)`
- `okAsync(null)` for not-found
- `crypto.randomUUID()` for IDs

**tRPC procedure** (`apps/api/src/trpc/procedures/user.ts`):
- Factory: `createFooRouter(params) => ReturnType<typeof router>`
- `result.match(okFn, (error) => throwTrpcError({ error }))`
- Import `throwTrpcError` from `./user.js`

**Container** (`apps/api/src/container.ts`):
- Create adapters → create raw use-cases → wrap with `withAuditLog` → return

**Test pattern** (`apps/api/src/__tests__/use-cases/create-user.test.ts`):
```typescript
vi.mocked(repo.method).mockReturnValue(okAsync(fakeEntity))
const result = await useCase({ ... })
expect(result.isOk()).toBe(true)
```

## M1 Scope: Core Projects + Tasks CRUD

**No memberships, no plan limits in M1.** Those are M2 and M3.

### New Tables

**`project`**: id (text PK), name (text notNull), description (text?), ownerId (text notNull), status ('active'|'archived' default 'active'), frozen (bool default false), unfrozenAt (timestamp?), cooldownMinutes (int?), createdAt, updatedAt

**`task`**: id (text PK), projectId (text notNull), title (text notNull), description (text?), status ('todo'|'in_progress'|'done' default 'todo'), priority ('low'|'medium'|'high' default 'medium'), dueDate (timestamp?), createdBy (text notNull), createdAt, updatedAt

**`task_assignee`**: id (text PK), taskId (text notNull FK→task.id cascade), userId (text notNull), role ('responsible'|'reviewer'|'collaborator'), assignedAt. Unique(taskId, userId).

### Domain Validation (pure functions → `Result<T, DomainError>`)

`packages/domain/src/validation/project-validation.ts`:
- `validateProjectName({ name })` — trim, non-empty, max 100 → `Result<string, DomainError>` (tag: `InvalidProjectName`)

`packages/domain/src/validation/task-validation.ts`:
- `validateTaskTitle({ title })` — trim, non-empty, max 200 → (tag: `InvalidTaskTitle`)
- `canTransitionStatus({ from, to })` — state machine: todo→in_progress, in_progress→done, done→in_progress, in_progress→todo (tag: `InvalidStatusTransition`)
- Export `type TaskStatus = 'todo' | 'in_progress' | 'done'`

`packages/domain/src/validation/assignment-validation.ts`:
- `canAssignResponsible({ currentResponsibleUserId, newUserId })` — max 1 responsible, same user is idempotent (tag: `InvalidAssignment`)

### New Domain Errors (add to `packages/domain/src/errors/domain-error.ts` union)

```typescript
| { readonly tag: 'ProjectNotFound'; readonly message: string }
| { readonly tag: 'TaskNotFound'; readonly message: string }
| { readonly tag: 'InvalidStatusTransition'; readonly message: string }
| { readonly tag: 'InvalidAssignment'; readonly message: string }
| { readonly tag: 'InsufficientPermission'; readonly message: string }
| { readonly tag: 'InvalidProjectName'; readonly message: string }
| { readonly tag: 'InvalidTaskTitle'; readonly message: string }
```

Create factory functions in `packages/domain/src/errors/project-errors.ts`.

### Port Interfaces (`packages/core/src/repositories/`)

**`IProjectRepository`**: create, findById, findByOwner, update, delete, countByOwner, deleteWithCascade

**`ITaskRepository`**: create, findById, findByProject (with `TaskFilters?: { status?, assigneeId?, priority? }`), update, delete, countByProject

**`ITaskAssigneeRepository`**: assign, unassign, findByTask, findResponsible, deleteByTask

**Record types use union literals** (not `string`):
- `ProjectRecord.status: 'active' | 'archived'`
- `TaskRecord.status: 'todo' | 'in_progress' | 'done'`
- `TaskRecord.priority: 'low' | 'medium' | 'high'`

### Drizzle Adapters (`apps/api/src/adapters/db/`)

- `drizzle-project-repository.ts` — implements `IProjectRepository`. `deleteWithCascade` uses `db.transaction()` to delete assignees → tasks → project atomically.
- `drizzle-task-repository.ts` — `findByProject` joins TaskAssignee when `assigneeId` filter set. `countByProject` uses `import { count } from 'drizzle-orm'` + `db.select({ value: count() })`.
- `drizzle-task-assignee-repository.ts` — implements `ITaskAssigneeRepository`.

### Use-Cases (`apps/api/src/use-cases/`)

**Project:**
- `createProject({ userId, name, description? })` — validate name → create → return record
- `getProject({ userId, projectId })` — find → ProjectNotFound if null
- `listUserProjects({ userId })` — findByOwner
- `archiveProject({ userId, projectId })` — find → check ownerId === userId → update status='archived'
- `deleteProject({ userId, projectId })` — find → check ownerId → deleteWithCascade

**Task:**
- `createTask({ userId, projectId, title, description?, priority?, dueDate? })` — validate title → find project → create
- `updateTask({ userId, taskId, title?, description?, priority?, dueDate? })` — validate title if provided → find task → update
- `transitionTaskStatus({ userId, taskId, newStatus })` — find task → canTransitionStatus → update
- `deleteTask({ userId, taskId })` — find task → deleteByTask assignees → delete task
- `listProjectTasks({ userId, projectId, filters? })` — find project → findByProject with filters
- `assignToTask({ userId, taskId, targetUserId, role })` — find task → if responsible, check canAssignResponsible → assign
- `unassignFromTask({ userId, taskId, targetUserId })` — find task → unassign

All mutating use-cases wrapped with `withAuditLog` in container.

### Zod Schemas (`packages/schema/src/`)

**Inputs:** create-project, create-task, update-task, transition-task-status, assign-task (AssignTask + UnassignTask schemas)

**Outputs:** public-project, public-task (client-safe, union literal status/priority)

### tRPC Routers

**`apps/api/src/trpc/procedures/project.ts`**: create, get, list, archive, delete — all `authedProcedure`

**`apps/api/src/trpc/procedures/task.ts`**: create, update, transition, delete, list, assign, unassign — all `authedProcedure`

**Update `mapErrorCode`** in `user.ts` to handle new error tags:
- ProjectNotFound, TaskNotFound → 'NOT_FOUND'
- InvalidStatusTransition, InvalidAssignment, InvalidProjectName, InvalidTaskTitle → 'BAD_REQUEST'
- InsufficientPermission → 'FORBIDDEN'

**Merge into root router** (`apps/api/src/trpc/router.ts`).

### Container Wiring

Extend `apps/api/src/container.ts` with all 3 repos and 12 use-cases.

### DB Schema Re-exports

Add `Project, Task, TaskAssignee` to `apps/api/src/db/schema.ts`.

## TDD Approach

Every task follows: write failing test → run → fail → implement → run → pass → commit.

Tests go in `apps/api/src/__tests__/use-cases/` and `packages/domain/src/__tests__/validation/`.

## Verification After M1

```bash
cd /home/vixx/Proyectos/voiler-taskforge
pnpm --filter @voiler/api db:push   # push schema to DB
pnpm typecheck                       # 0 errors
pnpm test -- --run                   # all pass
pnpm lint                            # 0 errors
pnpm format:check                    # clean
```

## After M1: 5 Review Fixes Already Identified

These should be applied after M1 is complete, in separate focused commits:

1. **Record union types** — `ProjectRecord.status: 'active' | 'archived'`, `TaskRecord.status: 'todo' | 'in_progress' | 'done'`, `TaskRecord.priority: 'low' | 'medium' | 'high'` (eliminates all `as` casts)
2. **SQL COUNT(*)** — use `import { count } from 'drizzle-orm'` in countByProject/countByOwner instead of fetching all rows
3. **FK constraints** — add `.references(() => Project.id, { onDelete: 'cascade' })` to task.projectId and task_assignee.taskId/userId
4. **Transaction in deleteWithCascade** — `db.transaction()` wrapping the 3-step cascade
5. **Missing tests** — update-task, delete-task, list-project-tasks, unassign-from-task unit tests

**Note:** Review fixes 1-4 can be incorporated directly during M1 implementation since we know about them upfront. Fix 5 (tests) is part of TDD so should be done inline.

## Next Milestones After M1

- **M2**: Memberships + Permissions (project_member table, owner protection, transferOwnership, deleteUser)
- **M3**: Subscriptions + Plan Limits + Stripe test mode + freeze/swap anti-abuse
- **M3.5**: Design System
- **M4**: Frontend (TanStack Start)
- **M5**: Polish, audit log, i18n
