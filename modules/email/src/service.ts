import { okAsync, type ResultAsync } from 'neverthrow'
import type { EmailMessage, EmailResult } from './types.js'

/** Application error shape used across the domain. */
type AppError = { readonly tag: string; readonly message: string }

/**
 * Port interface for email sending operations.
 * Concrete adapters (nodemailer, stub) must satisfy this contract.
 */
export interface IEmailService {
  /**
   * Sends a transactional email message.
   * Returns metadata about accepted and rejected recipients.
   */
  readonly send: (params: EmailMessage) => ResultAsync<EmailResult, AppError>
}

/**
 * Creates a stub email service that logs instead of sending real emails.
 * Use during development and testing before SMTP credentials are configured.
 */
export const createStubEmailService = (): IEmailService => {
  const send = (params: EmailMessage) => {
    console.warn(`[EMAIL STUB] To: ${params.to} Subject: ${params.subject}`)
    return okAsync<EmailResult, AppError>({
      messageId: `stub_${Date.now()}`,
      accepted: [params.to],
      rejected: [],
    })
  }

  return { send }
}
