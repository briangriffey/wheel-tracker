import { describe, it, expect } from 'vitest'
import {
  validateCashRequirement,
  validateStrikePrice,
  validatePositionState,
  validateWheelContinuity,
  validatePutAssignment,
  validateCallAssignment,
  calculateRecommendedStrikes,
  type ValidationResult,
  type CashRequirementInput,
  type StrikePriceInput,
  type PositionStateInput,
  type WheelContinuityInput,
  type PutAssignmentInput,
  type CallAssignmentInput,
} from './wheel'

// ============================================================================
// validateCashRequirement Tests
// ============================================================================

describe('validateCashRequirement', () => {
  it('should pass when cash balance covers requirement exactly', () => {
    const input: CashRequirementInput = {
      cashBalance: 15000,
      strikePrice: 150,
      contracts: 1, // 100 shares = $15,000 required
    }

    const result = validateCashRequirement(input)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should pass when cash balance exceeds requirement', () => {
    const input: CashRequirementInput = {
      cashBalance: 20000,
      strikePrice: 150,
      contracts: 1, // 100 shares = $15,000 required
    }

    const result = validateCashRequirement(input)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should fail when cash balance is insufficient', () => {
    const input: CashRequirementInput = {
      cashBalance: 10000,
      strikePrice: 150,
      contracts: 1, // 100 shares = $15,000 required
    }

    const result = validateCashRequirement(input)

    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('Insufficient cash')
    expect(result.errors[0]).toContain('$15000.00')
    expect(result.errors[0]).toContain('$10000.00')
    expect(result.errors[0]).toContain('$5000.00') // Shortfall
  })

  it('should calculate requirement correctly for multiple contracts', () => {
    const input: CashRequirementInput = {
      cashBalance: 10000,
      strikePrice: 100,
      contracts: 2, // 200 shares = $20,000 required
    }

    const result = validateCashRequirement(input)

    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('$20000.00')
  })

  it('should warn when cash balance is tight (less than 10% buffer)', () => {
    const input: CashRequirementInput = {
      cashBalance: 15500, // Just 3.3% buffer
      strikePrice: 150,
      contracts: 1, // 100 shares = $15,000 required
    }

    const result = validateCashRequirement(input)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('Cash balance is tight')
    expect(result.warnings[0]).toContain('10% buffer')
    expect(result.warnings[0]).toContain('$1500.00') // 10% of $15,000
  })

  it('should not warn when cash has adequate buffer', () => {
    const input: CashRequirementInput = {
      cashBalance: 18000, // 20% buffer
      strikePrice: 150,
      contracts: 1,
    }

    const result = validateCashRequirement(input)

    expect(result.valid).toBe(true)
    expect(result.warnings).toHaveLength(0)
  })

  it('should handle decimal strike prices correctly', () => {
    const input: CashRequirementInput = {
      cashBalance: 5000,
      strikePrice: 47.5,
      contracts: 1, // 100 shares = $4,750 required
    }

    const result = validateCashRequirement(input)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should handle high-value stocks', () => {
    const input: CashRequirementInput = {
      cashBalance: 100000,
      strikePrice: 1200,
      contracts: 1, // 100 shares = $120,000 required
    }

    const result = validateCashRequirement(input)

    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('$120000.00')
  })
})

// ============================================================================
// validateStrikePrice Tests
// ============================================================================

describe('validateStrikePrice', () => {
  it('should pass without warning when strike equals cost basis', () => {
    const input: StrikePriceInput = {
      callStrike: 150,
      positionCostBasis: 150,
    }

    const result = validateStrikePrice(input)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
    // Should have informational warning since strike is at cost basis
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('near cost basis')
  })

  it('should pass without warning when strike is well above cost basis', () => {
    const input: StrikePriceInput = {
      callStrike: 160,
      positionCostBasis: 150,
    }

    const result = validateStrikePrice(input)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
  })

  it('should warn when strike is below cost basis', () => {
    const input: StrikePriceInput = {
      callStrike: 145,
      positionCostBasis: 150,
    }

    const result = validateStrikePrice(input)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('below cost basis')
    expect(result.warnings[0]).toContain('$145.00')
    expect(result.warnings[0]).toContain('$150.00')
    expect(result.warnings[0]).toContain('$500.00') // Loss per contract
  })

  it('should calculate potential loss correctly', () => {
    const input: StrikePriceInput = {
      callStrike: 140,
      positionCostBasis: 147.5,
    }

    const result = validateStrikePrice(input)

    expect(result.warnings[0]).toContain('$750.00') // (147.5 - 140) * 100
  })

  it('should show informational message when strike is slightly above cost basis', () => {
    const input: StrikePriceInput = {
      callStrike: 152,
      positionCostBasis: 150, // 1.33% above
    }

    const result = validateStrikePrice(input)

    expect(result.valid).toBe(true)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('near cost basis')
    expect(result.warnings[0]).toContain('small gain')
    expect(result.warnings[0]).toContain('$200.00') // (152 - 150) * 100
  })

  it('should not show informational message when strike is significantly above cost basis', () => {
    const input: StrikePriceInput = {
      callStrike: 160,
      positionCostBasis: 150, // 6.67% above
    }

    const result = validateStrikePrice(input)

    expect(result.valid).toBe(true)
    expect(result.warnings).toHaveLength(0)
  })

  it('should handle decimal values correctly', () => {
    const input: StrikePriceInput = {
      callStrike: 147.25,
      positionCostBasis: 147.5,
    }

    const result = validateStrikePrice(input)

    expect(result.warnings[0]).toContain('$25.00') // (147.5 - 147.25) * 100
  })

  it('should warn for large losses', () => {
    const input: StrikePriceInput = {
      callStrike: 100,
      positionCostBasis: 150,
    }

    const result = validateStrikePrice(input)

    expect(result.warnings[0]).toContain('$5000.00') // (150 - 100) * 100
  })
})

