# Plan E-Modules: Init Script + Module System

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add two optional module placeholders (payments, email) with code markers, and an interactive init script to customize the boilerplate.

**Architecture:** Modules export domain logic only. tRPC procedures live in the API app behind code markers. Init script uses @inquirer/prompts for interactive CLI.

**Tech Stack:** TypeScript, @inquirer/prompts, tsx

---

### Task EM-1: Module Scaffolds (payments + email)

**Files:**

- Create: `modules/payments/module.json`
- Create: `modules/payments/CLAUDE.md`
- Create: `modules/payments/src/index.ts`
- Create: `modules/payments/src/types.ts`
- Create: `modules/payments/src/service.ts`
- Create: `modules/email/module.json`
- Create: `modules/email/CLAUDE.md`
- Create: `modules/email/src/index.ts`
- Create: `modules/email/src/types.ts`
- Create: `modules/email/src/service.ts`

**payments/module.json:**

```json
{
  "name": "payments",
  "description": "Stripe payment processing (checkout sessions, webhooks)",
  "envVars": ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"]
}
```

**payments/src/types.ts:**

```ts
/** Checkout session request. */
interface CreateCheckoutParams {
  readonly userId: string
  readonly priceId: string
  readonly successUrl: string
  readonly cancelUrl: string
}

/** Checkout session result. */
interface CheckoutSession {
  readonly id: string
  readonly url: string
}

/** Stripe webhook event (simplified). */
interface PaymentEvent {
  readonly type: string
  readonly data: Record<string, unknown>
}

export type { CheckoutSession, CreateCheckoutParams, PaymentEvent }
```

**payments/src/service.ts:**

```ts
import type { ResultAsync } from 'neverthrow'
import { ok } from 'neverthrow'
import type { AppError } from '@voiler/core'
import type { CheckoutSession, CreateCheckoutParams, PaymentEvent } from './types.js'

/** Port interface for payment processing. */
interface IPaymentService {
  readonly createCheckout: (params: CreateCheckoutParams) => ResultAsync<CheckoutSession, AppError>
  readonly handleWebhook: (params: {
    payload: string
    signature: string
  }) => ResultAsync<PaymentEvent, AppError>
}

/**
 * Stub payment service for development.
 * Replace with real Stripe implementation.
 */
const createStubPaymentService = (): IPaymentService => ({
  createCheckout: (params) =>
    ok({
      id: `cs_stub_${Date.now()}`,
      url: `${params.successUrl}?session_id=cs_stub`,
    }) as unknown as ResultAsync<CheckoutSession, AppError>,
  handleWebhook: (params) =>
    ok({
      type: 'payment_intent.succeeded',
      data: { signature: params.signature },
    }) as unknown as ResultAsync<PaymentEvent, AppError>,
})

export { createStubPaymentService }
export type { IPaymentService }
```

**payments/src/index.ts:**

```ts
export { createStubPaymentService } from './service.js'
export type { IPaymentService } from './service.js'
export type { CheckoutSession, CreateCheckoutParams, PaymentEvent } from './types.js'
```

**payments/CLAUDE.md:**

```markdown
# Payments Module

Optional Stripe payment processing module.

## Status: Stub

This module provides interfaces and a stub implementation. Replace `createStubPaymentService` with a real Stripe adapter for production.

## Activation

Activated via `pnpm init-project` when the user selects the payments module. Code markers `[MODULE:payments]` in the API app wire this module into the tRPC router and DI container.

## Environment Variables

- `STRIPE_SECRET_KEY` — Stripe secret API key
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
```

**email/module.json:**

```json
{
  "name": "email",
  "description": "Transactional email via SMTP (Resend, Postmark, or raw SMTP)",
  "envVars": ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM"]
}
```

**email/src/types.ts:**

```ts
/** Email message to send. */
interface EmailMessage {
  readonly to: string
  readonly subject: string
  readonly html: string
  readonly text?: string
}

/** Result of sending an email. */
interface EmailResult {
  readonly messageId: string
  readonly accepted: readonly string[]
}

export type { EmailMessage, EmailResult }
```

**email/src/service.ts:**

