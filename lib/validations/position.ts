import { z } from 'zod'

// Enums matching Prisma schema
export const PositionStatusSchema = z.enum(['OPEN', 'CLOSED'])

/**
 * Schema for assigning a PUT trade (creates a position)
 */
export const AssignPutSchema = z.object({
  tradeId: z.string().cuid('Invalid trade ID'),
})

/**
 * Schema for assigning a CALL trade (closes a position)
 */
export const AssignCallSchema = z.object({
  tradeId: z.string().cuid('Invalid trade ID'),
})

/**
 * Schema for updating position notes
 */
export const UpdatePositionSchema = z.object({
  id: z.string().cuid('Invalid position ID'),
  notes: z.string().max(1000, 'Notes must be 1000 characters or less').optional(),
  currentValue: z
    .number()
    .positive('Current value must be positive')
    .finite('Current value must be finite')
    .optional(),
})

// Type exports for use in components and actions
export type AssignPutInput = z.infer<typeof AssignPutSchema>
export type AssignCallInput = z.infer<typeof AssignCallSchema>
export type UpdatePositionInput = z.infer<typeof UpdatePositionSchema>
export type PositionStatus = z.infer<typeof PositionStatusSchema>
