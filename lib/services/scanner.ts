import { prisma } from '@/lib/db'
import { SCANNER } from './scanner-constants'
import {
  fetchStockPriceHistory,
  fetchOptionChain,
  fetchOptionGreeks,
  fetchOptionPrices,
} from './options-data'
import type {
  FinancialDataPriceRecord,
  OptionChainRecord,
  OptionGreeksRecord,
  OptionPriceRecord,
} from './options-data'

// === Pure Calculation Helpers ===

export function computeSMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null
  const slice = closes.slice(0, period)
  return slice.reduce((sum, v) => sum + v, 0) / period
}

export function computeIVRank(currentIV: number, lowIV: number, highIV: number): number {
  if (highIV <= lowIV) return 0
  const rank = ((currentIV - lowIV) / (highIV - lowIV)) * 100
  return Math.max(0, Math.min(100, rank))
}

export function computePremiumYield(bid: number, strike: number, dte: number): number {
  if (strike <= 0 || dte <= 0) return 0
  return (bid / strike) * (365 / dte) * 100
}

export function linearScore(value: number, min: number, max: number): number {
  if (max <= min) return 0
  const score = ((value - min) / (max - min)) * 100
  return Math.max(0, Math.min(100, score))
}

export function computeDeltaScore(delta: number): number {
  const absDelta = Math.abs(delta)
  const sweetMin = Math.abs(SCANNER.DELTA_SWEET_SPOT_MIN)
  const sweetMax = Math.abs(SCANNER.DELTA_SWEET_SPOT_MAX)

  if (absDelta >= sweetMax && absDelta <= sweetMin) {
    return 100
  }

  const rangeMin = Math.abs(SCANNER.TARGET_MAX_DELTA)
  const rangeMax = Math.abs(SCANNER.TARGET_MIN_DELTA)

  if (absDelta < rangeMin || absDelta > rangeMax) return 0

  if (absDelta < sweetMax) {
    return linearScore(absDelta, rangeMin, sweetMax)
  }
  return linearScore(rangeMax - absDelta, 0, rangeMax - sweetMin)
}

export function computeLiquidityScore(openInterest: number, spreadPct: number): number {
  const oiScore = Math.min(100, (openInterest / SCANNER.PREFERRED_OI) * 100)
  const spreadScore = spreadPct <= 0 ? 100 : Math.max(0, 100 - (spreadPct / SCANNER.MAX_SPREAD_PCT) * 100)
  return oiScore * 0.5 + spreadScore * 0.5
}

export function computeTrendScore(price: number, sma200: number): number {
  if (sma200 <= 0) return 0
  const pctAbove = ((price - sma200) / sma200) * 100
  if (pctAbove <= 0) return 0
  return Math.min(100, (pctAbove / SCANNER.MAX_TREND_DISTANCE_PCT) * 100)
}

