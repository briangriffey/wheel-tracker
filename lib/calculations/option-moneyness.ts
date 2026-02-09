/**
 * Option Moneyness Calculation Utilities
 *
 * Determines if options are In-The-Money (ITM), At-The-Money (ATM), or Out-of-The-Money (OTM)
 */

/**
 * Option moneyness status
 */
export type MoneynessStatus = 'ITM' | 'ATM' | 'OTM'

/**
 * Moneyness result with additional context
 */
export interface MoneynessResult {
  status: MoneynessStatus
  intrinsicValue: number
  percentageFromStrike: number
}

/**
 * Calculate option moneyness for a PUT option
 *
 * PUT options:
 * - ITM (In-The-Money): Stock price < Strike price (profitable to exercise)
 * - ATM (At-The-Money): Stock price ≈ Strike price (within threshold)
 * - OTM (Out-of-The-Money): Stock price > Strike price (expires worthless)
 *
 * @param currentPrice - Current stock price
 * @param strikePrice - Option strike price
 * @param atmThreshold - Percentage threshold for ATM (default: 1% = 0.01)
 * @returns Moneyness status
 *
 * @example
 * calculatePutMoneyness(145, 150) // Returns 'ITM' (stock below strike)
 * calculatePutMoneyness(150.5, 150) // Returns 'ATM' (within 1% of strike)
 * calculatePutMoneyness(155, 150) // Returns 'OTM' (stock above strike)
 */
export function calculatePutMoneyness(
  currentPrice: number,
  strikePrice: number,
  atmThreshold: number = 0.01
): MoneynessStatus {
  const percentDiff = Math.abs((currentPrice - strikePrice) / strikePrice)

  // At-The-Money: within threshold
  if (percentDiff <= atmThreshold) {
    return 'ATM'
  }

  // In-The-Money: stock price below strike
  if (currentPrice < strikePrice) {
    return 'ITM'
  }

  // Out-of-The-Money: stock price above strike
  return 'OTM'
}

/**
 * Calculate option moneyness for a CALL option
 *
 * CALL options:
 * - ITM (In-The-Money): Stock price > Strike price (profitable to exercise)
 * - ATM (At-The-Money): Stock price ≈ Strike price (within threshold)
 * - OTM (Out-of-The-Money): Stock price < Strike price (expires worthless)
 *
 * @param currentPrice - Current stock price
 * @param strikePrice - Option strike price
 * @param atmThreshold - Percentage threshold for ATM (default: 1% = 0.01)
 * @returns Moneyness status
 *
 * @example
 * calculateCallMoneyness(155, 150) // Returns 'ITM' (stock above strike)
 * calculateCallMoneyness(150.5, 150) // Returns 'ATM' (within 1% of strike)
 * calculateCallMoneyness(145, 150) // Returns 'OTM' (stock below strike)
 */
export function calculateCallMoneyness(
  currentPrice: number,
  strikePrice: number,
  atmThreshold: number = 0.01
): MoneynessStatus {
  const percentDiff = Math.abs((currentPrice - strikePrice) / strikePrice)

  // At-The-Money: within threshold
  if (percentDiff <= atmThreshold) {
    return 'ATM'
  }

  // In-The-Money: stock price above strike
  if (currentPrice > strikePrice) {
    return 'ITM'
  }

  // Out-of-The-Money: stock price below strike
  return 'OTM'
}

/**
 * Calculate option moneyness with detailed information
 *
 * Provides comprehensive moneyness analysis including intrinsic value
 * and percentage distance from strike.
 *
 * @param currentPrice - Current stock price
 * @param strikePrice - Option strike price
 * @param optionType - 'PUT' or 'CALL'
 * @param atmThreshold - Percentage threshold for ATM (default: 1% = 0.01)
 * @returns Detailed moneyness result
 *
 * @example
 * calculateOptionMoneyness(145, 150, 'PUT')
 * // Returns: { status: 'ITM', intrinsicValue: 5, percentageFromStrike: -3.33 }
 */
export function calculateOptionMoneyness(
  currentPrice: number,
  strikePrice: number,
  optionType: 'PUT' | 'CALL',
  atmThreshold: number = 0.01
): MoneynessResult {
  // Calculate basic moneyness
  const status =
    optionType === 'PUT'
      ? calculatePutMoneyness(currentPrice, strikePrice, atmThreshold)
      : calculateCallMoneyness(currentPrice, strikePrice, atmThreshold)

  // Calculate intrinsic value (value if exercised now)
  let intrinsicValue = 0
  if (optionType === 'PUT' && currentPrice < strikePrice) {
    intrinsicValue = strikePrice - currentPrice
  } else if (optionType === 'CALL' && currentPrice > strikePrice) {
    intrinsicValue = currentPrice - strikePrice
  }

  // Calculate percentage from strike
  const percentageFromStrike = ((currentPrice - strikePrice) / strikePrice) * 100

  return {
    status,
    intrinsicValue,
    percentageFromStrike,
  }
}

/**
 * Get color coding for moneyness status
 *
 * Returns Tailwind CSS classes for visual indication:
 * - Green: OTM (safe, expires worthless)
 * - Yellow: ATM (near the money, watch closely)
 * - Red: ITM (likely to be assigned/exercised)
 *
 * @param status - Moneyness status
 * @returns Object with background and text color classes
 */
export function getMoneynessColor(status: MoneynessStatus): {
  bg: string
  text: string
  border: string
} {
  switch (status) {
    case 'OTM':
      return {
        bg: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-300',
      }
    case 'ATM':
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        border: 'border-yellow-300',
      }
    case 'ITM':
      return {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-300',
      }
  }
}
