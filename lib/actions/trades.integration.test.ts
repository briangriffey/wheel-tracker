import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { createTrade, updateTrade, updateTradeStatus, deleteTrade } from './trades'

let testUserId: string

describe('Trade Server Actions Integration Tests', () => {
  beforeAll(async () => {
    // Clean up and create test user
    await prisma.trade.deleteMany()
    await prisma.user.deleteMany({ where: { email: 'test-trades@example.com' } })

    const user = await prisma.user.create({
      data: {
        email: 'test-trades@example.com',
        name: 'Trade Test User',
      },
    })
    testUserId = user.id
  })

  afterAll(async () => {
    await prisma.trade.deleteMany({ where: { userId: testUserId } })
    await prisma.user.deleteMany({ where: { id: testUserId } })
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await prisma.trade.deleteMany({ where: { userId: testUserId } })
  })

  describe('createTrade', () => {
    it('should create a PUT trade successfully', async () => {
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1)

      const result = await createTrade({
        ticker: 'AAPL',
        type: 'PUT',
        action: 'SELL_TO_OPEN',
        strikePrice: 150.0,
        premium: 2.5,
        contracts: 1,
        expirationDate: nextMonth,
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.id).toBeDefined()

      // Verify in database
      const trade = await prisma.trade.findUnique({
        where: { id: result.data.id },
      })

      expect(trade).toBeDefined()
      expect(trade?.ticker).toBe('AAPL')
      expect(trade?.type).toBe('PUT')
      expect(Number(trade?.strikePrice)).toBe(150.0)
      expect(Number(trade?.premium)).toBe(2.5)
      expect(trade?.contracts).toBe(1)
      expect(trade?.shares).toBe(100)
      expect(trade?.status).toBe('OPEN')
    })

    it('should reject invalid ticker (too long)', async () => {
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1)

      const result = await createTrade({
        ticker: 'TOOLONG',
        type: 'PUT',
        action: 'SELL_TO_OPEN',
        strikePrice: 150.0,
        premium: 2.5,
        contracts: 1,
        expirationDate: nextMonth,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeDefined()
      }
    })

    it('should reject negative strike price', async () => {
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1)

      const result = await createTrade({
        ticker: 'AAPL',
        type: 'PUT',
        action: 'SELL_TO_OPEN',
        strikePrice: -10.0,
        premium: 2.5,
        contracts: 1,
        expirationDate: nextMonth,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeDefined()
      }
    })

    it('should reject past expiration date', async () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      const result = await createTrade({
        ticker: 'AAPL',
        type: 'PUT',
        action: 'SELL_TO_OPEN',
        strikePrice: 150.0,
        premium: 2.5,
        contracts: 1,
        expirationDate: yesterday,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeDefined()
      }
    })
  })
})
