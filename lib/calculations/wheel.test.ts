import { describe, it, expect } from 'vitest'
import {
  calculateCyclePL,
  calculateAnnualizedReturn,
  calculateWinRate,
  suggestCallStrike,
  validateCashRequirement,
  type WheelCycle,
  type TradeData,
  type PositionData,
  type UserData,
} from './wheel'

// Helper to create mock trades
function createMockTrade(overrides: Partial<TradeData> = {}): TradeData {
  return {
    premium: 250,
    ...overrides,
  }
}

// Helper to create mock positions
function createMockPosition(overrides: Partial<PositionData> = {}): PositionData {
  return {
    shares: 100,
    costBasis: 147.5,
    realizedGainLoss: 750,
    ...overrides,
  }
}

// Helper to create mock wheel cycle
function createMockCycle(overrides: Partial<WheelCycle> = {}): WheelCycle {
  return {
    cycleNumber: 1,
    putTrade: createMockTrade({ premium: 250 }),
    position: createMockPosition({ realizedGainLoss: 750 }),
    callTrades: [
      createMockTrade({ premium: 200 }),
    ],
    totalPremiums: 450,
    realizedPL: 1200,
    duration: 45,
    startDate: new Date('2026-02-01'),
    endDate: new Date('2026-03-15'),
    ...overrides,
  }
}

describe('calculateCyclePL', () => {
  it('should calculate total P&L from premiums and stock gains', () => {
    const cycle = createMockCycle({
      putTrade: createMockTrade({ premium: 250 }),
      callTrades: [
        createMockTrade({ premium: 200 }),
      ],
      position: createMockPosition({ realizedGainLoss: 750 }),
    })

    // P&L = PUT premium (250) + CALL premium (200) + stock gain (750) = 1200
    const result = calculateCyclePL(cycle)
    expect(result).toBe(1200)
  })

  it('should handle multiple covered calls in a cycle', () => {
    const cycle = createMockCycle({
      putTrade: createMockTrade({ premium: 250 }),
      callTrades: [
        createMockTrade({ premium: 200 }),
        createMockTrade({ premium: 150 }),
        createMockTrade({ premium: 100 }),
      ],
      position: createMockPosition({ realizedGainLoss: 500 }),
    })

    // P&L = 250 + 200 + 150 + 100 + 500 = 1200
    const result = calculateCyclePL(cycle)
    expect(result).toBe(1200)
  })

  it('should handle negative stock gains (losses)', () => {
    const cycle = createMockCycle({
      putTrade: createMockTrade({ premium: 250 }),
      callTrades: [
        createMockTrade({ premium: 200 }),
      ],
      position: createMockPosition({ realizedGainLoss: -500 }),
    })

    // P&L = 250 + 200 + (-500) = -50 (net loss)
    const result = calculateCyclePL(cycle)
    expect(result).toBe(-50)
  })

  it('should handle cycle with no stock gain/loss', () => {
    const cycle = createMockCycle({
      putTrade: createMockTrade({ premium: 250 }),
      callTrades: [
        createMockTrade({ premium: 200 }),
      ],
      position: createMockPosition({ realizedGainLoss: 0 }),
    })

    // P&L = 250 + 200 + 0 = 450 (premiums only)
    const result = calculateCyclePL(cycle)
    expect(result).toBe(450)
  })

  it('should handle cycle with no realized gain/loss field', () => {
    const cycle = createMockCycle({
      putTrade: createMockTrade({ premium: 250 }),
      callTrades: [
        createMockTrade({ premium: 200 }),
      ],
      position: createMockPosition({ realizedGainLoss: null }),
    })

    // P&L = 250 + 200 + 0 = 450
    const result = calculateCyclePL(cycle)
    expect(result).toBe(450)
  })

  it('should handle empty call trades array', () => {
    const cycle = createMockCycle({
      putTrade: createMockTrade({ premium: 250 }),
      callTrades: [],
      position: createMockPosition({ realizedGainLoss: 750 }),
    })

    // P&L = 250 + 0 + 750 = 1000
    const result = calculateCyclePL(cycle)
    expect(result).toBe(1000)
  })
})

