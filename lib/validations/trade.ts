import { z } from 'zod'

// Schema for form inputs (dates as strings from HTML inputs)
export const CreateTradeFormSchema = z.object({
  ticker: z
    .string({ message: 'Ticker is required' })
    .min(1, 'Ticker is required')
    .max(5, 'Ticker must be 5 characters or less')
    .regex(/^[A-Z]+$/, 'Ticker must contain only uppercase letters')
    .transform((val) => val.toUpperCase()),
  type: z.enum(['PUT', 'CALL'], {
    message: 'Trade type is required',
  }),
  action: z.enum(['SELL_TO_OPEN', 'BUY_TO_CLOSE'], {
    message: 'Trade action is required',
  }),
  strikePrice: z
    .number({
      message: 'Strike price is required',
    })
    .positive('Strike price must be positive')
    .finite(),
  premium: z
    .number({
      message: 'Premium is required',
    })
    .positive('Premium must be positive')
    .finite(),
  contracts: z
    .number({
      message: 'Number of contracts is required',
    })
    .int('Contracts must be a whole number')
    .positive('Contracts must be at least 1'),
  openDate: z.string().min(1, 'Entry date is required'),
  expirationDate: z.string().min(1, 'Expiration date is required'),
  notes: z.string().optional(),
}).refine(
  (data) => new Date(data.expirationDate) > new Date(data.openDate),
  {
    message: 'Expiration date must be after entry date',
    path: ['expirationDate'],
  }
)

// Schema for server-side processing (dates as Date objects)
export const CreateTradeSchema = z.object({
  ticker: z
    .string({ message: 'Ticker is required' })
    .min(1, 'Ticker is required')
    .max(5, 'Ticker must be 5 characters or less')
    .regex(/^[A-Z]+$/, 'Ticker must contain only uppercase letters')
    .transform((val) => val.toUpperCase()),
  type: z.enum(['PUT', 'CALL'], {
    message: 'Trade type is required',
  }),
  action: z.enum(['SELL_TO_OPEN', 'BUY_TO_CLOSE'], {
    message: 'Trade action is required',
  }),
  strikePrice: z
    .number({
      message: 'Strike price is required',
    })
    .positive('Strike price must be positive')
    .finite(),
  premium: z
    .number({
      message: 'Premium is required',
    })
    .positive('Premium must be positive')
    .finite(),
  contracts: z
    .number({
      message: 'Number of contracts is required',
    })
    .int('Contracts must be a whole number')
    .positive('Contracts must be at least 1'),
  openDate: z.coerce.date({
    message: 'Entry date is required',
  }),
  expirationDate: z.coerce.date({
    message: 'Expiration date is required',
  }),
  notes: z.string().optional(),
}).refine(
  (data) => data.expirationDate > data.openDate,
  {
    message: 'Expiration date must be after entry date',
    path: ['expirationDate'],
  }
)

export type CreateTradeInput = z.infer<typeof CreateTradeSchema>
export type CreateTradeFormInput = z.infer<typeof CreateTradeFormSchema>
