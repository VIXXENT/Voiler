/**
 * Domain types for the email module.
 * No infrastructure dependencies — pure interfaces only.
 */

/** Represents an outbound transactional email message. */
export interface EmailMessage {
  readonly to: string
  readonly subject: string
  readonly html: string
  readonly text?: string
  readonly from?: string
  readonly replyTo?: string
}

/** Result returned after attempting to send an email. */
export interface EmailResult {
  readonly messageId: string
  readonly accepted: readonly string[]
  readonly rejected: readonly string[]
}
