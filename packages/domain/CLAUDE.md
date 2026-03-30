# @gemtest/domain

Pure domain layer — entities, value objects, and domain errors. Zero runtime dependencies.

## Purpose

Defines the business model in TypeScript using branded types and discriminated unions.
This package has no dependencies on infrastructure, frameworks, or ORMs.
It is the innermost layer of the hexagonal architecture — nothing here imports from other workspace packages.

## Source layout

```
src/
  entities/
    user.ts                # UserEntity — readonly type with branded UserId + Email fields
  value-objects/
    email.ts               # Email branded type + validation guard
    password.ts            # Password branded type (raw string, not hashed)
    user-id.ts             # UserId branded type (cuid2 string)
  errors/
    domain-error.ts        # DomainError — tagged union with 5 variants
  types/
    brand.ts               # Brand<T, B> utility type for nominal typing
  index.ts                 # Barrel re-exports
```

## Domain error variants

`DomainError` is a discriminated union (tag: `_tag`):
- `UserNotFound` — lookup by id or email returned nothing
- `UserAlreadyExists` — email collision on create
- `InvalidCredentials` — wrong password or missing user on auth
- `InvalidEmail` — email failed format validation
- `InvalidPassword` — password failed strength/length rules

## Dependencies

- None (zero external or workspace runtime dependencies)
- `devDependencies`: TypeScript only

## Rules

- No `throw`, no `try/catch`, no `ResultAsync` — this layer only defines types.
- All entity fields are `readonly` — mutations produce new values via spread.
- Branded types enforce nominal typing: never bypass with `as UserId` casting.
- `DomainError` variants must use `_tag` as discriminant (not `type` or `kind`).
- Do not import from `@gemtest/core`, `@gemtest/schema`, or any app package.
- See root CLAUDE.md for global coding standards.