export function computeDTE(expirationDate: Date, now: Date): number {
  return Math.ceil((expirationDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
}

// === Result Types ===

export interface ScanTickerResult {
  ticker: string
  passedPhase1: boolean
  phase1Reason?: string
  stockPrice?: number
  sma200?: number
  sma50?: number
  avgVolume?: number
  trendDirection?: string

  passedPhase2: boolean
  phase2Reason?: string
  currentIV?: number
  ivHigh52w?: number
  ivLow52w?: number
  ivRank?: number

  passedPhase3: boolean
  phase3Reason?: string
  contractName?: string
  strike?: number
  expiration?: Date
  dte?: number
  delta?: number
  theta?: number
  bid?: number
  ask?: number
  iv?: number
  openInterest?: number
  optionVolume?: number
  premiumYield?: number

  yieldScore?: number
  ivScore?: number
  deltaScore?: number
  liquidityScore?: number
  trendScore?: number
  compositeScore?: number

  hasOpenCSP: boolean
  hasAssignedPos: boolean
  portfolioFlag?: string

  passed: boolean
  finalReason?: string
}

// === Phase 1: Stock Universe Filter ===

interface Phase1Result {
  passed: boolean
  reason?: string
  stockPrice: number
  sma200: number | null
  sma50: number | null
  avgVolume: number
  trendDirection: string
}

export function runPhase1(records: FinancialDataPriceRecord[]): Phase1Result {
  if (records.length === 0) {
    return { passed: false, reason: 'No price data', stockPrice: 0, sma200: null, sma50: null, avgVolume: 0, trendDirection: 'unknown' }
  }

  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date))
  const closes = sorted.map((r) => r.close)
  const volumes = sorted.map((r) => r.volume)

  const stockPrice = closes[0]
  const sma200 = computeSMA(closes, SCANNER.SMA_PERIOD)
  const sma50 = computeSMA(closes, SCANNER.SMA_SHORT_PERIOD)
  const avgVolume = volumes.length >= 20
    ? volumes.slice(0, 20).reduce((s, v) => s + v, 0) / 20
    : volumes.reduce((s, v) => s + v, 0) / volumes.length

  if (stockPrice < SCANNER.MIN_PRICE || stockPrice > SCANNER.MAX_PRICE) {
    return { passed: false, reason: `Price $${stockPrice.toFixed(2)} outside $${SCANNER.MIN_PRICE}-$${SCANNER.MAX_PRICE} range`, stockPrice, sma200, sma50, avgVolume, trendDirection: 'unknown' }
  }

  if (avgVolume < SCANNER.MIN_AVG_VOLUME) {
    return { passed: false, reason: `Avg volume ${Math.round(avgVolume).toLocaleString()} below ${SCANNER.MIN_AVG_VOLUME.toLocaleString()} minimum`, stockPrice, sma200, sma50, avgVolume, trendDirection: 'unknown' }
  }

  if (sma200 === null) {
    return { passed: false, reason: 'Insufficient data for 200-day SMA', stockPrice, sma200, sma50, avgVolume, trendDirection: 'unknown' }
  }

  if (stockPrice <= sma200) {
    return { passed: false, reason: `Price $${stockPrice.toFixed(2)} below 200-day SMA $${sma200.toFixed(2)}`, stockPrice, sma200, sma50, avgVolume, trendDirection: 'falling' }
  }

  // Check SMA trend: current SMA200 vs SMA200 from TREND_LOOKBACK days ago
  let trendDirection = 'flat'
  if (closes.length >= SCANNER.SMA_PERIOD + SCANNER.SMA_TREND_LOOKBACK) {
    const olderCloses = closes.slice(SCANNER.SMA_TREND_LOOKBACK)
    const olderSma200 = computeSMA(olderCloses, SCANNER.SMA_PERIOD)
    if (olderSma200 !== null) {
      if (sma200 > olderSma200) {
        trendDirection = 'rising'
      } else if (sma200 < olderSma200) {
        trendDirection = 'falling'
      }
    }
  } else {
    trendDirection = 'rising' // Not enough data for trend check, assume rising if above SMA
  }

  if (trendDirection === 'falling') {
    return { passed: false, reason: '200-day SMA is falling', stockPrice, sma200, sma50, avgVolume, trendDirection }
  }

  return { passed: true, stockPrice, sma200, sma50, avgVolume, trendDirection }
}

// === Phase 2: IV Screen ===

interface Phase2Result {
  passed: boolean
  reason?: string
  currentIV: number
  ivHigh52w: number
  ivLow52w: number
  ivRank: number
}

export function runPhase2(greeksRecords: OptionGreeksRecord[]): Phase2Result {
  if (greeksRecords.length === 0) {
    return { passed: false, reason: 'No IV data available', currentIV: 0, ivHigh52w: 0, ivLow52w: 0, ivRank: 0 }
  }

  const sorted = [...greeksRecords].sort((a, b) => b.date.localeCompare(a.date))
  const currentIV = sorted[0].impliedVolatility
  const ivValues = sorted.map((r) => r.impliedVolatility)
  const ivHigh52w = Math.max(...ivValues)
  const ivLow52w = Math.min(...ivValues)
  const ivRank = computeIVRank(currentIV, ivLow52w, ivHigh52w)

  if (ivRank < SCANNER.MIN_IV_RANK) {
    return { passed: false, reason: `IV Rank ${ivRank.toFixed(1)} below ${SCANNER.MIN_IV_RANK} minimum`, currentIV, ivHigh52w, ivLow52w, ivRank }
  }

  return { passed: true, currentIV, ivHigh52w, ivLow52w, ivRank }
}

// === Phase 3: Option Selection ===

interface SelectedContract {
  contract: OptionChainRecord
  dte: number
  delta: number
  theta: number
  bid: number
  ask: number
  iv: number
  openInterest: number
  optionVolume: number
  premiumYield: number
}