```ts
import type { ResultAsync } from 'neverthrow'
import { ok } from 'neverthrow'
import type { AppError } from '@voiler/core'
import type { EmailMessage, EmailResult } from './types.js'

/** Port interface for email sending. */
interface IEmailService {
  readonly send: (params: EmailMessage) => ResultAsync<EmailResult, AppError>
}

/**
 * Stub email service for development.
 * Logs emails to console instead of sending.
 */
const createStubEmailService = (): IEmailService => ({
  send: (params) => {
    console.warn(`[EMAIL STUB] To: ${params.to} Subject: ${params.subject}`)
    return ok({
      messageId: `stub_${Date.now()}`,
      accepted: [params.to],
    }) as unknown as ResultAsync<EmailResult, AppError>
  },
})

export { createStubEmailService }
export type { IEmailService }
```

**email/src/index.ts:**

```ts
export { createStubEmailService } from './service.js'
export type { IEmailService } from './service.js'
export type { EmailMessage, EmailResult } from './types.js'
```

**email/CLAUDE.md:**

```markdown
# Email Module

Optional transactional email module.

## Status: Stub

This module provides interfaces and a stub implementation that logs to console. Replace `createStubEmailService` with a real SMTP/API adapter for production.

## Activation

Activated via `pnpm init-project` when the user selects the email module. Code markers `[MODULE:email]` in the API app wire this module into the tRPC router and DI container.

## Environment Variables

- `SMTP_HOST` — SMTP server hostname
- `SMTP_PORT` — SMTP server port
- `SMTP_USER` — SMTP auth username
- `SMTP_PASS` — SMTP auth password
- `EMAIL_FROM` — Default sender address
```

- [ ] Create all files as specified above
- [ ] Add `"modules/*"` to `pnpm-workspace.yaml` packages array
- [ ] Commit: `feat(modules): add payments and email module scaffolds`

---

### Task EM-2: Code Markers in Existing Files

**Files:**

- Modify: `apps/api/src/trpc/router.ts`
- Modify: `apps/api/src/container.ts`
- Modify: `.env.example`
- Create: `apps/api/src/trpc/procedures/payments.ts`
- Create: `apps/api/src/trpc/procedures/email.ts`

Insert code markers as commented lines. The module procedure files exist but are only wired in when markers are uncommented.

**apps/api/src/trpc/procedures/payments.ts** (always present, wired via marker):

```ts
import { z } from 'zod'

import type { IPaymentService } from '../../../../modules/payments/src/index.js'
import { authedProcedure, publicProcedure, router } from '../context.js'

interface CreatePaymentRouterParams {
  readonly paymentService: IPaymentService
}

/** tRPC router for payment operations. */
const createPaymentRouter = (params: CreatePaymentRouterParams) => {
  const { paymentService } = params

  return router({
    createCheckout: authedProcedure
      .input(
        z.object({
          priceId: z.string().min(1),
          successUrl: z.string().url(),
          cancelUrl: z.string().url(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const result = await paymentService.createCheckout({
          userId: ctx.user.id,
          ...input,
        })
        return result.match(
          (session) => session,
          (error) => {
            throw new Error(error.message)
          },
        )
      }),

    webhook: publicProcedure
      .input(
        z.object({
          payload: z.string(),
          signature: z.string(),
        }),
      )
      .mutation(async ({ input }) => {
        const result = await paymentService.handleWebhook(input)
        return result.match(
          (event) => ({ received: true, type: event.type }),
          (error) => {
            throw new Error(error.message)
          },
        )
      }),
  })
}

export { createPaymentRouter }
export type { CreatePaymentRouterParams }
```

**apps/api/src/trpc/procedures/email.ts** (always present, wired via marker):

```ts
import { z } from 'zod'

import type { IEmailService } from '../../../../modules/email/src/index.js'
import { adminProcedure, router } from '../context.js'

interface CreateEmailRouterParams {
  readonly emailService: IEmailService
}

/** tRPC router for email operations (admin only). */
const createEmailRouter = (params: CreateEmailRouterParams) => {
  const { emailService } = params

  return router({
    send: adminProcedure
      .input(
        z.object({
          to: z.string().email(),
          subject: z.string().min(1),
          html: z.string().min(1),
          text: z.string().optional(),
        }),
      )
      .mutation(async ({ input }) => {
        const result = await emailService.send(input)
        return result.match(
          (r) => ({ messageId: r.messageId }),
          (error) => {
            throw new Error(error.message)
          },
        )
      }),
  })
}

export { createEmailRouter }
export type { CreateEmailRouterParams }
```

