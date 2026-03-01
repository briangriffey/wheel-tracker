import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'
import { Prisma } from '@/lib/generated/prisma'
import type { User, CashDeposit, MarketBenchmark } from '@/lib/generated/prisma'
import {
  recordCashDeposit,
  recordCashWithdrawal,
  getCashDeposits,
  getDepositSummary,
  deleteCashDeposit,
} from '../deposits'

// Mock auth
vi.mock('@/lib/auth', () => ({
  getCurrentUserId: vi.fn(),
}))

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    cashDeposit: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    marketBenchmark: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}))

// Mock market data service
vi.mock('@/lib/services/market-data', () => ({
  fetchStockPrice: vi.fn(),
  getLatestPrice: vi.fn(),
}))

// Mock Next.js cache revalidation
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { fetchStockPrice, getLatestPrice } from '@/lib/services/market-data'

describe('Deposit Actions', () => {
  const mockUser: User = {
    id: 'user1',
    email: 'test@example.com',
    name: 'Test User',
    emailVerified: null,
    image: null,
    password: null,
    subscriptionTier: 'FREE',
    subscriptionStartDate: null,
    subscriptionEndDate: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    subscriptionStatus: null,
    subscriptionEndsAt: null,
    onboardingCompletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Default: return mock user ID
    vi.mocked(getCurrentUserId).mockResolvedValue('user1')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('recordCashDeposit', () => {
    it('should record a cash deposit with SPY price fetching', async () => {
      const depositDate = new Date('2026-02-10')
      const amount = 5000
      const spyPrice = 480.5

      // Mock SPY price fetch
      vi.mocked(getLatestPrice).mockResolvedValue(null)
      vi.mocked(fetchStockPrice).mockResolvedValue({
        ticker: 'SPY',
        price: spyPrice,
        date: depositDate,
        success: true,
      })

      // Mock no existing benchmark
      vi.mocked(prisma.marketBenchmark.findUnique).mockResolvedValue(null)

      // Mock benchmark creation
      const mockBenchmark: MarketBenchmark = {
        id: 'benchmark1',
        userId: mockUser.id,
        ticker: 'SPY',
        initialCapital: new Prisma.Decimal(0),
        setupDate: new Date(),
        initialPrice: new Prisma.Decimal(0),
        shares: new Prisma.Decimal(0),
        migrated: false,
        migratedAt: null,
        lastUpdated: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      vi.mocked(prisma.marketBenchmark.create).mockResolvedValue(mockBenchmark)

      // Mock deposit creation
      const expectedShares = amount / spyPrice
      const mockDeposit: CashDeposit = {
        id: 'deposit1',
        userId: mockUser.id,
        amount: new Prisma.Decimal(amount),
        type: 'DEPOSIT',
        depositDate,
        notes: null,
        spyPrice: new Prisma.Decimal(spyPrice),
        spyShares: new Prisma.Decimal(expectedShares),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      vi.mocked(prisma.cashDeposit.create).mockResolvedValue(mockDeposit)

      // Mock findMany for benchmark update
      vi.mocked(prisma.cashDeposit.findMany).mockResolvedValue([mockDeposit])

      const result = await recordCashDeposit({
        amount,
        depositDate,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.amount).toBe(amount)
        expect(result.data.spyPrice).toBe(spyPrice)
        expect(result.data.spyShares).toBeCloseTo(expectedShares, 4)
        expect(result.data.type).toBe('DEPOSIT')
      }

      expect(prisma.cashDeposit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUser.id,
          type: 'DEPOSIT',
          depositDate,
        }),
      })
    })

    it('should calculate SPY shares correctly', async () => {
      const depositDate = new Date('2026-02-10')
      const amount = 10000
      const spyPrice = 500

      vi.mocked(getLatestPrice).mockResolvedValue(null)
      vi.mocked(fetchStockPrice).mockResolvedValue({
        ticker: 'SPY',
        price: spyPrice,
        date: depositDate,
        success: true,
      })

      vi.mocked(prisma.marketBenchmark.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.marketBenchmark.create).mockResolvedValue({
        id: 'benchmark1',
        userId: mockUser.id,
        ticker: 'SPY',
        initialCapital: new Prisma.Decimal(0),
        setupDate: new Date(),
        initialPrice: new Prisma.Decimal(0),
        shares: new Prisma.Decimal(0),
        migrated: false,
        migratedAt: null,
        lastUpdated: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const expectedShares = 20 // 10000 / 500 = 20 shares
      const mockDeposit: CashDeposit = {
        id: 'deposit1',
        userId: mockUser.id,
        amount: new Prisma.Decimal(amount),
        type: 'DEPOSIT',
        depositDate,
        notes: null,
        spyPrice: new Prisma.Decimal(spyPrice),
        spyShares: new Prisma.Decimal(expectedShares),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(prisma.cashDeposit.create).mockResolvedValue(mockDeposit)
      vi.mocked(prisma.cashDeposit.findMany).mockResolvedValue([mockDeposit])

      const result = await recordCashDeposit({
        amount,
        depositDate,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.spyShares).toBe(expectedShares)
      }
    })

    it('should handle SPY price fetch failure', async () => {
      vi.mocked(getLatestPrice).mockResolvedValue(null)
      vi.mocked(fetchStockPrice).mockResolvedValue({
        ticker: 'SPY',
        price: 0,
        date: new Date(),
        success: false,
        error: 'API rate limit exceeded',
      })

      const result = await recordCashDeposit({
        amount: 5000,
        depositDate: new Date(),
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Failed to fetch SPY price')
      }
    })

    it('should include optional notes', async () => {
      const notes = 'Initial funding from savings'
      const depositDate = new Date('2026-02-10')

      vi.mocked(getLatestPrice).mockResolvedValue(null)
      vi.mocked(fetchStockPrice).mockResolvedValue({
        ticker: 'SPY',
        price: 480,
        date: depositDate,
        success: true,
      })

      vi.mocked(prisma.marketBenchmark.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.marketBenchmark.create).mockResolvedValue({
        id: 'benchmark1',
        userId: mockUser.id,
        ticker: 'SPY',
        initialCapital: new Prisma.Decimal(0),
        setupDate: new Date(),
        initialPrice: new Prisma.Decimal(0),
        shares: new Prisma.Decimal(0),
        migrated: false,
        migratedAt: null,
        lastUpdated: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const mockDeposit: CashDeposit = {
        id: 'deposit1',
        userId: mockUser.id,
        amount: new Prisma.Decimal(5000),
        type: 'DEPOSIT',
        depositDate,
        notes,
        spyPrice: new Prisma.Decimal(480),
        spyShares: new Prisma.Decimal(10.42),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(prisma.cashDeposit.create).mockResolvedValue(mockDeposit)
      vi.mocked(prisma.cashDeposit.findMany).mockResolvedValue([mockDeposit])

      const result = await recordCashDeposit({
        amount: 5000,
        depositDate,
        notes,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.notes).toBe(notes)
      }
    })
  })

  describe('getCashDeposits', () => {
    it('should return all deposits for user', async () => {
      const mockDeposits: CashDeposit[] = [
        {
          id: 'deposit1',
          userId: mockUser.id,
          amount: new Prisma.Decimal(5000),
          type: 'DEPOSIT',
          depositDate: new Date('2026-01-01'),
          notes: 'Initial',
          spyPrice: new Prisma.Decimal(450),
          spyShares: new Prisma.Decimal(11.11),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'deposit2',
          userId: mockUser.id,
          amount: new Prisma.Decimal(3000),
          type: 'DEPOSIT',
          depositDate: new Date('2026-02-01'),
          notes: null,
          spyPrice: new Prisma.Decimal(475),
          spyShares: new Prisma.Decimal(6.32),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(prisma.cashDeposit.findMany).mockResolvedValue(mockDeposits)

      const result = await getCashDeposits()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data[0].amount).toBe(5000)
        expect(result.data[1].amount).toBe(3000)
      }
    })

    it('should filter by deposit type', async () => {
      const mockDeposits: CashDeposit[] = [
        {
          id: 'deposit1',
          userId: mockUser.id,
          amount: new Prisma.Decimal(5000),
          type: 'DEPOSIT',
          depositDate: new Date('2026-01-01'),
          notes: null,
          spyPrice: new Prisma.Decimal(450),
          spyShares: new Prisma.Decimal(11.11),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(prisma.cashDeposit.findMany).mockResolvedValue(mockDeposits)

      const result = await getCashDeposits({ type: 'DEPOSIT' })

      expect(result.success).toBe(true)
      expect(prisma.cashDeposit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'DEPOSIT',
          }),
        })
      )
    })

    it('should filter by date range', async () => {
      const startDate = new Date('2026-01-01')
      const endDate = new Date('2026-01-31')

      vi.mocked(prisma.cashDeposit.findMany).mockResolvedValue([])

      await getCashDeposits({ startDate, endDate })

      expect(prisma.cashDeposit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            depositDate: {
              gte: startDate,
              lte: endDate,
            },
          }),
        })
      )
    })
  })

  describe('getDepositSummary', () => {
    it('should calculate summary metrics correctly', async () => {
      const mockDeposits: CashDeposit[] = [
        {
          id: 'deposit1',
          userId: mockUser.id,
          amount: new Prisma.Decimal(5000),
          type: 'DEPOSIT',
          depositDate: new Date('2026-01-01'),
          notes: null,
          spyPrice: new Prisma.Decimal(450),
          spyShares: new Prisma.Decimal(11.11),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'deposit2',
          userId: mockUser.id,
          amount: new Prisma.Decimal(3000),
          type: 'DEPOSIT',
          depositDate: new Date('2026-02-01'),
          notes: null,
          spyPrice: new Prisma.Decimal(475),
          spyShares: new Prisma.Decimal(6.32),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'withdrawal1',
          userId: mockUser.id,
          amount: new Prisma.Decimal(-1000),
          type: 'WITHDRAWAL',
          depositDate: new Date('2026-03-01'),
          notes: null,
          spyPrice: new Prisma.Decimal(480),
          spyShares: new Prisma.Decimal(-2.08),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(prisma.cashDeposit.findMany).mockResolvedValue(mockDeposits)

      const result = await getDepositSummary()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.totalDeposits).toBe(8000) // 5000 + 3000
        expect(result.data.totalWithdrawals).toBe(1000)
        expect(result.data.depositCount).toBe(2)
        expect(result.data.withdrawalCount).toBe(1)
        expect(result.data.netInvested).toBe(7000) // 8000 - 1000
        expect(result.data.totalSpyShares).toBeCloseTo(15.35, 2) // 11.11 + 6.32 - 2.08
      }
    })

    it('should return zero metrics when no deposits', async () => {
      vi.mocked(prisma.cashDeposit.findMany).mockResolvedValue([])

      const result = await getDepositSummary()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.totalDeposits).toBe(0)
        expect(result.data.depositCount).toBe(0)
        expect(result.data.netInvested).toBe(0)
        expect(result.data.totalSpyShares).toBe(0)
        expect(result.data.avgCostBasis).toBe(0)
        expect(result.data.firstDepositDate).toBeNull()
        expect(result.data.lastDepositDate).toBeNull()
      }
    })
  })

  describe('recordCashWithdrawal', () => {
    it('should record a withdrawal with negative values', async () => {
      const withdrawalDate = new Date('2026-02-10')
      const amount = 1000
      const spyPrice = 480

      // Mock existing deposits
      const mockDeposits: CashDeposit[] = [
        {
          id: 'deposit1',
          userId: mockUser.id,
          amount: new Prisma.Decimal(5000),
          type: 'DEPOSIT',
          depositDate: new Date('2026-01-01'),
          notes: null,
          spyPrice: new Prisma.Decimal(450),
          spyShares: new Prisma.Decimal(11.11),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(prisma.cashDeposit.findMany).mockResolvedValueOnce(mockDeposits)

      vi.mocked(getLatestPrice).mockResolvedValue(null)
      vi.mocked(fetchStockPrice).mockResolvedValue({
        ticker: 'SPY',
        price: spyPrice,
        date: withdrawalDate,
        success: true,
      })

      const expectedShares = -(amount / spyPrice)
      const mockWithdrawal: CashDeposit = {
        id: 'withdrawal1',
        userId: mockUser.id,
        amount: new Prisma.Decimal(-amount),
        type: 'WITHDRAWAL',
        depositDate: withdrawalDate,
        notes: null,
        spyPrice: new Prisma.Decimal(spyPrice),
        spyShares: new Prisma.Decimal(expectedShares),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(prisma.cashDeposit.create).mockResolvedValue(mockWithdrawal)
      vi.mocked(prisma.cashDeposit.findMany).mockResolvedValueOnce([
        ...mockDeposits,
        mockWithdrawal,
      ])

      const result = await recordCashWithdrawal({
        amount,
        depositDate: withdrawalDate,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.amount).toBe(-amount)
        expect(result.data.type).toBe('WITHDRAWAL')
        expect(result.data.spyShares).toBeLessThan(0)
      }
    })

    it('should prevent withdrawal exceeding total invested', async () => {
      // Mock existing deposits totaling $5000
      const mockDeposits: CashDeposit[] = [
        {
          id: 'deposit1',
          userId: mockUser.id,
          amount: new Prisma.Decimal(5000),
          type: 'DEPOSIT',
          depositDate: new Date('2026-01-01'),
          notes: null,
          spyPrice: new Prisma.Decimal(450),
          spyShares: new Prisma.Decimal(11.11),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(prisma.cashDeposit.findMany).mockResolvedValue(mockDeposits)

      // Try to withdraw $6000 (more than deposited)
      const result = await recordCashWithdrawal({
        amount: 6000,
        depositDate: new Date(),
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Cannot withdraw')
        expect(result.error).toContain('$6000')
        expect(result.error).toContain('$5000')
      }

      expect(prisma.cashDeposit.create).not.toHaveBeenCalled()
    })
  })

  describe('deleteCashDeposit', () => {
    it('should delete a deposit and recalculate benchmark', async () => {
      const depositId = 'clx1234567890'
      const depositToDelete: CashDeposit = {
        id: depositId,
        userId: mockUser.id,
        amount: new Prisma.Decimal(5000),
        type: 'DEPOSIT',
        depositDate: new Date('2026-01-01'),
        notes: null,
        spyPrice: new Prisma.Decimal(450),
        spyShares: new Prisma.Decimal(11.11),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(prisma.cashDeposit.findUnique).mockResolvedValue(depositToDelete)
      vi.mocked(prisma.cashDeposit.delete).mockResolvedValue(depositToDelete)
      vi.mocked(prisma.cashDeposit.findMany).mockResolvedValue([])

      const result = await deleteCashDeposit({ id: depositId })

      expect(result.success).toBe(true)
      expect(prisma.cashDeposit.delete).toHaveBeenCalledWith({
        where: { id: depositId },
      })
    })

    it("should prevent deleting another user's deposit", async () => {
      const depositId = 'clx1234567891'
      const otherUserDeposit: CashDeposit = {
        id: depositId,
        userId: 'otheruser',
        amount: new Prisma.Decimal(5000),
        type: 'DEPOSIT',
        depositDate: new Date('2026-01-01'),
        notes: null,
        spyPrice: new Prisma.Decimal(450),
        spyShares: new Prisma.Decimal(11.11),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(prisma.cashDeposit.findUnique).mockResolvedValue(otherUserDeposit)

      const result = await deleteCashDeposit({ id: depositId })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Unauthorized')
      }
      expect(prisma.cashDeposit.delete).not.toHaveBeenCalled()
    })

    it('should handle non-existent deposit', async () => {
      const depositId = 'clx1234567892'
      vi.mocked(prisma.cashDeposit.findUnique).mockResolvedValue(null)

      const result = await deleteCashDeposit({ id: depositId })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Deposit not found')
      }
      expect(prisma.cashDeposit.delete).not.toHaveBeenCalled()
    })
  })
})
