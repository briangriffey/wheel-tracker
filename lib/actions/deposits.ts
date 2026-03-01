'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { Prisma } from '@/lib/generated/prisma'
import { auth } from '@/lib/auth'
import { fetchStockPrice, getLatestPrice } from '@/lib/services/market-data'
import {
  RecordDepositSchema,
  RecordWithdrawalSchema,
  DeleteDepositSchema,
  GetDepositsSchema,
  type RecordDepositInput,
  type RecordWithdrawalInput,
  type DeleteDepositInput,
  type GetDepositsInput,
} from '@/lib/validations/deposit'

/**
 * Server action result type
 */
type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown }

/**
 * Cash deposit with calculated fields
 */
export interface CashDepositData {
  id: string
  userId: string
  amount: number
  type: 'DEPOSIT' | 'WITHDRAWAL'
  depositDate: Date
  notes: string | null
  spyPrice: number
  spyShares: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Deposit summary metrics
 */
export interface DepositSummary {
  totalDeposits: number
  totalWithdrawals: number
  depositCount: number
  withdrawalCount: number
  netInvested: number
  totalSpyShares: number
  avgCostBasis: number
  firstDepositDate: Date | null
  lastDepositDate: Date | null
}

async function getCurrentUserId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}

/**
 * Fetch SPY price for a given date
 * Uses cached price if available, otherwise fetches fresh
 */