interface Phase3Result {
  passed: boolean
  reason?: string
  selected?: SelectedContract
}

export function selectBestContract(
  putContracts: OptionChainRecord[],
  greeksMap: Map<string, OptionGreeksRecord>,
  pricesMap: Map<string, OptionPriceRecord>,
  now: Date
): Phase3Result {
  const candidates: SelectedContract[] = []

  for (const contract of putContracts) {
    const expDate = new Date(contract.expiration)
    const dte = computeDTE(expDate, now)

    if (dte < SCANNER.TARGET_MIN_DTE || dte > SCANNER.TARGET_MAX_DTE) continue

    const greeks = greeksMap.get(contract.identifier)
    const prices = pricesMap.get(contract.identifier)
    if (!greeks || !prices) continue

    const delta = greeks.delta
    if (delta > SCANNER.TARGET_MAX_DELTA || delta < SCANNER.TARGET_MIN_DELTA) continue

    const bid = prices.close // Use last close as proxy for bid
    const ask = bid * 1.02 // Estimate ask from close if not available separately
    const oi = prices.openInterest ?? 0
    const vol = prices.volume

    if (oi < SCANNER.MIN_OPEN_INTEREST) continue
    if (vol < SCANNER.MIN_OPTION_VOLUME) continue

    const mid = (bid + ask) / 2
    const spreadPct = mid > 0 ? (ask - bid) / mid : 1
    if (spreadPct > SCANNER.MAX_SPREAD_PCT) continue

    const premiumYield = computePremiumYield(bid, contract.strike, dte)
    if (premiumYield < SCANNER.MIN_PREMIUM_YIELD) continue

    candidates.push({
      contract,
      dte,
      delta,
      theta: greeks.theta,
      bid,
      ask,
      iv: greeks.impliedVolatility,
      openInterest: oi,
      optionVolume: vol,
      premiumYield,
    })
  }

  if (candidates.length === 0) {
    return { passed: false, reason: 'No contracts meet DTE/delta/yield/liquidity criteria' }
  }

  // Pick highest premium yield among candidates
  candidates.sort((a, b) => b.premiumYield - a.premiumYield)
  return { passed: true, selected: candidates[0] }
}

// === Phase 4: Scoring ===

export interface Phase4Scores {
  yieldScore: number
  ivScore: number
  deltaScore: number
  liquidityScore: number
  trendScore: number
  compositeScore: number
}

export function computeScores(
  premiumYield: number,
  ivRank: number,
  delta: number,
  openInterest: number,
  spreadPct: number,
  stockPrice: number,
  sma200: number
): Phase4Scores {
  const yieldScore = linearScore(premiumYield, SCANNER.YIELD_RANGE_MIN, SCANNER.YIELD_RANGE_MAX)
  const ivScore = linearScore(ivRank, SCANNER.IV_RANK_RANGE_MIN, SCANNER.IV_RANK_RANGE_MAX)
  const deltaScore = computeDeltaScore(delta)
  const liquidityScore = computeLiquidityScore(openInterest, spreadPct)
  const trendScore = computeTrendScore(stockPrice, sma200)

  const compositeScore =
    yieldScore * SCANNER.WEIGHTS.yield +
    ivScore * SCANNER.WEIGHTS.iv +
    deltaScore * SCANNER.WEIGHTS.delta +
    liquidityScore * SCANNER.WEIGHTS.liquidity +
    trendScore * SCANNER.WEIGHTS.trend

  return { yieldScore, ivScore, deltaScore, liquidityScore, trendScore, compositeScore }
}

// === Phase 5: Portfolio Checks ===

export async function checkPortfolio(
  userId: string,
  ticker: string
): Promise<{ hasOpenCSP: boolean; hasAssignedPos: boolean; portfolioFlag?: string }> {
  const openCSP = await prisma.trade.findFirst({
    where: {
      userId,
      ticker,
      type: 'PUT',
      action: 'SELL_TO_OPEN',
      status: 'OPEN',
    },
    select: { id: true },
  })

  const assignedPos = await prisma.position.findFirst({
    where: {
      userId,
      ticker,
      status: 'OPEN',
    },
    select: { id: true },
  })

  const hasOpenCSP = openCSP !== null
  const hasAssignedPos = assignedPos !== null

  let portfolioFlag: string | undefined
  if (hasOpenCSP) {
    portfolioFlag = 'Open CSP exists — skip or sell covered call instead'
  } else if (hasAssignedPos) {
    portfolioFlag = 'Holding assigned shares — consider covered call'
  }

  return { hasOpenCSP, hasAssignedPos, portfolioFlag }
}

