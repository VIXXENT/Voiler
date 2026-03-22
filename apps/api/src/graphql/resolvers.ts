import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { type User, type CreateUserInput } from '@gemtest/schema'
import { type ApolloServer } from '@apollo/server'
import * as argon2 from 'argon2'
import { fromPromise, type Result } from 'neverthrow'
import { dbError, validationError, type AppError } from '../errors.js'
import { GraphQLError } from 'graphql'

type MapToGraphQLErrorFn = (error: AppError) => never

/**
 * Maps our domain errors to GraphQLError for Apollo Server.
 * @param error - The AppError from our domain logic.
 * @throws GraphQLError to be caught by the Apollo Server.
 */
const mapToGraphQLError: MapToGraphQLErrorFn = (error: AppError): never => {
  const code: string = error._tag.toUpperCase()
  throw new GraphQLError(error.message, {
    extensions: { code, ...error },
  })
}

/**
 * Common structure for GraphQL Resolver arguments.
 */
type ResolverArgs<T> = [unknown, T, unknown, unknown];

export type GetUserArgs = {
  readonly id: number
}

/**
 * Type Extraction for the resolvers structure.
 */
type ResolversType = ConstructorParameters<typeof ApolloServer>[0]['resolvers'];

/**
 * GraphQL resolvers using neverthrow for error handling.
 */
export const resolvers: ResolversType = {
  Query: {
    /**
     * Basic health check to verify API status.
     * @returns A string indicating the API is alive.
     */
    health: (): string => 'OK - API is alive',

    /**
     * Retrieves all users from the database.
     *
     * This query fetches the complete list of registered users. It uses a linear
     * flow with neverthrow to handle potential database connectivity issues.
     *
     * @returns A promise resolving to a list of User entities.
     * @throws GraphQLError if the database operation fails.
     */
    users: async (): Promise<User[]> => {
      const selectResult = await fromPromise(
        db.select().from(users),
        (e: unknown): AppError => dbError({
          message: 'Failed to fetch the list of users from the database',
          cause: e,
        }),
      )

      if (selectResult.isErr()) {
        return mapToGraphQLError(selectResult.error)
      }

      return selectResult.value as User[]
    },

    /**
     * Retrieves a single user by their unique identifier.
     *
     * @param params - Standard GraphQL resolver arguments [parent, args, context, info].
     * @returns A promise resolving to the User entity or null if not found.
     * @throws GraphQLError if the database operation fails.
     */
    user: async (...params: ResolverArgs<GetUserArgs>): Promise<User | null> => {
      const args: GetUserArgs = params[1]
      const { id }: GetUserArgs = args

      const selectResult = await fromPromise(
        db.select().from(users).where(eq(users.id, id)),
        (e: unknown): AppError => dbError({
          message: `Failed to fetch user with id ${id} from the database`,
          cause: e,
        }),
      )

      if (selectResult.isErr()) {
        return mapToGraphQLError(selectResult.error)
      }

      const results: User[] = selectResult.value as User[]
      return results[0] || null
    },
  },
  Mutation: {
    /**
     * Creates a new user with a hashed password.
     *
     * This resolver handles the user registration process, validating the input,
     * hashing the password using argon2, and persisting the record in the database.
     * It uses a linear flow with neverthrow for robust error handling.
     *
     * @param params - Standard GraphQL resolver arguments [parent, args, context, info].
     * @returns A promise resolving to the newly created User entity.
     * @throws GraphQLError if any step of the process fails.
     */
    createUser: async (...params: ResolverArgs<CreateUserInput>): Promise<User> => {
      const args: CreateUserInput = params[1]
      const { name, email, password } = args

      // 1. Validate password existence
      if (!password) {
        return mapToGraphQLError(validationError({
          field: 'password',
          message: 'Password is required to create an account',
        }))
      }

      // 2. Hash the user password
      const hashResult: Result<string, AppError> = await fromPromise(
        argon2.hash(password),
        (e: unknown): AppError => dbError({
          message: 'Failed to securely hash the user password',
          cause: e,
        }),
      )
      if (hashResult.isErr()) {
        return mapToGraphQLError(hashResult.error)
      }
      const hashedPassword: string = hashResult.value

      // 3. Persist the user in the database
      const insertResult: Result<unknown[], AppError> = await fromPromise(
        db.insert(users).values({
          name,
          email,
          password: hashedPassword,
          image: '',
          role: 'user',
          createdAt: new Date(),
        }).returning(),
        (e: unknown): AppError => dbError({
          message: 'Failed to persist the user record in the database',
          cause: e,
        }),
      )
      if (insertResult.isErr()) {
        return mapToGraphQLError(insertResult.error)
      }

      const insertedUsers: unknown[] = insertResult.value
      const newUser: unknown = insertedUsers[0]

      // 4. Validate insertion result
      if (!newUser) {
        return mapToGraphQLError(dbError({
          message: 'User insertion succeeded but returned no data',
        }))
      }

      return newUser as User
    },
  },
}
