/**
 * Position calculation utilities
 */

export interface PositionData {
  shares: number
  totalCost: number
  costBasis: number
}

export interface UnrealizedPnLResult {
  unrealizedPnL: number
  unrealizedPnLPercent: number
  currentValue: number
}

/**
 * Calculate unrealized profit/loss for an open position
 *
 * @param position - Position data including shares and cost basis
 * @param currentPrice - Current market price per share
 * @returns Unrealized P&L amount, percentage, and current value
 *
 * Formula:
 * - Current Value = currentPrice * shares
 * - Unrealized P&L = currentValue - totalCost
 * - Unrealized P&L % = (unrealizedPnL / totalCost) * 100
 */
export function calculateUnrealizedPnL(
  position: PositionData,
  currentPrice: number | null | undefined
): UnrealizedPnLResult | null {
  // Return null if no current price available
  if (currentPrice == null || currentPrice <= 0) {
    return null
  }

  const { shares, totalCost } = position

  // Calculate current market value
  const currentValue = currentPrice * shares

  // Calculate unrealized gain/loss
  const unrealizedPnL = currentValue - totalCost

  // Calculate percentage return
  const unrealizedPnLPercent = totalCost > 0 ? (unrealizedPnL / totalCost) * 100 : 0

  return {
    unrealizedPnL,
    unrealizedPnLPercent,
    currentValue,
  }
}

/**
 * Calculate realized profit/loss when closing a position
 *
 * @param position - Position data including cost basis and total cost
 * @param salePrice - Price per share at sale
 * @param putPremium - Premium collected from the PUT that created the position
 * @param callPremium - Premium collected from the CALL that closed the position
 * @returns Realized P&L amount and percentage
 *
 * Formula:
 * - Sale Proceeds = salePrice * shares
 * - Total Premiums = putPremium + callPremium
 * - Realized P&L = saleProceeds + totalPremiums - totalCost
 * - Realized P&L % = (realizedPnL / totalCost) * 100
 */
export function calculateRealizedPnL(
  position: PositionData,
  salePrice: number,
  putPremium: number,
  callPremium: number
): { realizedPnL: number; realizedPnLPercent: number } {
  const { shares, totalCost } = position

  // Calculate sale proceeds
  const saleProceeds = salePrice * shares

  // Total premiums collected
  const totalPremiums = putPremium + callPremium

  // Calculate realized gain/loss
  const realizedPnL = saleProceeds + totalPremiums - totalCost

  // Calculate percentage return
  const realizedPnLPercent = totalCost > 0 ? (realizedPnL / totalCost) * 100 : 0

  return {
    realizedPnL,
    realizedPnLPercent,
  }
}
