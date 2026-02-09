/**
 * Wheel Strategy Calculation Utilities
 *
 * Provides calculation functions for wheel strategy metrics including:
 * - Cycle profit & loss
 * - Annualized returns
 * - Win rate tracking
 * - Call strike suggestions
 * - Cash requirement validation
 */

/**
 * Simplified trade data for wheel calculations
 */
export interface TradeData {
  premium: number
}

/**
 * Simplified position data for wheel calculations
 */
export interface PositionData {
  shares: number
  costBasis: number
  realizedGainLoss: number | null
}

/**
 * User data with optional cash balance
 */
export interface UserData {
  cashBalance?: number | null
}

/**
 * Represents a complete wheel cycle from PUT assignment to CALL assignment
 */
export interface WheelCycle {
  cycleNumber: number
  putTrade: TradeData
  position: PositionData
  callTrades: TradeData[]
  totalPremiums: number
  realizedPL: number
  duration: number // days
  startDate: Date
  endDate: Date
}

/**
 * Calculate total profit/loss for a complete wheel cycle
 *
 * P&L includes:
 * - PUT premium collected
 * - All CALL premiums collected
 * - Stock gains/losses (sale price - cost basis)
 *
 * @param cycle - Complete wheel cycle data
 * @returns Total profit/loss for the cycle
 *
 * Formula:
 * - Total Premiums = PUT premium + sum of all CALL premiums
 * - Stock Gain = (sale price - cost basis) * shares
 * - Cycle P&L = Total Premiums + Stock Gain
 *
 * @example
 * const cycle = {
 *   putTrade: { premium: 250 },
 *   callTrades: [{ premium: 200 }, { premium: 150 }],
 *   position: { shares: 100, costBasis: 147.50, realizedGainLoss: 750 }
 * }
 * // Returns: 1350 (250 + 200 + 150 + 750)
 */
export function calculateCyclePL(cycle: WheelCycle): number {
  // Use the position's realized gain/loss which includes stock gains
  // and add all premiums collected during the cycle
  const positionPL = cycle.position.realizedGainLoss ?? 0

  // Sum all premiums (PUT + CALLs)
  const putPremium = cycle.putTrade.premium
  const callPremiums = cycle.callTrades.reduce(
    (sum, trade) => sum + trade.premium,
    0
  )

  const totalPremiums = putPremium + callPremiums

  // Total P&L = premiums + stock gains/losses
  return totalPremiums + positionPL
}

/**
 * Calculate annualized return percentage
 *
 * Converts a profit over a given duration into an annualized percentage return.
 * Useful for comparing returns across different time periods.
 *
 * @param pl - Profit/loss amount
 * @param duration - Duration in days
 * @param capital - Capital deployed (initial investment)
 * @returns Annualized return as a percentage
 *
 * Formula:
 * - Return % = (P&L / Capital) * 100
 * - Annualized Return % = (Return % / Duration in days) * 365
 *
 * @example
 * calculateAnnualizedReturn(1200, 45, 14750)
 * // Returns: ~66.4% annualized
 * // (1200 / 14750 = 8.1% return over 45 days = 65.7% annualized)
 */
export function calculateAnnualizedReturn(
  pl: number,
  duration: number,
  capital: number
): number {
  // Handle edge cases
  if (capital <= 0 || duration <= 0) {
    return 0
  }

  // Calculate simple return percentage
  const returnPercent = (pl / capital) * 100

  // Annualize based on 365-day year
  const annualizedReturn = (returnPercent / duration) * 365

  return annualizedReturn
}

/**
 * Calculate win rate from cycle history
 *
 * Win rate is the percentage of cycles that were profitable (P&L > 0).
 * This metric helps assess the strategy's overall success rate.
 *
 * @param cycles - Array of completed wheel cycles
 * @returns Win rate as a percentage (0-100)
 *
 * Formula:
 * - Win Rate % = (Profitable Cycles / Total Cycles) * 100
 *
 * @example
 * const cycles = [
 *   { realizedPL: 1200 },  // win
 *   { realizedPL: -300 },  // loss
 *   { realizedPL: 850 },   // win
 *   { realizedPL: 0 },     // breakeven (not counted as win)
 * ]
 * // Returns: 50% (2 wins out of 4 cycles)
 */
export function calculateWinRate(cycles: WheelCycle[]): number {
  if (cycles.length === 0) {
    return 0
  }

  // Count profitable cycles (P&L > 0)
  const profitableCycles = cycles.filter((cycle) => {
    const pl = calculateCyclePL(cycle)
    return pl > 0
  }).length

  // Calculate win rate percentage
  const winRate = (profitableCycles / cycles.length) * 100

  return winRate
}

/**
 * Suggest optimal call strike price based on desired return
 *
 * Calculates the minimum strike price needed to achieve a desired return
 * when the call is assigned. Strike price must be above cost basis to
 * avoid realizing a loss.
 *
 * @param position - Current stock position with costBasis
 * @param desiredReturn - Desired return as a percentage (e.g., 5 for 5%)
 * @returns Suggested strike price
 *
 * Formula:
 * - Desired Profit Per Share = (Cost Basis * Desired Return %) / 100
 * - Suggested Strike = Cost Basis + Desired Profit Per Share
 *
 * @example
 * const position = {
 *   costBasis: 147.50,
 *   shares: 100
 * }
 * suggestCallStrike(position, 5)
 * // Returns: 154.88 (147.50 * 1.05)
 * // This gives a 5% return on cost basis if assigned
 */
export function suggestCallStrike(
  position: { costBasis: number },
  desiredReturn: number
): number {
  const costBasis = position.costBasis

  // Handle edge cases
  if (costBasis <= 0 || desiredReturn < 0) {
    return costBasis
  }

  // Calculate desired profit per share
  const desiredProfitPerShare = (costBasis * desiredReturn) / 100

  // Suggested strike = cost basis + desired profit
  const suggestedStrike = costBasis + desiredProfitPerShare

  return suggestedStrike
}

/**
 * Validate that user has sufficient cash to cover a PUT assignment
 *
 * Cash-secured puts require enough cash to purchase shares if assigned.
 * This validation helps prevent over-leveraging and ensures proper risk management.
 *
 * @param user - User with optional cash balance information
 * @param strikePrice - Strike price of the PUT
 * @param contracts - Number of contracts (each contract = 100 shares)
 * @returns true if user has sufficient cash, false otherwise
 *
 * Formula:
 * - Shares = Contracts * 100
 * - Required Cash = Strike Price * Shares
 * - Valid = User Cash Balance >= Required Cash
 *
 * Note: If cashBalance is not provided, validation is skipped and returns true.
 * This allows the function to work before cash tracking is fully implemented.
 *
 * @example
 * const user = { cashBalance: 20000 }
 * validateCashRequirement(user, 150, 1)
 * // Returns: true (needs $15,000, has $20,000)
 *
 * validateCashRequirement(user, 150, 2)
 * // Returns: false (needs $30,000, only has $20,000)
 */
export function validateCashRequirement(
  user: UserData,
  strikePrice: number,
  contracts: number
): boolean {
  // Handle edge cases
  if (strikePrice <= 0 || contracts <= 0) {
    return false
  }

  // Calculate required cash
  const shares = contracts * 100
  const requiredCash = strikePrice * shares

  // Check if user has cash balance field
  // If not present, return true (skip validation)
  if (user.cashBalance === null || user.cashBalance === undefined) {
    // Cash balance tracking not implemented yet
    // Return true to allow trade (validation will be added later)
    return true
  }

  const availableCash = user.cashBalance

  // Validate sufficient cash
  return availableCash >= requiredCash
}
