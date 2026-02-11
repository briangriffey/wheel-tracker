/**
 * Lump Sum vs DCA Comparison Calculations
 *
 * Compares Dollar-Cost Averaging (DCA) through periodic deposits
 * against a hypothetical lump sum investment made at a specific date.
 */

import type { CashDepositData } from '@/lib/actions/deposits'

/**
 * Represents a point in time for the comparison chart
 */
export interface ComparisonDataPoint {
  date: Date
  dcaValue: number // Value of DCA strategy at this point
  lumpSumValue: number // Value of lump sum at this point
  dcaShares: number // Cumulative shares acquired via DCA
  dcaInvested: number // Cumulative capital invested via DCA
}

/**
 * Result of lump sum vs DCA comparison
 */
export interface LumpSumComparison {
  // Current totals
  dcaShares: number
  dcaInvested: number
  lumpSumShares: number
  lumpSumInvested: number

  // Current values (at present SPY price)
  dcaCurrentValue: number
  lumpSumCurrentValue: number

  // Returns
  dcaReturn: number // Absolute return in dollars
  lumpSumReturn: number
  dcaReturnPct: number // Percentage return
  lumpSumReturnPct: number

  // Comparison
  difference: number // DCA value - Lump sum value
  differencePct: number // Percentage difference
  timingBenefit: number // Positive if DCA helped, negative if hurt
  timingBenefitPct: number

  // What performed better
  winner: 'DCA' | 'LUMP_SUM' | 'TIE'

  // Historical data for charting
  dataPoints: ComparisonDataPoint[]

  // Summary
  lumpSumDate: Date
  firstDepositDate: Date
  lastDepositDate: Date
}

/**
 * Calculate lump sum comparison
 *
 * Compares actual DCA strategy (deposits over time) against
 * a hypothetical lump sum investment made on a specific date.
 *
 * @param deposits - All cash deposits (DCA strategy)
 * @param lumpSumDate - Date when hypothetical lump sum would have been invested
 * @param lumpSumPrice - SPY price on lump sum date
 * @param currentPrice - Current SPY price
 * @returns Comparison result
 */
export function calculateLumpSumComparison(
  deposits: CashDepositData[],
  lumpSumDate: Date,
  lumpSumPrice: number,
  currentPrice: number
): LumpSumComparison {
  if (deposits.length === 0) {
    throw new Error('No deposits to compare')
  }

  // Sort deposits by date
  const sortedDeposits = [...deposits].sort(
    (a, b) => new Date(a.depositDate).getTime() - new Date(b.depositDate).getTime()
  )

  const firstDeposit = sortedDeposits[0]
  const lastDeposit = sortedDeposits[sortedDeposits.length - 1]

  // Calculate DCA totals
  const dcaShares = sortedDeposits.reduce((sum, d) => sum + d.spyShares, 0)
  const dcaInvested = sortedDeposits.reduce((sum, d) => sum + d.amount, 0)
  const dcaCurrentValue = dcaShares * currentPrice
  const dcaReturn = dcaCurrentValue - dcaInvested
  const dcaReturnPct = dcaInvested !== 0 ? (dcaReturn / dcaInvested) * 100 : 0

  // Calculate lump sum totals
  const lumpSumInvested = dcaInvested // Same total capital
  const lumpSumShares = lumpSumInvested / lumpSumPrice
  const lumpSumCurrentValue = lumpSumShares * currentPrice
  const lumpSumReturn = lumpSumCurrentValue - lumpSumInvested
  const lumpSumReturnPct = lumpSumInvested !== 0 ? (lumpSumReturn / lumpSumInvested) * 100 : 0

  // Calculate difference
  const difference = dcaCurrentValue - lumpSumCurrentValue
  const differencePct =
    lumpSumCurrentValue !== 0 ? (difference / lumpSumCurrentValue) * 100 : 0
  const timingBenefit = difference
  const timingBenefitPct = differencePct

  // Determine winner
  let winner: 'DCA' | 'LUMP_SUM' | 'TIE'
  if (Math.abs(difference) < 0.01) {
    winner = 'TIE'
  } else if (difference > 0) {
    winner = 'DCA'
  } else {
    winner = 'LUMP_SUM'
  }

  // Generate historical data points for charting
  const dataPoints = generateComparisonDataPoints(
    sortedDeposits,
    lumpSumDate,
    lumpSumPrice,
    currentPrice
  )

  return {
    dcaShares,
    dcaInvested,
    lumpSumShares,
    lumpSumInvested,
    dcaCurrentValue,
    lumpSumCurrentValue,
    dcaReturn,
    lumpSumReturn,
    dcaReturnPct,
    lumpSumReturnPct,
    difference,
    differencePct,
    timingBenefit,
    timingBenefitPct,
    winner,
    dataPoints,
    lumpSumDate,
    firstDepositDate: new Date(firstDeposit.depositDate),
    lastDepositDate: new Date(lastDeposit.depositDate),
  }
}

/**
 * Generate data points for comparison chart
 *
 * Creates a time series showing how DCA and lump sum strategies
 * would have performed over time.
 */
function generateComparisonDataPoints(
  deposits: CashDepositData[],
  lumpSumDate: Date,
  lumpSumPrice: number,
  currentPrice: number
): ComparisonDataPoint[] {
  const dataPoints: ComparisonDataPoint[] = []

  // Calculate lump sum shares (constant throughout)
  const totalInvested = deposits.reduce((sum, d) => sum + d.amount, 0)
  const lumpSumShares = totalInvested / lumpSumPrice

  let dcaShares = 0
  let dcaInvested = 0

  // Add a data point for lump sum start (if before first deposit)
  const firstDepositDate = new Date(deposits[0].depositDate)
  const lumpSumDateTime = new Date(lumpSumDate).getTime()

  if (lumpSumDateTime < firstDepositDate.getTime()) {
    dataPoints.push({
      date: new Date(lumpSumDate),
      dcaValue: 0,
      lumpSumValue: totalInvested, // Lump sum invested at start
      dcaShares: 0,
      dcaInvested: 0,
    })
  }

  // Add data points for each deposit
  for (const deposit of deposits) {
    dcaShares += deposit.spyShares
    dcaInvested += deposit.amount

    // At each deposit, calculate values using deposit's SPY price
    const priceAtDeposit = deposit.spyPrice
    const dcaValueAtDeposit = dcaShares * priceAtDeposit
    const lumpSumValueAtDeposit = lumpSumShares * priceAtDeposit

    dataPoints.push({
      date: new Date(deposit.depositDate),
      dcaValue: dcaValueAtDeposit,
      lumpSumValue: lumpSumValueAtDeposit,
      dcaShares,
      dcaInvested,
    })
  }

  // Add final data point with current price
  dataPoints.push({
    date: new Date(), // Current date
    dcaValue: dcaShares * currentPrice,
    lumpSumValue: lumpSumShares * currentPrice,
    dcaShares,
    dcaInvested,
  })

  return dataPoints
}

/**
 * Calculate what-if scenario for a different lump sum date
 *
 * Allows users to explore "what if I had invested everything on this date?"
 *
 * @param deposits - All cash deposits
 * @param whatIfDate - Hypothetical lump sum investment date
 * @param whatIfPrice - SPY price on that date
 * @param currentPrice - Current SPY price
 * @returns Comparison result
 */
export function calculateWhatIfScenario(
  deposits: CashDepositData[],
  whatIfDate: Date,
  whatIfPrice: number,
  currentPrice: number
): LumpSumComparison {
  return calculateLumpSumComparison(deposits, whatIfDate, whatIfPrice, currentPrice)
}