// ============================================================================
// validatePositionState Tests
// ============================================================================

describe('validatePositionState', () => {
  it('should pass when position is OPEN with no active calls', () => {
    const input: PositionStateInput = {
      positionId: 'pos_123',
      positionStatus: 'OPEN',
      openCallsCount: 0,
    }

    const result = validatePositionState(input)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
  })

  it('should fail when position is CLOSED', () => {
    const input: PositionStateInput = {
      positionId: 'pos_123',
      positionStatus: 'CLOSED',
      openCallsCount: 0,
    }

    const result = validatePositionState(input)

    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('pos_123')
    expect(result.errors[0]).toContain('CLOSED')
    expect(result.errors[0]).toContain('Only OPEN positions')
  })

  it('should fail when position has one open call', () => {
    const input: PositionStateInput = {
      positionId: 'pos_123',
      positionStatus: 'OPEN',
      openCallsCount: 1,
    }

    const result = validatePositionState(input)

    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('pos_123')
    expect(result.errors[0]).toContain('already has 1 open CALL')
    expect(result.errors[0]).toContain('Only one active covered CALL')
  })

  it('should fail when position has multiple open calls', () => {
    const input: PositionStateInput = {
      positionId: 'pos_456',
      positionStatus: 'OPEN',
      openCallsCount: 2,
    }

    const result = validatePositionState(input)

    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('already has 2 open CALL')
  })

  it('should fail immediately if position is closed, regardless of open calls', () => {
    const input: PositionStateInput = {
      positionId: 'pos_789',
      positionStatus: 'CLOSED',
      openCallsCount: 5,
    }

    const result = validatePositionState(input)

    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('CLOSED')
    // Should not mention open calls since position is closed
    expect(result.errors[0]).not.toContain('open CALL')
  })
})

// ============================================================================
// validateWheelContinuity Tests
// ============================================================================

describe('validateWheelContinuity', () => {
  it('should pass without warning when trade is linked to active wheel', () => {
    const input: WheelContinuityInput = {
      tradeId: 'trade_123',
      wheelId: 'wheel_456',
      ticker: 'AAPL',
      activeWheelId: 'wheel_456',
    }

    const result = validateWheelContinuity(input)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
  })

  it('should pass without warning when no active wheel exists and trade is not linked', () => {
    const input: WheelContinuityInput = {
      tradeId: 'trade_123',
      wheelId: null,
      ticker: 'AAPL',
      activeWheelId: null,
    }

    const result = validateWheelContinuity(input)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
  })

  it('should warn when trade is not linked but active wheel exists', () => {
    const input: WheelContinuityInput = {
      tradeId: 'trade_123',
      wheelId: null,
      ticker: 'AAPL',
      activeWheelId: 'wheel_456',
    }

    const result = validateWheelContinuity(input)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('not linked to the active wheel')
    expect(result.warnings[0]).toContain('wheel_456')
    expect(result.warnings[0]).toContain('AAPL')
  })

  it('should warn when trade is linked to different wheel than active one', () => {
    const input: WheelContinuityInput = {
      tradeId: 'trade_123',
      wheelId: 'wheel_789',
      ticker: 'AAPL',
      activeWheelId: 'wheel_456',
    }

    const result = validateWheelContinuity(input)

    expect(result.valid).toBe(true)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('linked to wheel wheel_789')
    expect(result.warnings[0]).toContain('different active wheel (wheel_456)')
    expect(result.warnings[0]).toContain('multiple wheels')
  })

  it('should warn when trade is linked to wheel but no active wheel exists', () => {
    const input: WheelContinuityInput = {
      tradeId: 'trade_123',
      wheelId: 'wheel_456',
      ticker: 'TSLA',
      activeWheelId: null,
    }

    const result = validateWheelContinuity(input)

    expect(result.valid).toBe(true)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('linked to wheel wheel_456')
    expect(result.warnings[0]).toContain('no active wheel was found')
    expect(result.warnings[0]).toContain('PAUSED, IDLE, or COMPLETED')
  })

  it('should handle new trades without tradeId', () => {
    const input: WheelContinuityInput = {
      wheelId: null,
      ticker: 'MSFT',
      activeWheelId: 'wheel_999',
    }

    const result = validateWheelContinuity(input)

    expect(result.valid).toBe(true)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('(new)')
    expect(result.warnings[0]).toContain('MSFT')
  })

  it('should handle undefined wheelId same as null', () => {
    const input: WheelContinuityInput = {
      tradeId: 'trade_999',
      wheelId: undefined,
      ticker: 'NVDA',
      activeWheelId: 'wheel_123',
    }

    const result = validateWheelContinuity(input)

    expect(result.valid).toBe(true)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('not linked to the active wheel')
  })
})

