/**
 * Module augmentation for Auth.js custom session and JWT fields.
 *
 * Extends the default Auth.js types to include GemTest-specific properties
 * like user role and database ID, enabling type-safe access in callbacks.
 */

declare module '@auth/core/types' {
  interface User {
    readonly role?: string
  }

  interface Session {
    user: {
      readonly id: string
      readonly role: string
      readonly name?: string | null
      readonly email?: string | null
      readonly image?: string | null
    }
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    readonly id?: string
    readonly role?: string
  }
}

export {}
