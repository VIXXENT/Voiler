import { type DefaultSession } from 'next-auth'

/**
 * Module augmentation for next-auth to extend User and Session types.
 * This allows safe access to 'id' property without type casting.
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
    } & DefaultSession['user']
  }

  interface User {
    id?: string;
  }
}
