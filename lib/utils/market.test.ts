import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  isMarketOpen,
  getNextMarketOpen,
  getLastMarketClose,
  canRefreshPrice,
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

  // Note: Market hours are 8:30 AM - 3:30 PM CT (America/Chicago)
  // In February, CT = CST = UTC-6. ET = EST = UTC-5.
  // So 10 AM CT = 16:00 UTC, 8:30 AM CT = 14:30 UTC, 3:30 PM CT = 21:30 UTC

  describe('isMarketOpen', () => {
    it('should return false for Saturday', () => {
      const saturday = new Date('2026-02-07T16:00:00Z') // Saturday 10 AM CT
      expect(isMarketOpen(saturday)).toBe(false)
    })

    it('should return false for Sunday', () => {
      const sunday = new Date('2026-02-08T16:00:00Z') // Sunday 10 AM CT
      expect(isMarketOpen(sunday)).toBe(false)
    })

    it('should return true for weekday during market hours', () => {
      const wednesday = new Date('2026-02-04T16:00:00Z') // Wednesday 10 AM CT
      expect(isMarketOpen(wednesday)).toBe(true)
    })

    it('should return false before market opens', () => {
      const earlyMorning = new Date('2026-02-04T14:00:00Z') // 8:00 AM CT
      expect(isMarketOpen(earlyMorning)).toBe(false)
    })

    it('should return false after market closes', () => {
      const evening = new Date('2026-02-04T22:00:00Z') // 4:00 PM CT
      expect(isMarketOpen(evening)).toBe(false)
    })

    it('should return true at market open (8:30 AM CT)', () => {
      const marketOpen = new Date('2026-02-04T14:30:00Z') // 8:30 AM CT
      expect(isMarketOpen(marketOpen)).toBe(true)
    })

    it('should return false at market close (3:30 PM CT)', () => {
      const marketClose = new Date('2026-02-04T21:30:00Z') // 3:30 PM CT
      expect(isMarketOpen(marketClose)).toBe(false)
    })

    it('should return false on New Years Day', () => {
      const newYears = new Date('2026-01-01T16:00:00Z')
      expect(isMarketOpen(newYears)).toBe(false)
    })

    it('should return false on Christmas', () => {
      const christmas = new Date('2026-12-25T16:00:00Z')
      expect(isMarketOpen(christmas)).toBe(false)
    })

    it('should return false on Independence Day (observed)', () => {
      const july4th = new Date('2026-07-03T16:00:00Z')
      expect(isMarketOpen(july4th)).toBe(false)
    })
  })

  describe('getNextMarketOpen', () => {
    it('should return next weekday if called on Friday evening', () => {
      const friday = new Date('2026-02-06T23:00:00Z') // Friday 5 PM CT
      const nextOpen = getNextMarketOpen(friday)

      // Should be a weekday
      const ctOpen = new Date(nextOpen.toLocaleString('en-US', { timeZone: 'America/Chicago' }))
      const dayOfWeek = ctOpen.getDay()
      expect(dayOfWeek).toBeGreaterThanOrEqual(1) // Monday = 1
      expect(dayOfWeek).toBeLessThanOrEqual(5) // Friday = 5
    })

    it('should skip weekends', () => {
      const saturday = new Date('2026-02-07T16:00:00Z')
      const nextOpen = getNextMarketOpen(saturday)

      const ctOpen = new Date(nextOpen.toLocaleString('en-US', { timeZone: 'America/Chicago' }))
      expect(ctOpen.getDay()).not.toBe(0) // Not Sunday
      expect(ctOpen.getDay()).not.toBe(6) // Not Saturday
    })

    it('should return a future date', () => {
      const now = new Date()
      const nextOpen = getNextMarketOpen(now)
      expect(nextOpen.getTime()).toBeGreaterThan(now.getTime())
    })
  })

  describe('getLastMarketClose', () => {
    it('should return today close if called after close on a trading day', () => {
      // Wednesday Feb 4 at 5 PM CT (23:00 UTC)
      const afterClose = new Date('2026-02-04T23:00:00Z')
      const lastClose = getLastMarketClose(afterClose)

      // Should be Feb 4 close (3:30 PM CT = 21:30 UTC)
      expect(lastClose.getTime()).toBeLessThanOrEqual(afterClose.getTime())
      expect(lastClose.getTime()).toBeGreaterThan(afterClose.getTime() - 4 * 60 * 60 * 1000)
    })

    it('should return previous Friday close if called on Saturday', () => {
      // Saturday Feb 7, 10 AM CT
      const saturday = new Date('2026-02-07T16:00:00Z')
      const lastClose = getLastMarketClose(saturday)

      // Should be Friday Feb 6 close
      expect(lastClose.getTime()).toBeLessThan(saturday.getTime())
    })

    it('should return previous day close if called before open on a trading day', () => {
      // Thursday Feb 5, 7 AM CT (13:00 UTC)
      const beforeOpen = new Date('2026-02-05T13:00:00Z')
      const lastClose = getLastMarketClose(beforeOpen)

      // Should be Wed Feb 4 close
      expect(lastClose.getTime()).toBeLessThan(beforeOpen.getTime())
    })
  })

  describe('canRefreshPrice', () => {
    it('should allow refresh during market hours if price is > 4 hours old', () => {
      // Wednesday 1 PM CT (19:00 UTC)
      const now = new Date('2026-02-04T19:00:00Z')
      // Updated 5 hours ago
      const updatedAt = new Date(now.getTime() - 5 * 60 * 60 * 1000)

      const result = canRefreshPrice(updatedAt, now)
      expect(result.canRefresh).toBe(true)
    })

    it('should not allow refresh during market hours if price is < 4 hours old', () => {
      // Wednesday 1 PM CT (19:00 UTC)
      const now = new Date('2026-02-04T19:00:00Z')
      // Updated 2 hours ago
      const updatedAt = new Date(now.getTime() - 2 * 60 * 60 * 1000)

      const result = canRefreshPrice(updatedAt, now)
      expect(result.canRefresh).toBe(false)
      expect(result.nextRefreshAt).not.toBeNull()
    })

    it('should allow refresh after close if price was last updated before close', () => {
      // Wednesday 5 PM CT (23:00 UTC) - after close
      const now = new Date('2026-02-04T23:00:00Z')
      // Updated at 2 PM CT (20:00 UTC) - before close at 3:30 PM CT
      const updatedAt = new Date('2026-02-04T20:00:00Z')

      const result = canRefreshPrice(updatedAt, now)
      expect(result.canRefresh).toBe(true)
    })

    it('should not allow refresh after close if already updated since close', () => {
      // Wednesday 5 PM CT (23:00 UTC) - after close
      const now = new Date('2026-02-04T23:00:00Z')
      // Updated at 4 PM CT (22:00 UTC) - after close at 3:30 PM CT
      const updatedAt = new Date('2026-02-04T22:00:00Z')

      const result = canRefreshPrice(updatedAt, now)
      expect(result.canRefresh).toBe(false)
      expect(result.nextRefreshAt).not.toBeNull()
    })

    it('should allow refresh on weekend if not updated since last Friday close', () => {
      // Saturday Feb 7 at 10 AM CT (16:00 UTC)
      const now = new Date('2026-02-07T16:00:00Z')
      // Updated Thursday at 2 PM CT
      const updatedAt = new Date('2026-02-05T20:00:00Z')

      const result = canRefreshPrice(updatedAt, now)
      expect(result.canRefresh).toBe(true)
    })

    it('should not allow refresh on weekend if already updated since Friday close', () => {
      // Saturday Feb 7 at 10 AM CT (16:00 UTC)
      const now = new Date('2026-02-07T16:00:00Z')
      // Updated Friday at 4 PM CT (22:00 UTC) - after close
      const updatedAt = new Date('2026-02-06T22:00:00Z')

      const result = canRefreshPrice(updatedAt, now)
      expect(result.canRefresh).toBe(false)
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

      it('should always include SPY for benchmark tracking', async () => {
        const tickers = await getActiveTickers(testUserId)
        expect(tickers).toContain('SPY')
      })

      it('should return only SPY if no active tickers', async () => {
        // Create a user with no data
        const emptyUser = await prisma.user.create({
          data: {
            email: 'empty-user@example.com',
            name: 'Empty User',
          },
        })

        const tickers = await getActiveTickers(emptyUser.id)
        expect(tickers).toEqual(['SPY'])

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