describe('calculateAnnualizedReturn', () => {
  it('should calculate annualized return for a 45-day cycle', () => {
    // 8.1% return over 45 days
    const result = calculateAnnualizedReturn(1200, 45, 14750)

    // (1200 / 14750) * (365 / 45) * 100 = ~65.99%
    expect(result).toBeCloseTo(65.99, 1)
  })

  it('should calculate annualized return for a 30-day cycle', () => {
    // 5% return over 30 days
    const result = calculateAnnualizedReturn(750, 30, 15000)

    // (750 / 15000) * (365 / 30) * 100 = ~60.8%
    expect(result).toBeCloseTo(60.83, 1)
  })

  it('should handle negative returns (losses)', () => {
    // -2% loss over 60 days
    const result = calculateAnnualizedReturn(-300, 60, 15000)

    // (-300 / 15000) * (365 / 60) * 100 = -12.17%
    expect(result).toBeCloseTo(-12.17, 1)
  })

  it('should return 0 when capital is 0', () => {
    const result = calculateAnnualizedReturn(1000, 45, 0)
    expect(result).toBe(0)
  })

  it('should return 0 when capital is negative', () => {
    const result = calculateAnnualizedReturn(1000, 45, -10000)
    expect(result).toBe(0)
  })

  it('should return 0 when duration is 0', () => {
    const result = calculateAnnualizedReturn(1000, 0, 15000)
    expect(result).toBe(0)
  })

  it('should return 0 when duration is negative', () => {
    const result = calculateAnnualizedReturn(1000, -45, 15000)
    expect(result).toBe(0)
  })

  it('should handle very short durations (1 day)', () => {
    // 1% return in 1 day
    const result = calculateAnnualizedReturn(150, 1, 15000)

    // (150 / 15000) * 365 * 100 = 365%
    expect(result).toBeCloseTo(365, 1)
  })

  it('should handle very long durations (365 days)', () => {
    // 10% return over full year
    const result = calculateAnnualizedReturn(1500, 365, 15000)

    // (1500 / 15000) * (365 / 365) * 100 = 10%
    expect(result).toBeCloseTo(10, 1)
  })

  it('should handle break-even scenarios (zero P&L)', () => {
    const result = calculateAnnualizedReturn(0, 45, 15000)
    expect(result).toBe(0)
  })
})

describe('calculateWinRate', () => {
  it('should calculate win rate with all profitable cycles', () => {
    const cycles = [
      createMockCycle({ realizedPL: 1200 }),
      createMockCycle({ realizedPL: 850 }),
      createMockCycle({ realizedPL: 1500 }),
    ]

    const result = calculateWinRate(cycles)
    expect(result).toBe(100) // 3/3 = 100%
  })

  it('should calculate win rate with mixed results', () => {
    const cycles = [
      createMockCycle({
        putTrade: createMockTrade({ premium: 250 }),
        callTrades: [createMockTrade({ premium: 200 })],
        position: createMockPosition({ realizedGainLoss: 750 }),
      }), // 1200 profit
      createMockCycle({
        putTrade: createMockTrade({ premium: 250 }),
        callTrades: [createMockTrade({ premium: 200 })],
        position: createMockPosition({ realizedGainLoss: -750 }),
      }), // -300 loss
      createMockCycle({
        putTrade: createMockTrade({ premium: 250 }),
        callTrades: [createMockTrade({ premium: 200 })],
        position: createMockPosition({ realizedGainLoss: 400 }),
      }), // 850 profit
    ]

    const result = calculateWinRate(cycles)
    expect(result).toBeCloseTo(66.67, 1) // 2/3 = 66.67%
  })

  it('should not count break-even as wins', () => {
    const cycles = [
      createMockCycle({
        putTrade: createMockTrade({ premium: 250 }),
        callTrades: [createMockTrade({ premium: 200 })],
        position: createMockPosition({ realizedGainLoss: -450 }),
      }), // 0 break-even
      createMockCycle({
        putTrade: createMockTrade({ premium: 250 }),
        callTrades: [createMockTrade({ premium: 200 })],
        position: createMockPosition({ realizedGainLoss: 750 }),
      }), // 1200 profit
    ]

    const result = calculateWinRate(cycles)
    expect(result).toBe(50) // 1/2 = 50%
  })

  it('should calculate win rate with all losing cycles', () => {
    const cycles = [
      createMockCycle({
        putTrade: createMockTrade({ premium: 250 }),
        callTrades: [createMockTrade({ premium: 200 })],
        position: createMockPosition({ realizedGainLoss: -1000 }),
      }),
      createMockCycle({
        putTrade: createMockTrade({ premium: 250 }),
        callTrades: [createMockTrade({ premium: 200 })],
        position: createMockPosition({ realizedGainLoss: -500 }),
      }),
    ]

    const result = calculateWinRate(cycles)
    expect(result).toBe(0) // 0/2 = 0%
  })

  it('should return 0 for empty cycle array', () => {
    const result = calculateWinRate([])
    expect(result).toBe(0)
  })

  it('should handle single cycle', () => {
    const cycles = [
      createMockCycle({
        putTrade: createMockTrade({ premium: 250 }),
        callTrades: [createMockTrade({ premium: 200 })],
        position: createMockPosition({ realizedGainLoss: 750 }),
      }),
    ]

    const result = calculateWinRate(cycles)
    expect(result).toBe(100) // 1/1 = 100%
  })
})

