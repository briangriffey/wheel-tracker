import { describe, it, expect } from 'vitest'
import { calculateLumpSumComparison, calculateWhatIfScenario } from '../lump-sum-comparison'
import type { CashDepositData } from '@/lib/actions/deposits'

describe('Lump Sum Comparison Calculations', () => {
  // Helper to create mock deposit data
  const createMockDeposit = (
    amount: number,
    depositDate: Date,
    spyPrice: number
  ): CashDepositData => ({
    id: `deposit-${depositDate.getTime()}`,
    userId: 'user1',
    amount,
    type: 'DEPOSIT',
    depositDate,
    notes: null,
    spyPrice,
    spyShares: amount / spyPrice,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  describe('calculateLumpSumComparison', () => {
    it('should calculate basic comparison correctly', () => {
      const deposits: CashDepositData[] = [
        createMockDeposit(1000, new Date('2026-01-01'), 400), // 2.5 shares
        createMockDeposit(1000, new Date('2026-02-01'), 420), // 2.381 shares
        createMockDeposit(1000, new Date('2026-03-01'), 450), // 2.222 shares
      ]

      const lumpSumDate = new Date('2026-01-01')
      const lumpSumPrice = 400
      const currentPrice = 480

      const result = calculateLumpSumComparison(deposits, lumpSumDate, lumpSumPrice, currentPrice)

      // DCA: 1000/400 + 1000/420 + 1000/450 = 2.5 + 2.380952... + 2.222222... = 7.103174... shares
      const expectedDcaShares = 1000 / 400 + 1000 / 420 + 1000 / 450
      expect(result.dcaShares).toBeCloseTo(expectedDcaShares, 4)
      expect(result.dcaInvested).toBe(3000)
      expect(result.dcaCurrentValue).toBeCloseTo(expectedDcaShares * 480, 2)

      // Lump sum: 3000 / 400 = 7.5 shares
      expect(result.lumpSumShares).toBe(7.5)
      expect(result.lumpSumInvested).toBe(3000)
      expect(result.lumpSumCurrentValue).toBe(7.5 * 480)

      // Lump sum should win (more shares)
      expect(result.winner).toBe('LUMP_SUM')
      expect(result.difference).toBeLessThan(0) // DCA - Lump Sum < 0
    })

    it('should favor DCA when market prices rise then fall', () => {
      const deposits: CashDepositData[] = [
        createMockDeposit(1000, new Date('2026-01-01'), 400), // 2.5 shares
        createMockDeposit(1000, new Date('2026-02-01'), 500), // 2.0 shares (high price)
        createMockDeposit(1000, new Date('2026-03-01'), 350), // 2.857 shares (low price)
      ]

      const lumpSumDate = new Date('2026-01-01')
      const lumpSumPrice = 400
      const currentPrice = 420

      const result = calculateLumpSumComparison(deposits, lumpSumDate, lumpSumPrice, currentPrice)

      // DCA: 2.5 + 2.0 + 2.857 = 7.357 shares
      expect(result.dcaShares).toBeCloseTo(7.357, 2)

      // Lump sum: 3000 / 400 = 7.5 shares
      expect(result.lumpSumShares).toBe(7.5)

      // Close comparison
      expect(result.winner).toBe('LUMP_SUM')
    })

    it('should calculate returns correctly', () => {
      const deposits: CashDepositData[] = [createMockDeposit(1000, new Date('2026-01-01'), 400)]

      const lumpSumDate = new Date('2026-01-01')
      const lumpSumPrice = 400
      const currentPrice = 480 // 20% gain

      const result = calculateLumpSumComparison(deposits, lumpSumDate, lumpSumPrice, currentPrice)

      // Both should have 20% return
      expect(result.dcaReturnPct).toBeCloseTo(20, 1)
      expect(result.lumpSumReturnPct).toBeCloseTo(20, 1)
      expect(result.winner).toBe('TIE')
    })

    it('should generate correct data points', () => {
      const deposits: CashDepositData[] = [
        createMockDeposit(1000, new Date('2026-01-01'), 400),
        createMockDeposit(1000, new Date('2026-02-01'), 420),
      ]

      const lumpSumDate = new Date('2026-01-01')
      const lumpSumPrice = 400
      const currentPrice = 450

      const result = calculateLumpSumComparison(deposits, lumpSumDate, lumpSumPrice, currentPrice)

      // Should have data points for each deposit + final point
      expect(result.dataPoints.length).toBeGreaterThanOrEqual(3)

      // First point should be first deposit
      const firstPoint = result.dataPoints[0]
      expect(firstPoint.dcaInvested).toBe(1000)
      expect(firstPoint.dcaShares).toBeCloseTo(2.5, 2)

      // Last point should use current price
      const lastPoint = result.dataPoints[result.dataPoints.length - 1]
      expect(lastPoint.dcaValue).toBeCloseTo((1000 / 400 + 1000 / 420) * currentPrice, 2)
    })

    it('should handle withdrawals correctly', () => {
      const deposits: CashDepositData[] = [
        createMockDeposit(2000, new Date('2026-01-01'), 400), // +5 shares
        { ...createMockDeposit(-500, new Date('2026-02-01'), 420), type: 'WITHDRAWAL' }, // -1.19 shares
      ]

      const lumpSumDate = new Date('2026-01-01')
      const lumpSumPrice = 400
      const currentPrice = 450

      const result = calculateLumpSumComparison(deposits, lumpSumDate, lumpSumPrice, currentPrice)

      // Net invested: 2000 - 500 = 1500
      expect(result.dcaInvested).toBe(1500)
      expect(result.lumpSumInvested).toBe(1500)
    })

    it('should throw error for empty deposits', () => {
      expect(() => {
        calculateLumpSumComparison([], new Date(), 400, 450)
      }).toThrow('No deposits to compare')
    })
  })

  describe('calculateWhatIfScenario', () => {
    it('should allow exploring different lump sum dates', () => {
      const deposits: CashDepositData[] = [
        createMockDeposit(1000, new Date('2026-01-01'), 400),
        createMockDeposit(1000, new Date('2026-02-01'), 420),
      ]

      // What if we invested at a lower price before first deposit?
      const whatIfDate = new Date('2025-12-01')
      const whatIfPrice = 380 // Lower price
      const currentPrice = 450

      const result = calculateWhatIfScenario(deposits, whatIfDate, whatIfPrice, currentPrice)

      // Lump sum at lower price should get more shares
      expect(result.lumpSumShares).toBeCloseTo(2000 / 380, 2)
      expect(result.winner).toBe('LUMP_SUM')
      expect(result.lumpSumDate).toEqual(whatIfDate)
    })

    it('should show DCA advantage when what-if price is high', () => {
      const deposits: CashDepositData[] = [
        createMockDeposit(1000, new Date('2026-01-01'), 400),
        createMockDeposit(1000, new Date('2026-02-01'), 380), // Bought at lower prices
      ]

      // What if we invested at peak?
      const whatIfDate = new Date('2025-12-01')
      const whatIfPrice = 500 // Very high price
      const currentPrice = 420

      const result = calculateWhatIfScenario(deposits, whatIfDate, whatIfPrice, currentPrice)

      // DCA should win because it avoided the high price
      expect(result.winner).toBe('DCA')
    })
  })

  describe('edge cases', () => {
    it('should handle single deposit', () => {
      const deposits: CashDepositData[] = [createMockDeposit(5000, new Date('2026-01-01'), 400)]

      const result = calculateLumpSumComparison(deposits, new Date('2026-01-01'), 400, 450)

      // Single deposit = lump sum, should be a tie
      expect(result.winner).toBe('TIE')
      expect(result.dcaShares).toBeCloseTo(result.lumpSumShares, 4)
    })

    it('should handle very small differences', () => {
      const deposits: CashDepositData[] = [
        createMockDeposit(1000, new Date('2026-01-01'), 400.0),
        createMockDeposit(1000, new Date('2026-02-01'), 400.01), // Tiny difference
      ]

      const result = calculateLumpSumComparison(deposits, new Date('2026-01-01'), 400, 450)

      // Very close, might be a tie or slight difference
      expect(Math.abs(result.difference)).toBeLessThan(1)
    })

    it('should handle market crash scenario', () => {
      const deposits: CashDepositData[] = [
        createMockDeposit(1000, new Date('2026-01-01'), 400),
        createMockDeposit(1000, new Date('2026-02-01'), 200), // Crash: bought at half price
      ]

      const lumpSumDate = new Date('2026-01-01')
      const lumpSumPrice = 400
      const currentPrice = 250 // Partial recovery

      const result = calculateLumpSumComparison(deposits, lumpSumDate, lumpSumPrice, currentPrice)

      // DCA should win - got more shares during crash
      // DCA: 1000/400 + 1000/200 = 2.5 + 5 = 7.5 shares
      // Lump: 2000/400 = 5 shares
      expect(result.dcaShares).toBeCloseTo(7.5, 2)
      expect(result.lumpSumShares).toBe(5)
      expect(result.winner).toBe('DCA')
      expect(result.timingBenefit).toBeGreaterThan(0)
    })
  })
})
