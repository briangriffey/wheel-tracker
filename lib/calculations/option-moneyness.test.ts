import { describe, it, expect } from 'vitest'
import {
  calculatePutMoneyness,
  calculateCallMoneyness,
  calculateOptionMoneyness,
  getMoneynessColor,
} from './option-moneyness'

describe('calculatePutMoneyness', () => {
  it('should return ITM when stock price is below strike', () => {
    expect(calculatePutMoneyness(145, 150)).toBe('ITM')
    expect(calculatePutMoneyness(100, 150)).toBe('ITM')
  })

  it('should return ATM when stock price is within threshold of strike', () => {
    expect(calculatePutMoneyness(150, 150)).toBe('ATM')
    expect(calculatePutMoneyness(150.5, 150)).toBe('ATM')
    expect(calculatePutMoneyness(149.5, 150)).toBe('ATM')
  })

  it('should return OTM when stock price is above strike', () => {
    expect(calculatePutMoneyness(155, 150)).toBe('OTM')
    expect(calculatePutMoneyness(200, 150)).toBe('OTM')
  })

  it('should respect custom ATM threshold', () => {
    // With 5% threshold
    expect(calculatePutMoneyness(147.5, 150, 0.05)).toBe('ATM') // 1.67% diff
    expect(calculatePutMoneyness(142, 150, 0.05)).toBe('ITM') // 5.3% diff
    expect(calculatePutMoneyness(158, 150, 0.05)).toBe('OTM') // 5.3% diff
  })
})

describe('calculateCallMoneyness', () => {
  it('should return ITM when stock price is above strike', () => {
    expect(calculateCallMoneyness(155, 150)).toBe('ITM')
    expect(calculateCallMoneyness(200, 150)).toBe('ITM')
  })

  it('should return ATM when stock price is within threshold of strike', () => {
    expect(calculateCallMoneyness(150, 150)).toBe('ATM')
    expect(calculateCallMoneyness(150.5, 150)).toBe('ATM')
    expect(calculateCallMoneyness(149.5, 150)).toBe('ATM')
  })

  it('should return OTM when stock price is below strike', () => {
    expect(calculateCallMoneyness(145, 150)).toBe('OTM')
    expect(calculateCallMoneyness(100, 150)).toBe('OTM')
  })

  it('should respect custom ATM threshold', () => {
    // With 5% threshold
    expect(calculateCallMoneyness(152.5, 150, 0.05)).toBe('ATM') // 1.67% diff
    expect(calculateCallMoneyness(158, 150, 0.05)).toBe('ITM') // 5.3% diff
    expect(calculateCallMoneyness(142, 150, 0.05)).toBe('OTM') // 5.3% diff
  })
})

describe('calculateOptionMoneyness', () => {
  it('should calculate PUT moneyness with details', () => {
    // ITM PUT
    const itmPut = calculateOptionMoneyness(145, 150, 'PUT')
    expect(itmPut.status).toBe('ITM')
    expect(itmPut.intrinsicValue).toBe(5)
    expect(itmPut.percentageFromStrike).toBeCloseTo(-3.33, 1)

    // OTM PUT
    const otmPut = calculateOptionMoneyness(155, 150, 'PUT')
    expect(otmPut.status).toBe('OTM')
    expect(otmPut.intrinsicValue).toBe(0)
    expect(otmPut.percentageFromStrike).toBeCloseTo(3.33, 1)

    // ATM PUT
    const atmPut = calculateOptionMoneyness(150, 150, 'PUT')
    expect(atmPut.status).toBe('ATM')
    expect(atmPut.intrinsicValue).toBe(0)
    expect(atmPut.percentageFromStrike).toBe(0)
  })

  it('should calculate CALL moneyness with details', () => {
    // ITM CALL
    const itmCall = calculateOptionMoneyness(155, 150, 'CALL')
    expect(itmCall.status).toBe('ITM')
    expect(itmCall.intrinsicValue).toBe(5)
    expect(itmCall.percentageFromStrike).toBeCloseTo(3.33, 1)

    // OTM CALL
    const otmCall = calculateOptionMoneyness(145, 150, 'CALL')
    expect(otmCall.status).toBe('OTM')
    expect(otmCall.intrinsicValue).toBe(0)
    expect(otmCall.percentageFromStrike).toBeCloseTo(-3.33, 1)

    // ATM CALL
    const atmCall = calculateOptionMoneyness(150, 150, 'CALL')
    expect(atmCall.status).toBe('ATM')
    expect(atmCall.intrinsicValue).toBe(0)
    expect(atmCall.percentageFromStrike).toBe(0)
  })

  it('should respect custom ATM threshold', () => {
    const result = calculateOptionMoneyness(152.5, 150, 'CALL', 0.05)
    expect(result.status).toBe('ATM')
    expect(result.intrinsicValue).toBe(2.5)
  })
})

describe('getMoneynessColor', () => {
  it('should return green colors for OTM', () => {
    const colors = getMoneynessColor('OTM')
    expect(colors.bg).toBe('bg-green-100')
    expect(colors.text).toBe('text-green-800')
    expect(colors.border).toBe('border-green-300')
  })

  it('should return yellow colors for ATM', () => {
    const colors = getMoneynessColor('ATM')
    expect(colors.bg).toBe('bg-yellow-100')
    expect(colors.text).toBe('text-yellow-800')
    expect(colors.border).toBe('border-yellow-300')
  })

  it('should return red colors for ITM', () => {
    const colors = getMoneynessColor('ITM')
    expect(colors.bg).toBe('bg-red-100')
    expect(colors.text).toBe('text-red-800')
    expect(colors.border).toBe('border-red-300')
  })
})
