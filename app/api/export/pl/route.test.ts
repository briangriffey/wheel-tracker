/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock modules before imports
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    trade: {
      findMany: vi.fn(),
    },
  },
}))

// Now import after mocks are set up
const { GET } = await import('./route')
const { auth } = await import('@/lib/auth')
const { prisma } = await import('@/lib/db')

describe('P&L Export API', () => {
  const mockUserId = 'user-123'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/export/pl - Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      // Mock no session
      vi.mocked(auth).mockResolvedValue(null as any)

      const request = new NextRequest('http://localhost:3000/api/export/pl')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
    })

    it('should reject requests without user ID in session', async () => {
      // Mock session without user ID
      vi.mocked(auth).mockResolvedValue({
        user: {},
        expires: '2026-12-31',
      } as any)

      const request = new NextRequest('http://localhost:3000/api/export/pl')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
    })

    it('should accept authenticated requests', async () => {
      // Mock valid session
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId, email: 'test@example.com' },
        expires: '2026-12-31',
      } as any)

      // Mock empty trades result
      vi.mocked(prisma.trade.findMany).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/export/pl')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/csv')
    })
  })

  describe('GET /api/export/pl - CSV Export', () => {
    beforeEach(() => {
      // Mock authenticated session
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId, email: 'test@example.com' },
        expires: '2026-12-31',
      } as any)
    })

    it('should export CSV with correct headers', async () => {
      vi.mocked(prisma.trade.findMany).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/export/pl')
      const response = await GET(request)
      const csvContent = await response.text()

      expect(response.headers.get('Content-Type')).toBe('text/csv')
      expect(response.headers.get('Content-Disposition')).toMatch(/attachment; filename="pl-report-/)

      // Check CSV header row
      const lines = csvContent.split('\n')
      expect(lines[0]).toBe(
        'Date Opened,Date Closed,Ticker,Type,Strike,Premium,Quantity,Status,Realized P&L,Notes'
      )
    })

    it('should export trade data correctly', async () => {
      const mockTrades = [
        {
          id: 'trade-1',
          userId: mockUserId,
          ticker: 'AAPL',
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          status: 'CLOSED',
          strikePrice: 150.0,
          premium: 250.0,
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2026-03-01'),
          openDate: new Date('2026-02-01'),
          closeDate: new Date('2026-02-15'),
          notes: 'Test trade',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdPosition: null,
          position: null,
          positionId: null,
        },
      ]

      vi.mocked(prisma.trade.findMany).mockResolvedValue(mockTrades as any)

      const request = new NextRequest('http://localhost:3000/api/export/pl')
      const response = await GET(request)
      const csvContent = await response.text()

      const lines = csvContent.split('\n')
      expect(lines[1]).toBe('2026-02-01,2026-02-15,AAPL,PUT,150.00,250.00,1,CLOSED,250.00,Test trade')
    })

    it('should include summary section', async () => {
      const mockTrades = [
        {
          id: 'trade-1',
          userId: mockUserId,
          ticker: 'AAPL',
          type: 'PUT',
          status: 'CLOSED',
          strikePrice:150.0,
          premium: 250.0,
          contracts: 1,
          openDate: new Date('2026-02-01'),
          closeDate: new Date('2026-02-15'),
          notes: null,
          createdPosition: null,
          position: null,
        },
        {
          id: 'trade-2',
          userId: mockUserId,
          ticker: 'MSFT',
          type: 'CALL',
          status: 'OPEN',
          strikePrice:400.0,
          premium: 300.0,
          contracts: 1,
          openDate: new Date('2026-02-05'),
          closeDate: null,
          notes: null,
          createdPosition: null,
          position: null,
        },
      ]

      vi.mocked(prisma.trade.findMany).mockResolvedValue(mockTrades as any)

      const request = new NextRequest('http://localhost:3000/api/export/pl')
      const response = await GET(request)
      const csvContent = await response.text()

      expect(csvContent).toContain('Summary')
      expect(csvContent).toContain('Total Trades,2')
      expect(csvContent).toContain('Closed Trades,1')
      expect(csvContent).toContain('Open Trades,1')
      expect(csvContent).toContain('Total Premium Collected,550.00')
      expect(csvContent).toContain('Total Realized P&L,250.00')
    })

    it('should handle empty results', async () => {
      vi.mocked(prisma.trade.findMany).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/export/pl')
      const response = await GET(request)
      const csvContent = await response.text()

      expect(response.status).toBe(200)
      expect(csvContent).toContain('Total Trades,0')
      expect(csvContent).toContain('Closed Trades,0')
      expect(csvContent).toContain('Open Trades,0')
    })

    it('should escape CSV fields with special characters', async () => {
      const mockTrades = [
        {
          id: 'trade-1',
          userId: mockUserId,
          ticker: 'AAPL',
          type: 'PUT',
          status: 'CLOSED',
          strikePrice:150.0,
          premium: 250.0,
          contracts: 1,
          openDate: new Date('2026-02-01'),
          closeDate: new Date('2026-02-15'),
          notes: 'Trade notes with "quotes" and, commas',
          createdPosition: null,
          position: null,
        },
      ]

      vi.mocked(prisma.trade.findMany).mockResolvedValue(mockTrades as any)

      const request = new NextRequest('http://localhost:3000/api/export/pl')
      const response = await GET(request)
      const csvContent = await response.text()

      expect(csvContent).toContain('"Trade notes with ""quotes"" and, commas"')
    })
  })

  describe('GET /api/export/pl - Date Range Filtering', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId, email: 'test@example.com' },
        expires: '2026-12-31',
      } as any)
    })

    it('should filter by start date', async () => {
      vi.mocked(prisma.trade.findMany).mockResolvedValue([])

      const request = new NextRequest(
        'http://localhost:3000/api/export/pl?startDate=2026-01-01'
      )
      await GET(request)

      expect(prisma.trade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            openDate: expect.objectContaining({
              gte: new Date('2026-01-01'),
            }),
          }),
        })
      )
    })

    it('should filter by end date', async () => {
      vi.mocked(prisma.trade.findMany).mockResolvedValue([])

      const request = new NextRequest(
        'http://localhost:3000/api/export/pl?endDate=2026-12-31'
      )
      await GET(request)

      expect(prisma.trade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            openDate: expect.objectContaining({
              lte: new Date('2026-12-31'),
            }),
          }),
        })
      )
    })

    it('should filter by date range', async () => {
      vi.mocked(prisma.trade.findMany).mockResolvedValue([])

      const request = new NextRequest(
        'http://localhost:3000/api/export/pl?startDate=2026-01-01&endDate=2026-12-31'
      )
      await GET(request)

      expect(prisma.trade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            openDate: {
              gte: new Date('2026-01-01'),
              lte: new Date('2026-12-31'),
            },
          }),
        })
      )
    })

    it('should include date range in summary when filtered', async () => {
      vi.mocked(prisma.trade.findMany).mockResolvedValue([])

      const request = new NextRequest(
        'http://localhost:3000/api/export/pl?startDate=2026-01-01&endDate=2026-12-31'
      )
      const response = await GET(request)
      const csvContent = await response.text()

      expect(csvContent).toContain('Date Range')
      expect(csvContent).toContain('Start Date,2026-01-01')
      expect(csvContent).toContain('End Date,2026-12-31')
    })
  })

  describe('GET /api/export/pl - Realized P&L Calculation', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId, email: 'test@example.com' },
        expires: '2026-12-31',
      } as any)
    })

    it('should calculate P&L for expired options', async () => {
      const mockTrades = [
        {
          id: 'trade-1',
          userId: mockUserId,
          ticker: 'AAPL',
          type: 'PUT',
          status: 'EXPIRED',
          strikePrice:150.0,
          premium: 250.0,
          contracts: 1,
          openDate: new Date('2026-02-01'),
          closeDate: new Date('2026-02-15'),
          notes: null,
          createdPosition: null,
          position: null,
        },
      ]

      vi.mocked(prisma.trade.findMany).mockResolvedValue(mockTrades as any)

      const request = new NextRequest('http://localhost:3000/api/export/pl')
      const response = await GET(request)
      const csvContent = await response.text()

      // For expired options, premium is the realized P&L
      expect(csvContent).toContain(',EXPIRED,250.00,')
    })

    it('should calculate P&L for assigned trades with positions', async () => {
      const mockTrades = [
        {
          id: 'trade-1',
          userId: mockUserId,
          ticker: 'AAPL',
          type: 'PUT',
          status: 'ASSIGNED',
          strikePrice:150.0,
          premium: 250.0,
          contracts: 1,
          openDate: new Date('2026-02-01'),
          closeDate: null,
          notes: null,
          createdPosition: {
            realizedGainLoss: 100.0,
            closedDate: new Date('2026-03-01'),
          },
          position: null,
        },
      ]

      vi.mocked(prisma.trade.findMany).mockResolvedValue(mockTrades as any)

      const request = new NextRequest('http://localhost:3000/api/export/pl')
      const response = await GET(request)
      const csvContent = await response.text()

      // For assigned trades, P&L = position gain/loss + premium
      expect(csvContent).toContain(',ASSIGNED,350.00,')
    })

    it('should not show P&L for open trades', async () => {
      const mockTrades = [
        {
          id: 'trade-1',
          userId: mockUserId,
          ticker: 'AAPL',
          type: 'PUT',
          status: 'OPEN',
          strikePrice:150.0,
          premium: 250.0,
          contracts: 1,
          openDate: new Date('2026-02-01'),
          closeDate: null,
          notes: null,
          createdPosition: null,
          position: null,
        },
      ]

      vi.mocked(prisma.trade.findMany).mockResolvedValue(mockTrades as any)

      const request = new NextRequest('http://localhost:3000/api/export/pl')
      const response = await GET(request)
      const csvContent = await response.text()

      // Open trades should have empty realized P&L column
      const lines = csvContent.split('\n')
      expect(lines[1]).toContain(',OPEN,,')
    })
  })

  describe('GET /api/export/pl - Error Handling', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId, email: 'test@example.com' },
        expires: '2026-12-31',
      } as any)
    })

    it('should handle database errors gracefully', async () => {
      vi.mocked(prisma.trade.findMany).mockRejectedValue(
        new Error('Database connection failed')
      )

      const request = new NextRequest('http://localhost:3000/api/export/pl')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to generate CSV export')
      expect(data.details).toContain('Database connection failed')
      expect(console.error).toHaveBeenCalled()
    })

    it('should handle invalid date parameters', async () => {
      // Invalid dates cause database errors, so we expect error handling
      vi.mocked(prisma.trade.findMany).mockRejectedValue(
        new Error('Invalid date value')
      )

      const request = new NextRequest(
        'http://localhost:3000/api/export/pl?startDate=invalid-date'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to generate CSV export')
    })
  })

  describe('GET /api/export/pl - Large Exports', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId, email: 'test@example.com' },
        expires: '2026-12-31',
      } as any)
    })

    it('should handle large datasets efficiently', async () => {
      // Create 1000 mock trades
      const mockTrades = Array.from({ length: 1000 }, (_, i) => ({
        id: `trade-${i}`,
        userId: mockUserId,
        ticker: 'AAPL',
        type: 'PUT',
        status: 'CLOSED',
        strikePrice: 150.0,
        premium: 250.0,
        contracts: 1,
        openDate: new Date('2026-02-01'),
        closeDate: new Date('2026-02-15'),
        notes: null,
        createdPosition: null,
        position: null,
      }))

      vi.mocked(prisma.trade.findMany).mockResolvedValue(mockTrades as any)

      const request = new NextRequest('http://localhost:3000/api/export/pl')
      const response = await GET(request)
      const csvContent = await response.text()

      expect(response.status).toBe(200)
      const lines = csvContent.split('\n')
      // Should have header + 1000 trades + empty line + summary lines
      expect(lines.length).toBeGreaterThan(1000)
      expect(csvContent).toContain('Total Trades,1000')
    })
  })
})