// === scanTicker: 5-Phase Pipeline ===

export async function scanTicker(ticker: string, userId: string): Promise<ScanTickerResult> {
  const result: ScanTickerResult = {
    ticker,
    passedPhase1: false,
    passedPhase2: false,
    passedPhase3: false,
    hasOpenCSP: false,
    hasAssignedPos: false,
    passed: false,
  }

  // Phase 1: Stock Universe Filter
  const priceHistory = await fetchStockPriceHistory(ticker)
  if (!priceHistory.success) {
    result.phase1Reason = priceHistory.error
    result.finalReason = `Phase 1 failed: ${priceHistory.error}`
    return result
  }

  const p1 = runPhase1(priceHistory.records)
  result.stockPrice = p1.stockPrice
  result.sma200 = p1.sma200 ?? undefined
  result.sma50 = p1.sma50 ?? undefined
  result.avgVolume = p1.avgVolume
  result.trendDirection = p1.trendDirection
  result.passedPhase1 = p1.passed
  result.phase1Reason = p1.reason

  if (!p1.passed) {
    result.finalReason = `Phase 1: ${p1.reason}`
    return result
  }

  // Phase 2: IV Screen — need an ATM put contract to get IV data
  const chainResult = await fetchOptionChain(ticker)
  if (!chainResult.success) {
    result.phase2Reason = chainResult.error
    result.finalReason = `Phase 2 failed: ${chainResult.error}`
    return result
  }

  const putContracts = chainResult.contracts.filter((c) => c.type === 'put')
  if (putContracts.length === 0) {
    result.phase2Reason = 'No put contracts available'
    result.finalReason = 'Phase 2: No put contracts available'
    return result
  }

  // Pick the nearest-to-ATM put for IV data
  const atmPut = putContracts.reduce((best, c) =>
    Math.abs(c.strike - p1.stockPrice) < Math.abs(best.strike - p1.stockPrice) ? c : best
  )

  const greeksResult = await fetchOptionGreeks(atmPut.identifier)
  if (!greeksResult.success) {
    result.phase2Reason = greeksResult.error
    result.finalReason = `Phase 2 failed: ${greeksResult.error}`
    return result
  }

  const p2 = runPhase2(greeksResult.records)
  result.currentIV = p2.currentIV
  result.ivHigh52w = p2.ivHigh52w
  result.ivLow52w = p2.ivLow52w
  result.ivRank = p2.ivRank
  result.passedPhase2 = p2.passed
  result.phase2Reason = p2.reason

  if (!p2.passed) {
    result.finalReason = `Phase 2: ${p2.reason}`
    return result
  }

  // Phase 3: Option Selection — fetch greeks and prices for candidate puts
  const now = new Date()
  const candidatePuts = putContracts.filter((c) => {
    const dte = computeDTE(new Date(c.expiration), now)
    return dte >= SCANNER.TARGET_MIN_DTE && dte <= SCANNER.TARGET_MAX_DTE
  })

  const greeksMap = new Map<string, OptionGreeksRecord>()
  const pricesMap = new Map<string, OptionPriceRecord>()

  for (const contract of candidatePuts) {
    const [gResult, pResult] = await Promise.all([
      fetchOptionGreeks(contract.identifier),
      fetchOptionPrices(contract.identifier),
    ])

    if (gResult.success && gResult.records.length > 0) {
      const latestGreeks = [...gResult.records].sort((a, b) => b.date.localeCompare(a.date))[0]
      greeksMap.set(contract.identifier, latestGreeks)
    }

    if (pResult.success && pResult.records.length > 0) {
      const latestPrices = [...pResult.records].sort((a, b) => b.date.localeCompare(a.date))[0]
      pricesMap.set(contract.identifier, latestPrices)
    }
  }

  const p3 = selectBestContract(candidatePuts, greeksMap, pricesMap, now)
  result.passedPhase3 = p3.passed
  result.phase3Reason = p3.reason

  if (!p3.passed || !p3.selected) {
    result.finalReason = `Phase 3: ${p3.reason}`
    return result
  }

  const sel = p3.selected
  result.contractName = sel.contract.identifier
  result.strike = sel.contract.strike
  result.expiration = new Date(sel.contract.expiration)
  result.dte = sel.dte
  result.delta = sel.delta
  result.theta = sel.theta
  result.bid = sel.bid
  result.ask = sel.ask
  result.iv = sel.iv
  result.openInterest = sel.openInterest
  result.optionVolume = sel.optionVolume
  result.premiumYield = sel.premiumYield

  // Phase 4: Scoring
  const mid = (sel.bid + sel.ask) / 2
  const spreadPct = mid > 0 ? (sel.ask - sel.bid) / mid : 0
  const scores = computeScores(
    sel.premiumYield,
    p2.ivRank,
    sel.delta,
    sel.openInterest,
    spreadPct,
    p1.stockPrice,
    p1.sma200!
  )

  result.yieldScore = scores.yieldScore
  result.ivScore = scores.ivScore
  result.deltaScore = scores.deltaScore
  result.liquidityScore = scores.liquidityScore
  result.trendScore = scores.trendScore
  result.compositeScore = scores.compositeScore

  // Phase 5: Portfolio Checks
  const portfolio = await checkPortfolio(userId, ticker)
  result.hasOpenCSP = portfolio.hasOpenCSP
  result.hasAssignedPos = portfolio.hasAssignedPos
  result.portfolioFlag = portfolio.portfolioFlag

  result.passed = true
  return result
}

