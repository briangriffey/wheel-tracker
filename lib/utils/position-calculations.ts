/**
 * Position calculation utilities
 *
 * @deprecated This module contains legacy calculation utilities.
 * Use @/lib/calculations/position instead for new position calculations.
 */

/**
 * Calculate unrealized P&L
 * @param currentValue Current market value of the position
 * @param totalCost Total cost paid for the position
 * @returns Unrealized gain or loss
 *
 * @deprecated Use calculateUnrealizedPnL from @/lib/calculations/position instead.
 * The new version accepts a position object and current price for better type safety.
 * @example
 * // Old (deprecated):
 * const pnl = calculateUnrealizedPnL(currentValue, totalCost)
 *
 * // New (recommended):
 * import { calculateUnrealizedPnL } from '@/lib/calculations/position'
 * const result = calculateUnrealizedPnL(position, currentPrice)
 * // Returns: { unrealizedPnL, unrealizedPnLPercent, currentValue }
 */
export function calculateUnrealizedPnL(currentValue: number, totalCost: number): number {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      'calculateUnrealizedPnL from @/lib/utils/position-calculations is deprecated. ' +
        'Use calculateUnrealizedPnL from @/lib/calculations/position instead.'
    )
  }
  return currentValue - totalCost
}

/**
 * Calculate unrealized P&L percentage
 * @param currentValue Current market value of the position
 * @param totalCost Total cost paid for the position
 * @returns Unrealized gain or loss as percentage
 *
 * @deprecated Use calculateUnrealizedPnL from @/lib/calculations/position instead.
 * The new version returns both amount and percentage in a single call.
 * @example
 * // Old (deprecated):
 * const percent = calculateUnrealizedPnLPercentage(currentValue, totalCost)
 *
 * // New (recommended):
 * import { calculateUnrealizedPnL } from '@/lib/calculations/position'
 * const result = calculateUnrealizedPnL(position, currentPrice)
 * const percent = result.unrealizedPnLPercent
 */
export function calculateUnrealizedPnLPercentage(currentValue: number, totalCost: number): number {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      'calculateUnrealizedPnLPercentage from @/lib/utils/position-calculations is deprecated. ' +
        'Use calculateUnrealizedPnL from @/lib/calculations/position instead (returns both amount and percent).'
    )
  }
  if (totalCost === 0) return 0
  return ((currentValue - totalCost) / totalCost) * 100
}

/**
 * Calculate current price per share
 * @param currentValue Current market value of the position
 * @param shares Number of shares
 * @returns Current price per share
 *
 * @deprecated Simple division can be done inline. This utility function is no longer needed.
 * Consider fetching current price directly from price data or calculating inline.
 * @example
 * // Old (deprecated):
 * const price = calculateCurrentPrice(currentValue, shares)
 *
 * // New (recommended):
 * const price = shares > 0 ? currentValue / shares : 0
 */
export function calculateCurrentPrice(currentValue: number, shares: number): number {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      'calculateCurrentPrice from @/lib/utils/position-calculations is deprecated. ' +
        'Calculate inline: currentValue / shares'
    )
  }
  if (shares === 0) return 0
  return currentValue / shares
}

/**
 * Calculate days held
 * @param acquiredDate Date the position was acquired
 * @param closedDate Optional date the position was closed
 * @returns Number of days the position has been held
 *
 * @deprecated This utility function has unclear ownership. Consider moving to a shared date utilities module
 * or calculating inline for simpler use cases.
 * @example
 * // Old (deprecated):
 * const days = calculateDaysHeld(acquiredDate, closedDate)
 *
 * // Alternative (calculate inline):
 * const endDate = closedDate ?? new Date()
 * const days = Math.ceil(Math.abs(endDate.getTime() - acquiredDate.getTime()) / (1000 * 60 * 60 * 24))
 */
export function calculateDaysHeld(acquiredDate: Date, closedDate?: Date | null): number {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      'calculateDaysHeld from @/lib/utils/position-calculations is deprecated. ' +
        'Consider using a shared date utilities module or calculating inline.'
    )
  }
  const endDate = closedDate ?? new Date()
  const diffTime = Math.abs(endDate.getTime() - acquiredDate.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * Calculate total premium from covered calls
 * @param coveredCalls Array of covered call trades
 * @returns Total premium collected
 *
 * @deprecated Simple array reduction can be done inline. This utility function is no longer needed.
 * @example
 * // Old (deprecated):
 * const total = calculateTotalCoveredCallPremium(coveredCalls)
 *
 * // New (recommended - calculate inline):
 * const total = coveredCalls.reduce((sum, call) => sum + call.premium, 0)
 */
export function calculateTotalCoveredCallPremium(coveredCalls: Array<{ premium: number }>): number {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      'calculateTotalCoveredCallPremium from @/lib/utils/position-calculations is deprecated. ' +
        'Calculate inline with Array.reduce().'
    )
  }
  return coveredCalls.reduce((sum, call) => sum + call.premium, 0)
}

/**
 * @deprecated Color functions have been moved to @/lib/design/colors
 * Import directly from @/lib/design/colors instead of using these re-exports.
 * The new design system provides getPnlColor() which returns all color variants at once.
 *
 * @example
 * // Old (deprecated):
 * import { getPnLColorClass } from '@/lib/utils/position-calculations'
 *
 * // New (recommended):
 * import { getPnlColor } from '@/lib/design/colors'
 * const colors = getPnlColor(pnl)  // Returns { text, bg, border }
 */
export { getPnLColorClass, getPnLBackgroundClass } from '@/lib/design/colors'

/**
 * Format currency value
 * @param value Numeric value
 * @returns Formatted currency string
 *
 * @deprecated Move formatting utilities to a dedicated @/lib/utils/format module.
 * This promotes better code organization and separation of concerns.
 * @example
 * // Old (deprecated):
 * import { formatCurrency } from '@/lib/utils/position-calculations'
 *
 * // Recommended (create new module):
 * // lib/utils/format.ts:
 * export function formatCurrency(value: number) {
 *   return new Intl.NumberFormat('en-US', {
 *     style: 'currency',
 *     currency: 'USD',
 *     minimumFractionDigits: 2,
 *     maximumFractionDigits: 2,
 *   }).format(value)
 * }
 */
export function formatCurrency(value: number): string {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      'formatCurrency from @/lib/utils/position-calculations is deprecated. ' +
        'Create a dedicated formatting utilities module at @/lib/utils/format instead.'
    )
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Format percentage value
 * @param value Numeric percentage
 * @returns Formatted percentage string
 *
 * @deprecated Move formatting utilities to a dedicated @/lib/utils/format module.
 * This promotes better code organization and separation of concerns.
 * @example
 * // Old (deprecated):
 * import { formatPercentage } from '@/lib/utils/position-calculations'
 *
 * // Recommended (create new module):
 * // lib/utils/format.ts:
 * export function formatPercentage(value: number) {
 *   const sign = value >= 0 ? '+' : ''
 *   return `${sign}${value.toFixed(2)}%`
 * }
 */
export function formatPercentage(value: number): string {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      'formatPercentage from @/lib/utils/position-calculations is deprecated. ' +
        'Create a dedicated formatting utilities module at @/lib/utils/format instead.'
    )
  }
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}
