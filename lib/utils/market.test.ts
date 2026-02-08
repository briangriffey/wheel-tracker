import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  isMarketOpen,
  getNextMarketOpen,
  getActiveTickers,
  getAllTickers,
  formatDateString,
  isMarketHoliday,
  isWeekend,
} from './market'
import { prisma } from '@/lib/db'

describe('Market Utilities', () => {
  let testUserId: string

  beforeAll(async () => {
    // Create a test user
    const user = await prisma.user.upsert({
      where: { email: 'test-market@example.com' },
      update: {},
      create: {
        email: 'test-market@example.com',
        name: 'Market Test User',
      },
    })
    testUserId = user.id

    // Clean up any existing test data - positions first due to foreign key constraint
    await prisma.position.deleteMany({ where: { userId: testUserId } })
    await prisma.trade.deleteMany({ where: { userId: testUserId } })
  })

  afterAll(async () => {
    // Clean up - positions first due to foreign key constraint
    await prisma.position.deleteMany({ where: { userId: testUserId } })
    await prisma.trade.deleteMany({ where: { userId: testUserId } })
  })

  describe('isMarketOpen', () => {
    it('should return false for Saturday', () => {
      const saturday = new Date('2026-02-07T10:00:00-05:00') // Saturday
      expect(isMarketOpen(saturday)).toBe(false)
    })

    it('should return false for Sunday', () => {
      const sunday = new Date('2026-02-08T10:00:00-05:00') // Sunday
      expect(isMarketOpen(sunday)).toBe(false)
    })

    it('should return true for weekday during market hours', () => {
      const wednesday = new Date('2026-02-04T10:00:00-05:00') // Wednesday 10 AM ET
      expect(isMarketOpen(wednesday)).toBe(true)
    })

    it('should return false before market opens', () => {
      const earlyMorning = new Date('2026-02-04T09:00:00-05:00') // 9:00 AM ET
      expect(isMarketOpen(earlyMorning)).toBe(false)
    })

    it('should return false after market closes', () => {
      const evening = new Date('2026-02-04T17:00:00-05:00') // 5:00 PM ET
      expect(isMarketOpen(evening)).toBe(false)
    })

    it('should return true at market open (9:30 AM)', () => {
      const marketOpen = new Date('2026-02-04T09:30:00-05:00')
      expect(isMarketOpen(marketOpen)).toBe(true)
    })

    it('should return false at market close (4:00 PM)', () => {
      const marketClose = new Date('2026-02-04T16:00:00-05:00')
      expect(isMarketOpen(marketClose)).toBe(false)
    })

    it('should return false on New Years Day', () => {
      const newYears = new Date('2026-01-01T10:00:00-05:00')
      expect(isMarketOpen(newYears)).toBe(false)
    })

    it('should return false on Christmas', () => {
      const christmas = new Date('2026-12-25T10:00:00-05:00')
      expect(isMarketOpen(christmas)).toBe(false)
    })

    it('should return false on Independence Day (observed)', () => {
      const july4th = new Date('2026-07-03T10:00:00-05:00')
      expect(isMarketOpen(july4th)).toBe(false)
    })
  })

  describe('getNextMarketOpen', () => {
    it('should return next weekday if called on Friday evening', () => {
      const friday = new Date('2026-02-06T17:00:00-05:00') // Friday 5 PM ET
      const nextOpen = getNextMarketOpen(friday)

      const dayOfWeek = nextOpen.getDay()
      expect(dayOfWeek).toBeGreaterThanOrEqual(1) // Monday = 1
      expect(dayOfWeek).toBeLessThanOrEqual(5) // Friday = 5
    })

    it('should skip weekends', () => {
      const saturday = new Date('2026-02-07T10:00:00-05:00')
      const nextOpen = getNextMarketOpen(saturday)

      expect(nextOpen.getDay()).not.toBe(0) // Not Sunday
      expect(nextOpen.getDay()).not.toBe(6) // Not Saturday
    })

    it('should return a future date', () => {
      const now = new Date()
      const nextOpen = getNextMarketOpen(now)
      expect(nextOpen.getTime()).toBeGreaterThan(now.getTime())
    })
  })

  describe('Ticker Queries', () => {
    beforeAll(async () => {
      // Create test data
      // Create an open trade
      await prisma.trade.create({
        data: {
          userId: testUserId,
          ticker: 'AAPL',
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          status: 'OPEN',
          strikePrice: 150,
          premium: 500,
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2026-03-01'),
        },
      })

      // Create a closed trade (should not be included in active)
      await prisma.trade.create({
        data: {
          userId: testUserId,
          ticker: 'TSLA',
          type: 'CALL',
          action: 'SELL_TO_OPEN',
          status: 'CLOSED',
          strikePrice: 250,
          premium: 300,
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2026-02-15'),
          closeDate: new Date('2026-02-01'),
        },
      })

      // Create an assigned PUT that creates a position
      const assignedTrade = await prisma.trade.create({
        data: {
          userId: testUserId,
          ticker: 'MSFT',
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          status: 'ASSIGNED',
          strikePrice: 400,
          premium: 800,
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2026-02-01'),
          closeDate: new Date('2026-02-01'),
        },
      })

      // Create an open position
      await prisma.position.create({
        data: {
          userId: testUserId,
          ticker: 'MSFT',
          shares: 100,
          costBasis: 400,
          totalCost: 40000,
          status: 'OPEN',
          acquiredDate: new Date('2026-02-01'),
          assignmentTradeId: assignedTrade.id,
        },
      })
    })

    describe('getActiveTickers', () => {

    it('should return tickers from open positions', async () => {
      const tickers = await getActiveTickers(testUserId)

      expect(tickers).toContain('MSFT')
    })

    it('should return tickers from open trades', async () => {
      const tickers = await getActiveTickers(testUserId)

      expect(tickers).toContain('AAPL')
    })

    it('should not return tickers from closed trades', async () => {
      const tickers = await getActiveTickers(testUserId)

      expect(tickers).not.toContain('TSLA')
    })

    it('should deduplicate tickers', async () => {
      const tickers = await getActiveTickers(testUserId)

      const uniqueTickers = [...new Set(tickers)]
      expect(tickers.length).toBe(uniqueTickers.length)
    })

    it('should return uppercase tickers', async () => {
      const tickers = await getActiveTickers(testUserId)

      for (const ticker of tickers) {
        expect(ticker).toBe(ticker.toUpperCase())
      }
    })

    it('should return sorted tickers', async () => {
      const tickers = await getActiveTickers(testUserId)

      const sorted = [...tickers].sort()
      expect(tickers).toEqual(sorted)
    })

    it('should return empty array if no active tickers', async () => {
      // Create a user with no data
      const emptyUser = await prisma.user.create({
        data: {
          email: 'empty-user@example.com',
          name: 'Empty User',
        },
      })

      const tickers = await getActiveTickers(emptyUser.id)
      expect(tickers).toEqual([])

      // Cleanup
      await prisma.user.delete({ where: { id: emptyUser.id } })
    })
    })

    describe('getAllTickers', () => {
    it('should return all tickers including closed', async () => {
      const tickers = await getAllTickers(testUserId)

      // Test should have AAPL (open trade), MSFT (open position), and TSLA (closed trade)
      expect(tickers.length).toBeGreaterThanOrEqual(3)
      expect(tickers).toContain('AAPL')
      expect(tickers).toContain('MSFT')
      expect(tickers).toContain('TSLA')
    })

    it('should deduplicate tickers', async () => {
      const tickers = await getAllTickers(testUserId)

      const uniqueTickers = [...new Set(tickers)]
      expect(tickers.length).toBe(uniqueTickers.length)
    })

    it('should return sorted tickers', async () => {
      const tickers = await getAllTickers(testUserId)

      const sorted = [...tickers].sort()
      expect(tickers).toEqual(sorted)
    })
    })
  })

  describe('formatDateString', () => {
    it('should format date to YYYY-MM-DD', () => {
      const date = new Date('2026-02-07T10:00:00')
      const formatted = formatDateString(date)

      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(formatted).toBe('2026-02-07')
    })

    it('should handle different dates', () => {
      const date = new Date('2025-12-25T00:00:00')
      expect(formatDateString(date)).toBe('2025-12-25')
    })
  })

  describe('isMarketHoliday', () => {
    it('should return true for New Years Day', () => {
      const newYears = new Date('2026-01-01')
      expect(isMarketHoliday(newYears)).toBe(true)
    })

    it('should return true for Christmas', () => {
      const christmas = new Date('2026-12-25')
      expect(isMarketHoliday(christmas)).toBe(true)
    })

    it('should return false for regular trading day', () => {
      const regularDay = new Date('2026-02-04')
      expect(isMarketHoliday(regularDay)).toBe(false)
    })
  })

  describe('isWeekend', () => {
    it('should return true for Saturday', () => {
      // Create a specific date and time to ensure correct day of week
      const saturday = new Date(2026, 1, 21, 12, 0, 0) // February 21, 2026 is a Saturday
      expect(isWeekend(saturday)).toBe(true)
    })

    it('should return true for Sunday', () => {
      const sunday = new Date(2026, 1, 22, 12, 0, 0) // February 22, 2026 is a Sunday
      expect(isWeekend(sunday)).toBe(true)
    })

    it('should return false for Monday', () => {
      const monday = new Date(2026, 1, 23, 12, 0, 0) // February 23, 2026 is a Monday
      expect(isWeekend(monday)).toBe(false)
    })

    it('should return false for Friday', () => {
      const friday = new Date(2026, 1, 20, 12, 0, 0) // February 20, 2026 is a Friday
      expect(isWeekend(friday)).toBe(false)
    })

    it('should return false for Wednesday', () => {
      const wednesday = new Date(2026, 1, 18, 12, 0, 0) // February 18, 2026 is a Wednesday
      expect(isWeekend(wednesday)).toBe(false)
    })
  })
})
