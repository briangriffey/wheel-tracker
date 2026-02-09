/**
 * Wheel Strategy Validation Utilities
 *
 * Provides validation functions for wheel operations to ensure safe trading practices.
 * These validators return structured results with errors (blocking) or warnings (informational).
 */

import { z } from 'zod'

// ============================================================================
// Zod Schemas for Server Actions
// ============================================================================

export const WheelStatusSchema = z.enum(['ACTIVE', 'IDLE', 'PAUSED', 'COMPLETED'])

export const CreateWheelSchema = z.object({
  ticker: z
    .string()
    .min(1, 'Ticker is required')
    .max(5, 'Ticker must be 5 characters or less')
    .transform((val) => val.toUpperCase())
    .refine((val) => /^[A-Z]+$/.test(val), 'Ticker must contain only letters'),
  notes: z.string().max(1000, 'Notes must be 1000 characters or less').optional(),
})

export const UpdateWheelSchema = z.object({
  id: z.string().cuid('Invalid wheel ID'),
  notes: z.string().max(1000, 'Notes must be 1000 characters or less').nullable().optional(),
})

export const WheelFiltersSchema = z
  .object({
    ticker: z.string().max(5).optional(),
    status: WheelStatusSchema.optional(),
  })
  .optional()

export type CreateWheelInput = z.infer<typeof CreateWheelSchema>
export type UpdateWheelInput = z.infer<typeof UpdateWheelSchema>
export type WheelFilters = z.infer<typeof WheelFiltersSchema>

// ============================================================================
// Types
// ============================================================================

export type ValidationResult = {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export type CashRequirementInput = {
  cashBalance: number
  strikePrice: number
  contracts: number
}

export type StrikePriceInput = {
  callStrike: number
  positionCostBasis: number
}

export type PositionStateInput = {
  positionId: string
  positionStatus: 'OPEN' | 'CLOSED'
  openCallsCount: number
}

export type WheelContinuityInput = {
  tradeId?: string
  wheelId?: string | null
  ticker: string
  activeWheelId?: string | null
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates if user has sufficient cash to cover PUT assignment
 *
 * When selling cash-secured PUTs, you must have enough cash to buy the shares
 * if assigned. This validator checks if the available cash balance is sufficient.
 *
 * Formula: cashRequired = strikePrice × shares (contracts × 100)
 *
 * @param input - Cash balance and PUT trade details
 * @returns ValidationResult with error if insufficient cash
 *
 * @example
 * validateCashRequirement({
 *   cashBalance: 10000,
 *   strikePrice: 150,
 *   contracts: 1
 * })
 * // Returns: { valid: false, errors: ['Insufficient cash...'], warnings: [] }
 */
export function validateCashRequirement(input: CashRequirementInput): ValidationResult {
  const { cashBalance, strikePrice, contracts } = input

  const shares = contracts * 100
  const cashRequired = strikePrice * shares

  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  }

  if (cashBalance < cashRequired) {
    result.valid = false
    result.errors.push(
      `Insufficient cash to cover PUT assignment. Required: $${cashRequired.toFixed(2)}, Available: $${cashBalance.toFixed(2)}, Shortfall: $${(cashRequired - cashBalance).toFixed(2)}`
    )
  }

  // Warning if cash is tight (less than 10% buffer)
  const bufferAmount = cashRequired * 0.1
  if (cashBalance >= cashRequired && cashBalance < cashRequired + bufferAmount) {
    result.warnings.push(
      `Cash balance is tight. Consider maintaining a 10% buffer ($${bufferAmount.toFixed(2)}) for emergencies.`
    )
  }

  return result
}

/**
 * Validates CALL strike price against position cost basis
 *
 * Warns if selling a covered CALL with strike below cost basis, which would
 * guarantee a loss if assigned. Best practice is to sell CALLs with strike
 * at or above cost basis to ensure profit on assignment.
 *
 * @param input - CALL strike and position cost basis
 * @returns ValidationResult with warning if strike < cost basis
 *
 * @example
 * validateStrikePrice({
 *   callStrike: 145,
 *   positionCostBasis: 147.50
 * })
 * // Returns: { valid: true, errors: [], warnings: ['Strike price $145.00 is below cost basis...'] }
 */
export function validateStrikePrice(input: StrikePriceInput): ValidationResult {
  const { callStrike, positionCostBasis } = input

  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  }

  if (callStrike < positionCostBasis) {
    const potentialLoss = (positionCostBasis - callStrike) * 100 // Per contract (100 shares)
    result.warnings.push(
      `Strike price $${callStrike.toFixed(2)} is below cost basis $${positionCostBasis.toFixed(2)}. If assigned, you will realize a loss of $${potentialLoss.toFixed(2)} per contract on the shares (excluding premiums collected).`
    )
  }

  // Informational message if strike is at or just above cost basis
  if (callStrike >= positionCostBasis && callStrike < positionCostBasis * 1.05) {
    const potentialGain = (callStrike - positionCostBasis) * 100
    result.warnings.push(
      `Strike price is near cost basis. If assigned, you will realize a small gain of $${potentialGain.toFixed(2)} per contract on the shares (plus premiums collected).`
    )
  }

  return result
}