**Markers to add in router.ts** (as comments after existing imports):

```ts
// [MODULE:payments] import type { CreatePaymentRouterParams } from './procedures/payments.js'
// [MODULE:payments] import { createPaymentRouter } from './procedures/payments.js'
// [MODULE:email] import type { CreateEmailRouterParams } from './procedures/email.js'
// [MODULE:email] import { createEmailRouter } from './procedures/email.js'
```

And in the router function body and interface, add commented entries:

```ts
// In CreateAppRouterParams interface:
// [MODULE:payments] readonly payment: CreatePaymentRouterParams
// [MODULE:email] readonly email: CreateEmailRouterParams

// In createAppRouter function body:
// [MODULE:payments] const paymentRouter = createPaymentRouter(params.payment)
// [MODULE:email] const emailRouter = createEmailRouter(params.email)

// In the router({}) call:
// [MODULE:payments] payment: paymentRouter,
// [MODULE:email] email: emailRouter,
```

**Markers to add in container.ts:**

```ts
// After existing imports:
// [MODULE:payments] import { createStubPaymentService } from '../../modules/payments/src/index.js'
// [MODULE:payments] import type { IPaymentService } from '../../modules/payments/src/index.js'
// [MODULE:email] import { createStubEmailService } from '../../modules/email/src/index.js'
// [MODULE:email] import type { IEmailService } from '../../modules/email/src/index.js'

// In Container interface:
// [MODULE:payments] readonly paymentService: IPaymentService
// [MODULE:email] readonly emailService: IEmailService

// In createContainer function body:
// [MODULE:payments] const paymentService = createStubPaymentService()
// [MODULE:email] const emailService = createStubEmailService()

// In return object:
// [MODULE:payments] paymentService,
// [MODULE:email] emailService,
```

**Markers in .env.example:**

```bash
# [MODULE:payments] Stripe
# [MODULE:payments] STRIPE_SECRET_KEY=
# [MODULE:payments] STRIPE_WEBHOOK_SECRET=

# [MODULE:email] Email (SMTP)
# [MODULE:email] SMTP_HOST=
# [MODULE:email] SMTP_PORT=587
# [MODULE:email] SMTP_USER=
# [MODULE:email] SMTP_PASS=
# [MODULE:email] EMAIL_FROM=noreply@example.com
```

- [ ] Create payments.ts and email.ts procedure files
- [ ] Insert markers in router.ts, container.ts, .env.example
- [ ] Verify lint + typecheck pass (markers are comments, should not affect)
- [ ] Commit: `feat(modules): add code markers for payments and email`

---

### Task EM-3: Init Script

**Files:**

- Create: `scripts/create-project.ts`
- Modify: `package.json` (add init-project script + @inquirer/prompts dep)

**Dependencies to install:** `@inquirer/prompts` (devDependency at root)

**Script structure:**

```ts
// scripts/create-project.ts
import { input, checkbox, confirm } from '@inquirer/prompts'
import { readFileSync, writeFileSync, rmSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { execSync } from 'node:child_process'

const ROOT = join(import.meta.dirname, '..')

// ── Helpers ──

/** Recursively find all files matching a filter. */
const findFiles = (params: { dir: string; filter: (path: string) => boolean }): string[] => { ... }

/** Read and replace text in a file. */
const replaceInFile = (params: { filePath: string; search: string | RegExp; replace: string }): void => { ... }

/** Process module markers: uncomment (activate) or delete (remove). */
const processMarkers = (params: { filePath: string; moduleName: string; action: 'activate' | 'remove' }): void => {
  // For 'activate': replace `// [MODULE:name] ` prefix with empty string (uncomment)
  // For 'remove': delete entire lines containing `// [MODULE:name]` or `# [MODULE:name]`
}

// ── Main ──