async function getSPYPriceForDate(
  date: Date
): Promise<{ price: number; success: boolean; error?: string }> {
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
 * Get or create SPY benchmark for user
 */
async function getOrCreateSPYBenchmark(userId: string) {
  let benchmark = await prisma.marketBenchmark.findUnique({
    where: {
      userId_ticker: {
        userId,
        ticker: 'SPY',
      },
    },
  })

  if (!benchmark) {
    // Create initial benchmark with zero values
    // It will be updated when first deposit is recorded
    benchmark = await prisma.marketBenchmark.create({
      data: {
        userId,
        ticker: 'SPY',
        initialCapital: new Prisma.Decimal(0),
        setupDate: new Date(),
        initialPrice: new Prisma.Decimal(0),
        shares: new Prisma.Decimal(0),
      },
    })
  }

  return benchmark
}

/**
 * Update SPY benchmark based on deposits
 */
async function updateSPYBenchmark(userId: string): Promise<void> {
  // Get all deposits for this user
  const deposits = await prisma.cashDeposit.findMany({
    where: { userId },
    orderBy: { depositDate: 'asc' },
  })

  if (deposits.length === 0) {
    return
  }

  // Calculate totals
  const totalShares = deposits.reduce((sum, d) => sum + d.spyShares.toNumber(), 0)
  const totalCapital = deposits.reduce((sum, d) => sum + d.amount.toNumber(), 0)

  // Get or create benchmark
  const benchmark = await getOrCreateSPYBenchmark(userId)

  // Get first deposit for setup date and price
  const firstDeposit = deposits[0]

  // Update benchmark with deposit-based totals
  await prisma.marketBenchmark.update({
    where: { id: benchmark.id },
    data: {
      shares: new Prisma.Decimal(totalShares),
      initialCapital: new Prisma.Decimal(totalCapital),
      setupDate: firstDeposit.depositDate,
      initialPrice: firstDeposit.spyPrice,
      lastUpdated: new Date(),
    },
  })
}

/**
 * Record a cash deposit
 * Automatically calculates SPY shares and updates benchmark
 */
export async function recordCashDeposit(
  input: RecordDepositInput
): Promise<ActionResult<CashDepositData>> {
  try {
    // Validate input
    const validated = RecordDepositSchema.parse(input)
    const { amount, depositDate, notes } = validated

    // Get current user
    const userId = await getCurrentUserId()
    if (!userId) return { success: false, error: 'Not authenticated' }

    // Fetch SPY price for the deposit date
    const priceResult = await getSPYPriceForDate(depositDate)

    if (!priceResult.success) {
      return {
        success: false,
        error: `Failed to fetch SPY price: ${priceResult.error}`,
      }
    }

    const spyPrice = priceResult.price

    // Calculate SPY shares to add
    const spyShares = amount / spyPrice

    // Create deposit record in a transaction with benchmark update
    const deposit = await prisma.$transaction(async (tx) => {
      // Create deposit
      const newDeposit = await tx.cashDeposit.create({
        data: {
          userId,
          amount: new Prisma.Decimal(amount),
          type: 'DEPOSIT',
          depositDate,
          notes: notes || null,
          spyPrice: new Prisma.Decimal(spyPrice),
          spyShares: new Prisma.Decimal(spyShares),
        },
      })

      return newDeposit
    })

    // Update benchmark (outside transaction to avoid deadlocks)
    await updateSPYBenchmark(userId)

    // Revalidate relevant paths
    revalidatePath('/dashboard')
    revalidatePath('/deposits')

    return {
      success: true,
      data: {
        id: deposit.id,
        userId: deposit.userId,
        amount: deposit.amount.toNumber(),
        type: deposit.type as 'DEPOSIT' | 'WITHDRAWAL',
        depositDate: deposit.depositDate,
        notes: deposit.notes,
        spyPrice: deposit.spyPrice.toNumber(),
        spyShares: deposit.spyShares.toNumber(),
        createdAt: deposit.createdAt,
        updatedAt: deposit.updatedAt,
      },
    }
  } catch (error) {
    console.error('Error recording cash deposit:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to record cash deposit' }
  }
}

/**
 * Record a cash withdrawal
 * Automatically calculates SPY shares to remove and updates benchmark
 */
export async function recordCashWithdrawal(
  input: RecordWithdrawalInput
): Promise<ActionResult<CashDepositData>> {
  try {
    // Validate input
    const validated = RecordWithdrawalSchema.parse(input)
    const { amount, depositDate, notes } = validated

    // Get current user
    const userId = await getCurrentUserId()
    if (!userId) return { success: false, error: 'Not authenticated' }

    // Check if user has enough invested capital
    const deposits = await prisma.cashDeposit.findMany({
      where: { userId },
    })

    const netInvested = deposits.reduce((sum, d) => sum + d.amount.toNumber(), 0)

    if (amount > netInvested) {
      return {
        success: false,
        error: `Cannot withdraw $${amount}. You have only invested $${netInvested} total.`,
      }
    }

    // Fetch SPY price for the withdrawal date
    const priceResult = await getSPYPriceForDate(depositDate)

    if (!priceResult.success) {
      return {
        success: false,
        error: `Failed to fetch SPY price: ${priceResult.error}`,
      }
    }

    const spyPrice = priceResult.price

    // Calculate SPY shares to remove (negative)
    const spyShares = -(amount / spyPrice)

    // Create withdrawal record
    const withdrawal = await prisma.cashDeposit.create({
      data: {
        userId,
        amount: new Prisma.Decimal(-amount), // Store as negative
        type: 'WITHDRAWAL',
        depositDate,
        notes: notes || null,
        spyPrice: new Prisma.Decimal(spyPrice),
        spyShares: new Prisma.Decimal(spyShares), // Negative shares
      },
    })

    // Update benchmark
    await updateSPYBenchmark(userId)

    // Revalidate relevant paths
    revalidatePath('/dashboard')
    revalidatePath('/deposits')

    return {
      success: true,
      data: {
        id: withdrawal.id,
        userId: withdrawal.userId,
        amount: withdrawal.amount.toNumber(),
        type: withdrawal.type as 'DEPOSIT' | 'WITHDRAWAL',
        depositDate: withdrawal.depositDate,
        notes: withdrawal.notes,
        spyPrice: withdrawal.spyPrice.toNumber(),
        spyShares: withdrawal.spyShares.toNumber(),
        createdAt: withdrawal.createdAt,
        updatedAt: withdrawal.updatedAt,
      },
    }
  } catch (error) {
    console.error('Error recording cash withdrawal:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to record cash withdrawal' }
  }
}

/**
 * Get all cash deposits for current user
 */
export async function getCashDeposits(
  filters?: GetDepositsInput
): Promise<ActionResult<CashDepositData[]>> {
  try {
    // Validate filters if provided
    const validated = filters ? GetDepositsSchema.parse(filters) : {}

    // Get current user
    const userId = await getCurrentUserId()
    if (!userId) return { success: false, error: 'Not authenticated' }

    // Build where clause
    const where: Prisma.CashDepositWhereInput = {
      userId,
    }

    if (validated.type) {
      where.type = validated.type
    }

    if (validated.startDate || validated.endDate) {
      where.depositDate = {}
      if (validated.startDate) {
        where.depositDate.gte = validated.startDate
      }
      if (validated.endDate) {
        where.depositDate.lte = validated.endDate
      }
    }

    // Query deposits
    const deposits = await prisma.cashDeposit.findMany({
      where,
      orderBy: { depositDate: 'desc' },
      take: validated.limit,
      skip: validated.offset,
    })

    return {
      success: true,
      data: deposits.map((d) => ({
        id: d.id,
        userId: d.userId,
        amount: d.amount.toNumber(),
        type: d.type as 'DEPOSIT' | 'WITHDRAWAL',
        depositDate: d.depositDate,
        notes: d.notes,
        spyPrice: d.spyPrice.toNumber(),
        spyShares: d.spyShares.toNumber(),
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
    }
  } catch (error) {
    console.error('Error getting cash deposits:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to get cash deposits' }
  }
}

/**
 * Get deposit summary metrics
 */
export async function getDepositSummary(): Promise<ActionResult<DepositSummary>> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return { success: false, error: 'Not authenticated' }

    const deposits = await prisma.cashDeposit.findMany({
      where: { userId },
      orderBy: { depositDate: 'asc' },
    })

    if (deposits.length === 0) {
      return {
        success: true,
        data: {
          totalDeposits: 0,
          totalWithdrawals: 0,
          depositCount: 0,
          withdrawalCount: 0,
          netInvested: 0,
          totalSpyShares: 0,
          avgCostBasis: 0,
          firstDepositDate: null,
          lastDepositDate: null,
        },
      }
    }

    const depositRecords = deposits.filter((d) => d.type === 'DEPOSIT')
    const withdrawalRecords = deposits.filter((d) => d.type === 'WITHDRAWAL')

    const totalDeposits = depositRecords.reduce((sum, d) => sum + d.amount.toNumber(), 0)
    const totalWithdrawals = withdrawalRecords.reduce(
      (sum, d) => sum + Math.abs(d.amount.toNumber()),
      0
    )
    const netInvested = deposits.reduce((sum, d) => sum + d.amount.toNumber(), 0)
    const totalSpyShares = deposits.reduce((sum, d) => sum + d.spyShares.toNumber(), 0)
    const avgCostBasis = totalSpyShares !== 0 ? netInvested / totalSpyShares : 0

    return {
      success: true,
      data: {
        totalDeposits,
        totalWithdrawals,
        depositCount: depositRecords.length,
        withdrawalCount: withdrawalRecords.length,
        netInvested,
        totalSpyShares,
        avgCostBasis,
        firstDepositDate: deposits[0].depositDate,
        lastDepositDate: deposits[deposits.length - 1].depositDate,
      },
    }
  } catch (error) {
    console.error('Error getting deposit summary:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to get deposit summary' }
  }
}

/**
 * Delete a cash deposit
 * WARNING: This will recalculate the benchmark
 */
export async function deleteCashDeposit(input: DeleteDepositInput): Promise<ActionResult<void>> {
  try {
    const validated = DeleteDepositSchema.parse(input)
    const { id } = validated

    const userId = await getCurrentUserId()
    if (!userId) return { success: false, error: 'Not authenticated' }

    // Check if deposit exists and belongs to user
    const deposit = await prisma.cashDeposit.findUnique({
      where: { id },
    })

    if (!deposit) {
      return { success: false, error: 'Deposit not found' }
    }

    if (deposit.userId !== userId) {
      return { success: false, error: 'Unauthorized' }
    }

    // Delete deposit
    await prisma.cashDeposit.delete({
      where: { id },
    })

    // Recalculate benchmark
    await updateSPYBenchmark(userId)

    // Revalidate paths
    revalidatePath('/dashboard')
    revalidatePath('/deposits')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('Error deleting cash deposit:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to delete cash deposit' }
  }
}