// ============================================================================
// ValidationResult Type Tests
// ============================================================================

describe('ValidationResult type structure', () => {
  it('should have correct structure for valid result', () => {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    }

    expect(result).toHaveProperty('valid')
    expect(result).toHaveProperty('errors')
    expect(result).toHaveProperty('warnings')
    expect(Array.isArray(result.errors)).toBe(true)
    expect(Array.isArray(result.warnings)).toBe(true)
  })

  it('should have correct structure for invalid result with error', () => {
    const result: ValidationResult = {
      valid: false,
      errors: ['Error message'],
      warnings: [],
    }

    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(typeof result.errors[0]).toBe('string')
  })

  it('should support multiple errors and warnings', () => {
    const result: ValidationResult = {
      valid: false,
      errors: ['Error 1', 'Error 2'],
      warnings: ['Warning 1', 'Warning 2', 'Warning 3'],
    }

    expect(result.errors).toHaveLength(2)
    expect(result.warnings).toHaveLength(3)
  })
})

// ============================================================================
// validatePutAssignment Tests
// ============================================================================

describe('validatePutAssignment', () => {
  it('should pass when cash balance is sufficient', () => {
    const input: PutAssignmentInput = {
      strikePrice: 150,
      shares: 100,
      premium: 250,
      cashBalance: 20000,
      ticker: 'AAPL',
    }

    const result = validatePutAssignment(input)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.breakdown).toBeDefined()
    expect(result.breakdown?.totalCost).toBe(15000)
    expect(result.breakdown?.effectiveCostBasis).toBe(147.5) // 150 - (250/100)
    expect(result.breakdown?.cashRemaining).toBe(5000)
  })

  it('should fail when cash balance is insufficient', () => {
    const input: PutAssignmentInput = {
      strikePrice: 150,
      shares: 100,
      premium: 250,
      cashBalance: 10000,
      ticker: 'AAPL',
    }

    const result = validatePutAssignment(input)

    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('Insufficient cash')
    expect(result.errors[0]).toContain('$15000.00')
    expect(result.errors[0]).toContain('$10000.00')
    expect(result.errors[0]).toContain('$5000.00') // Shortfall
  })

  it('should warn when cash will be very low after assignment', () => {
    const input: PutAssignmentInput = {
      strikePrice: 150,
      shares: 100,
      premium: 250,
      cashBalance: 15500, // Only $500 remaining
      ticker: 'AAPL',
    }

    const result = validatePutAssignment(input)

    expect(result.valid).toBe(true)
    expect(result.warnings).toContainEqual(
      expect.stringContaining('only $500.00 in cash remaining')
    )
  })

  it('should include effective cost basis in warnings', () => {
    const input: PutAssignmentInput = {
      strikePrice: 150,
      shares: 100,
      premium: 300,
      cashBalance: 20000,
      ticker: 'AAPL',
    }

    const result = validatePutAssignment(input)

    expect(result.warnings).toContainEqual(
      expect.stringContaining('Effective cost basis: $147.00 per share')
    )
  })

  it('should calculate breakdown correctly for multiple shares', () => {
    const input: PutAssignmentInput = {
      strikePrice: 100,
      shares: 200, // 2 contracts
      premium: 400,
      cashBalance: 25000,
      ticker: 'MSFT',
    }

    const result = validatePutAssignment(input)

    expect(result.breakdown?.totalCost).toBe(20000)
    expect(result.breakdown?.effectiveCostBasis).toBe(98) // 100 - (400/200)
    expect(result.breakdown?.cashRemaining).toBe(5000)
  })
})

// ============================================================================
// validateCallAssignment Tests
// ============================================================================

