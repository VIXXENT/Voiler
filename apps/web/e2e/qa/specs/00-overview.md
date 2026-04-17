# TaskForge — App Overview

## What is TaskForge?

TaskForge is a project management SaaS application. It allows individuals and teams to organize
their work by creating projects, managing tasks within those projects, and collaborating with team
members through a role-based invitation system.

## Core Concepts

### Users

Any person can register an account with their name, email address, and a password. Once registered
they can log in, manage their own projects, and be invited to other users' projects.

### Projects

A project is the top-level organizational unit. It has a name, an optional description, a status
(Active or Archived), and may be frozen (read-only). Every project has exactly one Owner — the
person who created it.

### Tasks

Tasks live inside a project. Each task has a title, an optional description, a priority level
(Low, Medium, or High), an optional due date, and a status that tracks its progress (To Do,
In Progress, Done).

### Members

A project can have multiple collaborators beyond the Owner. Each collaborator has a role:

- **Member** — can view and manage tasks
- **Viewer** — read-only access

Only the project Owner can invite new members, change their roles, or remove them.

### Plans

TaskForge operates on a freemium model:

| Feature      | Free Plan | Pro Plan  |
| ------------ | --------- | --------- |
| Projects     | 3 max     | Unlimited |
| Members/proj | 5 max     | Unlimited |
| Tasks/proj   | 50 max    | Unlimited |

When a Free plan user hits a limit, the app shows a clear error message explaining why the action
failed and how to upgrade.

## Application Structure

The app has two main zones:

1. **Public zone** (`/`, `/auth/login`, `/auth/register`) — accessible without authentication.
2. **Authenticated zone** (`/projects`, `/projects/:id/*`, `/billing`, `/settings`) — requires
   a logged-in session. Unauthenticated visitors are redirected to the login page.

## Navigation Skeleton

```
Home (/)
├── Login (/auth/login)
└── Register (/auth/register)

Authenticated shell (always shows sidebar)
├── Projects (/projects)
├── Project Detail (/projects/:id)
│   ├── Tasks tab     (/projects/:id)
│   ├── Members tab   (/projects/:id/members)
│   └── Settings tab  (/projects/:id/settings)
├── Billing (/billing)
└── Settings (/settings)
```

## Quality Bar

A well-functioning TaskForge should:

- Complete any single flow in no more than 3 clicks from the relevant starting page
- Show clear, readable error messages when something goes wrong (never silent failures)
- Never leave the user on a blank or broken page after an action
- Be usable without reading documentation — all controls should be self-explanatory
- Reflect state changes immediately after form submission (no need to manually refresh)
