import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { POST, GET } from './route'
import { NextRequest } from 'next/server'
import * as marketData from '@/lib/services/market-data'
import * as marketUtils from '@/lib/utils/market'

// Mock the modules
vi.mock('@/lib/services/market-data')
vi.mock('@/lib/utils/market')

describe('Cron Job: Update Prices', () => {
  const mockCronSecret = 'test-cron-secret-12345'
  const originalCronSecret = process.env.CRON_SECRET

  beforeEach(() => {
    // Set up environment
    process.env.CRON_SECRET = mockCronSecret

    // Reset all mocks
    vi.clearAllMocks()

    // Mock console methods to avoid cluttering test output
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    // Restore original environment
    if (originalCronSecret) {
      process.env.CRON_SECRET = originalCronSecret
    } else {
      delete process.env.CRON_SECRET
    }

    // Restore console methods
    vi.restoreAllMocks()
  })

  describe('GET /api/cron/update-prices', () => {
    it('should return health check when market is open', async () => {
      // Mock market as open
      vi.mocked(marketUtils.isMarketOpen).mockReturnValue(true)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('ready')
      expect(data.marketOpen).toBe(true)
      expect(data.message).toContain('operational')
    })

    it('should return health check when market is closed', async () => {
      // Mock market as closed
      vi.mocked(marketUtils.isMarketOpen).mockReturnValue(false)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('ready')
      expect(data.marketOpen).toBe(false)
    })
  })

  describe('POST /api/cron/update-prices - Authentication', () => {
    it('should reject requests without authorization header', async () => {
      const request = new NextRequest('http://localhost:3000/api/cron/update-prices', {
        method: 'POST',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
      expect(console.warn).toHaveBeenCalledWith('[CRON] Unauthorized cron request attempt')
    })

    it('should reject requests with invalid authorization', async () => {
      const request = new NextRequest('http://localhost:3000/api/cron/update-prices', {
        method: 'POST',
        headers: {
          authorization: 'Bearer wrong-secret',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
    })

    it('should accept requests with valid authorization', async () => {
      // Mock market as closed to avoid actual price fetching
      vi.mocked(marketUtils.isMarketOpen).mockReturnValue(false)

      const request = new NextRequest('http://localhost:3000/api/cron/update-prices', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${mockCronSecret}`,
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should return error if CRON_SECRET not configured', async () => {
      delete process.env.CRON_SECRET

      const request = new NextRequest('http://localhost:3000/api/cron/update-prices', {
        method: 'POST',
        headers: {
          authorization: 'Bearer some-secret',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('not configured')
    })
  })

  describe('POST /api/cron/update-prices - Market Hours', () => {
    it('should skip updates when market is closed', async () => {
      // Mock market as closed
      vi.mocked(marketUtils.isMarketOpen).mockReturnValue(false)

      const request = new NextRequest('http://localhost:3000/api/cron/update-prices', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${mockCronSecret}`,
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.skipped).toBe(true)
      expect(data.reason).toBe('Market is closed')
      expect(console.log).toHaveBeenCalledWith('[CRON] Market is closed, skipping price updates')

      // Verify no price fetching was attempted
      expect(marketUtils.getActiveTickers).not.toHaveBeenCalled()
      expect(marketData.batchFetchPrices).not.toHaveBeenCalled()
    })

    it('should proceed with updates when market is open', async () => {
      // Mock market as open
      vi.mocked(marketUtils.isMarketOpen).mockReturnValue(true)
      // Mock no active tickers to simplify test
      vi.mocked(marketUtils.getActiveTickers).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/cron/update-prices', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${mockCronSecret}`,
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(console.log).toHaveBeenCalledWith('[CRON] Market is open, proceeding with price updates')
      expect(marketUtils.getActiveTickers).toHaveBeenCalled()
    })
  })

  describe('POST /api/cron/update-prices - Price Updates', () => {
    it('should handle no active tickers', async () => {
      vi.mocked(marketUtils.isMarketOpen).mockReturnValue(true)
      vi.mocked(marketUtils.getActiveTickers).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/cron/update-prices', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${mockCronSecret}`,
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('No active tickers to update')
      expect(console.log).toHaveBeenCalledWith('[CRON] No active tickers found, nothing to update')

      // Verify no price fetching was attempted
      expect(marketData.batchFetchPrices).not.toHaveBeenCalled()
    })

    it('should successfully update prices for active tickers', async () => {
      const mockTickers = ['AAPL', 'MSFT', 'TSLA']
      const mockResults = [
        {
          ticker: 'AAPL',
          price: 180.5,
          date: new Date('2026-02-07'),
          success: true,
        },
        {
          ticker: 'MSFT',
          price: 420.25,
          date: new Date('2026-02-07'),
          success: true,
        },
        {
          ticker: 'TSLA',
          price: 250.0,
          date: new Date('2026-02-07'),
          success: true,
        },
      ]

      vi.mocked(marketUtils.isMarketOpen).mockReturnValue(true)
      vi.mocked(marketUtils.getActiveTickers).mockResolvedValue(mockTickers)
      vi.mocked(marketData.batchFetchPrices).mockResolvedValue(mockResults)

      const request = new NextRequest('http://localhost:3000/api/cron/update-prices', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${mockCronSecret}`,
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Updated 3 of 3 tickers')
      expect(data.summary.total).toBe(3)
      expect(data.summary.successful).toBe(3)
      expect(data.summary.failed).toBe(0)
      expect(data.results.successful).toHaveLength(3)
      expect(data.results.failed).toHaveLength(0)
      expect(data.duration).toMatch(/\d+ms/)

      // Verify correct logging
      expect(console.log).toHaveBeenCalledWith(
        '[CRON] Found 3 active tickers:',
        'AAPL, MSFT, TSLA'
      )
      expect(console.log).toHaveBeenCalledWith(
        '[CRON] Successfully updated:',
        'AAPL=$180.5, MSFT=$420.25, TSLA=$250'
      )

      // Verify batchFetchPrices was called with correct tickers
      expect(marketData.batchFetchPrices).toHaveBeenCalledWith(mockTickers)
    })

    it('should handle partial failures gracefully', async () => {
      const mockTickers = ['AAPL', 'INVALID', 'MSFT']
      const mockResults = [
        {
          ticker: 'AAPL',
          price: 180.5,
          date: new Date('2026-02-07'),
          success: true,
        },
        {
          ticker: 'INVALID',
          price: 0,
          date: new Date('2026-02-07'),
          success: false,
          error: 'Invalid ticker symbol',
        },
        {
          ticker: 'MSFT',
          price: 420.25,
          date: new Date('2026-02-07'),
          success: true,
        },
      ]

      vi.mocked(marketUtils.isMarketOpen).mockReturnValue(true)
      vi.mocked(marketUtils.getActiveTickers).mockResolvedValue(mockTickers)
      vi.mocked(marketData.batchFetchPrices).mockResolvedValue(mockResults)

      const request = new NextRequest('http://localhost:3000/api/cron/update-prices', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${mockCronSecret}`,
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Updated 2 of 3 tickers')
      expect(data.summary.successful).toBe(2)
      expect(data.summary.failed).toBe(1)
      expect(data.results.successful).toHaveLength(2)
      expect(data.results.failed).toHaveLength(1)
      expect(data.results.failed[0].ticker).toBe('INVALID')
      expect(data.results.failed[0].error).toBe('Invalid ticker symbol')

      // Verify warning was logged for failures
      expect(console.warn).toHaveBeenCalledWith(
        '[CRON] Failed to update:',
        'INVALID: Invalid ticker symbol'
      )
    })

    it('should handle complete failure', async () => {
      const mockTickers = ['AAPL', 'MSFT']
      const mockResults = [
        {
          ticker: 'AAPL',
          price: 0,
          date: new Date('2026-02-07'),
          success: false,
          error: 'API rate limit exceeded',
        },
        {
          ticker: 'MSFT',
          price: 0,
          date: new Date('2026-02-07'),
          success: false,
          error: 'API rate limit exceeded',
        },
      ]

      vi.mocked(marketUtils.isMarketOpen).mockReturnValue(true)
      vi.mocked(marketUtils.getActiveTickers).mockResolvedValue(mockTickers)
      vi.mocked(marketData.batchFetchPrices).mockResolvedValue(mockResults)

      const request = new NextRequest('http://localhost:3000/api/cron/update-prices', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${mockCronSecret}`,
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true) // Job succeeded even though all updates failed
      expect(data.message).toBe('Updated 0 of 2 tickers')
      expect(data.summary.successful).toBe(0)
      expect(data.summary.failed).toBe(2)
    })
  })

  describe('POST /api/cron/update-prices - Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      vi.mocked(marketUtils.isMarketOpen).mockReturnValue(true)
      vi.mocked(marketUtils.getActiveTickers).mockRejectedValue(
        new Error('Database connection failed')
      )

      const request = new NextRequest('http://localhost:3000/api/cron/update-prices', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${mockCronSecret}`,
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Cron job failed')
      expect(data.details).toContain('Database connection failed')
      expect(console.error).toHaveBeenCalled()
    })

    it('should handle unexpected errors', async () => {
      vi.mocked(marketUtils.isMarketOpen).mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const request = new NextRequest('http://localhost:3000/api/cron/update-prices', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${mockCronSecret}`,
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Cron job failed')
    })
  })

  describe('Response Format', () => {
    it('should include timestamp in all responses', async () => {
      vi.mocked(marketUtils.isMarketOpen).mockReturnValue(false)

      const request = new NextRequest('http://localhost:3000/api/cron/update-prices', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${mockCronSecret}`,
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.timestamp).toBeDefined()
      expect(new Date(data.timestamp).toString()).not.toBe('Invalid Date')
    })

    it('should include duration in all responses', async () => {
      vi.mocked(marketUtils.isMarketOpen).mockReturnValue(true)
      vi.mocked(marketUtils.getActiveTickers).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/cron/update-prices', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${mockCronSecret}`,
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.duration).toBeDefined()
      expect(data.duration).toMatch(/\d+ms/)
    })
  })
})
