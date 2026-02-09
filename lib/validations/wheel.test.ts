import { describe, it, expect } from 'vitest'
import {
  validateCashRequirement,
  validateStrikePrice,
  validatePositionState,
  validateWheelContinuity,
  type ValidationResult,
  type CashRequirementInput,
  type StrikePriceInput,
  type PositionStateInput,
  type WheelContinuityInput,
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
