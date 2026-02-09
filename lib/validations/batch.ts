import { z } from 'zod'

/**
 * Schema for batch expiration of trades
 *
 * Marks multiple trades as expired in a single atomic operation.
 * All trade IDs must be valid CUIDs.
 */
export const BatchExpireSchema = z.object({
  tradeIds: z
    .array(z.string().cuid('Invalid trade ID'))
    .min(1, 'At least one trade ID is required')
    .max(100, 'Cannot expire more than 100 trades at once'),
})

/**
 * Schema for batch assignment of trades
 *
 * Assigns multiple PUT/CALL trades in a single atomic operation.
 * PUTs create positions, CALLs close positions.
 */
export const BatchAssignSchema = z.object({
  tradeIds: z
    .array(z.string().cuid('Invalid trade ID'))
    .min(1, 'At least one trade ID is required')
    .max(50, 'Cannot assign more than 50 trades at once'),
})

// Type exports for use in components and actions
export type BatchExpireInput = z.infer<typeof BatchExpireSchema>
export type BatchAssignInput = z.infer<typeof BatchAssignSchema>
