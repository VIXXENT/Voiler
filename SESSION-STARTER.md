# TaskForge — Session Starter

Paste this at the start of each session to orient the agent.

---

## Context

You are implementing **TaskForge**, a project management SaaS built on top of the **Voiler boilerplate** to stress-test it. The goal is to build a complete, working SaaS and validate that every layer of the boilerplate functions correctly.

**Worktree:** `/home/vixx/Proyectos/voiler-taskforge` (branch `feat/taskforge`)
**Origin boilerplate:** `/home/vixx/Proyectos/voiler` (main branch)
**Full spec:** `docs/superpowers/specs/2026-04-05-taskforge-design.md`
**Implementation guide:** `TASKFORGE-CONTEXT.md` — READ THIS FIRST before starting any work.

Current state: Voiler boilerplate with payments active, email module removed. M1 not yet implemented.

---

## Coding Mandates (non-negotiable)

From `CLAUDE.md` — these apply to ALL code written:

- **No semicolons**
- **Arrow functions only**, max 1 param (wrap multiple params in an object)
- **`const` over `let`**, no mutation
- **`as` casting forbidden** — fix types instead
- **`any` forbidden**
- **`throw`/`try-catch` forbidden** for business logic — use neverthrow `Result`/`ResultAsync`
- **Hexagonal architecture** — domain has zero infra imports (`@voiler/domain` cannot import from `@voiler/core`, Drizzle, tRPC, etc.)
- **JSDoc** on all exported functions
- **English** for all code, comments, and commits
- `// eslint-disable-next-line @typescript-eslint/typedef` before every `const` that infers its type from a function call (pgTable, z.object, createSelectSchema, etc.)

---

## Development Process

### One subagent per task

Use `superpowers:subagent-driven-development`. Each task gets a **fresh subagent** with:
- Full task text from the plan
- Relevant context (patterns, file paths, existing code)
- No access to conversation history

### TDD on every feature

Red → Green → Refactor. Write the failing test first, run it to confirm it fails, then implement.

### After each task: two-stage review

1. **Spec reviewer** — verifies the implementation matches what was requested (nothing more, nothing less). Read the actual code, don't trust the implementer's report.
2. **Code quality reviewer** — checks coding standards, smell, security, test coverage.

Fix all issues before marking the task complete and moving to the next one.

### Double Agent Review at each milestone

After completing a milestone (M1, M2, etc.):
1. **Reviewer Agent** — thorough analysis: bugs, code smells, standard violations, edge cases, security
2. **Triager Agent** — evaluates each finding: category, urgency, priority. Decides: fix immediately OR create GitHub issue with epic

---

## Voiler Mirror Rule

**Critical:** Any bug, gap, or improvement found in TaskForge whose root cause is in the Voiler boilerplate must be handled in BOTH places:

1. **Fix it in TaskForge** (the worktree)
2. **Create a GitHub issue in Voiler** to track fixing it in the original boilerplate

### Creating Voiler issues

Use `gh` CLI from `/home/vixx/Proyectos/voiler`:

```bash
cd /home/vixx/Proyectos/voiler
gh issue create \
  --title "fix: <short description>" \
  --body "**Found while building TaskForge.**

**Problem:** <what the issue is>

**Impact:** <what breaks or could break>

**Fix applied in TaskForge:** <what was done in voiler-taskforge>

**Suggested fix for Voiler:** <what should be done in the boilerplate>" \
  --label "bug,taskforge-finding" \
  --assignee "@me"
```

If the label `taskforge-finding` doesn't exist, create it first:
```bash
gh label create "taskforge-finding" --color "#e4e669" --description "Found while building TaskForge stress-test"
```

Likewise, improvements or new patterns discovered during TaskForge that would benefit the boilerplate should be tracked as `enhancement` issues.

---

## Verification Commands

Run after every milestone (and after every Double Agent Review fix):

```bash
cd /home/vixx/Proyectos/voiler-taskforge
pnpm typecheck          # 0 errors across all packages
pnpm test -- --run      # all tests pass
pnpm lint               # 0 errors
pnpm format:check       # all files formatted
```

For DB changes: `pnpm --filter @voiler/api db:push`

---

## Current Task: Implement M1

Read `TASKFORGE-CONTEXT.md` fully, then implement M1 using `superpowers:subagent-driven-development`.

The 5 review fixes already identified for M1 (union literal types, SQL COUNT, FK constraints, transaction in deleteWithCascade, missing tests) should be incorporated **during** M1 implementation — not as a separate pass afterward. Specifically:
- Use union literal types in `ProjectRecord` and `TaskRecord` from the start
- Use `count()` from drizzle-orm in countByProject/countByOwner
- Add FK `.references()` to task and task_assignee tables
- Implement `deleteWithCascade` using `db.transaction()` from the start
- Write tests for ALL use-cases including update-task, delete-task, list-project-tasks, unassign-from-task
