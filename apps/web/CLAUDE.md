# apps/web

React + Vite + Tailwind CSS. Apollo Client for GraphQL.

## Architecture

- Apollo `HttpLink` points to `127.0.0.1:4000` (avoids DNS resolution latency).
- Integration with `@gemtest/ui` via pnpm workspaces.

## Auth (current: Mock)

- Mock Session in `App.tsx` local state for initial SPA development.
- Simulates admin user (`admin@gemtest.com`).
- `lib/auth.ts` contains Auth.js base config ready for migration.

## Auth (planned)

- Provider: CredentialsProvider → JWT-based sessions.
- OAuth: Google/GitHub (pending).

## Pending

- Real Dashboard components.
- OAuth configuration.
- E2E tests with Playwright (high priority).
