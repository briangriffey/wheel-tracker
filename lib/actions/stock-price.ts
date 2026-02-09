'use server'

import { fetchStockPrice as fetchStockPriceService } from '@/lib/services/market-data'

/**
 * Server action wrapper for fetching stock prices
 * This allows client components to fetch prices via server actions
 */
export async function fetchCurrentStockPrice(ticker: string) {
  try {
    const result = await fetchStockPriceService(ticker)
    return result
  } catch (error) {
    console.error(`Error fetching stock price for ${ticker}:`, error)
    return {
      ticker,
      price: 0,
      date: new Date(),
      success: false,
      error: 'Failed to fetch stock price',
    }
  }
}
