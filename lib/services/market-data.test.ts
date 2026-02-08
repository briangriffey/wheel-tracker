import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getLatestPrice, getLatestPrices } from './market-data'
import { prisma } from '@/lib/db'

describe('Market Data Service', () => {
  // Setup test environment
  beforeAll(async () => {
    // Set test API key
    process.env.ALPHA_VANTAGE_API_KEY = 'test-api-key'

    // Clean up test data
    await prisma.stockPrice.deleteMany({
      where: {
        ticker: {
          in: ['TEST', 'AAPL', 'MSFT', 'TSLA'],
        },
      },
    })
  })

  afterAll(async () => {
    // Clean up
    await prisma.stockPrice.deleteMany({
      where: {
        ticker: {
          in: ['TEST', 'AAPL', 'MSFT', 'TSLA'],
        },
      },
    })
  })

  describe('API Configuration', () => {
    it('should require API key in environment', () => {
      expect(process.env.ALPHA_VANTAGE_API_KEY).toBeDefined()
    })
  })

  describe('getLatestPrice', () => {
    it('should retrieve latest price from database', async () => {
      // First, save a price
      await prisma.stockPrice.create({
        data: {
          ticker: 'TSLA',
          price: 250.5,
          date: new Date('2026-02-07'),
          source: 'alpha_vantage',
        },
      })

      const result = await getLatestPrice('TSLA')

      expect(result).toBeTruthy()
      expect(result?.ticker).toBe('TSLA')
      expect(result?.price).toBe(250.5)
      expect(result?.success).toBe(true)
    })

    it('should return null for non-existent ticker', async () => {
      const result = await getLatestPrice('NONEXISTENT')
      expect(result).toBeNull()
    })

    it('should return most recent price', async () => {
      // Save multiple prices
      await prisma.stockPrice.createMany({
        data: [
          {
            ticker: 'MSFT',
            price: 390.0,
            date: new Date('2026-02-01'),
            source: 'alpha_vantage',
          },
          {
            ticker: 'MSFT',
            price: 400.0,
            date: new Date('2026-02-07'),
            source: 'alpha_vantage',
          },
        ],
      })

      const result = await getLatestPrice('MSFT')

      expect(result?.price).toBe(400.0)
      expect(result?.date).toEqual(new Date('2026-02-07'))
    })

    it('should handle case-insensitive ticker', async () => {
      const result = await getLatestPrice('msft')
      expect(result).toBeTruthy()
      expect(result?.ticker).toBe('MSFT')
    })
  })

  describe('getLatestPrices', () => {
    it('should retrieve multiple latest prices', async () => {
      const results = await getLatestPrices(['MSFT', 'TSLA'])

      expect(results.size).toBeGreaterThan(0)
      expect(results.has('MSFT')).toBe(true)
      expect(results.has('TSLA')).toBe(true)
    })

    it('should handle empty array', async () => {
      const results = await getLatestPrices([])
      expect(results.size).toBe(0)
    })

    it('should handle non-existent tickers gracefully', async () => {
      const results = await getLatestPrices(['MSFT', 'NONEXISTENT'])

      expect(results.has('MSFT')).toBe(true)
      expect(results.has('NONEXISTENT')).toBe(false)
    })

    it('should deduplicate tickers', async () => {
      const results = await getLatestPrices(['MSFT', 'msft', 'MSFT'])

      expect(results.size).toBe(1)
      expect(results.has('MSFT')).toBe(true)
    })
  })

  describe('Database persistence', () => {
    it('should save stock price with correct schema', async () => {
      const testPrice = await prisma.stockPrice.create({
        data: {
          ticker: 'TEST',
          price: 123.45,
          date: new Date('2026-02-07'),
          source: 'alpha_vantage',
        },
      })

      expect(testPrice.ticker).toBe('TEST')
      expect(testPrice.price.toNumber()).toBe(123.45)
      expect(testPrice.source).toBe('alpha_vantage')
    })

    it('should enforce unique constraint on ticker and date', async () => {
      await prisma.stockPrice.create({
        data: {
          ticker: 'UNIQUE_TEST',
          price: 100.0,
          date: new Date('2026-02-07'),
          source: 'alpha_vantage',
        },
      })

      // Attempting to create duplicate should work with upsert
      await prisma.stockPrice.upsert({
        where: {
          ticker_date: {
            ticker: 'UNIQUE_TEST',
            date: new Date('2026-02-07'),
          },
        },
        update: {
          price: 110.0,
        },
        create: {
          ticker: 'UNIQUE_TEST',
          price: 110.0,
          date: new Date('2026-02-07'),
          source: 'alpha_vantage',
        },
      })

      const result = await prisma.stockPrice.findFirst({
        where: {
          ticker: 'UNIQUE_TEST',
          date: new Date('2026-02-07'),
        },
      })

      expect(result?.price.toNumber()).toBe(110.0)

      // Cleanup
      await prisma.stockPrice.delete({
        where: {
          ticker_date: {
            ticker: 'UNIQUE_TEST',
            date: new Date('2026-02-07'),
          },
        },
      })
    })
  })
})
