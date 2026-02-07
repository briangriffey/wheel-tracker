import { describe, it, expect } from 'vitest'
import { calculateUnrealizedPnL, calculateRealizedPnL } from './position'

describe('calculateUnrealizedPnL', () => {
  const position = {
    shares: 100,
    totalCost: 14750, // Cost basis $147.50/share
    costBasis: 147.5,
  }

  it('should calculate positive unrealized P&L', () => {
    // Stock is now $150/share (gain)
    const result = calculateUnrealizedPnL(position, 150)

    expect(result).not.toBeNull()
    expect(result!.currentValue).toBe(15000) // 100 shares * $150
    expect(result!.unrealizedPnL).toBe(250) // $15,000 - $14,750
    expect(result!.unrealizedPnLPercent).toBeCloseTo(1.69, 2) // (250 / 14750) * 100
  })

  it('should calculate negative unrealized P&L', () => {
    // Stock is now $145/share (loss)
    const result = calculateUnrealizedPnL(position, 145)

    expect(result).not.toBeNull()
    expect(result!.currentValue).toBe(14500) // 100 shares * $145
    expect(result!.unrealizedPnL).toBe(-250) // $14,500 - $14,750
    expect(result!.unrealizedPnLPercent).toBeCloseTo(-1.69, 2)
  })

  it('should calculate zero unrealized P&L at break-even', () => {
    // Stock is at cost basis
    const result = calculateUnrealizedPnL(position, 147.5)

    expect(result).not.toBeNull()
    expect(result!.currentValue).toBe(14750)
    expect(result!.unrealizedPnL).toBe(0)
    expect(result!.unrealizedPnLPercent).toBe(0)
  })

  it('should return null when currentPrice is null', () => {
    const result = calculateUnrealizedPnL(position, null)
    expect(result).toBeNull()
  })

  it('should return null when currentPrice is undefined', () => {
    const result = calculateUnrealizedPnL(position, undefined)
    expect(result).toBeNull()
  })

  it('should return null when currentPrice is zero', () => {
    const result = calculateUnrealizedPnL(position, 0)
    expect(result).toBeNull()
  })

  it('should return null when currentPrice is negative', () => {
    const result = calculateUnrealizedPnL(position, -10)
    expect(result).toBeNull()
  })

  it('should handle large positions correctly', () => {
    const largePosition = {
      shares: 1000,
      totalCost: 100000, // $100/share
      costBasis: 100,
    }

    const result = calculateUnrealizedPnL(largePosition, 110)

    expect(result).not.toBeNull()
    expect(result!.currentValue).toBe(110000)
    expect(result!.unrealizedPnL).toBe(10000)
    expect(result!.unrealizedPnLPercent).toBe(10)
  })

  it('should handle fractional share prices correctly', () => {
    const result = calculateUnrealizedPnL(position, 147.77)

    expect(result).not.toBeNull()
    expect(result!.currentValue).toBeCloseTo(14777, 2) // 100 * 147.77
    expect(result!.unrealizedPnL).toBeCloseTo(27, 2) // 14777 - 14750
  })
})

describe('calculateRealizedPnL', () => {
  const position = {
    shares: 100,
    totalCost: 14750, // Cost basis $147.50/share (after PUT premium)
    costBasis: 147.5,
  }

  it('should calculate realized P&L with profit', () => {
    // Sold at $150/share with $250 PUT premium and $200 CALL premium
    const result = calculateRealizedPnL(
      position,
      150, // sale price
      250, // PUT premium collected
      200 // CALL premium collected
    )

    // Sale proceeds: 150 * 100 = 15,000
    // Total premiums: 250 + 200 = 450
    // Total revenue: 15,000 + 450 = 15,450
    // Realized P&L: 15,450 - 14,750 = 700
    expect(result.realizedPnL).toBe(700)
    expect(result.realizedPnLPercent).toBeCloseTo(4.75, 2) // (700 / 14750) * 100
  })

  it('should calculate realized P&L with loss', () => {
    // Sold at $145/share with $250 PUT premium and $100 CALL premium
    const result = calculateRealizedPnL(position, 145, 250, 100)

    // Sale proceeds: 145 * 100 = 14,500
    // Total premiums: 250 + 100 = 350
    // Total revenue: 14,500 + 350 = 14,850
    // Realized P&L: 14,850 - 14,750 = 100
    expect(result.realizedPnL).toBe(100)
    expect(result.realizedPnLPercent).toBeCloseTo(0.68, 2)
  })

  it('should calculate break-even correctly', () => {
    // Break-even scenario
    const result = calculateRealizedPnL(position, 147.5, 250, 0)

    // Sale proceeds: 147.5 * 100 = 14,750
    // Total premiums: 250 + 0 = 250
    // Total revenue: 14,750 + 250 = 15,000
    // Realized P&L: 15,000 - 14,750 = 250
    expect(result.realizedPnL).toBe(250)
  })

  it('should handle zero premiums', () => {
    const result = calculateRealizedPnL(position, 150, 0, 0)

    // Sale proceeds: 150 * 100 = 15,000
    // Total premiums: 0
    // Realized P&L: 15,000 - 14,750 = 250
    expect(result.realizedPnL).toBe(250)
    expect(result.realizedPnLPercent).toBeCloseTo(1.69, 2)
  })

  it('should handle high premiums that offset loss on shares', () => {
    // Stock drops but high premiums still result in profit
    const result = calculateRealizedPnL(
      position,
      140, // $7.50/share loss
      500, // High PUT premium
      300 // High CALL premium
    )

    // Sale proceeds: 140 * 100 = 14,000
    // Total premiums: 500 + 300 = 800
    // Total revenue: 14,000 + 800 = 14,800
    // Realized P&L: 14,800 - 14,750 = 50 (still profitable due to premiums)
    expect(result.realizedPnL).toBe(50)
    expect(result.realizedPnLPercent).toBeCloseTo(0.34, 2)
  })

  it('should calculate large position correctly', () => {
    const largePosition = {
      shares: 1000,
      totalCost: 100000,
      costBasis: 100,
    }

    const result = calculateRealizedPnL(largePosition, 110, 1000, 500)

    // Sale proceeds: 110 * 1000 = 110,000
    // Total premiums: 1000 + 500 = 1,500
    // Total revenue: 110,000 + 1,500 = 111,500
    // Realized P&L: 111,500 - 100,000 = 11,500
    expect(result.realizedPnL).toBe(11500)
    expect(result.realizedPnLPercent).toBe(11.5)
  })

  it('should handle fractional prices and premiums', () => {
    const result = calculateRealizedPnL(position, 149.99, 250.5, 175.75)

    // Sale proceeds: 149.99 * 100 = 14,999
    // Total premiums: 250.5 + 175.75 = 426.25
    // Total revenue: 14,999 + 426.25 = 15,425.25
    // Realized P&L: 15,425.25 - 14,750 = 675.25
    expect(result.realizedPnL).toBeCloseTo(675.25, 2)
    expect(result.realizedPnLPercent).toBeCloseTo(4.58, 2)
  })
})
