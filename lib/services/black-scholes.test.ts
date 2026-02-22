import { describe, it, expect } from 'vitest'
import {
  normalCDF,
  normalPDF,
  bsPutPrice,
  bsVega,
  computeIV,
  dteToYears,
  RISK_FREE_RATE,
} from './black-scholes'

describe('Black-Scholes', () => {
  describe('normalCDF', () => {
    it('should return 0.5 for x=0', () => {
      expect(normalCDF(0)).toBeCloseTo(0.5, 7)
    })

    it('should return ~0.8413 for x=1', () => {
      expect(normalCDF(1)).toBeCloseTo(0.8413, 4)
    })

    it('should return ~0.1587 for x=-1', () => {
      expect(normalCDF(-1)).toBeCloseTo(0.1587, 4)
    })

    it('should approach 1 for large positive x', () => {
      expect(normalCDF(6)).toBeCloseTo(1.0, 6)
    })

    it('should approach 0 for large negative x', () => {
      expect(normalCDF(-6)).toBeCloseTo(0.0, 6)
    })

    it('should satisfy N(x) + N(-x) = 1', () => {
      expect(normalCDF(1.5) + normalCDF(-1.5)).toBeCloseTo(1.0, 7)
      expect(normalCDF(2.3) + normalCDF(-2.3)).toBeCloseTo(1.0, 7)
    })
  })

  describe('normalPDF', () => {
    it('should return ~0.3989 at x=0', () => {
      expect(normalPDF(0)).toBeCloseTo(0.3989, 4)
    })

    it('should be symmetric: n(x) = n(-x)', () => {
      expect(normalPDF(1.5)).toBeCloseTo(normalPDF(-1.5), 10)
    })

    it('should decrease away from 0', () => {
      expect(normalPDF(0)).toBeGreaterThan(normalPDF(1))
      expect(normalPDF(1)).toBeGreaterThan(normalPDF(2))
    })
  })

  describe('bsPutPrice', () => {
    it('should price an ATM put correctly (textbook example)', () => {
      // S=100, K=100, T=1, r=0.05, sigma=0.20 → put ≈ 5.57
      const price = bsPutPrice(100, 100, 1, 0.05, 0.20)
      expect(price).toBeCloseTo(5.57, 1)
    })

    it('should price a deep ITM put higher', () => {
      // Deep ITM: K >> S
      const deepItm = bsPutPrice(80, 100, 1, 0.05, 0.20)
      const atm = bsPutPrice(100, 100, 1, 0.05, 0.20)
      expect(deepItm).toBeGreaterThan(atm)
    })

    it('should price a deep OTM put near zero', () => {
      // Deep OTM: K << S
      const deepOtm = bsPutPrice(150, 100, 0.25, 0.05, 0.20)
      expect(deepOtm).toBeLessThan(0.01)
    })

    it('should be monotonically increasing in sigma', () => {
      const lowVol = bsPutPrice(100, 100, 1, 0.05, 0.15)
      const highVol = bsPutPrice(100, 100, 1, 0.05, 0.40)
      expect(highVol).toBeGreaterThan(lowVol)
    })

    it('should be monotonically increasing in T for ATM', () => {
      const shortDte = bsPutPrice(100, 100, 0.1, 0.05, 0.20)
      const longDte = bsPutPrice(100, 100, 1.0, 0.05, 0.20)
      expect(longDte).toBeGreaterThan(shortDte)
    })
  })

  describe('bsVega', () => {
    it('should be positive', () => {
      expect(bsVega(100, 100, 1, 0.05, 0.20)).toBeGreaterThan(0)
    })

    it('should be highest ATM', () => {
      const atm = bsVega(100, 100, 1, 0.05, 0.20)
      const otm = bsVega(100, 80, 1, 0.05, 0.20)
      const itm = bsVega(100, 120, 1, 0.05, 0.20)
      expect(atm).toBeGreaterThan(otm)
      expect(atm).toBeGreaterThan(itm)
    })
  })

  describe('computeIV', () => {
    it('should round-trip: compute BS price at known sigma, then recover sigma', () => {
      const S = 100, K = 100, T = 1, r = 0.05, trueSigma = 0.25
      const price = bsPutPrice(S, K, T, r, trueSigma)
      const recoveredSigma = computeIV(price, S, K, T, r)

      expect(recoveredSigma).not.toBeNull()
      expect(recoveredSigma!).toBeCloseTo(trueSigma, 6)
    })

    it('should recover sigma for OTM put', () => {
      const S = 110, K = 100, T = 0.25, r = 0.05, trueSigma = 0.30
      const price = bsPutPrice(S, K, T, r, trueSigma)
      const recoveredSigma = computeIV(price, S, K, T, r)

      expect(recoveredSigma).not.toBeNull()
      expect(recoveredSigma!).toBeCloseTo(trueSigma, 5)
    })

    it('should recover sigma for high volatility', () => {
      const S = 100, K = 100, T = 0.5, r = 0.05, trueSigma = 1.5
      const price = bsPutPrice(S, K, T, r, trueSigma)
      const recoveredSigma = computeIV(price, S, K, T, r)

      expect(recoveredSigma).not.toBeNull()
      expect(recoveredSigma!).toBeCloseTo(trueSigma, 4)
    })

    it('should return null for T <= 0', () => {
      expect(computeIV(5, 100, 100, 0, 0.05)).toBeNull()
      expect(computeIV(5, 100, 100, -1, 0.05)).toBeNull()
    })

    it('should return null for price <= 0', () => {
      expect(computeIV(0, 100, 100, 1, 0.05)).toBeNull()
      expect(computeIV(-1, 100, 100, 1, 0.05)).toBeNull()
    })

    it('should return null for S <= 0', () => {
      expect(computeIV(5, 0, 100, 1, 0.05)).toBeNull()
    })

    it('should return null for K <= 0', () => {
      expect(computeIV(5, 100, 0, 1, 0.05)).toBeNull()
    })

    it('should handle realistic market data', () => {
      // AAPL-like: S=180, K=175, T=35/365, option price ~2.50
      const S = 180, K = 175, T = 35 / 365, r = 0.05, trueSigma = 0.28
      const price = bsPutPrice(S, K, T, r, trueSigma)
      const recoveredSigma = computeIV(price, S, K, T, r)

      expect(recoveredSigma).not.toBeNull()
      expect(recoveredSigma!).toBeCloseTo(trueSigma, 4)
    })
  })

  describe('dteToYears', () => {
    it('should convert 365 days to 1 year', () => {
      expect(dteToYears(365)).toBe(1.0)
    })

    it('should convert 30 days correctly', () => {
      expect(dteToYears(30)).toBeCloseTo(0.0822, 4)
    })

    it('should handle 0 days', () => {
      expect(dteToYears(0)).toBe(0)
    })
  })

  describe('RISK_FREE_RATE', () => {
    it('should be 0.05', () => {
      expect(RISK_FREE_RATE).toBe(0.05)
    })
  })
})
