import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'
import type { CashDepositData } from '@/lib/actions/deposits'

// Mock the auth module
const mockAuth = vi.fn()
vi.mock('@/lib/auth', () => ({
  auth: () => mockAuth(),
}))

// Mock the deposits actions
const mockGetCashDeposits = vi.fn()
vi.mock('@/lib/actions/deposits', () => ({
  getCashDeposits: () => mockGetCashDeposits(),
}))

describe('Deposits Export API - GET /api/export/deposits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockDeposits: CashDepositData[] = [
    {
      id: '1',
      userId: 'user1',
      amount: 5000,
      type: 'DEPOSIT',
      depositDate: new Date('2026-01-15'),
      notes: 'Initial deposit',
      spyPrice: 450.25,
      spyShares: 11.1053,
      createdAt: new Date('2026-01-15'),
      updatedAt: new Date('2026-01-15'),
    },
    {
      id: '2',
      userId: 'user1',
      amount: -1000,
      type: 'WITHDRAWAL',
      depositDate: new Date('2026-02-01'),
      notes: null,
      spyPrice: 455.5,
      spyShares: -2.1956,
      createdAt: new Date('2026-02-01'),
      updatedAt: new Date('2026-02-01'),
    },
  ]

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockAuth.mockResolvedValue(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 401 when session has no user ID', async () => {
      mockAuth.mockResolvedValue({ user: {} })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })
  })

  describe('Successful Export', () => {
    it('should return CSV file with deposits data', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user1' } })
      mockGetCashDeposits.mockResolvedValue({
        success: true,
        data: mockDeposits,
      })

      const response = await GET()
      const csvContent = await response.text()

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/csv')
      expect(response.headers.get('Content-Disposition')).toContain('attachment')
      expect(response.headers.get('Content-Disposition')).toContain('deposits-export')

      expect(csvContent).toContain('Date,Type,Amount,SPY Price,SPY Shares,Notes')
      expect(csvContent).toContain('2026-01-15,DEPOSIT,5000.00')
      expect(csvContent).toContain('2026-02-01,WITHDRAWAL,1000.00')
      expect(csvContent).toContain('Initial deposit')
    })

    it('should include summary section in CSV', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user1' } })
      mockGetCashDeposits.mockResolvedValue({
        success: true,
        data: mockDeposits,
      })

      const response = await GET()
      const csvContent = await response.text()

      expect(csvContent).toContain('Summary')
      expect(csvContent).toContain('Total Deposits')
      expect(csvContent).toContain('Total Withdrawals')
      expect(csvContent).toContain('Net Invested')
      expect(csvContent).toContain('Total SPY Shares')
    })

    it('should handle empty deposits list', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user1' } })
      mockGetCashDeposits.mockResolvedValue({
        success: true,
        data: [],
      })

      const response = await GET()
      const csvContent = await response.text()

      expect(response.status).toBe(200)
      expect(csvContent).toContain('Date,Type,Amount,SPY Price,SPY Shares,Notes')
      expect(csvContent).toContain('Summary')
    })
  })

  describe('Error Handling', () => {
    it('should return error response when deposits fetch fails', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user1' } })
      mockGetCashDeposits.mockResolvedValue({
        success: false,
        error: 'Database connection failed',
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Database connection failed')
    })

    it('should handle unexpected errors gracefully', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user1' } })
      mockGetCashDeposits.mockRejectedValue(new Error('Unexpected error'))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to generate CSV export')
    })
  })

  describe('CSV Formatting', () => {
    it('should format amounts as absolute values', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user1' } })
      mockGetCashDeposits.mockResolvedValue({
        success: true,
        data: mockDeposits,
      })

      const response = await GET()
      const csvContent = await response.text()

      // Withdrawal amount should be displayed as absolute value
      expect(csvContent).toContain('1000.00')
      expect(csvContent).not.toContain('-1000.00')
    })

    it('should handle null notes', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user1' } })
      mockGetCashDeposits.mockResolvedValue({
        success: true,
        data: mockDeposits,
      })

      const response = await GET()
      const csvContent = await response.text()

      const lines = csvContent.split('\n')
      const withdrawalLine = lines.find((line) => line.includes('WITHDRAWAL'))

      expect(withdrawalLine).toBeDefined()
      expect(withdrawalLine).toMatch(/,\s*$/)
    })
  })
})
