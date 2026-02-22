import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OptionType } from './options-data'
import type { FinancialDataPriceRecord, OptionChainRecord, OptionGreeksRecord, OptionPriceRecord } from './options-data'
import { SCANNER } from './scanner-constants'

// Mock dependencies
vi.mock('@/lib/db', () => ({
  prisma: {
    trade: { findFirst: vi.fn() },
    position: { findFirst: vi.fn() },
    watchlistTicker: { findMany: vi.fn() },
    scanResult: { createMany: vi.fn(), deleteMany: vi.fn() },
  },
}))

vi.mock('./rate-limiter', () => ({
  apiRateLimiter: {
    enqueue: <T>(fn: () => Promise<T>) => fn(),
    getQueueLength: () => 0,
  },
}))

vi.mock('./options-data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./options-data')>()
  return {
    ...actual,
    fetchStockPriceHistory: vi.fn(),
    fetchOptionChain: vi.fn(),
    fetchOptionGreeks: vi.fn(),
    fetchOptionPrices: vi.fn(),
  }
})

const {
  computeSMA,
  computeIVRank,
  computePremiumYield,
  linearScore,
  computeDeltaScore,
  computeLiquidityScore,
  computeTrendScore,
  computeDTE,
  runPhase1,
  runPhase2,
  selectBestContract,
  computeScores,
  checkPortfolio,
  scanTicker,
  runFullScan,
} = await import('./scanner')

const {
  fetchStockPriceHistory,
  fetchOptionChain,
  fetchOptionGreeks,
  fetchOptionPrices,
} = await import('./options-data') as unknown as {
  fetchStockPriceHistory: ReturnType<typeof vi.fn>
  fetchOptionChain: ReturnType<typeof vi.fn>
  fetchOptionGreeks: ReturnType<typeof vi.fn>
  fetchOptionPrices: ReturnType<typeof vi.fn>
}

const { prisma } = await import('@/lib/db') as unknown as {
  prisma: {
    trade: { findFirst: ReturnType<typeof vi.fn> }
    position: { findFirst: ReturnType<typeof vi.fn> }
    watchlistTicker: { findMany: ReturnType<typeof vi.fn> }
    scanResult: { createMany: ReturnType<typeof vi.fn>; deleteMany: ReturnType<typeof vi.fn> }
  }
}

// === Test Helpers ===

function makePriceRecords(count: number, basePrice: number, baseVolume: number): FinancialDataPriceRecord[] {
  const records: FinancialDataPriceRecord[] = []
  for (let i = 0; i < count; i++) {
    const date = new Date(2026, 1, 14 - i)
    records.push({
      date: date.toISOString().slice(0, 10),
      open: basePrice - 1,
      high: basePrice + 1,
      low: basePrice - 2,
      close: basePrice + ((count - i) * 0.05), // Most recent price is highest
      volume: baseVolume,
    })
  }
  return records
}

