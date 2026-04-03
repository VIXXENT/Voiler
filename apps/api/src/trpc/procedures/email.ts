import type { EmailResult, IEmailService } from '@voiler/mod-email'
import { z } from 'zod'

import { adminProcedure, router } from '../context.js'

/** Dependencies for the email router. */
interface CreateEmailRouterParams {
  readonly emailService: IEmailService
}

/** tRPC router for email operations (admin only). */
const createEmailRouter = (params: CreateEmailRouterParams) => {
  const { emailService } = params

  return router({
    send: adminProcedure
      .input(
        z.object({
          to: z.string().email(),
          subject: z.string().min(1),
          html: z.string().min(1),
          text: z.string().optional(),
        }),
      )
      .mutation(async ({ input }) => {
        const result = await emailService.send(input)
        return result.match(
          (r: EmailResult) => ({ messageId: r.messageId }),
          (error: { readonly message: string }) => {
            throw new Error(error.message)
          },
        )
      }),
  })
}

export { createEmailRouter }
export type { CreateEmailRouterParams }
