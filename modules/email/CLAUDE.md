# email module

Stub implementation of transactional email via SMTP.

## Status

This module is a **stub** — all service methods return `okAsync(...)` values
without real SMTP integration. Activate it via `init-project` to wire up
real SMTP credentials and replace stubs with live adapters.

## Environment Variables

| Variable     | Description                  |
| ------------ | ---------------------------- |
| `SMTP_HOST`  | SMTP server hostname         |
| `SMTP_PORT`  | SMTP server port (e.g. 587)  |
| `SMTP_USER`  | SMTP authentication username |
| `SMTP_PASS`  | SMTP authentication password |
| `EMAIL_FROM` | Default sender address       |

## Activation

Run `pnpm init-project` and select the `email` module to:

1. Add env vars to `.env`
2. Replace stub service with real nodemailer/SMTP adapter
3. Register service in the API container

## Structure

- `src/types.ts` — domain interfaces (no infrastructure deps)
- `src/service.ts` — IEmailService interface + stub factory
- `src/index.ts` — barrel re-exports
