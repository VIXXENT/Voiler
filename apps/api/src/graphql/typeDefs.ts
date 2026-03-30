/**
 * GraphQL schema type definitions.
 *
 * Zod ↔ GraphQL alignment:
 *   type User        → packages/schema/src/entities/user.ts       :: UserSchema
 *   type Query.users → packages/schema/src/outputs/public-user.ts :: PublicUserSchema
 *   type Query.user  → packages/schema/src/outputs/public-user.ts :: PublicUserSchema
 *   Mutation.createUser args → packages/schema/src/inputs/create-user.ts :: CreateUserInputSchema
 *
 * Field mapping (UserSchema → GraphQL User):
 *   id            z.number().int().positive().optional()  → Int
 *   name          z.string().optional()                   → String
 *   email         z.string().email()                      → String!
 *   emailVerified z.date().optional()                     → String  (serialized ISO)
 *   image         z.string().url().optional()             → String
 *   role          z.string().default('user')              → String!
 *   createdAt     z.date().optional()                     → String  (serialized ISO)
 *
 * Fields intentionally excluded from GraphQL (sensitive / internal):
 *   password, twoFactorSecret, loginAttempts, lockUntil
 *
 * Sync tool: apps/api/src/graphql/schema-sync.ts
 */
export const typeDefs: string = `#graphql
  # Zod: UserSchema (packages/schema/src/entities/user.ts)
  # Exposed subset: PublicUserSchema (packages/schema/src/outputs/public-user.ts)
  type User {
    id: Int!
    name: String
    email: String!
    emailVerified: String
    image: String
    role: String!
    createdAt: String
  }

  type Query {
    health: String!
    users: [User!]!
    user(id: Int!): User
  }

  # createUser args: CreateUserInputSchema (packages/schema/src/inputs/create-user.ts)
  type Mutation {
    createUser(name: String, email: String!, password: String!): User!
  }
`