const main = async () => {
  console.log('\n🚀 Voiler Project Initializer\n')

  // 1. Scope name
  const scope = await input({
    message: 'Project scope (e.g. @myapp):',
    validate: (value) => /^@[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(value) || 'Must be a valid npm scope (@lowercase-with-dashes)',
  })

  // 2. Module selection
  const modules = await checkbox({
    message: 'Select modules to include:',
    choices: [
      { name: 'payments — Stripe checkout + webhooks', value: 'payments' },
      { name: 'email — Transactional SMTP email', value: 'email' },
    ],
  })

  // 3. Confirmation
  const confirmed = await confirm({
    message: `Initialize as ${scope} with modules: ${modules.length ? modules.join(', ') : 'none'}?`,
  })

  if (!confirmed) {
    console.log('Aborted.')
    return
  }

  // 4. Rename scope
  console.log(`\nRenaming @voiler/* → ${scope}/*...`)
  const filesToRename = findFiles({
    dir: ROOT,
    filter: (p) => !p.includes('node_modules') && !p.includes('.git') &&
      (p.endsWith('.json') || p.endsWith('.ts') || p.endsWith('.tsx') ||
       p.endsWith('.yaml') || p.endsWith('.yml') || p.endsWith('.md') ||
       p.endsWith('.txt') || p.endsWith('.mjs')),
  })
  for (const file of filesToRename) {
    replaceInFile({ filePath: file, search: /@voiler\//g, replace: `${scope}/` })
    replaceInFile({ filePath: file, search: /name: "voiler"/g, replace: `name: "${scope.slice(1)}"` })
  }
  // Also rename root package name
  replaceInFile({ filePath: join(ROOT, 'package.json'), search: '"voiler"', replace: `"${scope.slice(1)}"` })
  console.log('  done')

  // 5. Process modules
  const allModules = ['payments', 'email']
  for (const mod of allModules) {
    if (modules.includes(mod)) {
      console.log(`Activating module: ${mod}...`)
      // Find all files with markers and uncomment
      const markerFiles = findFiles({
        dir: ROOT,
        filter: (p) => !p.includes('node_modules') && !p.includes('.git'),
      })
      for (const file of markerFiles) {
        processMarkers({ filePath: file, moduleName: mod, action: 'activate' })
      }
    } else {
      console.log(`Removing module: ${mod}...`)
      // Delete marker lines from all files
      const markerFiles = findFiles({
        dir: ROOT,
        filter: (p) => !p.includes('node_modules') && !p.includes('.git'),
      })
      for (const file of markerFiles) {
        processMarkers({ filePath: file, moduleName: mod, action: 'remove' })
      }
      // Delete module directory
      rmSync(join(ROOT, 'modules', mod), { recursive: true, force: true })
      // Delete module procedure file
      rmSync(join(ROOT, 'apps/api/src/trpc/procedures', `${mod}.ts`), { force: true })
    }
    console.log('  done')
  }

  // 6. Clean boilerplate artifacts
  console.log('Cleaning boilerplate artifacts...')
  rmSync(join(ROOT, 'docs/superpowers'), { recursive: true, force: true })
  rmSync(join(ROOT, 'docs/reviews'), { recursive: true, force: true })
  for (const file of readdirSync(join(ROOT, 'scripts'))) {
    if (file.endsWith('.sh')) rmSync(join(ROOT, 'scripts', file), { force: true })
  }
  // Remove the init script itself
  rmSync(join(ROOT, 'scripts/create-project.ts'), { force: true })
  console.log('  done')

  // 7. Reinstall
  console.log('Running pnpm install...')
  execSync('pnpm install', { cwd: ROOT, stdio: 'inherit' })

  console.log(`\n✅ Project initialized as ${scope}\n`)
}

main()
```

- [ ] Install @inquirer/prompts: `pnpm add -Dw @inquirer/prompts`
- [ ] Create `scripts/create-project.ts` with the full implementation
- [ ] Add `"init-project": "tsx scripts/create-project.ts"` to root package.json scripts
- [ ] Test the script works (dry run or actual run in a temp copy)
- [ ] Commit: `feat(modules): add interactive init script`

---

### Task EM-4: Verification

- [ ] `pnpm lint` — 0 errors
- [ ] `pnpm typecheck` — 0 errors
- [ ] `pnpm test` — all passing
- [ ] `pnpm format:check` — all formatted
- [ ] Verify markers are invisible to lint/typecheck (they're comments)
- [ ] Commit any fixes