/**
 * Validates if a position can accept a new covered CALL
 *
 * Checks that:
 * 1. Position is OPEN (not CLOSED)
 * 2. Position does not already have an open CALL (only one active CALL allowed)
 *
 * @param input - Position state and open calls count
 * @returns ValidationResult with error if position cannot accept new CALL
 *
 * @example
 * validatePositionState({
 *   positionId: 'pos_123',
 *   positionStatus: 'OPEN',
 *   openCallsCount: 1
 * })
 * // Returns: { valid: false, errors: ['Position already has an open CALL...'], warnings: [] }
 */
export function validatePositionState(input: PositionStateInput): ValidationResult {
  const { positionId, positionStatus, openCallsCount } = input

  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  }

  if (positionStatus !== 'OPEN') {
    result.valid = false
    result.errors.push(
      `Position ${positionId} is ${positionStatus}. Only OPEN positions can have new covered CALLs.`
    )
    return result
  }

  if (openCallsCount > 0) {
    result.valid = false
    result.errors.push(
      `Position ${positionId} already has ${openCallsCount} open CALL(s). Only one active covered CALL is allowed per position. Close or expire the existing CALL before creating a new one.`
    )
  }

  return result
}

/**
 * Validates wheel continuity for trade linking
 *
 * Ensures trades are properly linked to wheels for accurate cycle tracking.
 * Warns if:
 * 1. Trade is not linked to a wheel when an active wheel exists for the ticker
 * 2. Trade is linked to a different wheel than the active one
 *
 * @param input - Trade and wheel linking information
 * @returns ValidationResult with warning if wheel continuity is broken
 *
 * @example
 * validateWheelContinuity({
 *   tradeId: 'trade_123',
 *   wheelId: null,
 *   ticker: 'AAPL',
 *   activeWheelId: 'wheel_456'
 * })
 * // Returns: { valid: true, errors: [], warnings: ['Trade is not linked to the active wheel...'] }
 */
export function validateWheelContinuity(input: WheelContinuityInput): ValidationResult {
  const { tradeId, wheelId, ticker, activeWheelId } = input

  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  }

  // If there's an active wheel for this ticker but trade is not linked to it
  if (activeWheelId && wheelId !== activeWheelId) {
    if (wheelId === null || wheelId === undefined) {
      result.warnings.push(
        `Trade ${tradeId || '(new)'} for ${ticker} is not linked to the active wheel (${activeWheelId}). Consider linking it to maintain wheel cycle tracking and accurate performance metrics.`
      )
    } else {
      result.warnings.push(
        `Trade ${tradeId || '(new)'} for ${ticker} is linked to wheel ${wheelId}, but there is a different active wheel (${activeWheelId}) for this ticker. This may indicate you have multiple wheels for the same ticker, which can complicate tracking.`
      )
    }
  }

  // If trade is linked to a wheel but no active wheel exists (informational)
  if (wheelId && !activeWheelId) {
    result.warnings.push(
      `Trade ${tradeId || '(new)'} is linked to wheel ${wheelId}, but no active wheel was found for ${ticker}. The wheel may be PAUSED, IDLE, or COMPLETED.`
    )
  }

  return result
}