describe('Scanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.FINANCIAL_DATA_API_KEY = 'test-key'
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // === Pure Calculation Helpers ===

  describe('computeSMA', () => {
    it('should compute simple moving average', () => {
      const closes = [10, 20, 30, 40, 50]
      expect(computeSMA(closes, 3)).toBe(20) // (10+20+30)/3
    })

    it('should return null when insufficient data', () => {
      expect(computeSMA([10, 20], 5)).toBeNull()
    })

    it('should use first N elements (most recent)', () => {
      const closes = [100, 50, 50, 50, 50, 10, 10]
      expect(computeSMA(closes, 4)).toBe(62.5) // (100+50+50+50)/4
    })

    it('should handle single element', () => {
      expect(computeSMA([42], 1)).toBe(42)
    })
  })

  describe('computeIVRank', () => {
    it('should compute IV rank correctly', () => {
      // (30 - 20) / (60 - 20) * 100 = 25
      expect(computeIVRank(0.30, 0.20, 0.60)).toBeCloseTo(25)
    })

    it('should return 0 when current equals low', () => {
      expect(computeIVRank(0.20, 0.20, 0.60)).toBe(0)
    })

    it('should return 100 when current equals high', () => {
      expect(computeIVRank(0.60, 0.20, 0.60)).toBe(100)
    })

    it('should clamp to 0 when below range', () => {
      expect(computeIVRank(0.10, 0.20, 0.60)).toBe(0)
    })

    it('should clamp to 100 when above range', () => {
      expect(computeIVRank(0.70, 0.20, 0.60)).toBe(100)
    })

    it('should return 0 when high equals low', () => {
      expect(computeIVRank(0.30, 0.30, 0.30)).toBe(0)
    })
  })

  describe('computePremiumYield', () => {
    it('should compute annualized premium yield', () => {
      // (2.50 / 100) * (365 / 35) * 100 = 26.07%
      const result = computePremiumYield(2.50, 100, 35)
      expect(result).toBeCloseTo(26.07, 1)
    })

    it('should return 0 for zero strike', () => {
      expect(computePremiumYield(2.50, 0, 35)).toBe(0)
    })

    it('should return 0 for zero DTE', () => {
      expect(computePremiumYield(2.50, 100, 0)).toBe(0)
    })
  })

  describe('linearScore', () => {
    it('should return 0 at minimum', () => {
      expect(linearScore(8, 8, 24)).toBe(0)
    })

    it('should return 100 at maximum', () => {
      expect(linearScore(24, 8, 24)).toBe(100)
    })

    it('should return 50 at midpoint', () => {
      expect(linearScore(16, 8, 24)).toBe(50)
    })

    it('should clamp below minimum to 0', () => {
      expect(linearScore(5, 8, 24)).toBe(0)
    })

    it('should clamp above maximum to 100', () => {
      expect(linearScore(30, 8, 24)).toBe(100)
    })

    it('should return 0 when min equals max', () => {
      expect(linearScore(10, 10, 10)).toBe(0)
    })
  })

  describe('computeDeltaScore', () => {
    it('should return 100 in sweet spot (-0.22 to -0.25)', () => {
      expect(computeDeltaScore(-0.23)).toBe(100)
      expect(computeDeltaScore(-0.22)).toBe(100)
      expect(computeDeltaScore(-0.25)).toBe(100)
    })

    it('should return 0 outside target range', () => {
      expect(computeDeltaScore(-0.15)).toBe(0)
      expect(computeDeltaScore(-0.35)).toBe(0)
    })

    it('should scale between edge and sweet spot', () => {
      const score = computeDeltaScore(-0.21)
      expect(score).toBeGreaterThan(0)
      expect(score).toBeLessThan(100)
    })

    it('should return score at target edge', () => {
      const score = computeDeltaScore(-0.20)
      expect(score).toBe(0) // Edge of range
    })
  })

  describe('computeLiquidityScore', () => {
    it('should return high score for high OI and tight spread', () => {
      const score = computeLiquidityScore(500, 0)
      expect(score).toBe(100)
    })

    it('should return 50 for half-preferred OI with zero spread', () => {
      const score = computeLiquidityScore(250, 0)
      expect(score).toBe(75) // 50 (OI) + 50 (spread component at 100 * 0.5)
    })

    it('should penalize wide spreads', () => {
      const tight = computeLiquidityScore(500, 0.02)
      const wide = computeLiquidityScore(500, 0.08)
      expect(tight).toBeGreaterThan(wide)
    })

    it('should cap OI contribution at preferred level', () => {
      const atPref = computeLiquidityScore(500, 0.05)
      const abovePref = computeLiquidityScore(1000, 0.05)
      expect(atPref).toBe(abovePref)
    })
  })

  describe('computeTrendScore', () => {
    it('should return 0 when price equals SMA', () => {
      expect(computeTrendScore(100, 100)).toBe(0)
    })

    it('should return 0 when below SMA', () => {
      expect(computeTrendScore(95, 100)).toBe(0)
    })

    it('should scale linearly up to max distance', () => {
      // 10% above SMA → 10/20 * 100 = 50
      expect(computeTrendScore(110, 100)).toBe(50)
    })

    it('should cap at 100 for 20%+ above SMA', () => {
      expect(computeTrendScore(120, 100)).toBe(100)
      expect(computeTrendScore(130, 100)).toBe(100)
    })

    it('should return 0 for zero SMA', () => {
      expect(computeTrendScore(100, 0)).toBe(0)
    })
  })

  describe('computeDTE', () => {
    it('should compute days until expiration', () => {
      const now = new Date('2026-02-14')
      const exp = new Date('2026-03-21')
      expect(computeDTE(exp, now)).toBe(35)
    })

    it('should handle same day as 0', () => {
      const d = new Date('2026-02-14')
      expect(computeDTE(d, d)).toBe(0)
    })
  })

  // === Phase Filter Tests ===

  describe('runPhase1', () => {
    it('should pass for valid stock meeting all criteria', () => {
      const records = makePriceRecords(250, 80, 2_000_000)
      const result = runPhase1(records)

      expect(result.passed).toBe(true)
      expect(result.stockPrice).toBeGreaterThan(0)
      expect(result.sma200).not.toBeNull()
      expect(result.avgVolume).toBeGreaterThanOrEqual(SCANNER.MIN_AVG_VOLUME)
    })

    it('should fail for price below minimum', () => {
      // Build records where all prices are well below the $20 minimum
      const records: FinancialDataPriceRecord[] = []
      for (let i = 0; i < 250; i++) {
        const date = new Date(2026, 1, 14 - i)
        records.push({
          date: date.toISOString().slice(0, 10),
          open: 9, high: 11, low: 8,
          close: 10,
          volume: 2_000_000,
        })
      }
      const result = runPhase1(records)

      expect(result.passed).toBe(false)
      expect(result.reason).toContain('Price')
      expect(result.reason).toContain('outside')
    })

    it('should fail for price above maximum', () => {
      const records = makePriceRecords(250, 200, 2_000_000)
      const result = runPhase1(records)

      expect(result.passed).toBe(false)
      expect(result.reason).toContain('Price')
    })

    it('should fail for low volume', () => {
      const records = makePriceRecords(250, 80, 500_000)
      const result = runPhase1(records)

      expect(result.passed).toBe(false)
      expect(result.reason).toContain('volume')
    })

    it('should fail for insufficient SMA data', () => {
      const records = makePriceRecords(100, 80, 2_000_000)
      const result = runPhase1(records)

      expect(result.passed).toBe(false)
      expect(result.reason).toContain('Insufficient data')
    })

    it('should fail for empty records', () => {
      const result = runPhase1([])

      expect(result.passed).toBe(false)
      expect(result.reason).toBe('No price data')
    })

    it('should fail when price is below SMA200', () => {
      // Create records where recent price dipped below the SMA
      const records: FinancialDataPriceRecord[] = []
      for (let i = 0; i < 250; i++) {
        const date = new Date(2026, 1, 14 - i)
        records.push({
          date: date.toISOString().slice(0, 10),
          open: 80,
          high: 82,
          low: 78,
          close: i === 0 ? 50 : 80, // Most recent is way below average
          volume: 2_000_000,
        })
      }
      const result = runPhase1(records)

      expect(result.passed).toBe(false)
      expect(result.reason).toContain('below 200-day SMA')
    })
  })

  describe('runPhase2', () => {
    it('should pass when IV rank is above minimum', () => {
      const customRecords: OptionGreeksRecord[] = [
        { date: '2026-02-14', delta: -0.23, gamma: 0.015, theta: -0.045, vega: 0.32, rho: -0.08, impliedVolatility: 0.35 },
        { date: '2026-01-14', delta: -0.23, gamma: 0.015, theta: -0.045, vega: 0.32, rho: -0.08, impliedVolatility: 0.45 },
        { date: '2025-08-14', delta: -0.23, gamma: 0.015, theta: -0.045, vega: 0.32, rho: -0.08, impliedVolatility: 0.20 },
      ]

      const result = runPhase2(customRecords)
      // currentIV = 0.35, low = 0.20, high = 0.45
      // IVRank = (0.35 - 0.20) / (0.45 - 0.20) * 100 = 60
      expect(result.passed).toBe(true)
      expect(result.ivRank).toBeCloseTo(60)
    })

    it('should fail when IV rank is below minimum', () => {
      const records: OptionGreeksRecord[] = [
        { date: '2026-02-14', delta: -0.23, gamma: 0.015, theta: -0.045, vega: 0.32, rho: -0.08, impliedVolatility: 0.22 },
        { date: '2025-08-14', delta: -0.23, gamma: 0.015, theta: -0.045, vega: 0.32, rho: -0.08, impliedVolatility: 0.20 },
        { date: '2025-02-14', delta: -0.23, gamma: 0.015, theta: -0.045, vega: 0.32, rho: -0.08, impliedVolatility: 0.50 },
      ]

      const result = runPhase2(records)
      // currentIV = 0.22, IVRank = (0.22 - 0.20) / (0.50 - 0.20) * 100 = 6.67
      expect(result.passed).toBe(false)
      expect(result.reason).toContain('IV Rank')
      expect(result.ivRank).toBeLessThan(SCANNER.MIN_IV_RANK)
    })

    it('should fail for empty records', () => {
      const result = runPhase2([])
      expect(result.passed).toBe(false)
      expect(result.reason).toBe('No IV data available')
    })
  })

  // Verify scanner correctly filters OptionType.Put contracts and ignores OptionType.Call.
  // The OptionType enum (enforced by fetchOptionChain's mapping) prevents the old bug where
  // lowercase 'put' strings would silently produce zero matches.
  describe('option chain put filtering (OptionType enum)', () => {
    const expDate = new Date(Date.now() + 35 * 86400000).toISOString().slice(0, 10)

    it('should find put contracts and ignore call contracts', async () => {
      const priceRecords = makePriceRecords(250, 80, 2_000_000)
      fetchStockPriceHistory.mockResolvedValue({ ticker: 'MSFT', records: priceRecords, success: true })

      fetchOptionChain.mockResolvedValue({
        ticker: 'MSFT',
        contracts: [
          { identifier: 'MSFT260321P00075000', strike: 75, expiration: expDate, type: OptionType.Put },
          { identifier: 'MSFT260321C00090000', strike: 90, expiration: expDate, type: OptionType.Call },
        ],
        success: true,
      })

      fetchOptionGreeks.mockResolvedValue({
        contractName: 'MSFT260321P00075000',
        records: [
          { date: '2026-02-14', delta: -0.23, gamma: 0.015, theta: -0.045, vega: 0.32, rho: -0.08, impliedVolatility: 0.35 },
          { date: '2025-08-14', delta: -0.23, gamma: 0.015, theta: -0.045, vega: 0.32, rho: -0.08, impliedVolatility: 0.20 },
        ],
        success: true,
      })

      fetchOptionPrices.mockResolvedValue({
        contractName: 'MSFT260321P00075000',
        records: [{ date: '2026-02-14', open: 2.0, high: 2.5, low: 1.9, close: 2.20, volume: 50, openInterest: 600 }],
        success: true,
      })

      prisma.trade.findFirst.mockResolvedValue(null)
      prisma.position.findFirst.mockResolvedValue(null)

      const result = await scanTicker('MSFT', 'user-1')

      // OptionType.Put contract found; OptionType.Call correctly excluded
      expect(result.passedPhase1).toBe(true)
      expect(result.passedPhase2).toBe(true)
    })
  })

  describe('selectBestContract', () => {
    const now = new Date('2026-02-14')

    function makePut(strike: number, expDays: number): OptionChainRecord {
      const exp = new Date(now.getTime() + expDays * 86400000)
      return {
        identifier: `TEST${exp.toISOString().slice(2, 10).replace(/-/g, '')}P${String(strike * 1000).padStart(8, '0')}`,
        strike,
        expiration: exp.toISOString().slice(0, 10),
        type: OptionType.Put,
      }
    }

    it('should select the best yielding contract', () => {
      const contracts = [makePut(95, 35), makePut(90, 35)]

      const greeksMap = new Map<string, OptionGreeksRecord>()
      const pricesMap = new Map<string, OptionPriceRecord>()

      for (const c of contracts) {
        greeksMap.set(c.identifier, {
          date: '2026-02-14', delta: -0.23, gamma: 0.015, theta: -0.045, vega: 0.32, rho: -0.08, impliedVolatility: 0.30,
        })
        pricesMap.set(c.identifier, {
          date: '2026-02-14', open: 2.0, high: 2.5, low: 1.9, close: 2.20, volume: 50, openInterest: 600,
        })
      }

      const result = selectBestContract(contracts, greeksMap, pricesMap, now)
      expect(result.passed).toBe(true)
      expect(result.selected).toBeDefined()
      expect(result.selected!.premiumYield).toBeGreaterThan(0)
    })

    it('should reject contracts outside DTE range', () => {
      const contracts = [makePut(95, 10), makePut(90, 60)] // Too early, too late
      const greeksMap = new Map<string, OptionGreeksRecord>()
      const pricesMap = new Map<string, OptionPriceRecord>()

      const result = selectBestContract(contracts, greeksMap, pricesMap, now)
      expect(result.passed).toBe(false)
    })

    it('should reject contracts with delta outside range', () => {
      const contracts = [makePut(95, 35)]

      const greeksMap = new Map<string, OptionGreeksRecord>()
      greeksMap.set(contracts[0].identifier, {
        date: '2026-02-14', delta: -0.10, gamma: 0.015, theta: -0.045, vega: 0.32, rho: -0.08, impliedVolatility: 0.30,
      })

      const pricesMap = new Map<string, OptionPriceRecord>()
      pricesMap.set(contracts[0].identifier, {
        date: '2026-02-14', open: 2.0, high: 2.5, low: 1.9, close: 2.20, volume: 50, openInterest: 600,
      })

      const result = selectBestContract(contracts, greeksMap, pricesMap, now)
      expect(result.passed).toBe(false)
    })

    it('should reject contracts with low open interest', () => {
      const contracts = [makePut(95, 35)]

      const greeksMap = new Map<string, OptionGreeksRecord>()
      greeksMap.set(contracts[0].identifier, {
        date: '2026-02-14', delta: -0.23, gamma: 0.015, theta: -0.045, vega: 0.32, rho: -0.08, impliedVolatility: 0.30,
      })

      const pricesMap = new Map<string, OptionPriceRecord>()
      pricesMap.set(contracts[0].identifier, {
        date: '2026-02-14', open: 2.0, high: 2.5, low: 1.9, close: 2.20, volume: 50, openInterest: 50, // Below 100
      })

      const result = selectBestContract(contracts, greeksMap, pricesMap, now)
      expect(result.passed).toBe(false)
    })

    it('should return failure message when no candidates', () => {
      const result = selectBestContract([], new Map(), new Map(), now)
      expect(result.passed).toBe(false)
      expect(result.reason).toContain('No contracts')
    })
  })

  describe('computeScores', () => {
    it('should produce weighted composite score', () => {
      const scores = computeScores(16, 45, -0.23, 500, 0.02, 110, 100)

      expect(scores.yieldScore).toBe(50) // 16 is midpoint of 8-24
      expect(scores.ivScore).toBe(50) // 45 is midpoint of 20-70
      expect(scores.deltaScore).toBe(100) // -0.23 is in sweet spot
      expect(scores.liquidityScore).toBeGreaterThan(0)
      expect(scores.trendScore).toBe(50) // 10% above SMA, max=20%
      expect(scores.compositeScore).toBeGreaterThan(0)
    })

    it('should weight yield highest (30%)', () => {
      const highYield = computeScores(24, 20, -0.20, 100, 0.10, 100, 100)
      const lowYield = computeScores(8, 20, -0.20, 100, 0.10, 100, 100)

      expect(highYield.compositeScore).toBeGreaterThan(lowYield.compositeScore)
    })

    it('should weight IV second highest (25%)', () => {
      const highIV = computeScores(16, 70, -0.23, 500, 0, 100, 100)
      const lowIV = computeScores(16, 20, -0.23, 500, 0, 100, 100)

      expect(highIV.compositeScore).toBeGreaterThan(lowIV.compositeScore)
    })
  })

  // === Portfolio Checks ===

  describe('checkPortfolio', () => {
    it('should detect open CSP', async () => {
      prisma.trade.findFirst.mockResolvedValue({ id: 'trade-1' })
      prisma.position.findFirst.mockResolvedValue(null)

      const result = await checkPortfolio('user-1', 'AAPL')

      expect(result.hasOpenCSP).toBe(true)
      expect(result.hasAssignedPos).toBe(false)
      expect(result.portfolioFlag).toContain('Open CSP')
    })

    it('should detect assigned position', async () => {
      prisma.trade.findFirst.mockResolvedValue(null)
      prisma.position.findFirst.mockResolvedValue({ id: 'pos-1' })

      const result = await checkPortfolio('user-1', 'AAPL')

      expect(result.hasOpenCSP).toBe(false)
      expect(result.hasAssignedPos).toBe(true)
      expect(result.portfolioFlag).toContain('assigned shares')
    })

    it('should return clean when no conflicts', async () => {
      prisma.trade.findFirst.mockResolvedValue(null)
      prisma.position.findFirst.mockResolvedValue(null)

      const result = await checkPortfolio('user-1', 'AAPL')

      expect(result.hasOpenCSP).toBe(false)
      expect(result.hasAssignedPos).toBe(false)
      expect(result.portfolioFlag).toBeUndefined()
    })
  })

  // === Integration: scanTicker ===

  describe('scanTicker', () => {
    function setupMocksForFullPass() {
      // Phase 1: Good price data
      const priceRecords = makePriceRecords(250, 80, 2_000_000)
      fetchStockPriceHistory.mockResolvedValue({
        ticker: 'AAPL',
        records: priceRecords,
        success: true,
      })

      // Phase 2: Good option chain + greeks
      const expDate = new Date(Date.now() + 35 * 86400000).toISOString().slice(0, 10)
      fetchOptionChain.mockResolvedValue({
        ticker: 'AAPL',
        contracts: [
          { identifier: 'AAPL260321P00075000', strike: 75, expiration: expDate, type: 'Put' },
          { identifier: 'AAPL260321P00080000', strike: 80, expiration: expDate, type: 'Put' },
        ],
        success: true,
      })

      fetchOptionGreeks.mockResolvedValue({
        contractName: 'AAPL260321P00075000',
        records: [
          { date: '2026-02-14', delta: -0.23, gamma: 0.015, theta: -0.045, vega: 0.32, rho: -0.08, impliedVolatility: 0.35 },
          { date: '2026-01-14', delta: -0.23, gamma: 0.015, theta: -0.045, vega: 0.32, rho: -0.08, impliedVolatility: 0.45 },
          { date: '2025-08-14', delta: -0.23, gamma: 0.015, theta: -0.045, vega: 0.32, rho: -0.08, impliedVolatility: 0.20 },
        ],
        success: true,
      })

      fetchOptionPrices.mockResolvedValue({
        contractName: 'AAPL260321P00075000',
        records: [
          { date: '2026-02-14', open: 2.0, high: 2.5, low: 1.9, close: 2.20, volume: 50, openInterest: 600 },
        ],
        success: true,
      })

      // Phase 5: Clean portfolio
      prisma.trade.findFirst.mockResolvedValue(null)
      prisma.position.findFirst.mockResolvedValue(null)
    }

    it('should pass all phases for a good candidate', async () => {
      setupMocksForFullPass()

      const result = await scanTicker('AAPL', 'user-1')

      expect(result.passedPhase1).toBe(true)
      expect(result.passedPhase2).toBe(true)
      expect(result.passedPhase3).toBe(true)
      expect(result.passed).toBe(true)
      expect(result.compositeScore).toBeGreaterThan(0)
    })

    it('should stop at phase 1 when price data fails', async () => {
      fetchStockPriceHistory.mockResolvedValue({
        ticker: 'BAD',
        records: [],
        success: false,
        error: 'No price history data for BAD',
      })

      const result = await scanTicker('BAD', 'user-1')

      expect(result.passedPhase1).toBe(false)
      expect(result.passed).toBe(false)
      expect(result.finalReason).toContain('Phase 1')
    })

    it('should stop at phase 2 when IV rank is too low', async () => {
      const priceRecords = makePriceRecords(250, 80, 2_000_000)
      fetchStockPriceHistory.mockResolvedValue({
        ticker: 'LOW',
        records: priceRecords,
        success: true,
      })

      const expDate = new Date(Date.now() + 35 * 86400000).toISOString().slice(0, 10)
      fetchOptionChain.mockResolvedValue({
        ticker: 'LOW',
        contracts: [
          { identifier: 'LOW260321P00080000', strike: 80, expiration: expDate, type: 'Put' },
        ],
        success: true,
      })

      fetchOptionGreeks.mockResolvedValue({
        contractName: 'LOW260321P00080000',
        records: [
          { date: '2026-02-14', delta: -0.23, gamma: 0.015, theta: -0.045, vega: 0.32, rho: -0.08, impliedVolatility: 0.22 },
          { date: '2025-08-14', delta: -0.23, gamma: 0.015, theta: -0.045, vega: 0.32, rho: -0.08, impliedVolatility: 0.20 },
          { date: '2025-02-14', delta: -0.23, gamma: 0.015, theta: -0.045, vega: 0.32, rho: -0.08, impliedVolatility: 0.50 },
        ],
        success: true,
      })

      const result = await scanTicker('LOW', 'user-1')

      expect(result.passedPhase1).toBe(true)
      expect(result.passedPhase2).toBe(false)
      expect(result.passed).toBe(false)
      expect(result.finalReason).toContain('Phase 2')
    })

    it('should include portfolio flags even when passing', async () => {
      setupMocksForFullPass()
      prisma.trade.findFirst.mockResolvedValue({ id: 'trade-1' })

      const result = await scanTicker('AAPL', 'user-1')

      expect(result.passed).toBe(true)
      expect(result.hasOpenCSP).toBe(true)
      expect(result.portfolioFlag).toContain('Open CSP')
    })
  })

  // === Integration: runFullScan ===

  describe('runFullScan', () => {
    it('should scan all watchlist tickers and save results', async () => {
      prisma.watchlistTicker.findMany.mockResolvedValue([
        { ticker: 'AAPL' },
        { ticker: 'MSFT' },
      ])
      prisma.scanResult.deleteMany.mockResolvedValue({ count: 0 })

      // Both tickers fail at phase 1 for simplicity
      fetchStockPriceHistory.mockResolvedValue({
        ticker: 'TEST',
        records: [],
        success: false,
        error: 'No data',
      })

      prisma.scanResult.createMany.mockResolvedValue({ count: 2 })

      const result = await runFullScan('user-1')

      expect(result.totalScanned).toBe(2)
      expect(result.totalPassed).toBe(0)
      expect(prisma.scanResult.createMany).toHaveBeenCalledTimes(1)

      const createCall = prisma.scanResult.createMany.mock.calls[0][0]
      expect(createCall.data).toHaveLength(2)
    })

    it('should handle errors for individual tickers without failing scan', async () => {
      prisma.watchlistTicker.findMany.mockResolvedValue([{ ticker: 'ERR' }])
      prisma.scanResult.deleteMany.mockResolvedValue({ count: 0 })

      fetchStockPriceHistory.mockRejectedValue(new Error('Network failure'))

      prisma.scanResult.createMany.mockResolvedValue({ count: 1 })

      const result = await runFullScan('user-1')

      expect(result.totalScanned).toBe(1)
      expect(result.results[0].passed).toBe(false)
      expect(result.results[0].finalReason).toContain('Scan error')
    })

    it('should handle empty watchlist', async () => {
      prisma.watchlistTicker.findMany.mockResolvedValue([])
      prisma.scanResult.deleteMany.mockResolvedValue({ count: 0 })
      prisma.scanResult.createMany.mockResolvedValue({ count: 0 })

      const result = await runFullScan('user-1')

      expect(result.totalScanned).toBe(0)
      expect(result.totalPassed).toBe(0)
    })
  })
})
