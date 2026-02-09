import { z } from 'zod'

// Enums matching Prisma schema
export const TradeTypeSchema = z.enum(['PUT', 'CALL'])
export const TradeActionSchema = z.enum(['SELL_TO_OPEN', 'BUY_TO_CLOSE'])
export const TradeStatusSchema = z.enum(['OPEN', 'CLOSED', 'EXPIRED', 'ASSIGNED'])

// Schema for creating a new trade
export const CreateTradeSchema = z.object({
  ticker: z
    .string()
    .min(1, 'Ticker is required')
    .max(5, 'Ticker must be 5 characters or less')
    .transform((val) => val.toUpperCase())
    .refine((val) => /^[A-Z]+$/.test(val), 'Ticker must contain only letters'),
  type: TradeTypeSchema,
  action: TradeActionSchema,
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
  contracts: z
    .number()
    .int('Contracts must be an integer')
    .positive('Contracts must be positive')
    .min(1, 'Must have at least 1 contract'),
  expirationDate: z.coerce
    .date()
    .refine((date) => date > new Date(), 'Expiration date must be in the future'),
  openDate: z.coerce.date().optional(),
  notes: z.string().max(1000, 'Notes must be 1000 characters or less').optional(),
  positionId: z.string().cuid().optional(),
  wheelId: z.string().cuid().optional(),
})

// Schema for updating a trade
export const UpdateTradeSchema = z.object({
  id: z.string().cuid('Invalid trade ID'),
  ticker: z
    .string()
    .min(1, 'Ticker is required')
    .max(5, 'Ticker must be 5 characters or less')
    .transform((val) => val.toUpperCase())
    .refine((val) => /^[A-Z]+$/.test(val), 'Ticker must contain only letters')
    .optional(),
  type: TradeTypeSchema.optional(),
  action: TradeActionSchema.optional(),
  strikePrice: z
    .number()
    .positive('Strike price must be positive')
    .finite('Strike price must be finite')
    .optional(),
  premium: z
    .number()
    .positive('Premium must be positive')
    .finite('Premium must be finite')
    .optional(),
  contracts: z
    .number()
    .int('Contracts must be an integer')
    .positive('Contracts must be positive')
    .optional(),
  expirationDate: z.coerce.date().optional(),
  openDate: z.coerce.date().optional(),
  closeDate: z.coerce.date().optional(),
  notes: z.string().max(1000, 'Notes must be 1000 characters or less').optional(),
  positionId: z.string().cuid().optional(),
})

// Schema for updating trade status
export const UpdateTradeStatusSchema = z.object({
  id: z.string().cuid('Invalid trade ID'),
  status: TradeStatusSchema,
  closeDate: z.coerce.date().optional(),
})

// Type exports for use in components and actions
export type CreateTradeInput = z.infer<typeof CreateTradeSchema>
export type UpdateTradeInput = z.infer<typeof UpdateTradeSchema>
export type UpdateTradeStatusInput = z.infer<typeof UpdateTradeStatusSchema>
export type TradeType = z.infer<typeof TradeTypeSchema>
export type TradeAction = z.infer<typeof TradeActionSchema>
export type TradeStatus = z.infer<typeof TradeStatusSchema>
