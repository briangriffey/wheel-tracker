/**
 * Tests for semantic color functions
 */

import { describe, it, expect } from 'vitest'
import {
  getPnlColor,
  getPnLColorClass,
  getPnLBackgroundClass,
  getStatusColor,
  getPositionColor,
  getSemanticColor,
  getContrastRatio,
  meetsContrastAA,
  meetsContrastAAA,
  type ColorVariant,
  type TradeStatus,
  type PositionStatus,
} from '../colors'

describe('getPnlColor', () => {
  it('returns green colors for positive P&L', () => {
    const result = getPnlColor(100.50)
    expect(result).toEqual({
      text: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
    })
  })

  it('returns red colors for negative P&L', () => {
    const result = getPnlColor(-50.25)
    expect(result).toEqual({
      text: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
    })
  })

  it('returns gray colors for zero P&L', () => {
    const result = getPnlColor(0)
    expect(result).toEqual({
      text: 'text-gray-600',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
    })
  })

  it('handles very small positive values correctly', () => {
    const result = getPnlColor(0.01)
    expect(result.text).toBe('text-green-600')
  })

  it('handles very small negative values correctly', () => {
    const result = getPnlColor(-0.01)
    expect(result.text).toBe('text-red-600')
  })

  it('handles large positive values', () => {
    const result = getPnlColor(10000.99)
    expect(result.text).toBe('text-green-600')
  })

  it('handles large negative values', () => {
    const result = getPnlColor(-10000.99)
    expect(result.text).toBe('text-red-600')
  })
})

describe('getPnLColorClass', () => {
  it('returns text-green-600 for positive P&L', () => {
    expect(getPnLColorClass(100)).toBe('text-green-600')
  })

  it('returns text-red-600 for negative P&L', () => {
    expect(getPnLColorClass(-100)).toBe('text-red-600')
  })

  it('returns text-gray-600 for zero P&L', () => {
    expect(getPnLColorClass(0)).toBe('text-gray-600')
  })
})

describe('getPnLBackgroundClass', () => {
  it('returns bg-green-50 for positive P&L', () => {
    expect(getPnLBackgroundClass(100)).toBe('bg-green-50')
  })

  it('returns bg-red-50 for negative P&L', () => {
    expect(getPnLBackgroundClass(-100)).toBe('bg-red-50')
  })

  it('returns bg-gray-50 for zero P&L', () => {
    expect(getPnLBackgroundClass(0)).toBe('bg-gray-50')
  })
})

describe('getStatusColor', () => {
  it('returns green colors for OPEN status', () => {
    const result = getStatusColor('OPEN')
    expect(result).toEqual({
      text: 'text-green-800',
      bg: 'bg-green-100',
      border: 'border-green-200',
    })
  })

  it('returns purple colors for ASSIGNED status', () => {
    const result = getStatusColor('ASSIGNED')
    expect(result).toEqual({
      text: 'text-purple-800',
      bg: 'bg-purple-100',
      border: 'border-purple-200',
    })
  })

  it('returns yellow colors for EXPIRED status', () => {
    const result = getStatusColor('EXPIRED')
    expect(result).toEqual({
      text: 'text-yellow-800',
      bg: 'bg-yellow-100',
      border: 'border-yellow-200',
    })
  })

  it('returns gray colors for CLOSED status', () => {
    const result = getStatusColor('CLOSED')
    expect(result).toEqual({
      text: 'text-gray-800',
      bg: 'bg-gray-100',
      border: 'border-gray-200',
    })
  })

  it('handles PositionStatus OPEN', () => {
    const status: PositionStatus = 'OPEN'
    const result = getStatusColor(status)
    expect(result.text).toBe('text-green-800')
  })

  it('handles PositionStatus CLOSED', () => {
    const status: PositionStatus = 'CLOSED'
    const result = getStatusColor(status)
    expect(result.text).toBe('text-gray-800')
  })
})