describe('suggestCallStrike', () => {
  it('should suggest strike for 5% desired return', () => {
    const position = {
      costBasis: 147.5,
      shares: 100,
    }

    const result = suggestCallStrike(position, 5)

    // 147.50 * 1.05 = 154.875
    expect(result).toBeCloseTo(154.875, 2)
  })

  it('should suggest strike for 3% desired return', () => {
    const position = {
      costBasis: 150,
      shares: 100,
    }

    const result = suggestCallStrike(position, 3)

    // 150 * 1.03 = 154.50
    expect(result).toBeCloseTo(154.5, 1)
  })

  it('should suggest strike for 10% desired return', () => {
    const position = {
      costBasis: 100,
      shares: 100,
    }

    const result = suggestCallStrike(position, 10)

    // 100 * 1.10 = 110
    expect(result).toBe(110)
  })

  it('should handle 0% desired return (return cost basis)', () => {
    const position = {
      costBasis: 150,
      shares: 100,
    }

    const result = suggestCallStrike(position, 0)
    expect(result).toBe(150)
  })

  it('should handle negative desired return (return cost basis)', () => {
    const position = {
      costBasis: 150,
      shares: 100,
    }

    const result = suggestCallStrike(position, -5)
    expect(result).toBe(150)
  })

  it('should handle zero cost basis', () => {
    const position = {
      costBasis: 0,
      shares: 100,
    }

    const result = suggestCallStrike(position, 5)
    expect(result).toBe(0)
  })

  it('should handle fractional desired returns', () => {
    const position = {
      costBasis: 150,
      shares: 100,
    }

    const result = suggestCallStrike(position, 2.5)

    // 150 * 1.025 = 153.75
    expect(result).toBeCloseTo(153.75, 2)
  })

  it('should handle large positions', () => {
    const position = {
      costBasis: 500,
      shares: 100,
    }

    const result = suggestCallStrike(position, 5)

    // 500 * 1.05 = 525
    expect(result).toBe(525)
  })
})

describe('validateCashRequirement', () => {
  it('should return true when user has sufficient cash', () => {
    const user: UserData = { cashBalance: 20000 }

    const result = validateCashRequirement(user, 150, 1)

    // Needs: 150 * 100 = 15,000
    // Has: 20,000
    expect(result).toBe(true)
  })

  it('should return false when user has insufficient cash', () => {
    const user: UserData = { cashBalance: 10000 }

    const result = validateCashRequirement(user, 150, 1)

    // Needs: 150 * 100 = 15,000
    // Has: 10,000
    expect(result).toBe(false)
  })

  it('should return false when user has exactly required cash minus $1', () => {
    const user: UserData = { cashBalance: 14999 }

    const result = validateCashRequirement(user, 150, 1)

    // Needs: 15,000
    // Has: 14,999
    expect(result).toBe(false)
  })

  it('should return true when user has exactly required cash', () => {
    const user: UserData = { cashBalance: 15000 }

    const result = validateCashRequirement(user, 150, 1)

    // Needs: 15,000
    // Has: 15,000
    expect(result).toBe(true)
  })

  it('should handle multiple contracts', () => {
    const user: UserData = { cashBalance: 50000 }

    const result = validateCashRequirement(user, 150, 3)

    // Needs: 150 * 300 = 45,000
    // Has: 50,000
    expect(result).toBe(true)
  })

  it('should return false for multiple contracts with insufficient cash', () => {
    const user: UserData = { cashBalance: 20000 }

    const result = validateCashRequirement(user, 150, 2)

    // Needs: 150 * 200 = 30,000
    // Has: 20,000
    expect(result).toBe(false)
  })

  it('should return true when cashBalance is not available (future feature)', () => {
    const user: UserData = {}

    const result = validateCashRequirement(user, 150, 1)

    // Cash tracking not implemented yet, should allow
    expect(result).toBe(true)
  })

  it('should return true when cashBalance is null', () => {
    const user: UserData = { cashBalance: null }

    const result = validateCashRequirement(user, 150, 1)

    expect(result).toBe(true)
  })

  it('should return true when cashBalance is undefined', () => {
    const user: UserData = { cashBalance: undefined }

    const result = validateCashRequirement(user, 150, 1)

    expect(result).toBe(true)
  })

  it('should return false for invalid strike price (0)', () => {
    const user: UserData = { cashBalance: 20000 }

    const result = validateCashRequirement(user, 0, 1)
    expect(result).toBe(false)
  })

  it('should return false for invalid strike price (negative)', () => {
    const user: UserData = { cashBalance: 20000 }

    const result = validateCashRequirement(user, -150, 1)
    expect(result).toBe(false)
  })

  it('should return false for invalid contracts (0)', () => {
    const user: UserData = { cashBalance: 20000 }

    const result = validateCashRequirement(user, 150, 0)
    expect(result).toBe(false)
  })

  it('should return false for invalid contracts (negative)', () => {
    const user: UserData = { cashBalance: 20000 }

    const result = validateCashRequirement(user, 150, -1)
    expect(result).toBe(false)
  })

  it('should handle fractional strike prices', () => {
    const user: UserData = { cashBalance: 15000 }

    const result = validateCashRequirement(user, 147.50, 1)

    // Needs: 147.50 * 100 = 14,750
    // Has: 15,000
    expect(result).toBe(true)
  })

  it('should handle zero cash balance', () => {
    const user: UserData = { cashBalance: 0 }

    const result = validateCashRequirement(user, 150, 1)
    expect(result).toBe(false)
  })
})
