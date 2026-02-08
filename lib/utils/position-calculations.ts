/**
 * Position calculation utilities
 */

/**
 * Calculate unrealized P&L
 * @param currentValue Current market value of the position
 * @param totalCost Total cost paid for the position
 * @returns Unrealized gain or loss
 */
export function calculateUnrealizedPnL(
  currentValue: number,
  totalCost: number
): number {
  return currentValue - totalCost
}

/**
 * Calculate unrealized P&L percentage
 * @param currentValue Current market value of the position
 * @param totalCost Total cost paid for the position
 * @returns Unrealized gain or loss as percentage
 */
export function calculateUnrealizedPnLPercentage(
  currentValue: number,
  totalCost: number
): number {
  if (totalCost === 0) return 0
  return ((currentValue - totalCost) / totalCost) * 100
}

/**
 * Calculate current price per share
 * @param currentValue Current market value of the position
 * @param shares Number of shares
 * @returns Current price per share
 */
export function calculateCurrentPrice(
  currentValue: number,
  shares: number
): number {
  if (shares === 0) return 0
  return currentValue / shares
}

/**
 * Calculate days held
 * @param acquiredDate Date the position was acquired
 * @param closedDate Optional date the position was closed
 * @returns Number of days the position has been held
 */
export function calculateDaysHeld(
  acquiredDate: Date,
  closedDate?: Date | null
): number {
  const endDate = closedDate ?? new Date()
  const diffTime = Math.abs(endDate.getTime() - acquiredDate.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * Calculate total premium from covered calls
 * @param coveredCalls Array of covered call trades
 * @returns Total premium collected
 */
export function calculateTotalCoveredCallPremium(
  coveredCalls: Array<{ premium: number }>
): number {
  return coveredCalls.reduce((sum, call) => sum + call.premium, 0)
}

// Color functions have been moved to @/lib/design/colors
// Re-export for backward compatibility
export { getPnLColorClass, getPnLBackgroundClass } from '@/lib/design/colors'

/**
 * Format currency value
 * @param value Numeric value
 * @returns Formatted currency string
 */
export function formatCurrency(value: number): string {
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
 */
export function formatPercentage(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}
