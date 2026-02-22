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
    // Real API response format — field names differ from our OptionChainRecord interface.
    // The API uses: contract_name, strike_price, expiration_date, put_or_call ("Put"/"Call")
    const mockChainData = [
      {
        trading_symbol: 'MSFT',
        central_index_key: '0000789019',
        registrant_name: 'MICROSOFT CORP',
        contract_name: 'MSFT271217P00660000',
        expiration_date: '2027-12-17',
        put_or_call: 'Put',
        strike_price: 660.0,
      },
      {
        trading_symbol: 'MSFT',
        central_index_key: '0000789019',
        registrant_name: 'MICROSOFT CORP',
        contract_name: 'MSFT271217C00660000',
        expiration_date: '2027-12-17',
        put_or_call: 'Call',
        strike_price: 660.0,
      },
      {
        trading_symbol: 'MSFT',
        central_index_key: '0000789019',
        registrant_name: 'MICROSOFT CORP',
        contract_name: 'MSFT271219P00620000',
        expiration_date: '2027-12-19',
        put_or_call: 'Put',
        strike_price: 620.0,
      },
    ]

    it('should map raw API fields to canonical OptionChainRecord shape', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockChainData),
      }))

      const result: OptionChainResult = await fetchOptionChain('MSFT')

      expect(result.success).toBe(true)
      expect(result.ticker).toBe('MSFT')
      expect(result.contracts).toHaveLength(3)

      // contract_name → identifier
      expect(result.contracts[0].identifier).toBe('MSFT271217P00660000')
      // strike_price → strike
      expect(result.contracts[0].strike).toBe(660.0)
      // expiration_date → expiration
      expect(result.contracts[0].expiration).toBe('2027-12-17')
      // put_or_call → type (preserves API capitalization: "Put" / "Call")
      expect(result.contracts[0].type).toBe('Put')
      expect(result.contracts[1].type).toBe('Call')
    })

    it('should preserve "Put"/"Call" capitalization from API (not lowercase)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockChainData),
      }))

      const result = await fetchOptionChain('MSFT')

      const types = result.contracts.map((c) => c.type)
      expect(types).toContain('Put')
      expect(types).toContain('Call')
      expect(types).not.toContain('put')
      expect(types).not.toContain('call')
    })

    it('should not expose raw API field names on returned contracts', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockChainData),
      }))

      const result = await fetchOptionChain('MSFT')
      const contract = result.contracts[0] as unknown as Record<string, unknown>

      // Raw field names must not leak through
      expect(contract['contract_name']).toBeUndefined()
      expect(contract['strike_price']).toBeUndefined()
      expect(contract['expiration_date']).toBeUndefined()
      expect(contract['put_or_call']).toBeUndefined()

      // Canonical field names must be present
      expect(contract['identifier']).toBeDefined()
      expect(contract['strike']).toBeDefined()
      expect(contract['expiration']).toBeDefined()
      expect(contract['type']).toBeDefined()
    })

    it('should uppercase the ticker', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockChainData),
      }))

      const result = await fetchOptionChain('msft')

      expect(result.ticker).toBe('MSFT')
    })

    it('should call correct API endpoint', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockChainData),
      })
      vi.stubGlobal('fetch', mockFetch)

      await fetchOptionChain('MSFT')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('option-chain?identifier=MSFT&key=test-api-key')
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

      const result = await fetchOptionChain('MSFT')

      expect(result.success).toBe(false)
      expect(result.error).toContain('authentication')
    })

    it('should return error for HTTP 429', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      }))

      const result = await fetchOptionChain('MSFT')

      expect(result.success).toBe(false)
      expect(result.error).toContain('rate limit')
    })

    it('should return error when fetch throws', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Connection refused')))

      const result = await fetchOptionChain('MSFT')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to fetch')
    })

    it('should throw when API key is not configured', async () => {
      delete process.env.FINANCIAL_DATA_API_KEY

      await expect(fetchOptionChain('MSFT')).rejects.toThrow('FINANCIAL_DATA_API_KEY')
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
