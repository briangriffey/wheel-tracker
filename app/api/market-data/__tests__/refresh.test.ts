import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../refresh/route'
import { NextRequest } from 'next/server'

// Mock the market data service
const mockBatchFetchPrices = vi.fn()
const mockGetActiveTickers = vi.fn()

vi.mock('@/lib/services/market-data', () => ({
  batchFetchPrices: (...args: unknown[]) => mockBatchFetchPrices(...args),
}))

vi.mock('@/lib/utils/market', () => ({
  getActiveTickers: () => mockGetActiveTickers(),
}))

describe('Market Data Refresh API - POST /api/market-data/refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Successful Refresh', () => {
    it('should refresh all active tickers when no body provided', async () => {
      mockGetActiveTickers.mockResolvedValue(['AAPL', 'TSLA', 'MSFT'])
      mockBatchFetchPrices.mockResolvedValue([
        { ticker: 'AAPL', price: 152.45, date: new Date(), success: true },
        { ticker: 'TSLA', price: 198.75, date: new Date(), success: true },
        { ticker: 'MSFT', price: 345.6, date: new Date(), success: true },
      ])

      const request = new NextRequest('http://localhost/api/market-data/refresh', {
        method: 'POST',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.summary.successful).toBe(3)
      expect(data.summary.failed).toBe(0)
      expect(data.summary.total).toBe(3)
    })

    it('should refresh specified tickers when provided in body', async () => {
      mockBatchFetchPrices.mockResolvedValue([
        { ticker: 'AAPL', price: 152.45, date: new Date(), success: true },
        { ticker: 'TSLA', price: 198.75, date: new Date(), success: true },
      ])

      const request = new NextRequest('http://localhost/api/market-data/refresh', {
        method: 'POST',
        body: JSON.stringify({ tickers: ['AAPL', 'TSLA'] }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(mockBatchFetchPrices).toHaveBeenCalledWith(['AAPL', 'TSLA'])
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.summary.successful).toBe(2)
    })

    it('should uppercase ticker symbols', async () => {
      mockBatchFetchPrices.mockResolvedValue([
        { ticker: 'AAPL', price: 152.45, date: new Date(), success: true },
      ])

      const request = new NextRequest('http://localhost/api/market-data/refresh', {
        method: 'POST',
        body: JSON.stringify({ tickers: ['aapl'] }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      await POST(request)

      expect(mockBatchFetchPrices).toHaveBeenCalledWith(['AAPL'])
    })

    it('should return results with successful and failed tickers', async () => {
      mockGetActiveTickers.mockResolvedValue(['AAPL', 'INVALID', 'TSLA'])
      mockBatchFetchPrices.mockResolvedValue([
        { ticker: 'AAPL', price: 152.45, date: new Date(), success: true },
        { ticker: 'INVALID', price: 0, date: new Date(), success: false, error: 'Invalid ticker' },
        { ticker: 'TSLA', price: 198.75, date: new Date(), success: true },
      ])

      const request = new NextRequest('http://localhost/api/market-data/refresh', {
        method: 'POST',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.summary.successful).toBe(2)
      expect(data.summary.failed).toBe(1)
      expect(data.summary.total).toBe(3)
      expect(data.results.successful).toHaveLength(2)
      expect(data.results.failed).toHaveLength(1)
      expect(data.results.failed[0].ticker).toBe('INVALID')
      expect(data.results.failed[0].error).toBe('Invalid ticker')
    })
  })

  describe('Empty Results', () => {
    it('should handle no active tickers gracefully', async () => {
      mockGetActiveTickers.mockResolvedValue([])

      const request = new NextRequest('http://localhost/api/market-data/refresh', {
        method: 'POST',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('No active tickers to refresh')
      expect(data.results).toEqual([])
    })

    it('should handle empty ticker array in body', async () => {
      mockGetActiveTickers.mockResolvedValue([])

      const request = new NextRequest('http://localhost/api/market-data/refresh', {
        method: 'POST',
        body: JSON.stringify({ tickers: [] }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockBatchFetchPrices).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid JSON body gracefully', async () => {
      mockGetActiveTickers.mockResolvedValue(['AAPL'])
      mockBatchFetchPrices.mockResolvedValue([
        { ticker: 'AAPL', price: 152.45, date: new Date(), success: true },
      ])

      const request = new NextRequest('http://localhost/api/market-data/refresh', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      await response.json()

      // Should fall back to getting active tickers
      expect(response.status).toBe(200)
      expect(mockGetActiveTickers).toHaveBeenCalled()
    })

    it('should return error response when batch fetch fails', async () => {
      mockGetActiveTickers.mockResolvedValue(['AAPL'])
      mockBatchFetchPrices.mockRejectedValue(new Error('API service unavailable'))

      const request = new NextRequest('http://localhost/api/market-data/refresh', {
        method: 'POST',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to refresh market data')
    })

    it('should handle getActiveTickers failure', async () => {
      mockGetActiveTickers.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/market-data/refresh', {
        method: 'POST',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })

  describe('Response Format', () => {
    it('should return correct response structure', async () => {
      mockGetActiveTickers.mockResolvedValue(['AAPL'])
      mockBatchFetchPrices.mockResolvedValue([
        { ticker: 'AAPL', price: 152.45, date: new Date('2026-02-09'), success: true },
      ])

      const request = new NextRequest('http://localhost/api/market-data/refresh', {
        method: 'POST',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data).toHaveProperty('success')
      expect(data).toHaveProperty('message')
      expect(data).toHaveProperty('results')
      expect(data).toHaveProperty('summary')
      expect(data.results).toHaveProperty('successful')
      expect(data.results).toHaveProperty('failed')
      expect(data.summary).toHaveProperty('total')
      expect(data.summary).toHaveProperty('successful')
      expect(data.summary).toHaveProperty('failed')
    })

    it('should include price, date, and ticker in successful results', async () => {
      const testDate = new Date('2026-02-09')
      mockGetActiveTickers.mockResolvedValue(['AAPL'])
      mockBatchFetchPrices.mockResolvedValue([
        { ticker: 'AAPL', price: 152.45, date: testDate, success: true },
      ])

      const request = new NextRequest('http://localhost/api/market-data/refresh', {
        method: 'POST',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.results.successful[0]).toHaveProperty('ticker', 'AAPL')
      expect(data.results.successful[0]).toHaveProperty('price', 152.45)
      expect(data.results.successful[0]).toHaveProperty('date')
    })
  })

  describe('Rate Limiting Integration', () => {
    it('should handle large number of tickers', async () => {
      const manyTickers = Array.from({ length: 20 }, (_, i) => `TICKER${i}`)
      mockGetActiveTickers.mockResolvedValue(manyTickers)

      const results = manyTickers.map((ticker) => ({
        ticker,
        price: 100 + Math.random() * 100,
        date: new Date(),
        success: true,
      }))
      mockBatchFetchPrices.mockResolvedValue(results)

      const request = new NextRequest('http://localhost/api/market-data/refresh', {
        method: 'POST',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.summary.total).toBe(20)
      expect(mockBatchFetchPrices).toHaveBeenCalledWith(manyTickers)
    })
  })
})

describe('Market Data Refresh Logic', () => {
  it('should correctly calculate summary counts', () => {
    const results = [
      { ticker: 'AAPL', success: true, price: 152, date: new Date() },
      { ticker: 'TSLA', success: false, price: 0, date: new Date(), error: 'Error' },
      { ticker: 'MSFT', success: true, price: 345, date: new Date() },
      { ticker: 'INVALID', success: false, price: 0, date: new Date(), error: 'Error' },
    ]

    const successful = results.filter((r) => r.success)
    const failed = results.filter((r) => !r.success)

    expect(successful).toHaveLength(2)
    expect(failed).toHaveLength(2)
    expect(successful[0].ticker).toBe('AAPL')
    expect(failed[0].ticker).toBe('TSLA')
  })

  it('should handle all successful results', () => {
    const results = [
      { ticker: 'AAPL', success: true, price: 152, date: new Date() },
      { ticker: 'TSLA', success: true, price: 198, date: new Date() },
    ]

    const successful = results.filter((r) => r.success)
    const failed = results.filter((r) => !r.success)

    expect(successful).toHaveLength(2)
    expect(failed).toHaveLength(0)
  })

  it('should handle all failed results', () => {
    const results = [
      { ticker: 'INVALID1', success: false, price: 0, date: new Date(), error: 'Error' },
      { ticker: 'INVALID2', success: false, price: 0, date: new Date(), error: 'Error' },
    ]

    const successful = results.filter((r) => r.success)
    const failed = results.filter((r) => !r.success)

    expect(successful).toHaveLength(0)
    expect(failed).toHaveLength(2)
  })
})
