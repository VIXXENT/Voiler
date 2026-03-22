import { Auth, type AuthConfig } from '@auth/core'
import Google from '@auth/core/providers/google'
import GitHub from '@auth/core/providers/github'
import Credentials from '@auth/core/providers/credentials'
import Email from '@auth/core/providers/email'
import { DrizzleAdapter } from '../db/auth-adapter.js'
import { users } from '../db/schema.js'
import { db } from '../db/index.js'
import { eq } from 'drizzle-orm'
import * as argon2 from 'argon2'
import { type User } from '@gemtest/schema'
import { type User as AuthUser } from '@auth/core/types'
import { Result, fromPromise } from 'neverthrow'

type VerificationRequestParams = {
  readonly identifier: string
  readonly url: string
}

/**
 * Auth.js configuration for the GemTest API.
 *
 * This configuration defines the authentication strategies, including OAuth (Google, GitHub),
 * Magic Links (Email), and traditional Credentials. It utilizes the custom DrizzleAdapter
 * for database persistence and follows the Neverthrow linear flow for logic.
 *
 * Context: We use 'database' session strategy to maintain state on the server side
 * and support features like session invalidation and multiple device management.
 */
export const authConfig: AuthConfig = {
  adapter: DrizzleAdapter,
  basePath: '/api/auth',
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
    Email({
      server: {
        host: process.env.SMTP_HOST || 'localhost',
        port: Number(process.env.SMTP_PORT) || 25,
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASSWORD || '',
        },
      },
      from: process.env.SMTP_FROM || 'noreply@gemtest.com',
      /**
       * Sends a verification request (Magic Link) to the user's email.
       *
       * Currently supports a Mock Mailer for development, logging the URL to the console.
       * In production, this can be swapped or extended to use a real transport.
       *
       * @param params - Object containing the recipient identifier and the magic link URL.
       */
      sendVerificationRequest: async (params: VerificationRequestParams): Promise<void> => {
        const { identifier: email, url }: VerificationRequestParams = params
        console.info('-----------------------------------------')
        console.info('📧 MOCK EMAIL SENT TO:', email)
        console.info('🔗 MAGIC LINK URL:', url)
        console.info('-----------------------------------------')
      },
    }),
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      /**
       * Authorizes a user based on their email and password.
       *
       * This method validates the credentials against the database, verifying the
       * argon2 hash of the stored password. It uses the Neverthrow linear flow
       * to handle potential database or hashing errors gracefully.
       *
       * @param credentials - The user credentials provided during login.
       * @returns A promise resolving to the user object if valid, or null otherwise.
       */
      authorize: async (
        credentials: Record<string, unknown>,
      ): Promise<AuthUser | null> => {
        const { email, password } = credentials

        // 1. Basic input validation
        if (typeof email !== 'string' || typeof password !== 'string') {
          return null
        }

        // 2. Fetch user from database
        const selectResult: Result<unknown[], Error> = await fromPromise(
          db.select().from(users).where(eq(users.email, email)),
          (e: unknown): Error => new Error(`Auth DB Error: ${String(e)}`),
        )

        if (selectResult.isErr()) {
          console.error(selectResult.error.message)
          return null
        }

        const user: User | undefined = selectResult.value[0] as User | undefined
        if (!user || !user.password) {
          return null
        }

        // 3. Verify password hash
        const verifyResult: Result<boolean, Error> = await fromPromise(
          argon2.verify(user.password, password),
          (e: unknown): Error => new Error(`Hash verification error: ${String(e)}`),
        )

        if (verifyResult.isErr()) {
          console.error(verifyResult.error.message)
          return null
        }

        const isValid: boolean = verifyResult.value
        if (!isValid) {
          return null
        }

        // 4. Return user info (excluding sensitive data)
        // Auth.js User requires string id; our schema uses number.
        return {
          id: user.id?.toString(),
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],
  session: {
    strategy: 'database' as const,
  },
  useSecureCookies: process.env.NODE_ENV === 'production',
  callbacks: {
    /**
     * Enhances the session object with additional user metadata.
     *
     * This callback is executed whenever a session is checked. It ensures that the
     * session object available on the client/server includes custom fields like
     * the user's role and database ID.
     *
     * @param params - Object containing the current session and user entities.
     * @returns The augmented session object.
     */
    // TODO: Replace with Auth.js module augmentation for Session type
    /* eslint-disable @typescript-eslint/no-explicit-any */
    session: async (params: {
      readonly session: any
      readonly user: any
    }): Promise<any> => {
      /* eslint-enable @typescript-eslint/no-explicit-any */
      const { session, user } = params
      if (session.user) {
        session.user.id = user.id
        session.user.role = user.role
      }
      return session
    },
  },
}

type AuthHandlerFn = (req: Request) => Promise<Response>

/**
 * Main Authentication handler for Web Requests.
 *
 * This function bridges the Auth.js core with the incoming HTTP request,
 * applying the defined authConfig to determine the authentication state.
 *
 * @param req - The incoming standard Web Request object.
 * @returns A promise resolving to the Auth.js Response object.
 */
export const authHandler: AuthHandlerFn = (req: Request): Promise<Response> => Auth(req, authConfig)
