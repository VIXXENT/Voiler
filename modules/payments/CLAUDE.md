# payments module

Stub implementation of Stripe payment processing.

## Status

This module is a **stub** — all service methods return `okAsync(...)` values
without real Stripe integration. Activate it via `init-project` to wire up
real Stripe credentials and replace stubs with live adapters.

## Environment Variables

| Variable                | Description                                    |
| ----------------------- | ---------------------------------------------- |
| `STRIPE_SECRET_KEY`     | Stripe secret key (sk*live*... or sk*test*...) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret                  |

## Activation

Run `pnpm init-project` and select the `payments` module to:

1. Add env vars to `.env`
2. Replace stub service with real Stripe adapter
3. Register router in the API container

## Structure

- `src/types.ts` — domain interfaces (no infrastructure deps)
- `src/service.ts` — IPaymentService interface + stub factory
- `src/index.ts` — barrel re-exports
