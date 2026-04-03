# Plan E-Modules: Init Script + Module System

## Goal

Add an interactive init script that transforms the Voiler boilerplate into a named project, and two optional module placeholders (payments, email) using code markers for zero-coupling activation/removal.

## Architecture

### Module System

Each module lives in `modules/<name>/` and exports domain logic only (services, interfaces). tRPC procedures that consume the module live in `apps/api/src/trpc/procedures/` behind code markers. This follows the hexagonal pattern: modules are domain + ports, the API layer is the adapter.

**Code markers** are comment lines in existing files that reference a module:

```ts
// [MODULE:payments] import { paymentRouter } from './payments'
```

- Commented = disconnected (default in boilerplate)
- The init script either uncomments (activate) or deletes (remove) the line
- Deterministic: no code generation, no AST manipulation

**Marker locations:**

- `apps/api/src/trpc/router.ts` — merge module routers
- `apps/api/src/trpc/procedures/` — module-specific procedure files (created by markers or kept/deleted)
- `apps/api/src/container.ts` — wire module services
- `.env.example` — module env vars
- `docker-compose.yml` — module services (if any)
- `docker-compose.prod.yml` — module services (if any)

### Module: payments (stub)

```
modules/payments/
  module.json
  CLAUDE.md
  src/
    index.ts           # Barrel export
    service.ts         # IPaymentService interface + stub implementation
    types.ts           # CheckoutSession, PaymentEvent types
```

`module.json`:

```json
{
  "name": "payments",
  "description": "Stripe payment processing (checkout sessions, webhooks)",
  "envVars": ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"]
}
```

tRPC procedures (in `apps/api/src/trpc/procedures/payments.ts`, behind marker):

- `payments.createCheckout` — authedProcedure, calls paymentService.createCheckout
- `payments.webhook` — publicProcedure, verifies Stripe signature, processes event

### Module: email (stub)

```
modules/email/
  module.json
  CLAUDE.md
  src/
    index.ts           # Barrel export
    service.ts         # IEmailService interface + stub (console.log in dev)
    types.ts           # EmailMessage, EmailResult types
```

`module.json`:

```json
{
  "name": "email",
  "description": "Transactional email via SMTP (Resend, Postmark, or raw SMTP)",
  "envVars": ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM"]
}
```

tRPC procedures (in `apps/api/src/trpc/procedures/email.ts`, behind marker):

- `email.send` — adminProcedure, calls emailService.send (admin-only for direct send)

### Init Script

`scripts/create-project.ts` — TypeScript + @inquirer/prompts

**Flow:**

1. Prompt: scope name (text input, npm scope validation `@[a-z0-9-]+`)
2. Prompt: modules to include (checkbox: payments, email)
3. Rename `@voiler/*` to `@<scope>/*` in all relevant files
4. Activate selected modules (uncomment their code markers)
5. Remove unselected modules (delete marker lines + `modules/<name>/` directory)
6. Update `.env.example` (add/remove module env vars)
7. Clean boilerplate artifacts (docs/superpowers/, docs/reviews/, scripts/\*.sh)
8. Run `pnpm install` to regenerate lockfile

**Files touched by rename:**

- All `package.json` files (name, dependencies, devDependencies)
- `pnpm-workspace.yaml`
- All TypeScript imports using `@voiler/`
- `tsconfig.json` references
- `turbo.json` (if any package-specific config)
- `docker-compose*.yml` (container names)
- `CLAUDE.md`, `AGENTS.md`, `llms.txt`

**Script registered as:** `"init-project": "tsx scripts/create-project.ts"` in root `package.json`

## Design Decisions

1. **Modules export domain logic, not routers** — follows hexagonal architecture. The module is reusable across transport layers. tRPC procedures live in the API app.

2. **Code markers over code generation** — deterministic, no AST. A commented line is either uncommented or deleted. No intermediate state.

3. **Two modules only** — payments and email demonstrate the pattern without bloat. More modules are trivial to add once the pattern exists.

4. **Admin module is NOT optional** — it's core functionality (impersonation, user management) that every project needs.

5. **No GitHub repo creation** — the developer knows `gh repo create`. The init script focuses on tedious/error-prone tasks.

6. **No directory copy** — GitHub "Use this template" handles this natively.
