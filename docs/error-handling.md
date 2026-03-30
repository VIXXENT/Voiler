# Error Handling

GemTest uses [neverthrow](https://github.com/supermacro/neverthrow) for explicit,
type-safe error handling. `throw` and `try/catch` are **forbidden** for business
logic or expected errors (DB failures, validation, auth).

## Core Rule

Every fallible function must return `Result<T, E>` (sync) or `ResultAsync<T, E>` (async).
Errors are values, not exceptions.

## Tagged Union Errors

Define error types as discriminated unions with a `tag` field:

```ts
// packages/domain/src/errors/domain-error.ts
type DomainError =
  | { tag: 'InvalidEmail'; message: string }
  | { tag: 'WeakPassword'; message: string }
  | { tag: 'UserNotFound'; id: string };

// packages/core/src/errors/app-error.ts
type AppError =
  | DomainError
  | { tag: 'DatabaseError'; cause: unknown }
  | { tag: 'HashingError'; cause: unknown }
  | { tag: 'TokenError'; cause: unknown }
  | { tag: 'Unauthorized' };
```

## Returning Results

Use `ok()` and `err()` from neverthrow:

```ts
import { ok, err, ResultAsync } from 'neverthrow';

const validateEmail = (raw: string): Result<Email, DomainError> => {
  if (!raw.includes('@')) {
    return err({ tag: 'InvalidEmail', message: `"${raw}" is not a valid email` });
  }
  return ok(raw as Email);
};
```

## Async Functions

Prefer `ResultAsync` with `await` for linear flow. Avoid deep `.andThen()` chains:

```ts
const authenticate = async (params: AuthParams): ResultAsync<Session, AppError> => {
  const { email, password } = params;

  const userResult = await userRepo.findByEmail(email);
  if (userResult.isErr()) return err(userResult.error);

  const user = userResult.value;
  const matchResult = await passwordService.verify({ hash: user.passwordHash, plain: password });
  if (matchResult.isErr()) return err(matchResult.error);

  if (!matchResult.value) return err({ tag: 'Unauthorized' });

  return tokenService.sign({ userId: user.id });
};
```

## Wrapping Infrastructure

Adapt Promise-based third-party libs with `fromPromise` or `fromThrowable`:

```ts
import { fromPromise } from 'neverthrow';

const findByEmail = (email: string): ResultAsync<User | null, AppError> =>
  fromPromise(
    db.select().from(userTable).where(eq(userTable.email, email)).get(),
    (cause) => ({ tag: 'DatabaseError' as const, cause }),
  );
```

## Exhaustive Handling

Use `.match()` or a `switch` on the `tag` at the boundary (resolver, HTTP handler):

```ts
// In a GraphQL resolver
const result = await authenticate(input);

return result.match(
  (session) => ({ token: session.token, user: session.user }),
  (error) => {
    switch (error.tag) {
      case 'Unauthorized':
        throw new GraphQLError('Invalid credentials', { extensions: { code: 'UNAUTHORIZED' } });
      case 'UserNotFound':
        throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
      case 'DatabaseError':
        throw new GraphQLError('Internal error', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
    }
  },
);
```

Throwing inside the resolver is acceptable because it is a **primary adapter boundary**,
not business logic. The GraphQL framework catches it and formats the response.

## What NOT to Do

```ts
// Forbidden — throws for expected flow
const getUser = async (id: string) => {
  const user = await db.find(id);
  if (!user) throw new Error('User not found'); // ← forbidden
  return user;
};

// Forbidden — hides errors
try {
  await doSomething();
} catch {
  // swallow
}
```
