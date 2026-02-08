import { describe, it, expect } from 'vitest'
import {
  calculateDaysUntilExpiration,
  getExpirationColorClass,
  getExpirationUrgency,
} from '../expirations'

describe('calculateDaysUntilExpiration', () => {
  it('calculates days until expiration correctly', () => {
    const today = new Date()
    const future = new Date(today)
    future.setDate(future.getDate() + 10)

    const days = calculateDaysUntilExpiration(future)
    expect(days).toBe(10)
  })

  it('returns 0 for today', () => {
    const today = new Date()
    const days = calculateDaysUntilExpiration(today)
    expect(days).toBe(0)
  })

  it('returns negative for past dates', () => {
    const past = new Date()
    past.setDate(past.getDate() - 5)

    const days = calculateDaysUntilExpiration(past)
    expect(days).toBe(-5)
  })

  it('handles dates across month boundaries', () => {
    const future = new Date('2026-02-05')

    // Mock the current date
    const originalDate = Date
    global.Date = class extends originalDate {
      constructor() {
        super()
        return new originalDate('2026-01-28')
      }
      static now() {
        return new originalDate('2026-01-28').getTime()
      }
    } as DateConstructor

    const days = calculateDaysUntilExpiration(future)
    expect(days).toBe(8)

    // Restore original Date
    global.Date = originalDate
  })
})

describe('getExpirationColorClass', () => {
  it('returns red class for past expiration', () => {
    const colorClass = getExpirationColorClass(-1)
    expect(colorClass).toBe('text-red-700 bg-red-50 border-red-300')
  })

  it('returns red class for urgent (<7 days)', () => {
    const colorClass = getExpirationColorClass(5)
    expect(colorClass).toBe('text-red-600 bg-red-50 border-red-200')
  })

  it('returns yellow class for soon (7-14 days)', () => {
    const colorClass = getExpirationColorClass(10)
    expect(colorClass).toBe('text-yellow-600 bg-yellow-50 border-yellow-200')
  })

  it('returns green class for later (14+ days)', () => {
    const colorClass = getExpirationColorClass(20)
    expect(colorClass).toBe('text-green-600 bg-green-50 border-green-200')
  })

  it('returns red class for 0 days (today)', () => {
    const colorClass = getExpirationColorClass(0)
    expect(colorClass).toBe('text-red-600 bg-red-50 border-red-200')
  })

  it('returns red class for 6 days', () => {
    const colorClass = getExpirationColorClass(6)
    expect(colorClass).toBe('text-red-600 bg-red-50 border-red-200')
  })

  it('returns yellow class for exactly 7 days', () => {
    const colorClass = getExpirationColorClass(7)
    expect(colorClass).toBe('text-yellow-600 bg-yellow-50 border-yellow-200')
  })

  it('returns yellow class for 13 days', () => {
    const colorClass = getExpirationColorClass(13)
    expect(colorClass).toBe('text-yellow-600 bg-yellow-50 border-yellow-200')
  })

  it('returns green class for exactly 14 days', () => {
    const colorClass = getExpirationColorClass(14)
    expect(colorClass).toBe('text-green-600 bg-green-50 border-green-200')
  })
})

describe('getExpirationUrgency', () => {
  it('returns urgent for <7 days', () => {
    expect(getExpirationUrgency(0)).toBe('urgent')
    expect(getExpirationUrgency(5)).toBe('urgent')
    expect(getExpirationUrgency(6)).toBe('urgent')
  })

  it('returns soon for 7-14 days', () => {
    expect(getExpirationUrgency(7)).toBe('soon')
    expect(getExpirationUrgency(10)).toBe('soon')
    expect(getExpirationUrgency(13)).toBe('soon')
  })

  it('returns later for 14+ days', () => {
    expect(getExpirationUrgency(14)).toBe('later')
    expect(getExpirationUrgency(20)).toBe('later')
    expect(getExpirationUrgency(100)).toBe('later')
  })

  it('returns urgent for negative days (past due)', () => {
    expect(getExpirationUrgency(-1)).toBe('urgent')
    expect(getExpirationUrgency(-10)).toBe('urgent')
  })
})
