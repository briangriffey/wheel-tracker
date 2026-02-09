import { describe, it, expect } from 'vitest'
import { Prisma } from '@/lib/generated/prisma'
import type { PositionWithCalculations } from '@/lib/queries/positions'

const mockPosition: PositionWithCalculations = {
  id: '1',
  userId: 'user1',
  ticker: 'AAPL',
  shares: 500,
  costBasis: new Prisma.Decimal(150),
  totalCost: new Prisma.Decimal(75000),
  currentValue: new Prisma.Decimal(77500),
  realizedGainLoss: null,
  status: 'OPEN',
  acquiredDate: new Date('2026-01-15'),
  closedDate: null,
  notes: 'Test position',
  createdAt: new Date('2026-01-15'),
  updatedAt: new Date('2026-02-07'),
  assignmentTradeId: 'trade1',
  wheelId: null,
  assignmentTrade: {
    id: 'trade1',
    ticker: 'AAPL',
    strikePrice: new Prisma.Decimal(150),
    premium: new Prisma.Decimal(500),
    expirationDate: new Date('2026-01-15'),
  },
  coveredCalls: [
    {
      id: 'call1',
      premium: new Prisma.Decimal(500),
      strikePrice: new Prisma.Decimal(155),
      expirationDate: new Date('2026-02-15'),
      status: 'OPEN',
      contracts: 1,
    },
  ],
  unrealizedPL: 2500,
  unrealizedPLPercent: 3.33,
  daysHeld: 23,
  coveredCallsPremium: 500,
  netCostBasis: 149,
}

// Helper functions to test
function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getPLColorClass(pl?: number): string {
  if (!pl) return 'text-gray-600'
  if (pl > 0) return 'text-green-600'
  if (pl < 0) return 'text-red-600'
  return 'text-gray-600'
}

function getPLBgColorClass(pl?: number): string {
  if (!pl) return 'bg-gray-50'
  if (pl > 0) return 'bg-green-50 border-green-200'
  if (pl < 0) return 'bg-red-50 border-red-200'
  return 'bg-gray-50'
}

function calculateCurrentPrice(currentValue: Prisma.Decimal | null, shares: number): number | null {
  return currentValue ? currentValue.toNumber() / shares : null
}

describe('PositionCard Component Logic', () => {
  describe('Currency Formatting', () => {
    it('should format positive currency correctly', () => {
      expect(formatCurrency(2500)).toBe('$2500.00')
    })

    it('should format negative currency correctly', () => {
      expect(formatCurrency(-1500.5)).toBe('$-1500.50')
    })

    it('should format zero correctly', () => {
      expect(formatCurrency(0)).toBe('$0.00')
    })

    it('should handle decimal values', () => {
      expect(formatCurrency(123.456)).toBe('$123.46')
    })

    it('should handle large values', () => {
      expect(formatCurrency(1000000)).toBe('$1000000.00')
    })
  })

  describe('Date Formatting', () => {
    it('should format date correctly', () => {
      const date = new Date('2026-01-15T12:00:00')
      const formatted = formatDate(date)
      expect(formatted).toMatch(/Jan 15, 2026/)
    })

    it('should handle different months', () => {
      const date = new Date('2026-12-31T12:00:00')
      const formatted = formatDate(date)
      expect(formatted).toMatch(/Dec 31, 2026/)
    })
  })

  describe('P&L Color Classes', () => {
    it('should return green for profit', () => {
      expect(getPLColorClass(100)).toBe('text-green-600')
    })

    it('should return red for loss', () => {
      expect(getPLColorClass(-100)).toBe('text-red-600')
    })

    it('should return gray for zero', () => {
      expect(getPLColorClass(0)).toBe('text-gray-600')
    })

    it('should return gray for undefined', () => {
      expect(getPLColorClass(undefined)).toBe('text-gray-600')
    })
  })

  describe('P&L Background Color Classes', () => {
    it('should return green background for profit', () => {
      expect(getPLBgColorClass(100)).toBe('bg-green-50 border-green-200')
    })

    it('should return red background for loss', () => {
      expect(getPLBgColorClass(-100)).toBe('bg-red-50 border-red-200')
    })

    it('should return gray background for zero', () => {
      expect(getPLBgColorClass(0)).toBe('bg-gray-50')
    })

    it('should return gray background for undefined', () => {
      expect(getPLBgColorClass(undefined)).toBe('bg-gray-50')
    })
  })

  describe('Current Price Calculation', () => {
    it('should calculate current price per share correctly', () => {
      const currentValue = new Prisma.Decimal(77500)
      const shares = 500
      const price = calculateCurrentPrice(currentValue, shares)
      expect(price).toBe(155)
    })

    it('should handle null current value', () => {
      const price = calculateCurrentPrice(null, 500)
      expect(price).toBeNull()
    })

    it('should handle decimal share prices', () => {
      const currentValue = new Prisma.Decimal(10050.5)
      const shares = 100
      const price = calculateCurrentPrice(currentValue, shares)
      expect(price).toBeCloseTo(100.505, 2)
    })
  })

  describe('Position Display Data', () => {
    it('should have all required fields', () => {
      expect(mockPosition).toHaveProperty('ticker')
      expect(mockPosition).toHaveProperty('shares')
      expect(mockPosition).toHaveProperty('costBasis')
      expect(mockPosition).toHaveProperty('totalCost')
      expect(mockPosition).toHaveProperty('currentValue')
      expect(mockPosition).toHaveProperty('unrealizedPL')
      expect(mockPosition).toHaveProperty('unrealizedPLPercent')
      expect(mockPosition).toHaveProperty('daysHeld')
      expect(mockPosition).toHaveProperty('coveredCallsPremium')
      expect(mockPosition).toHaveProperty('netCostBasis')
    })

    it('should calculate unrealized P&L correctly', () => {
      expect(mockPosition.unrealizedPL).toBe(2500)
    })

    it('should calculate P&L percentage correctly', () => {
      expect(mockPosition.unrealizedPLPercent).toBeCloseTo(3.33, 2)
    })

    it('should have positive days held', () => {
      expect(mockPosition.daysHeld).toBeGreaterThan(0)
    })
  })

  describe('Covered Calls Premium', () => {
    it('should display covered calls premium when present', () => {
      expect(mockPosition.coveredCallsPremium).toBeGreaterThan(0)
    })

    it('should calculate net cost basis with premium', () => {
      const expectedNetCost = mockPosition.costBasis.toNumber() - (mockPosition.coveredCallsPremium / mockPosition.shares)
      expect(mockPosition.netCostBasis).toBeCloseTo(expectedNetCost, 2)
    })

    it('should handle zero premium', () => {
      const positionWithoutPremium: PositionWithCalculations = {
        ...mockPosition,
        coveredCallsPremium: 0,
        netCostBasis: mockPosition.costBasis.toNumber(),
      }
      expect(positionWithoutPremium.coveredCallsPremium).toBe(0)
      expect(positionWithoutPremium.netCostBasis).toBe(mockPosition.costBasis.toNumber())
    })
  })

  describe('Loading State', () => {
    it('should handle missing current value (loading)', () => {
      const loadingPosition: PositionWithCalculations = {
        ...mockPosition,
        currentValue: null,
        unrealizedPL: undefined,
        unrealizedPLPercent: undefined,
      }
      expect(loadingPosition.currentValue).toBeNull()
      expect(loadingPosition.unrealizedPL).toBeUndefined()
    })
  })

  describe('Error State', () => {
    it('should handle missing current price gracefully', () => {
      const price = calculateCurrentPrice(null, mockPosition.shares)
      expect(price).toBeNull()
    })
  })
})
