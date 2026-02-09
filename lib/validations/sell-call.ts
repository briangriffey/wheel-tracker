import { z } from 'zod'

/**
 * Validation schema for selling a covered call against a position
 *
 * This schema is a subset of CreateTradeSchema with specific constraints:
 * - Type is always CALL
 * - Action is always SELL_TO_OPEN
 * - Ticker, shares, and position are pre-filled and locked
 */
export const SellCallSchema = z.object({
  positionId: z.string().cuid('Invalid position ID'),
  strikePrice: z
    .number()
    .positive('Strike price must be positive')
    .finite('Strike price must be finite')
    .refine((val) => val > 0, 'Strike price must be greater than 0'),
  premium: z
    .number()
    .positive('Premium must be positive')
    .finite('Premium must be finite')
    .refine((val) => val > 0, 'Premium must be greater than 0'),
  expirationDate: z.coerce
    .date()
    .refine((date) => date > new Date(), 'Expiration date must be in the future')
    .refine(
      (date) => {
        const daysUntilExpiration = Math.ceil(
          (date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        )
        return daysUntilExpiration >= 1 && daysUntilExpiration <= 365
      },
      'Expiration date should be between 1 and 365 days from now'
    ),
  notes: z.string().max(1000, 'Notes must be 1000 characters or less').optional(),
})

// Type exports for use in components
export type SellCallInput = z.infer<typeof SellCallSchema>
