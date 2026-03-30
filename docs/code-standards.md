# Code Standards

All code, comments, logs, and technical documentation must be written in English.

## JSDoc

Every exported function must have a JSDoc block covering four fields:

```ts
/**
 * What this function does and WHY it exists (not just what).
 *
 * @param params - Destructured below; named params object pattern is mandatory.
 * @returns ResultAsync wrapping the success type and the error union.
 * @context Called by the GraphQL resolver after input validation.
 */
const createUser = async (params: CreateUserParams): ResultAsync<User, AppError> => {
  const { email, password } = params;
  // ...
};
```

- **What/Why**: explain intent and motivation, not mechanics.
- **@param**: one line per param; describe shape for objects.
- **@returns**: describe the success value and what errors are possible.
- **@context**: where/when this function is called (caller context).

## Naming

| Thing | Convention | Example |
|-------|-----------|---------|
| Table, model, Zod schema | Singular PascalCase | `User`, `AuthSession` |
| Files | kebab-case | `create-user.ts` |
| Variables, functions | camelCase | `getUserById` |
| Types / Interfaces | PascalCase | `CreateUserParams` |
| Constants | SCREAMING_SNAKE if truly constant | `MAX_RETRIES` |

## Arrow Functions

Arrow functions are mandatory for:
- React components
- All internal logic functions
- Callbacks and closures

```ts
// Correct
const hashPassword = (params: HashParams): ResultAsync<string, AppError> => { ... };

// Incorrect
function hashPassword(params: HashParams) { ... }
```

## Immutability

- Use `const` over `let` at all times.
- Never mutate objects or arrays. Use spread and functional methods:

```ts
// Correct
const updated = { ...user, email: newEmail };
const names = users.map((u) => u.name);

// Incorrect
user.email = newEmail;
users.push(newUser);
```

## Complexity

- Maximum **3 levels of indentation**.
- Low cyclomatic complexity: extract functions rather than nesting conditionals.
- Prefer early returns over else branches.

## Type Management

### Definitions

Parameter types must be defined separately, never inline:

```ts
// Correct
type CreateUserParams = { email: string; password: string };
const createUser = (params: CreateUserParams) => {
  const { email, password } = params;
};

// Incorrect
const createUser = ({ email, password }: { email: string; password: string }) => { ... };
```

### Extraction over Manual Re-definition

```ts
// Prefer
type UseCaseParams = Parameters<typeof createUser>[0];
type UserName = User['name'];

// Avoid
type UseCaseParams = { email: string; password: string }; // duplicated
```

### Annotations

Annotate only when it adds information beyond what TypeScript infers:

```ts
// Correct — inference is enough
const count = 0;

// Correct — annotation clarifies the return contract
const findUser = (id: UserId): ResultAsync<User, AppError> => { ... };

// Incorrect — widening the type to hide real shape
const data: any = response;
```

- `any` is **forbidden**.
- Casting (`as any`, `as unknown`, `as string`) is **forbidden**.
- Resolve type errors at the root using type guards or advanced types.

### Return Types

- **Required** on all exported or public functions.
- **Optional** on internal functions where inference is unambiguous.

### Location

- Centralized in `packages/schema` or `*.types.ts` files.
- Exception: types used by a single function live directly above that function.

## Linting

Run after every intervention:

```sh
npm run lint -- --fix
```
