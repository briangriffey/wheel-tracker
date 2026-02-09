import { z } from 'zod'

/**
 * Schema for rolling an option to a new strike/expiration
 *
 * Rolling an option involves:
 * 1. Closing the current option (BUY_TO_CLOSE)
 * 2. Opening a new option with different strike/expiration (SELL_TO_OPEN)
 * 3. Calculating the net credit or debit from both transactions
 */
export const RollOptionSchema = z.object({
  // ID of the current trade to roll
  tradeId: z.string().cuid('Invalid trade ID'),

  // New option parameters
  newStrikePrice: z
    .number()
    .positive('New strike price must be positive')
    .finite('New strike price must be finite')
    .refine((val) => val > 0, 'New strike price must be greater than 0'),

  newExpirationDate: z.coerce
    .date()
    .refine((date) => date > new Date(), 'New expiration date must be in the future'),

  // Premium paid to close current position (always positive, but is a cost)
  closePremium: z
    .number()
    .nonnegative('Close premium cannot be negative')
    .finite('Close premium must be finite'),

  // Premium collected from opening new position (income)
  openPremium: z
    .number()
    .positive('Open premium must be positive')
    .finite('Open premium must be finite')
    .refine((val) => val > 0, 'Open premium must be greater than 0'),

  // Optional notes about the roll
  notes: z.string().max(1000, 'Notes must be 1000 characters or less').optional(),
})

// Type export for use in components and actions
export type RollOptionInput = z.infer<typeof RollOptionSchema>

/**
 * Calculate net credit/debit from a roll
 *
 * Net Credit (positive): When you receive more premium from the new option
 * than you pay to close the old one
 *
 * Net Debit (negative): When you pay more to close the old option than you
 * receive from the new one
 *
 * @param closePremium - Amount paid to buy back the current option
 * @param openPremium - Amount received from selling the new option
 * @returns Net premium (positive = credit, negative = debit)
 */
export function calculateNetPremium(closePremium: number, openPremium: number): number {
  return openPremium - closePremium
}
