'use server'

import { fetchStockPrice, getLatestPrice } from '@/lib/services/market-data'

/**
 * Preview calculation result
 */
export interface DepositPreview {
  spyPrice: number
  spyShares: number
  priceDate: Date
}

/**
 * Fetch SPY price for a given date (for preview purposes)
 * Uses cached price if available, otherwise fetches fresh
 */
async function getSPYPriceForDate(date: Date): Promise<{ price: number; success: boolean; error?: string }> {
  try {
    // First check if we have a cached price for this date
    const cachedPrice = await getLatestPrice('SPY')

    if (cachedPrice) {
      // Check if cached price is from the same day or recent
      const priceDate = new Date(cachedPrice.date)
      const targetDate = new Date(date)

      // If dates match (same day), use cached price
      if (
        priceDate.getFullYear() === targetDate.getFullYear() &&
        priceDate.getMonth() === targetDate.getMonth() &&
        priceDate.getDate() === targetDate.getDate()
      ) {
        return { price: cachedPrice.price, success: true }
      }

      // If deposit is for today and price is recent (within 24 hours), use it
      const now = new Date()
      const isToday =
        targetDate.getFullYear() === now.getFullYear() &&
        targetDate.getMonth() === now.getMonth() &&
        targetDate.getDate() === now.getDate()

      if (isToday && cachedPrice) {
        return { price: cachedPrice.price, success: true }
      }
    }

    // If no cached price or date doesn't match, fetch fresh
    const result = await fetchStockPrice('SPY')

    if (!result.success || !result.price) {
      return {
        price: 0,
        success: false,
        error: result.error || 'Failed to fetch SPY price',
      }
    }

    return { price: result.price, success: true }
  } catch (error) {
    console.error('Error fetching SPY price:', error)
    return {
      price: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Calculate deposit preview without saving
 * Returns SPY price and calculated shares for the given amount and date
 */
export async function calculateDepositPreview(
  amount: number,
  depositDate: Date
): Promise<{ success: true; data: DepositPreview } | { success: false; error: string }> {
  try {
    // Validate inputs
    if (!amount || amount <= 0) {
      return { success: false, error: 'Amount must be greater than 0' }
    }

    if (!depositDate || depositDate > new Date()) {
      return { success: false, error: 'Deposit date cannot be in the future' }
    }

    // Fetch SPY price for the deposit date
    const priceResult = await getSPYPriceForDate(depositDate)

    if (!priceResult.success) {
      return {
        success: false,
        error: `Failed to fetch SPY price: ${priceResult.error}`,
      }
    }

    const spyPrice = priceResult.price

    // Calculate SPY shares
    const spyShares = amount / spyPrice

    return {
      success: true,
      data: {
        spyPrice,
        spyShares,
        priceDate: depositDate,
      },
    }
  } catch (error) {
    console.error('Error calculating deposit preview:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to calculate deposit preview' }
  }
}

/**
 * Withdrawal preview result (extends DepositPreview with net invested info)
 */
export interface WithdrawalPreview extends DepositPreview {
  netInvested: number
  remainingAfterWithdrawal: number
}

/**
 * Calculate withdrawal preview without saving
 * Returns SPY price, calculated shares, and validates against net invested
 */
export async function calculateWithdrawalPreview(
  amount: number,
  withdrawalDate: Date
): Promise<{ success: true; data: WithdrawalPreview } | { success: false; error: string }> {
  try {
    // Validate inputs
    if (!amount || amount <= 0) {
      return { success: false, error: 'Amount must be greater than 0' }
    }

    if (!withdrawalDate || withdrawalDate > new Date()) {
      return { success: false, error: 'Withdrawal date cannot be in the future' }
    }

    // Get current net invested amount
    const { prisma } = await import('@/lib/db')

    // Get current user
    const user = await prisma.user.findFirst()
    if (!user) {
      return { success: false, error: 'No user found' }
    }

    // Calculate net invested
    const deposits = await prisma.cashDeposit.findMany({
      where: { userId: user.id },
    })

    const netInvested = deposits.reduce((sum, d) => sum + d.amount.toNumber(), 0)

    // Validate withdrawal amount
    if (amount > netInvested) {
      return {
        success: false,
        error: `Cannot withdraw $${amount.toFixed(2)}. You have only invested $${netInvested.toFixed(2)} total.`,
      }
    }

    // Fetch SPY price for the withdrawal date
    const priceResult = await getSPYPriceForDate(withdrawalDate)

    if (!priceResult.success) {
      return {
        success: false,
        error: `Failed to fetch SPY price: ${priceResult.error}`,
      }
    }

    const spyPrice = priceResult.price

    // Calculate SPY shares (negative for withdrawal)
    const spyShares = -(amount / spyPrice)

    return {
      success: true,
      data: {
        spyPrice,
        spyShares,
        priceDate: withdrawalDate,
        netInvested,
        remainingAfterWithdrawal: netInvested - amount,
      },
    }
  } catch (error) {
    console.error('Error calculating withdrawal preview:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to calculate withdrawal preview' }
  }
}
