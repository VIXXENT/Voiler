import { type DefaultSession } from 'next-auth'

/**
 * Module augmentation for next-auth to extend User and Session types.
 *
 * Mirrors the backend Auth.js augmentation so the frontend can safely
 * access custom fields (id, role) returned by the API session endpoint.
 */
declare module 'next-auth' {
  type Session = {
    user: {
      readonly id: string
      readonly role: string
    } & DefaultSession['user']
  } & DefaultSession

  type User = {
    readonly id?: string
    readonly role?: string
  }
}
