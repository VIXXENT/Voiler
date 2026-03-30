# @gemtest/config-env

Fail-fast environment variable validation using Zod, scoped by NODE_ENV.

## Purpose

Validates `process.env` against the appropriate Zod schema on startup.
If any required variable is missing or malformed, the process throws immediately with a clear
diagnostic message — the application must not boot with invalid configuration.
This is the one intentional use of `throw` in the codebase (unrecoverable startup error).

## Source layout

```
src/
  schema.ts      # BaseEnvSchema, ProductionEnvSchema, TestEnvSchema + exported types
  load-env.ts    # loadEnv() — selects schema by NODE_ENV, validates, returns typed config
  index.ts       # Barrel re-exports (loadEnv + all schema types)
```

## Schema hierarchy

| Schema                | Used when          | Extra requirements                        |
|-----------------------|--------------------|-------------------------------------------|
| `BaseEnvSchema`       | `development`      | PORT, DATABASE_URL, AUTH_SECRET, AUTH_URL |
| `TestEnvSchema`       | `test`             | DATABASE_URL defaults to `file::memory:`  |
| `ProductionEnvSchema` | `production`       | DATABASE_URL must be URL + Turso creds    |

## Exported types

- `EnvConfig` — union of all three schema inferred types (return type of `loadEnv`)
- `AnyEnvSchema` — union of the three Zod schema types (for `resolveSchema` return)
- `BaseEnvConfig`, `ProductionEnvConfig`, `TestEnvConfig` — individual inferred types

## Dependencies

**External:**
- `zod` — schema validation and type inference

## Rules

- `loadEnv()` is the only export consumers should call — do not import schemas directly from apps.
- `throw` in `load-env.ts` is intentional and the sole exception to the neverthrow rule.
- Do not add application-specific variables here — keep it to infrastructure/runtime config.
- All new environment variables must go into the appropriate schema (base or environment-specific).
- See root CLAUDE.md for global coding standards.
