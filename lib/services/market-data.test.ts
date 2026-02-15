import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import type { StockPriceResult } from './market-data'

// Mock prisma before importing the module under test
const mockUpsert = vi.fn()
const mockFindUnique = vi.fn()
const mockFindMany = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    stockPrice: {
      upsert: (...args: unknown[]) => mockUpsert(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}))

// Import after mocks are set up
const { fetchStockPrice, getLatestPrice, getLatestPrices } = await import('./market-data')

describe('Market Data Service', () => {
  const originalApiKey = process.env.FINANCIAL_DATA_API_KEY

  beforeAll(() => {
    vi.useFakeTimers()
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  beforeEach(() => {
    // Advance 2 minutes to clear the rate limiter's per-minute window
    vi.advanceTimersByTime(120000)
    vi.clearAllMocks()
    process.env.FINANCIAL_DATA_API_KEY = 'test-api-key'
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    if (originalApiKey) {
      process.env.FINANCIAL_DATA_API_KEY = originalApiKey
    } else {
      delete process.env.FINANCIAL_DATA_API_KEY
    }
  })

  describe('fetchStockPrice - FinancialData.net API', () => {
    it('should parse close and date from first element on success', async () => {
      const mockResponse: Array<{ date: string; open: number; high: number; low: number; close: number; volume: number }> = [
        { date: '2026-02-14', open: 150.0, high: 155.0, low: 149.0, close: 153.45, volume: 1000000 },
        { date: '2026-02-13', open: 148.0, high: 152.0, low: 147.0, close: 150.0, volume: 900000 },
      ]

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      }))
      mockUpsert.mockResolvedValue({})

      const result = await fetchStockPrice('AAPL')

      expect(result.ticker).toBe('AAPL')
      expect(result.price).toBe(153.45)
      expect(result.date).toEqual(new Date('2026-02-14'))
      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should return StockPriceResult with correct shape', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([
          { date: '2026-02-14', open: 150.0, high: 155.0, low: 149.0, close: 153.45, volume: 1000000 },
        ]),
      }))
      mockUpsert.mockResolvedValue({})

      const result: StockPriceResult = await fetchStockPrice('AAPL')

      expect(result).toHaveProperty('ticker')
      expect(result).toHaveProperty('price')
      expect(result).toHaveProperty('date')
      expect(result).toHaveProperty('success')
      expect(typeof result.ticker).toBe('string')
      expect(typeof result.price).toBe('number')
      expect(result.date).toBeInstanceOf(Date)
      expect(typeof result.success).toBe('boolean')
    })

    it('should uppercase ticker in result', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([
          { date: '2026-02-14', open: 150.0, high: 155.0, low: 149.0, close: 153.45, volume: 1000000 },
        ]),
      }))
      mockUpsert.mockResolvedValue({})

      const result = await fetchStockPrice('aapl')

      expect(result.ticker).toBe('AAPL')
    })

    it('should save price to database on success', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([
          { date: '2026-02-14', open: 150.0, high: 155.0, low: 149.0, close: 153.45, volume: 1000000 },
        ]),
      }))
      mockUpsert.mockResolvedValue({})

      await fetchStockPrice('AAPL')

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ticker: 'AAPL' },
          create: expect.objectContaining({ ticker: 'AAPL', source: 'financial_data' }),
        })
      )
    })

    it('should return error for empty array response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      }))

      const result = await fetchStockPrice('XYZ')

      expect(result.success).toBe(false)
      expect(result.price).toBe(0)
      expect(result.error).toContain('No data')
    })

    it('should return error for HTTP 401 (unauthorized)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      }))

      const result = await fetchStockPrice('AAPL')

      expect(result.success).toBe(false)
      expect(result.price).toBe(0)
      expect(result.error).toContain('authentication')
    })

    it('should return error for HTTP 429 (rate limited)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      }))

      const result = await fetchStockPrice('AAPL')

      expect(result.success).toBe(false)
      expect(result.price).toBe(0)
      expect(result.error).toContain('rate limit')
    })

    it('should return error for HTTP 5xx (server error)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      }))

      const result = await fetchStockPrice('AAPL')

      expect(result.success).toBe(false)
      expect(result.price).toBe(0)
      expect(result.error).toContain('server error')
    })

    it('should return error for HTTP 404 (unknown ticker)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      }))

      const result = await fetchStockPrice('AAPL')

      expect(result.success).toBe(false)
      expect(result.price).toBe(0)
      expect(result.error).toContain('No data')
    })

    it('should return error when fetch throws (network error)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))

      const result = await fetchStockPrice('AAPL')

      expect(result.success).toBe(false)
      expect(result.price).toBe(0)
      expect(result.error).toContain('Failed to fetch')
    })

    it('should return error when price is zero/NaN', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([
          { date: '2026-02-14', open: 0, high: 0, low: 0, close: 0, volume: 0 },
        ]),
      }))

      const result = await fetchStockPrice('AAPL')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid price')
    })

    it('should return error when close is NaN', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([
          { date: '2026-02-14', open: 150, high: 155, low: 149, close: NaN, volume: 1000000 },
        ]),
      }))

      const result = await fetchStockPrice('AAPL')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid price')
    })

    it('should not save to database on failure', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      }))

      await fetchStockPrice('AAPL')

      expect(mockUpsert).not.toHaveBeenCalled()
    })

    it('should throw when API key is not configured', async () => {
      delete process.env.FINANCIAL_DATA_API_KEY

      await expect(fetchStockPrice('AAPL')).rejects.toThrow('FINANCIAL_DATA_API_KEY')
    })
  })

  describe('getLatestPrice', () => {
    it('should retrieve latest price from database', async () => {
      mockFindUnique.mockResolvedValue({
        ticker: 'TSLA',
        price: { toNumber: () => 250.5 },
        updatedAt: new Date('2026-02-14'),
        source: 'financial_data',
      })

      const result = await getLatestPrice('TSLA')

      expect(result?.ticker).toBe('TSLA')
      expect(result?.price).toBe(250.5)
    })

    it('should return null for non-existent ticker', async () => {
      mockFindUnique.mockResolvedValue(null)

      const result = await getLatestPrice('NONEXISTENT')
      expect(result).toBeNull()
    })

    it('should handle case-insensitive ticker lookup', async () => {
      mockFindUnique.mockResolvedValue({
        ticker: 'MSFT',
        price: { toNumber: () => 400.0 },
        updatedAt: new Date('2026-02-14'),
        source: 'financial_data',
      })

      const result = await getLatestPrice('msft')

      expect(result?.ticker).toBe('MSFT')
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { ticker: 'MSFT' },
      })
    })

    it('should return null on database error', async () => {
      mockFindUnique.mockRejectedValue(new Error('DB error'))

      const result = await getLatestPrice('AAPL')
      expect(result).toBeNull()
    })
  })

  describe('getLatestPrices', () => {
    it('should retrieve multiple latest prices', async () => {
      mockFindMany.mockResolvedValue([
        { ticker: 'MSFT', price: { toNumber: () => 400.0 }, updatedAt: new Date(), source: 'financial_data' },
        { ticker: 'TSLA', price: { toNumber: () => 250.5 }, updatedAt: new Date(), source: 'financial_data' },
      ])

      const results = await getLatestPrices(['MSFT', 'TSLA'])

      expect(results.size).toBe(2)
      expect(results.has('MSFT')).toBe(true)
      expect(results.has('TSLA')).toBe(true)
    })

    it('should handle empty array', async () => {
      mockFindMany.mockResolvedValue([])

      const results = await getLatestPrices([])
      expect(results.size).toBe(0)
    })

    it('should handle non-existent tickers gracefully', async () => {
      mockFindMany.mockResolvedValue([
        { ticker: 'MSFT', price: { toNumber: () => 400.0 }, updatedAt: new Date(), source: 'financial_data' },
      ])

      const results = await getLatestPrices(['MSFT', 'NONEXISTENT'])

      expect(results.has('MSFT')).toBe(true)
      expect(results.has('NONEXISTENT')).toBe(false)
    })

    it('should deduplicate tickers', async () => {
      mockFindMany.mockResolvedValue([
        { ticker: 'MSFT', price: { toNumber: () => 400.0 }, updatedAt: new Date(), source: 'financial_data' },
      ])

      const results = await getLatestPrices(['MSFT', 'msft', 'MSFT'])

      expect(results.size).toBe(1)
      expect(results.has('MSFT')).toBe(true)
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { ticker: { in: ['MSFT'] } },
      })
    })

    it('should return empty map on database error', async () => {
      mockFindMany.mockRejectedValue(new Error('DB error'))

      const results = await getLatestPrices(['AAPL'])
      expect(results.size).toBe(0)
    })
  })
})
