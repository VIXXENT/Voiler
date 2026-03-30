# Project Management

## GitHub Projects Board

URL: https://github.com/users/VIXXENT/projects/2

All planned work is tracked as GitHub Issues. The board is the single source of truth
for prioritization.

## Session Workflow

Each working session follows this sequence:

1. **Check open issues** — review the backlog, identify the highest-priority unblocked item.
2. **Create a branch** — one branch per issue: `feature/#N-description` or `fix/#N-description`.
3. **Work incrementally** — comment progress on the issue, check off checklist items.
4. **Create a PR** — link to the issue (`Closes #N`). Description should summarize what
   changed and why.
5. **Close the issue** — merge the PR; the issue closes automatically via the link.

## Branch Naming

```
feature/#5-e2e-tests
fix/#12-auth-redirect-loop
```

Pattern: `{type}/#N-{short-description}` where `N` is the issue number.

## Labels

### Epic (scope)
| Label | Scope |
|-------|-------|
| `epic:auth` | Authentication and session management |
| `epic:frontend` | React app, UI components |
| `epic:backend` | Apollo Server, resolvers, use-cases |
| `epic:testing` | E2E, unit tests, test infrastructure |
| `epic:devops` | CI/CD, deployment, infrastructure |
| `epic:dx` | Developer experience, tooling, docs |

### Priority
| Label | Meaning |
|-------|---------|
| `priority:critical` | Blocking — must be resolved immediately |
| `priority:high` | Next in queue after critical |
| `priority:medium` | Normal backlog |
| `priority:low` | Nice to have |

### Type
| Label | Meaning |
|-------|---------|
| `type:feature` | New functionality |
| `type:bug` | Something broken |
| `type:tech-debt` | Refactor, cleanup, no new behavior |
| `type:infra` | CI, deployment, tooling |

## Creating New Issues

If unplanned work is discovered during a session, **create an issue before starting it**.

Minimum fields:
- Title: clear action verb + subject (`Add Argon2 adapter for password hashing`)
- Labels: at least one `epic:*`, one `priority:*`, one `type:*`
- Description: context, acceptance criteria, and any checklist of sub-tasks

## Multi-Agent Workflow

`_agents/` folder contains agent definitions and plans for parallel development.
Multiple agents can work simultaneously on independent issues (different packages or apps)
without merge conflicts if they follow branch-per-issue discipline.

Agents communicate via:
- GitHub Issues (shared state, progress comments)
- PR descriptions (handoff notes)
- `_agents/` plan files (task decomposition)

When dispatching parallel agents, assign each agent to a different leaf of the
dependency graph to avoid overlapping writes.