// === runFullScan Orchestrator ===

export interface FullScanResult {
  scanDate: Date
  results: ScanTickerResult[]
  totalScanned: number
  totalPassed: number
}

export async function runFullScan(userId: string): Promise<FullScanResult> {
  const scanDate = new Date()

  const watchlist = await prisma.watchlistTicker.findMany({
    where: { userId },
    select: { ticker: true },
  })

  // Delete previous scan results (keep only latest scan)
  await prisma.scanResult.deleteMany({ where: { userId } })

  const results: ScanTickerResult[] = []

  // Process tickers sequentially to respect rate limits
  for (const { ticker } of watchlist) {
    try {
      const tickerResult = await scanTicker(ticker, userId)
      results.push(tickerResult)
    } catch (error) {
      console.error(`Error scanning ${ticker}:`, error)
      results.push({
        ticker,
        passedPhase1: false,
        passedPhase2: false,
        passedPhase3: false,
        hasOpenCSP: false,
        hasAssignedPos: false,
        passed: false,
        finalReason: `Scan error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    }
  }

  // Save all results to database
  await prisma.scanResult.createMany({
    data: results.map((r) => ({
      userId,
      scanDate,
      ticker: r.ticker,
      stockPrice: r.stockPrice,
      sma200: r.sma200,
      sma50: r.sma50,
      avgVolume: r.avgVolume,
      trendDirection: r.trendDirection,
      passedPhase1: r.passedPhase1,
      phase1Reason: r.phase1Reason,
      currentIV: r.currentIV,
      ivHigh52w: r.ivHigh52w,
      ivLow52w: r.ivLow52w,
      ivRank: r.ivRank,
      passedPhase2: r.passedPhase2,
      phase2Reason: r.phase2Reason,
      contractName: r.contractName,
      strike: r.strike,
      expiration: r.expiration,
      dte: r.dte,
      delta: r.delta,
      theta: r.theta,
      bid: r.bid,
      ask: r.ask,
      iv: r.iv,
      openInterest: r.openInterest,
      optionVolume: r.optionVolume,
      premiumYield: r.premiumYield,
      passedPhase3: r.passedPhase3,
      phase3Reason: r.phase3Reason,
      yieldScore: r.yieldScore,
      ivScore: r.ivScore,
      deltaScore: r.deltaScore,
      liquidityScore: r.liquidityScore,
      trendScore: r.trendScore,
      compositeScore: r.compositeScore,
      hasOpenCSP: r.hasOpenCSP,
      hasAssignedPos: r.hasAssignedPos,
      portfolioFlag: r.portfolioFlag,
      passed: r.passed,
      finalReason: r.finalReason,
    })),
  })

  return {
    scanDate,
    results,
    totalScanned: results.length,
    totalPassed: results.filter((r) => r.passed).length,
  }
}
