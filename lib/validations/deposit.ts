import { z } from 'zod'

/**
 * Deposit type enum
 */
export const DepositTypeSchema = z.enum(['DEPOSIT', 'WITHDRAWAL'])

/**
 * Schema for recording a cash deposit
 */
export const RecordDepositSchema = z.object({
  amount: z
    .number()
    .finite('Amount must be finite')
    .positive('Amount must be positive')
    .refine((val) => val > 0, 'Amount must be greater than 0'),
  depositDate: z.coerce
    .date()
    .refine((date) => date <= new Date(), 'Deposit date cannot be in the future'),
  notes: z.string().optional(),
})

/**
 * Schema for recording a cash withdrawal
 */
export const RecordWithdrawalSchema = z.object({
  amount: z
    .number()
    .finite('Amount must be finite')
    .positive('Amount must be positive')
    .refine((val) => val > 0, 'Amount must be greater than 0'),
  depositDate: z.coerce
    .date()
    .refine((date) => date <= new Date(), 'Withdrawal date cannot be in the future'),
  notes: z.string().optional(),
})

/**
 * Schema for updating a deposit
 */
export const UpdateDepositSchema = z.object({
  id: z.string().cuid('Invalid deposit ID'),
  amount: z.number().finite('Amount must be finite').positive('Amount must be positive').optional(),
  depositDate: z.coerce
    .date()
    .refine((date) => date <= new Date(), 'Deposit date cannot be in the future')
    .optional(),
  notes: z.string().optional(),
})

/**
 * Schema for deleting a deposit
 */
export const DeleteDepositSchema = z.object({
  id: z.string().cuid('Invalid deposit ID'),
})

/**
 * Schema for getting deposit filters
 */
export const GetDepositsSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  type: DepositTypeSchema.optional(),
  limit: z.number().int().positive().max(1000).optional(),
  offset: z.number().int().nonnegative().optional(),
})

/**
 * Type exports
 */
export type RecordDepositInput = z.infer<typeof RecordDepositSchema>
export type RecordWithdrawalInput = z.infer<typeof RecordWithdrawalSchema>
export type UpdateDepositInput = z.infer<typeof UpdateDepositSchema>
export type DeleteDepositInput = z.infer<typeof DeleteDepositSchema>
export type GetDepositsInput = z.infer<typeof GetDepositsSchema>
