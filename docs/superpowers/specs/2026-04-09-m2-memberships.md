# M2: Memberships + Permissions

## Goal

Add project membership roles (member/viewer) so that multiple users can collaborate on a project. Enforce role-based access on all project and task operations. Implement `transferOwnership` and cascade cleanup for `deleteUser`.

## New Table

**`project_member`** — `packages/schema/src/entities/project-member.ts`

- `id`: text PK
- `projectId`: text notNull FK→project.id cascade
- `userId`: text notNull
- `role`: text notNull ('member' | 'viewer')
- `joinedAt`: timestamp with timezone notNull
- Unique(projectId, userId)

> Note: The `owner` role is NOT stored in this table. Ownership lives on `project.ownerId`. Members are additional collaborators with reduced permissions.

## New Domain Errors

Add to `packages/domain/src/errors/domain-error.ts`:

```
| { readonly tag: 'MemberNotFound'; readonly message: string }
| { readonly tag: 'AlreadyMember'; readonly message: string }
| { readonly tag: 'CannotRemoveOwner'; readonly message: string }
| { readonly tag: 'NotAMember'; readonly message: string }
```

Factory functions in `packages/domain/src/errors/project-errors.ts`.

## Domain Validation

`packages/domain/src/validation/member-validation.ts`:

- `validateMemberRole({ role }): Result<'member' | 'viewer', DomainError>` — must be 'member' or 'viewer' (tag: `InvalidAssignment`)

## Port Interface

`packages/core/src/repositories/project-member.repository.ts`:

```typescript
interface ProjectMemberRecord {
  readonly id: string
  readonly projectId: string
  readonly userId: string
  readonly role: 'member' | 'viewer'
  readonly joinedAt: Date
}

interface CreateMemberData {
  readonly id: string
  readonly projectId: string
  readonly userId: string
  readonly role: 'member' | 'viewer'
  readonly joinedAt: Date
}

interface IProjectMemberRepository {
  addMember: (params: { data: CreateMemberData }) => ResultAsync<ProjectMemberRecord, AppError>
  removeMember: (params: { projectId: string; userId: string }) => ResultAsync<void, AppError>
  findByProject: (params: { projectId: string }) => ResultAsync<ProjectMemberRecord[], AppError>
  findMembership: (params: {
    projectId: string
    userId: string
  }) => ResultAsync<ProjectMemberRecord | null, AppError>
  updateRole: (params: {
    projectId: string
    userId: string
    role: 'member' | 'viewer'
  }) => ResultAsync<ProjectMemberRecord, AppError>
  deleteByProject: (params: { projectId: string }) => ResultAsync<void, AppError>
  deleteByUser: (params: { userId: string }) => ResultAsync<void, AppError>
}
```

## Permission Helper

`packages/domain/src/validation/permission-validation.ts`:

```typescript
type ProjectRole = 'owner' | 'member' | 'viewer'

/**
 * Determine a user's effective role on a project.
 * Owner if ownerId matches, member/viewer if in members, null if not affiliated.
 */
const resolveProjectRole: (params: {
  userId: string
  ownerId: string
  membership: ProjectMemberRecord | null
}) => ProjectRole | null

/**
 * Check if a role can perform a given action.
 * owner: all actions
 * member: read + mutate tasks + assign
 * viewer: read only
 */
const canPerformAction: (params: {
  role: ProjectRole
  action: 'read' | 'mutate' | 'admin'
}) => Result<void, DomainError> // tag: InsufficientPermission
```

## Drizzle Adapter

`apps/api/src/adapters/db/drizzle-project-member-repository.ts` — implements `IProjectMemberRepository`.

## Use-Cases

`apps/api/src/use-cases/project/`

**`invite-to-project.ts`**

- Params: `{ userId: string; projectId: string; targetUserId: string; role: 'member'|'viewer' }`
- Logic: findById project → notFound. Check userId is owner (`project.ownerId === userId`) → insufficientPermission. validateMemberRole. findMembership(targetUserId) → if exists, AlreadyMember. addMember.
- Returns: `ResultAsync<ProjectMemberRecord, AppError>`

**`remove-from-project.ts`**

- Params: `{ userId: string; projectId: string; targetUserId: string }`
- Logic: findById project → notFound. userId must be owner OR targetUserId === userId (self-remove). Cannot remove owner (`targetUserId === project.ownerId` → CannotRemoveOwner). findMembership(targetUserId) → if null, MemberNotFound. removeMember.
- Returns: `ResultAsync<void, AppError>`

**`list-project-members.ts`**

- Params: `{ userId: string; projectId: string }`
- Logic: findById project → notFound. Check userId is owner or has membership → notAMember if neither. findByProject.
- Returns: `ResultAsync<ProjectMemberRecord[], AppError>`

**`update-member-role.ts`**

- Params: `{ userId: string; projectId: string; targetUserId: string; newRole: 'member'|'viewer' }`
- Logic: findById project → notFound. userId must be owner. Cannot change owner's role (targetUserId === ownerId → CannotRemoveOwner). findMembership(targetUserId) → null → MemberNotFound. validateMemberRole. updateRole.
- Returns: `ResultAsync<ProjectMemberRecord, AppError>`

**`transfer-ownership.ts`**

- Params: `{ userId: string; projectId: string; newOwnerId: string }`
- Logic: findById project → notFound. userId must be owner. newOwnerId must have membership (findMembership → null → MemberNotFound). Update `project.ownerId = newOwnerId`. Remove newOwner from members table (they're now the owner). Add old owner as 'member'.
- Returns: `ResultAsync<ProjectRecord, AppError>`

**`delete-user-data.ts`** (called when a user account is deleted)

- Params: `{ userId: string }`
- Logic: deleteByUser in memberRepository. For projects owned by userId: find all, deleteWithCascade each. (Soft approach — real deletion policy TBD in M5.)
- Returns: `ResultAsync<void, AppError>`

## M1 Use-Case Permission Upgrades

Update these existing use-cases to check membership in addition to ownership:

- **`createTask`**: userId must be owner or member (not viewer)
- **`updateTask`**: owner or member
- **`transitionTaskStatus`**: owner or member
- **`deleteTask`**: owner or member
- **`assignToTask`**: owner or member
- **`unassignFromTask`**: owner or member
- **`listProjectTasks`**: owner, member, OR viewer (read access)
- **`getProject`**: owner, member, OR viewer

For all permission checks, inject `memberRepository` into affected use-cases and call `resolveProjectRole` + `canPerformAction`.

## Zod Schemas

`packages/schema/src/inputs/invite-to-project.ts` — `InviteToProjectInputSchema`
`packages/schema/src/inputs/update-member-role.ts` — `UpdateMemberRoleInputSchema`
`packages/schema/src/inputs/transfer-ownership.ts` — `TransferOwnershipInputSchema`
`packages/schema/src/outputs/public-project-member.ts` — `PublicProjectMemberSchema`

## tRPC Router

`apps/api/src/trpc/procedures/member.ts`:

- `invite` (mutation)
- `remove` (mutation)
- `list` (query)
- `updateRole` (mutation)
- `transferOwnership` (mutation)

Merge into root router + container.

## Tests

Unit tests for:

- All new validation functions
- All 5 new use-cases
- Updated M1 use-cases (permission paths)

## Verification After M2

```bash
pnpm --filter @voiler/api db:push
pnpm typecheck
pnpm test -- --run
pnpm lint
pnpm format:check
```
