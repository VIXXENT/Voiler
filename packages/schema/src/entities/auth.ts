import { z } from 'zod'

/**
 * Account schema for OAuth providers.
 *
 * Why: Stores the OAuth provider link (provider + providerAccountId) for each user.
 * Required by Auth.js to support social login flows without storing passwords.
 *
 * @see {@link Account} for the inferred TypeScript type.
 */
// eslint-disable-next-line @typescript-eslint/typedef
export const AccountSchema = z.object({
  id: z.string().optional(),
  userId: z.number().int(),
  type: z.string(),
  provider: z.string(),
  providerAccountId: z.string(),
  refresh_token: z.string().optional(),
  access_token: z.string().optional(),
  expires_at: z.number().int().optional(),
  token_type: z.string().optional(),
  scope: z.string().optional(),
  id_token: z.string().optional(),
  session_state: z.string().optional(),
})

/**
 * Session schema for database-based sessions.
 *
 * Why: Auth.js database strategy persists sessions server-side. Extended with
 * userAgent and ipAddress for security auditing without a separate audit log table.
 *
 * @see {@link Session} for the inferred TypeScript type.
 */
// eslint-disable-next-line @typescript-eslint/typedef
export const SessionSchema = z.object({
  id: z.string().optional(),
  sessionToken: z.string(),
  userId: z.number().int(),
  expires: z.date(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
})

/**
 * VerificationToken schema for Magic Links and Password Recovery.
 *
 * Why: Auth.js uses short-lived tokens identified by (identifier, token) pair.
 * Storing in DB allows server-side revocation on use or expiry.
 *
 * @see {@link VerificationToken} for the inferred TypeScript type.
 */
// eslint-disable-next-line @typescript-eslint/typedef
export const VerificationTokenSchema = z.object({
  identifier: z.string(),
  token: z.string(),
  expires: z.date(),
})

/** TypeScript type inferred from {@link AccountSchema}. */
export type Account = z.infer<typeof AccountSchema>
/** TypeScript type inferred from {@link SessionSchema}. */
export type Session = z.infer<typeof SessionSchema>
/** TypeScript type inferred from {@link VerificationTokenSchema}. */
export type VerificationToken = z.infer<typeof VerificationTokenSchema>
