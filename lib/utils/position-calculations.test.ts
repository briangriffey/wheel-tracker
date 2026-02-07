import { describe, it, expect } from 'vitest'
import {
  calculateUnrealizedPnL,
  calculateUnrealizedPnLPercentage,
  calculateCurrentPrice,
  calculateDaysHeld,
  calculateTotalCoveredCallPremium,
  getPnLColorClass,
  getPnLBackgroundClass,
  formatCurrency,
  formatPercentage,
} from './position-calculations'

describe('Position Calculations', () => {
  describe('calculateUnrealizedPnL', () => {
    it('should calculate positive P&L correctly', () => {
      expect(calculateUnrealizedPnL(16500, 15000)).toBe(1500)
    })

    it('should calculate negative P&L correctly', () => {
      expect(calculateUnrealizedPnL(14000, 15000)).toBe(-1000)
    })

    it('should return 0 for break-even', () => {
      expect(calculateUnrealizedPnL(15000, 15000)).toBe(0)
    })

    it('should handle decimal values', () => {
      expect(calculateUnrealizedPnL(1234.56, 1000.12)).toBeCloseTo(234.44)
    })
  })

  describe('calculateUnrealizedPnLPercentage', () => {
    it('should calculate positive percentage correctly', () => {
      expect(calculateUnrealizedPnLPercentage(16500, 15000)).toBe(10)
    })

    it('should calculate negative percentage correctly', () => {
      expect(calculateUnrealizedPnLPercentage(14000, 15000)).toBeCloseTo(-6.67, 2)
    })

    it('should return 0 for break-even', () => {
      expect(calculateUnrealizedPnLPercentage(15000, 15000)).toBe(0)
    })

    it('should handle zero total cost', () => {
      expect(calculateUnrealizedPnLPercentage(1000, 0)).toBe(0)
    })

    it('should calculate percentage with decimals', () => {
      expect(calculateUnrealizedPnLPercentage(11000, 10000)).toBe(10)
    })
  })

  describe('calculateCurrentPrice', () => {
    it('should calculate current price per share correctly', () => {
      expect(calculateCurrentPrice(16500, 100)).toBe(165)
    })

    it('should handle decimal results', () => {
      expect(calculateCurrentPrice(10000, 300)).toBeCloseTo(33.33, 2)
    })

    it('should return 0 for zero shares', () => {
      expect(calculateCurrentPrice(16500, 0)).toBe(0)
    })

    it('should handle large numbers', () => {
      expect(calculateCurrentPrice(1000000, 5000)).toBe(200)
    })
  })

  describe('calculateDaysHeld', () => {
    it('should calculate days between two dates', () => {
      const acquiredDate = new Date('2024-01-01')
      const closedDate = new Date('2024-01-31')
      expect(calculateDaysHeld(acquiredDate, closedDate)).toBe(30)
    })

    it('should calculate days from acquired to now when no close date', () => {
      const acquiredDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
      const days = calculateDaysHeld(acquiredDate)
      expect(days).toBeGreaterThanOrEqual(10)
      expect(days).toBeLessThanOrEqual(11) // Account for timing
    })

    it('should handle same day acquisition and closure', () => {
      const sameDate = new Date('2024-01-01')
      expect(calculateDaysHeld(sameDate, sameDate)).toBe(0)
    })

    it('should round up partial days', () => {
      const acquiredDate = new Date('2024-01-01T00:00:00')
      const closedDate = new Date('2024-01-01T12:00:00') // Half day
      expect(calculateDaysHeld(acquiredDate, closedDate)).toBe(1)
    })

    it('should handle null close date', () => {
      const acquiredDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
      const days = calculateDaysHeld(acquiredDate, null)
      expect(days).toBeGreaterThanOrEqual(5)
    })
  })

  describe('calculateTotalCoveredCallPremium', () => {
    it('should sum premiums from multiple calls', () => {
      const calls = [{ premium: 250 }, { premium: 300 }, { premium: 150 }]
      expect(calculateTotalCoveredCallPremium(calls)).toBe(700)
    })

    it('should handle single call', () => {
      const calls = [{ premium: 500 }]
      expect(calculateTotalCoveredCallPremium(calls)).toBe(500)
    })

    it('should return 0 for empty array', () => {
      expect(calculateTotalCoveredCallPremium([])).toBe(0)
    })

    it('should handle decimal premiums', () => {
      const calls = [{ premium: 123.45 }, { premium: 67.89 }]
      expect(calculateTotalCoveredCallPremium(calls)).toBeCloseTo(191.34)
    })

    it('should handle zero premiums', () => {
      const calls = [{ premium: 0 }, { premium: 100 }]
      expect(calculateTotalCoveredCallPremium(calls)).toBe(100)
    })
  })

  describe('getPnLColorClass', () => {
    it('should return green for positive P&L', () => {
      expect(getPnLColorClass(100)).toBe('text-green-600')
    })

    it('should return red for negative P&L', () => {
      expect(getPnLColorClass(-100)).toBe('text-red-600')
    })

    it('should return gray for zero P&L', () => {
      expect(getPnLColorClass(0)).toBe('text-gray-600')
    })

    it('should handle very small positive values', () => {
      expect(getPnLColorClass(0.01)).toBe('text-green-600')
    })

    it('should handle very small negative values', () => {
      expect(getPnLColorClass(-0.01)).toBe('text-red-600')
    })
  })

  describe('getPnLBackgroundClass', () => {
    it('should return green background for positive P&L', () => {
      expect(getPnLBackgroundClass(100)).toBe('bg-green-50')
    })

    it('should return red background for negative P&L', () => {
      expect(getPnLBackgroundClass(-100)).toBe('bg-red-50')
    })

    it('should return gray background for zero P&L', () => {
      expect(getPnLBackgroundClass(0)).toBe('bg-gray-50')
    })

    it('should handle very small positive values', () => {
      expect(getPnLBackgroundClass(0.01)).toBe('bg-green-50')
    })

    it('should handle very small negative values', () => {
      expect(getPnLBackgroundClass(-0.01)).toBe('bg-red-50')
    })
  })

  describe('formatCurrency', () => {
    it('should format positive values correctly', () => {
      expect(formatCurrency(1500)).toBe('$1,500.00')
    })

    it('should format negative values correctly', () => {
      expect(formatCurrency(-1500)).toBe('-$1,500.00')
    })

    it('should format zero correctly', () => {
      expect(formatCurrency(0)).toBe('$0.00')
    })

    it('should include thousands separator', () => {
      expect(formatCurrency(123456.78)).toBe('$123,456.78')
    })

    it('should format decimals to 2 places', () => {
      expect(formatCurrency(123.456)).toBe('$123.46')
    })

    it('should handle very large numbers', () => {
      expect(formatCurrency(1234567890.12)).toBe('$1,234,567,890.12')
    })

    it('should handle very small numbers', () => {
      expect(formatCurrency(0.01)).toBe('$0.01')
    })
  })

  describe('formatPercentage', () => {
    it('should format positive percentage with + sign', () => {
      expect(formatPercentage(10.5)).toBe('+10.50%')
    })

    it('should format negative percentage with - sign', () => {
      expect(formatPercentage(-5.25)).toBe('-5.25%')
    })

    it('should format zero with + sign', () => {
      expect(formatPercentage(0)).toBe('+0.00%')
    })

    it('should format to 2 decimal places', () => {
      expect(formatPercentage(12.3456)).toBe('+12.35%')
    })

    it('should round correctly', () => {
      expect(formatPercentage(12.345)).toBe('+12.35%')
      expect(formatPercentage(12.344)).toBe('+12.34%')
    })

    it('should handle very small positive values', () => {
      expect(formatPercentage(0.01)).toBe('+0.01%')
    })

    it('should handle very small negative values', () => {
      expect(formatPercentage(-0.01)).toBe('-0.01%')
    })
  })
})
