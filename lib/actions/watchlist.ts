'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import {
  AddWatchlistTickerSchema,
  RemoveWatchlistTickerSchema,
  type AddWatchlistTickerInput,
  type RemoveWatchlistTickerInput,
} from '@/lib/validations/watchlist'
import { auth } from '@/lib/auth'
import { runFullScan, type FullScanResult } from '@/lib/services/scanner'

type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string }

async function getCurrentUserId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}

export interface WatchlistTickerData {
  id: string
  ticker: string
  notes: string | null
  addedAt: Date
}

export async function addWatchlistTicker(
  input: AddWatchlistTickerInput
): Promise<ActionResult<WatchlistTickerData>> {
  try {
    const validated = AddWatchlistTickerSchema.parse(input)

    const userId = await getCurrentUserId()
    if (!userId) {
      return { success: false, error: 'Unauthorized. Please log in.' }
    }

    // Check for duplicate
    const existing = await prisma.watchlistTicker.findUnique({
      where: { userId_ticker: { userId, ticker: validated.ticker } },
    })

    if (existing) {
      return { success: false, error: `${validated.ticker} is already in your watchlist` }
    }

    const ticker = await prisma.watchlistTicker.create({
      data: {
        userId,
        ticker: validated.ticker,
        notes: validated.notes,
      },
      select: {
        id: true,
        ticker: true,
        notes: true,
        addedAt: true,
      },
    })

    revalidatePath('/scanner')

    return { success: true, data: ticker }
  } catch (error) {
    console.error('Error adding watchlist ticker:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to add ticker to watchlist' }
  }
}

export async function removeWatchlistTicker(
  input: RemoveWatchlistTickerInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const validated = RemoveWatchlistTickerSchema.parse(input)

    const userId = await getCurrentUserId()
    if (!userId) {
      return { success: false, error: 'Unauthorized. Please log in.' }
    }

    // Verify ownership
    const existing = await prisma.watchlistTicker.findUnique({
      where: { id: validated.id },
      select: { userId: true },
    })

    if (!existing) {
      return { success: false, error: 'Ticker not found' }
    }

    if (existing.userId !== userId) {
      return { success: false, error: 'Unauthorized' }
    }

    await prisma.watchlistTicker.delete({
      where: { id: validated.id },
    })

    revalidatePath('/scanner')

    return { success: true, data: { id: validated.id } }
  } catch (error) {
    console.error('Error removing watchlist ticker:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to remove ticker from watchlist' }
  }
}

export async function triggerManualScan(): Promise<ActionResult<FullScanResult>> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { success: false, error: 'Unauthorized. Please log in.' }
    }

    const result = await runFullScan(userId)
    revalidatePath('/scanner')

    return { success: true, data: result }
  } catch (error) {
    console.error('Error running manual scan:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to run scan' }
  }
}

export async function getWatchlistTickers(): Promise<ActionResult<WatchlistTickerData[]>> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { success: false, error: 'Unauthorized. Please log in.' }
    }

    const tickers = await prisma.watchlistTicker.findMany({
      where: { userId },
      select: {
        id: true,
        ticker: true,
        notes: true,
        addedAt: true,
      },
      orderBy: { addedAt: 'desc' },
    })

    return { success: true, data: tickers }
  } catch (error) {
    console.error('Error fetching watchlist tickers:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to fetch watchlist' }
  }
}
