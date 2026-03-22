import NextAuth, { type NextAuthConfig, type User, type Session } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import CredentialsProvider from 'next-auth/providers/credentials'

/**
 * Auth.js configuration for GemTest Web.
 */
export const authConfig: NextAuthConfig = {
  providers: [
    CredentialsProvider({
      name: 'Credenciales',
      credentials: {
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'admin@gemtest.com',
        },
        password: { label: 'Contraseña', type: 'password' },
      },
      /**
       * Authorizes a user based on credentials.
       * @param credentials - The user credentials.
       * @returns The user object or null if authorization fails.
       */
      authorize: async (
        credentials: Partial<Record<'email' | 'password', unknown>>,
      ): Promise<User | null> => {
        // Mock de autenticación para esta fase
        const email = credentials?.email
        const password = credentials?.password
        
        if (typeof email !== 'string' || typeof password !== 'string') {
          return null
        }

        const isAdmin: boolean = email === 'admin@gemtest.com'
          && password === 'admin123'
        if (isAdmin) {
          return {
            id: '1',
            name: 'Arquitecto Senior',
            email: 'admin@gemtest.com',
          }
        }
        return null
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    /**
     * Augments the session object with the user ID from the token.
     * @param params - The session and token.
     * @returns The modified session.
     */
    session: (params: { session: Session; token: JWT }): Session => {
      const { session, token } = params
      if (token && session.user && token.sub) {
        session.user.id = token.sub
      }
      return session
    },
  },
}

/**
 * Type Extraction from NextAuth to solve TS2742 portable reference issues.
 */
type AuthResult = ReturnType<typeof NextAuth>;

const authInstance: AuthResult = NextAuth(authConfig)

/**
 * Exported authentication handlers and methods with explicit extracted types.
 */
export const handlers: AuthResult['handlers'] = authInstance.handlers
export const auth: AuthResult['auth'] = authInstance.auth
export const signIn: AuthResult['signIn'] = authInstance.signIn
export const signOut: AuthResult['signOut'] = authInstance.signOut