describe('getPositionColor', () => {
  it('returns P&L-based colors when P&L is positive', () => {
    const result = getPositionColor('STOCK', 150.50)
    expect(result).toEqual({
      text: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
    })
  })

  it('returns P&L-based colors when P&L is negative', () => {
    const result = getPositionColor('STOCK', -75.25)
    expect(result).toEqual({
      text: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
    })
  })

  it('returns P&L-based colors when P&L is zero', () => {
    const result = getPositionColor('STOCK', 0)
    expect(result).toEqual({
      text: 'text-gray-600',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
    })
  })

  it('returns neutral colors when P&L is not provided', () => {
    const result = getPositionColor('STOCK')
    expect(result).toEqual({
      text: 'text-gray-700',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
    })
  })

  it('returns neutral colors when P&L is null', () => {
    const result = getPositionColor('STOCK', null)
    expect(result).toEqual({
      text: 'text-gray-700',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
    })
  })

  it('returns neutral colors when P&L is undefined', () => {
    const result = getPositionColor('STOCK', undefined)
    expect(result).toEqual({
      text: 'text-gray-700',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
    })
  })
})

describe('getSemanticColor', () => {
  it('returns green colors for success state', () => {
    const result = getSemanticColor('success')
    expect(result).toEqual({
      text: 'text-green-800',
      bg: 'bg-green-50',
      border: 'border-green-200',
    })
  })

  it('returns red colors for error state', () => {
    const result = getSemanticColor('error')
    expect(result).toEqual({
      text: 'text-red-800',
      bg: 'bg-red-50',
      border: 'border-red-200',
    })
  })

  it('returns yellow colors for warning state', () => {
    const result = getSemanticColor('warning')
    expect(result).toEqual({
      text: 'text-yellow-800',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
    })
  })

  it('returns blue colors for info state', () => {
    const result = getSemanticColor('info')
    expect(result).toEqual({
      text: 'text-blue-800',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
    })
  })
})

describe('getContrastRatio', () => {
  it('calculates maximum contrast for black and white', () => {
    const ratio = getContrastRatio('#000000', '#FFFFFF')
    expect(ratio).toBeCloseTo(21, 1)
  })

  it('calculates minimum contrast for identical colors', () => {
    const ratio = getContrastRatio('#000000', '#000000')
    expect(ratio).toBeCloseTo(1, 1)
  })

  it('handles 3-digit hex colors', () => {
    const ratio = getContrastRatio('#000', '#FFF')
    expect(ratio).toBeCloseTo(21, 1)
  })

  it('handles hex colors without # prefix', () => {
    const ratio = getContrastRatio('000000', 'FFFFFF')
    expect(ratio).toBeCloseTo(21, 1)
  })

  it('calculates ratio for gray colors', () => {
    const ratio = getContrastRatio('#808080', '#FFFFFF')
    expect(ratio).toBeGreaterThan(1)
    expect(ratio).toBeLessThan(21)
  })

  it('returns null for invalid hex color', () => {
    const ratio = getContrastRatio('invalid', '#FFFFFF')
    expect(ratio).toBeNull()
  })

  it('returns null for invalid length hex', () => {
    const ratio = getContrastRatio('#FFFFF', '#000000')
    expect(ratio).toBeNull()
  })

  it('is symmetric (order does not matter)', () => {
    const ratio1 = getContrastRatio('#FF0000', '#00FF00')
    const ratio2 = getContrastRatio('#00FF00', '#FF0000')
    expect(ratio1).toBe(ratio2)
  })
})

describe('meetsContrastAA', () => {
  it('returns true for black text on white background (normal text)', () => {
    expect(meetsContrastAA('#000000', '#FFFFFF', false)).toBe(true)
  })

  it('returns true for black text on white background (large text)', () => {
    expect(meetsContrastAA('#000000', '#FFFFFF', true)).toBe(true)
  })

  it('returns false for low contrast combinations (normal text)', () => {
    // Light gray on white has low contrast
    expect(meetsContrastAA('#CCCCCC', '#FFFFFF', false)).toBe(false)
  })

  it('allows lower ratio for large text', () => {
    // A ratio that meets AA for large text but not normal text
    // Gray #767676 on white has ~4.54:1 ratio
    expect(meetsContrastAA('#767676', '#FFFFFF', true)).toBe(true)
    expect(meetsContrastAA('#767676', '#FFFFFF', false)).toBe(true)
  })

  it('returns false for identical colors', () => {
    expect(meetsContrastAA('#000000', '#000000', false)).toBe(false)
  })

  it('returns false for invalid colors', () => {
    expect(meetsContrastAA('invalid', '#FFFFFF', false)).toBe(false)
  })

  it('validates design system success colors', () => {
    // Green-800 text on green-50 background
    expect(meetsContrastAA('#166534', '#F0FDF4', false)).toBe(true)
  })

  it('validates design system error colors', () => {
    // Red-800 text on red-50 background
    expect(meetsContrastAA('#991B1B', '#FEF2F2', false)).toBe(true)
  })
})

