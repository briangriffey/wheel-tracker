import { z } from 'zod'

/**
 * Supported benchmark tickers
 */
export const BenchmarkTickerSchema = z.enum(['SPY', 'QQQ', 'VTI', 'DIA', 'IWM'])

/**
 * Schema for setting up a new benchmark
 */
export const SetupBenchmarkSchema = z.object({
  ticker: BenchmarkTickerSchema,
  initialCapital: z
    .number()
    .finite('Initial capital must be finite')
    .positive('Initial capital must be positive')
    .refine((val) => val > 0, 'Initial capital must be greater than 0'),
  setupDate: z.coerce.date(),
})

/**
 * Schema for updating a benchmark
 */
export const UpdateBenchmarkSchema = z.object({
  ticker: BenchmarkTickerSchema,
})

/**
 * Schema for deleting a benchmark
 */
export const DeleteBenchmarkSchema = z.object({
  ticker: BenchmarkTickerSchema,
})

/**
 * Schema for getting benchmark comparison
 */
export const GetComparisonSchema = z.object({
  ticker: BenchmarkTickerSchema.optional(),
})

/**
 * Type exports
 */
export type SetupBenchmarkInput = z.infer<typeof SetupBenchmarkSchema>
export type UpdateBenchmarkInput = z.infer<typeof UpdateBenchmarkSchema>
export type DeleteBenchmarkInput = z.infer<typeof DeleteBenchmarkSchema>
export type GetComparisonInput = z.infer<typeof GetComparisonSchema>
