import { z } from 'zod'

export const AddWatchlistTickerSchema = z.object({
  ticker: z
    .string()
    .min(1, 'Ticker is required')
    .max(5, 'Max 5 characters')
    .transform((v) => v.toUpperCase())
    .refine((v) => /^[A-Z]+$/.test(v), 'Letters only'),
  notes: z.string().max(500).optional(),
})

export const RemoveWatchlistTickerSchema = z.object({
  id: z.string().cuid(),
})

export type AddWatchlistTickerInput = z.infer<typeof AddWatchlistTickerSchema>
export type RemoveWatchlistTickerInput = z.infer<typeof RemoveWatchlistTickerSchema>