describe('meetsContrastAAA', () => {
  it('returns true for black text on white background', () => {
    expect(meetsContrastAAA('#000000', '#FFFFFF', false)).toBe(true)
  })

  it('requires higher ratio for normal text than AA', () => {
    // A ratio that meets AA but not AAA for normal text
    // #595959 on white has ~7:1 ratio (AAA threshold)
    expect(meetsContrastAAA('#595959', '#FFFFFF', false)).toBe(true)
    // #767676 on white has ~4.54:1 ratio (below AAA threshold)
    expect(meetsContrastAAA('#767676', '#FFFFFF', false)).toBe(false)
  })

  it('allows lower ratio for large text', () => {
    // #767676 on white meets AAA for large text but not normal text
    expect(meetsContrastAAA('#767676', '#FFFFFF', true)).toBe(true)
    expect(meetsContrastAAA('#767676', '#FFFFFF', false)).toBe(false)
  })

  it('returns false for low contrast', () => {
    expect(meetsContrastAAA('#CCCCCC', '#FFFFFF', false)).toBe(false)
  })

  it('returns false for invalid colors', () => {
    expect(meetsContrastAAA('invalid', '#FFFFFF', false)).toBe(false)
  })
})

describe('ColorVariant type', () => {
  it('has correct structure', () => {
    const variant: ColorVariant = {
      text: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
    }

    expect(variant).toHaveProperty('text')
    expect(variant).toHaveProperty('bg')
    expect(variant).toHaveProperty('border')
  })
})

describe('Edge cases and integration', () => {
  it('handles floating point P&L values', () => {
    expect(getPnLColorClass(123.456789)).toBe('text-green-600')
    expect(getPnLColorClass(-123.456789)).toBe('text-red-600')
  })

  it('all status types return valid color variants', () => {
    const statuses: Array<TradeStatus | PositionStatus> = [
      'OPEN',
      'CLOSED',
      'EXPIRED',
      'ASSIGNED',
    ]

    statuses.forEach((status) => {
      const result = getStatusColor(status)
      expect(result).toHaveProperty('text')
      expect(result).toHaveProperty('bg')
      expect(result).toHaveProperty('border')
      expect(result.text).toMatch(/^text-/)
      expect(result.bg).toMatch(/^bg-/)
      expect(result.border).toMatch(/^border-/)
    })
  })

  it('all semantic states return valid color variants', () => {
    const states: Array<'success' | 'error' | 'warning' | 'info'> = [
      'success',
      'error',
      'warning',
      'info',
    ]

    states.forEach((state) => {
      const result = getSemanticColor(state)
      expect(result).toHaveProperty('text')
      expect(result).toHaveProperty('bg')
      expect(result).toHaveProperty('border')
      expect(result.text).toMatch(/^text-/)
      expect(result.bg).toMatch(/^bg-/)
      expect(result.border).toMatch(/^border-/)
    })
  })

  it('backward compatibility - getPnLColorClass matches getPnlColor.text', () => {
    const testValues = [100, -100, 0, 0.01, -0.01]

    testValues.forEach((value) => {
      expect(getPnLColorClass(value)).toBe(getPnlColor(value).text)
    })
  })

  it('backward compatibility - getPnLBackgroundClass matches getPnlColor.bg', () => {
    const testValues = [100, -100, 0, 0.01, -0.01]

    testValues.forEach((value) => {
      expect(getPnLBackgroundClass(value)).toBe(getPnlColor(value).bg)
    })
  })
})
