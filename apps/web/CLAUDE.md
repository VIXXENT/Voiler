# @gemtest/web

React + Vite + Tailwind CSS frontend with Apollo Client and Auth.js (NextAuth v5).

## Purpose

Single-page application that consumes the GraphQL API.
Currently contains the core App.tsx shell and a full Playwright E2E suite.
The UI is in early stage — component extraction is pending (see issue #16).

## Source layout

```
src/
  App.tsx                  # Main component — auth state, GraphQL query, user list render
  main.tsx                 # React entry point, ApolloProvider wrapper
  index.css                # Tailwind base styles
  lib/
    apollo.ts              # ApolloClient instance (HttpLink → 127.0.0.1:4000/graphql)
  types/
    next-auth.d.ts         # Session type augmentation for Auth.js
e2e/
  auth.spec.ts             # Auth flow E2E tests (serial, real backend)
  smoke.spec.ts            # Smoke tests (app loads, GraphQL responds)
```

## Dependencies

**Workspace:**
- `@gemtest/schema` — shared types (PublicUser, AuthResponse)
- `@gemtest/ui` — shared component library

**External:**
- `@apollo/client` — GraphQL client
- `next-auth` (v5 beta) — Auth.js session management
- `react` + `react-dom` — UI framework
- `vite` + `@vitejs/plugin-react` — build tool
- `tailwindcss` — utility CSS
- `@playwright/test` — E2E test runner

## Rules

- Apollo `HttpLink` must point to `127.0.0.1:4000` (not `localhost`) to avoid DNS latency.
- E2E tests in `e2e/` run against a live stack — they require both `api` and `web` running.
- Do not add business logic to `App.tsx` — it is a composition shell only.
- Types imported from `@gemtest/schema`; do not redefine domain types locally.
- See root CLAUDE.md for global coding standards (typing, neverthrow, JSDoc).