describe('validateCallAssignment', () => {
  it('should show profit for profitable assignment', () => {
    const input: CallAssignmentInput = {
      strikePrice: 155,
      shares: 100,
      premium: 550, // PUT premium 250 + CALL premium 300
      positionCostBasis: 147.5,
      positionTotalCost: 14750,
      ticker: 'AAPL',
    }

    const result = validateCallAssignment(input)

    expect(result.valid).toBe(true)
    expect(result.breakdown.saleProceeds).toBe(15500)
    expect(result.breakdown.shareProfit).toBe(750)
    expect(result.breakdown.totalPremiums).toBe(550)
    expect(result.breakdown.totalProfit).toBe(1300) // 750 + 550
    expect(result.breakdown.returnOnInvestment).toBeCloseTo(8.81, 2)
    expect(result.warnings).toContainEqual(
      expect.stringContaining('Profitable assignment')
    )
  })

  it('should show loss for unprofitable assignment', () => {
    const input: CallAssignmentInput = {
      strikePrice: 145,
      shares: 100,
      premium: 400, // Total premiums
      positionCostBasis: 147.5,
      positionTotalCost: 14750,
      ticker: 'AAPL',
    }

    const result = validateCallAssignment(input)

    expect(result.valid).toBe(true)
    expect(result.breakdown.shareProfit).toBe(-250) // 14500 - 14750
    expect(result.breakdown.totalProfit).toBe(150) // -250 + 400
    expect(result.warnings).toContainEqual(
      expect.stringContaining('Profitable assignment')
    )
  })

  it('should show break-even for zero profit assignment', () => {
    const input: CallAssignmentInput = {
      strikePrice: 147.5,
      shares: 100,
      premium: 0,
      positionCostBasis: 147.5,
      positionTotalCost: 14750,
      ticker: 'AAPL',
    }

    const result = validateCallAssignment(input)

    expect(result.breakdown.totalProfit).toBe(0)
    expect(result.warnings).toContainEqual(
      expect.stringContaining('Break-even assignment')
    )
  })

  it('should show opportunity cost when current price is above strike', () => {
    const input: CallAssignmentInput = {
      strikePrice: 150,
      shares: 100,
      premium: 500,
      positionCostBasis: 145,
      positionTotalCost: 14500,
      currentStockPrice: 160,
      ticker: 'AAPL',
    }

    const result = validateCallAssignment(input)

    expect(result.warnings).toContainEqual(
      expect.stringContaining('Current stock price is $160.00')
    )
    expect(result.warnings).toContainEqual(
      expect.stringContaining('giving up $1000.00 in potential additional gains')
    )
  })

  it('should not show opportunity cost when current price is below or equal to strike', () => {
    const input: CallAssignmentInput = {
      strikePrice: 150,
      shares: 100,
      premium: 500,
      positionCostBasis: 145,
      positionTotalCost: 14500,
      currentStockPrice: 148,
      ticker: 'AAPL',
    }

    const result = validateCallAssignment(input)

    expect(result.warnings).not.toContainEqual(
      expect.stringContaining('giving up')
    )
  })

  it('should include detailed breakdown in warnings', () => {
    const input: CallAssignmentInput = {
      strikePrice: 155,
      shares: 100,
      premium: 600,
      positionCostBasis: 147.5,
      positionTotalCost: 14750,
      ticker: 'AAPL',
    }

    const result = validateCallAssignment(input)

    expect(result.warnings).toContainEqual(
      expect.stringContaining('Breakdown: Shares sold at $155.00')
    )
    expect(result.warnings).toContainEqual(
      expect.stringContaining('Premium collected ($600.00)')
    )
  })
})

// ============================================================================
// calculateRecommendedStrikes Tests
// ============================================================================

describe('calculateRecommendedStrikes', () => {
  it('should calculate recommended strikes correctly', () => {
    const costBasis = 150

    const result = calculateRecommendedStrikes(costBasis)

    expect(result.minimum).toBe(150)
    expect(result.conservative).toBeCloseTo(153, 0)
    expect(result.aggressive).toBeCloseTo(157.5, 1)
  })

  it('should handle decimal cost basis', () => {
    const costBasis = 147.5

    const result = calculateRecommendedStrikes(costBasis)

    expect(result.minimum).toBe(147.5)
    expect(result.conservative).toBeCloseTo(150.45, 2)
    expect(result.aggressive).toBeCloseTo(154.88, 2)
  })

  it('should handle low cost basis', () => {
    const costBasis = 10

    const result = calculateRecommendedStrikes(costBasis)

    expect(result.minimum).toBe(10)
    expect(result.conservative).toBe(10.2)
    expect(result.aggressive).toBe(10.5)
  })

  it('should handle high cost basis', () => {
    const costBasis = 1000

    const result = calculateRecommendedStrikes(costBasis)

    expect(result.minimum).toBe(1000)
    expect(result.conservative).toBe(1020)
    expect(result.aggressive).toBe(1050)
  })
})
