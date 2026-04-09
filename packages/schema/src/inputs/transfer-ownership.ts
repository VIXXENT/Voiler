import { z } from 'zod'

/**
 * Zod schema for the transfer-ownership input.
 * Validates the data required to transfer project ownership to a new owner.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const TransferOwnershipInputSchema = z.object({
  projectId: z.string().min(1),
  newOwnerId: z.string().min(1),
})

/**
 * TypeScript type for the transfer-ownership input.
 * Inferred from the Zod schema.
 */
type TransferOwnershipInput = z.infer<typeof TransferOwnershipInputSchema>

export { TransferOwnershipInputSchema }
export type { TransferOwnershipInput }
