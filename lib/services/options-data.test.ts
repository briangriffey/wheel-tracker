import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type {
  StockPriceHistoryResult,
  OptionChainResult,
  OptionGreeksResult,
  OptionPriceResult,
} from './options-data'

// Mock the rate limiter to execute immediately (no delays)
vi.mock('./rate-limiter', () => ({
  apiRateLimiter: {
    enqueue: <T>(fn: () => Promise<T>) => fn(),
    getQueueLength: () => 0,
  },
}))

// Import after mocks are set up
const {
  fetchStockPriceHistory,
  fetchOptionChain,
  fetchOptionGreeks,
  fetchOptionPrices,
} = await import('./options-data')

describe('Options Data Service', () => {
  const originalApiKey = process.env.FINANCIAL_DATA_API_KEY

  beforeEach(() => {
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

  // === fetchStockPriceHistory ===

  describe('fetchStockPriceHistory', () => {
    const mockPriceData = [
      { date: '2026-02-14', open: 178.0, high: 180.0, low: 177.0, close: 179.50, volume: 52000000 },
      { date: '2026-02-13', open: 176.0, high: 179.0, low: 175.0, close: 178.00, volume: 48000000 },
      { date: '2026-02-12', open: 175.0, high: 177.0, low: 174.0, close: 176.50, volume: 45000000 },
    ]

    it('should return full price history array on success', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockPriceData),
      }))

      const result: StockPriceHistoryResult = await fetchStockPriceHistory('AAPL')

      expect(result.success).toBe(true)
      expect(result.ticker).toBe('AAPL')
      expect(result.records).toHaveLength(3)
      expect(result.records[0].close).toBe(179.50)
      expect(result.error).toBeUndefined()
    })

    it('should uppercase the ticker', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockPriceData),
      }))

      const result = await fetchStockPriceHistory('aapl')

      expect(result.ticker).toBe('AAPL')
    })

    it('should call correct API endpoint', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockPriceData),
      })
      vi.stubGlobal('fetch', mockFetch)

      await fetchStockPriceHistory('AAPL')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('stock-prices?identifier=AAPL&key=test-api-key')
      )
    })

    it('should return error for empty array response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      }))

      const result = await fetchStockPriceHistory('XYZ')

      expect(result.success).toBe(false)
      expect(result.records).toHaveLength(0)
      expect(result.error).toContain('No price history')
    })

    it('should return error for HTTP 401', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      }))

      const result = await fetchStockPriceHistory('AAPL')

      expect(result.success).toBe(false)
      expect(result.error).toContain('authentication')
    })

    it('should return error for HTTP 404', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      }))

      const result = await fetchStockPriceHistory('AAPL')

      expect(result.success).toBe(false)
      expect(result.error).toContain('No data found')
    })

    it('should return error for HTTP 429', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      }))

      const result = await fetchStockPriceHistory('AAPL')

      expect(result.success).toBe(false)
      expect(result.error).toContain('rate limit')
    })

    it('should return error for HTTP 500', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      }))

      const result = await fetchStockPriceHistory('AAPL')

      expect(result.success).toBe(false)
      expect(result.error).toContain('server error')
    })

    it('should return error when fetch throws', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))

      const result = await fetchStockPriceHistory('AAPL')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to fetch')
    })

    it('should throw when API key is not configured', async () => {
      delete process.env.FINANCIAL_DATA_API_KEY

      await expect(fetchStockPriceHistory('AAPL')).rejects.toThrow('FINANCIAL_DATA_API_KEY')
    })
  })

  // === fetchOptionChain ===

  describe('fetchOptionChain', () => {
    const mockChainData = [
      { identifier: 'AAPL260320P00170000', strike: 170, expiration: '2026-03-20', type: 'put' },
      { identifier: 'AAPL260320C00190000', strike: 190, expiration: '2026-03-20', type: 'call' },
      { identifier: 'AAPL260417P00165000', strike: 165, expiration: '2026-04-17', type: 'put' },
    ]

    it('should return option chain contracts on success', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockChainData),
      }))

      const result: OptionChainResult = await fetchOptionChain('AAPL')

      expect(result.success).toBe(true)
      expect(result.ticker).toBe('AAPL')
      expect(result.contracts).toHaveLength(3)
      expect(result.contracts[0].identifier).toBe('AAPL260320P00170000')
      expect(result.contracts[0].type).toBe('put')
    })

    it('should uppercase the ticker', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockChainData),
      }))

      const result = await fetchOptionChain('aapl')

      expect(result.ticker).toBe('AAPL')
    })

    it('should call correct API endpoint', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockChainData),
      })
      vi.stubGlobal('fetch', mockFetch)

      await fetchOptionChain('AAPL')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('option-chain?identifier=AAPL&key=test-api-key')
      )
    })

    it('should return error for empty response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      }))

      const result = await fetchOptionChain('XYZ')

      expect(result.success).toBe(false)
      expect(result.error).toContain('No option chain')
    })

    it('should return error for HTTP 401', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      }))

      const result = await fetchOptionChain('AAPL')

      expect(result.success).toBe(false)
      expect(result.error).toContain('authentication')
    })

    it('should return error for HTTP 429', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      }))

      const result = await fetchOptionChain('AAPL')

      expect(result.success).toBe(false)
      expect(result.error).toContain('rate limit')
    })

    it('should return error when fetch throws', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Connection refused')))

      const result = await fetchOptionChain('AAPL')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to fetch')
    })

    it('should throw when API key is not configured', async () => {
      delete process.env.FINANCIAL_DATA_API_KEY

      await expect(fetchOptionChain('AAPL')).rejects.toThrow('FINANCIAL_DATA_API_KEY')
    })
  })

  // === fetchOptionGreeks ===

  describe('fetchOptionGreeks', () => {
    const mockGreeksData = [
      {
        date: '2026-02-14',
        delta: -0.228,
        gamma: 0.015,
        theta: -0.045,
        vega: 0.32,
        rho: -0.08,
        impliedVolatility: 0.285,
      },
      {
        date: '2026-02-13',
        delta: -0.235,
        gamma: 0.016,
        theta: -0.043,
        vega: 0.31,
        rho: -0.079,
        impliedVolatility: 0.290,
      },
    ]

    it('should return greeks records on success', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockGreeksData),
      }))

      const result: OptionGreeksResult = await fetchOptionGreeks('AAPL260320P00170000')

      expect(result.success).toBe(true)
      expect(result.contractName).toBe('AAPL260320P00170000')
      expect(result.records).toHaveLength(2)
      expect(result.records[0].delta).toBe(-0.228)
      expect(result.records[0].impliedVolatility).toBe(0.285)
    })

    it('should call correct API endpoint', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockGreeksData),
      })
      vi.stubGlobal('fetch', mockFetch)

      await fetchOptionGreeks('AAPL260320P00170000')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('option-greeks?identifier=AAPL260320P00170000&key=test-api-key')
      )
    })

    it('should return error for empty response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      }))

      const result = await fetchOptionGreeks('AAPL260320P00170000')

      expect(result.success).toBe(false)
      expect(result.error).toContain('No greeks data')
    })

    it('should return error for HTTP 404', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      }))

      const result = await fetchOptionGreeks('BADCONTRACT')

      expect(result.success).toBe(false)
      expect(result.error).toContain('No data found')
    })

    it('should return error for HTTP 500', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      }))

      const result = await fetchOptionGreeks('AAPL260320P00170000')

      expect(result.success).toBe(false)
      expect(result.error).toContain('server error')
    })

    it('should return error when fetch throws', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Timeout')))

      const result = await fetchOptionGreeks('AAPL260320P00170000')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to fetch')
    })

    it('should throw when API key is not configured', async () => {
      delete process.env.FINANCIAL_DATA_API_KEY

      await expect(fetchOptionGreeks('AAPL260320P00170000')).rejects.toThrow('FINANCIAL_DATA_API_KEY')
    })
  })

  // === fetchOptionPrices ===

  describe('fetchOptionPrices', () => {
    const mockPriceData = [
      {
        date: '2026-02-14',
        open: 2.10,
        high: 2.30,
        low: 2.05,
        close: 2.20,
        volume: 1500,
        openInterest: 2847,
      },
      {
        date: '2026-02-13',
        open: 2.00,
        high: 2.15,
        low: 1.95,
        close: 2.10,
        volume: 1200,
        openInterest: 2800,
      },
    ]

    it('should return option price records on success', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockPriceData),
      }))

      const result: OptionPriceResult = await fetchOptionPrices('AAPL260320P00170000')

      expect(result.success).toBe(true)
      expect(result.contractName).toBe('AAPL260320P00170000')
      expect(result.records).toHaveLength(2)
      expect(result.records[0].close).toBe(2.20)
      expect(result.records[0].openInterest).toBe(2847)
    })

    it('should call correct API endpoint', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockPriceData),
      })
      vi.stubGlobal('fetch', mockFetch)

      await fetchOptionPrices('AAPL260320P00170000')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('option-prices?identifier=AAPL260320P00170000&key=test-api-key')
      )
    })

    it('should return error for empty response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      }))

      const result = await fetchOptionPrices('AAPL260320P00170000')

      expect(result.success).toBe(false)
      expect(result.error).toContain('No price data')
    })

    it('should return error for HTTP 401', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      }))

      const result = await fetchOptionPrices('AAPL260320P00170000')

      expect(result.success).toBe(false)
      expect(result.error).toContain('authentication')
    })

    it('should return error for HTTP 429', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      }))

      const result = await fetchOptionPrices('AAPL260320P00170000')

      expect(result.success).toBe(false)
      expect(result.error).toContain('rate limit')
    })

    it('should return error when fetch throws', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('DNS failure')))

      const result = await fetchOptionPrices('AAPL260320P00170000')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to fetch')
    })

    it('should throw when API key is not configured', async () => {
      delete process.env.FINANCIAL_DATA_API_KEY

      await expect(fetchOptionPrices('AAPL260320P00170000')).rejects.toThrow('FINANCIAL_DATA_API_KEY')
    })

    it('should handle records without openInterest', async () => {
      const dataWithoutOI = [
        { date: '2026-02-14', open: 2.10, high: 2.30, low: 2.05, close: 2.20, volume: 1500 },
      ]
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(dataWithoutOI),
      }))

      const result = await fetchOptionPrices('AAPL260320P00170000')

      expect(result.success).toBe(true)
      expect(result.records[0].openInterest).toBeUndefined()
    })
  })
})
