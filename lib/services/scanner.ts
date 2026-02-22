import { prisma } from '@/lib/db'
import { SCANNER } from './scanner-constants'
import {
  fetchStockPriceHistory,
  fetchOptionChain,
  fetchOptionGreeks,
  fetchOptionPrices,
  OptionType,
} from './options-data'
import type {
  FinancialDataPriceRecord,
  OptionGreeksRecord,
} from './options-data'
import { logger } from '../logger'

const log = logger.child({ module: 'scanner' })

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
    log.debug('Phase 1: no price records — cannot evaluate')
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

  log.debug({
    recordCount: records.length,
    stockPrice,
    sma200,
    sma50,
    avgVolume: Math.round(avgVolume),
    priceRange: `$${SCANNER.MIN_PRICE}–$${SCANNER.MAX_PRICE}`,
    minVolume: SCANNER.MIN_AVG_VOLUME,
  }, 'Phase 1: computed stock values')

  if (stockPrice < SCANNER.MIN_PRICE || stockPrice > SCANNER.MAX_PRICE) {
    const reason = `Price $${stockPrice.toFixed(2)} outside $${SCANNER.MIN_PRICE}-$${SCANNER.MAX_PRICE} range`
    log.debug({ stockPrice, reason }, 'Phase 1: FAILED price range check')
    return { passed: false, reason, stockPrice, sma200, sma50, avgVolume, trendDirection: 'unknown' }
  }

  if (avgVolume < SCANNER.MIN_AVG_VOLUME) {
    const reason = `Avg volume ${Math.round(avgVolume).toLocaleString()} below ${SCANNER.MIN_AVG_VOLUME.toLocaleString()} minimum`
    log.debug({ avgVolume: Math.round(avgVolume), minVolume: SCANNER.MIN_AVG_VOLUME, reason }, 'Phase 1: FAILED volume check')
    return { passed: false, reason, stockPrice, sma200, sma50, avgVolume, trendDirection: 'unknown' }
  }

  if (sma200 === null) {
    const reason = 'Insufficient data for 200-day SMA'
    log.debug({ recordCount: records.length, requiredRecords: SCANNER.SMA_PERIOD, reason }, 'Phase 1: FAILED SMA data check')
    return { passed: false, reason, stockPrice, sma200, sma50, avgVolume, trendDirection: 'unknown' }
  }

  if (stockPrice <= sma200) {
    const reason = `Price $${stockPrice.toFixed(2)} below 200-day SMA $${sma200.toFixed(2)}`
    log.debug({ stockPrice, sma200, pctBelowSma: (((sma200 - stockPrice) / sma200) * 100).toFixed(1) + '%', reason }, 'Phase 1: FAILED above-SMA200 check')
    return { passed: false, reason, stockPrice, sma200, sma50, avgVolume, trendDirection: 'falling' }
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
      log.debug(
        { currentSma200: sma200, olderSma200, lookbackDays: SCANNER.SMA_TREND_LOOKBACK, trendDirection },
        'Phase 1: SMA200 trend computed'
      )
    }
  } else {
    trendDirection = 'rising' // Not enough data for trend check, assume rising if above SMA
    log.debug(
      { recordCount: closes.length, requiredForTrend: SCANNER.SMA_PERIOD + SCANNER.SMA_TREND_LOOKBACK },
      'Phase 1: insufficient records for SMA trend check, assuming rising'
    )
  }

  if (trendDirection === 'falling') {
    const reason = '200-day SMA is falling'
    log.debug({ trendDirection, reason }, 'Phase 1: FAILED SMA trend check')
    return { passed: false, reason, stockPrice, sma200, sma50, avgVolume, trendDirection }
  }

  log.debug(
    { stockPrice, sma200, sma50, avgVolume: Math.round(avgVolume), trendDirection, pctAboveSma: (((stockPrice - sma200) / sma200) * 100).toFixed(1) + '%' },
    'Phase 1: PASSED all checks'
  )
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
    log.debug('Phase 2: no greeks records — cannot compute IV rank')
    return { passed: false, reason: 'No IV data available', currentIV: 0, ivHigh52w: 0, ivLow52w: 0, ivRank: 0 }
  }

  const sorted = [...greeksRecords].sort((a, b) => b.date.localeCompare(a.date))
  const currentIV = sorted[0].impliedVolatility
  const ivValues = sorted.map((r) => r.impliedVolatility)
  const ivHigh52w = Math.max(...ivValues)
  const ivLow52w = Math.min(...ivValues)
  const ivRank = computeIVRank(currentIV, ivLow52w, ivHigh52w)

  log.debug({
    recordCount: greeksRecords.length,
    latestDate: sorted[0].date,
    currentIV,
    ivHigh52w,
    ivLow52w,
    ivRank: parseFloat(ivRank.toFixed(1)),
    minIvRank: SCANNER.MIN_IV_RANK,
  }, 'Phase 2: IV rank computed')

  if (ivRank < SCANNER.MIN_IV_RANK) {
    const reason = `IV Rank ${ivRank.toFixed(1)} below ${SCANNER.MIN_IV_RANK} minimum`
    log.debug({ ivRank: ivRank.toFixed(1), minIvRank: SCANNER.MIN_IV_RANK, reason }, 'Phase 2: FAILED IV rank check')
    return { passed: false, reason, currentIV, ivHigh52w, ivLow52w, ivRank }
  }

  log.debug({ ivRank: parseFloat(ivRank.toFixed(1)), currentIV }, 'Phase 2: PASSED IV rank check')
  return { passed: true, currentIV, ivHigh52w, ivLow52w, ivRank }
}

// === Phase 3: Option Selection ===

/**
 * A fully hydrated contract: chain fields joined with the latest greeks
 * and price data. Built in scanTicker before calling selectBestContract.
 */
export interface ContractData {
  // From OptionChainRecord
  identifier: string
  strike: number
  expiration: string
  type: OptionType
  // From latest OptionGreeksRecord
  greeksDate: string
  delta: number
  gamma: number
  theta: number
  vega: number
  rho: number
  impliedVolatility: number
  // From latest OptionPriceRecord
  pricesDate: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  openInterest?: number
}

interface SelectedContract {
  contract: ContractData
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
  contractDataList: ContractData[],
  now: Date
): Phase3Result {
  const candidates: SelectedContract[] = []

  let rejectedDte = 0
  let rejectedDelta = 0
  let rejectedOI = 0
  let rejectedVolume = 0
  let rejectedSpread = 0
  let rejectedYield = 0

  for (const cd of contractDataList) {
    const expDate = new Date(cd.expiration)
    const dte = computeDTE(expDate, now)

    if (dte < SCANNER.TARGET_MIN_DTE || dte > SCANNER.TARGET_MAX_DTE) {
      rejectedDte++
      continue
    }

    if (cd.delta > SCANNER.TARGET_MAX_DELTA || cd.delta < SCANNER.TARGET_MIN_DELTA) {
      rejectedDelta++
      log.info(
        { contractData: cd, minDelta: SCANNER.TARGET_MIN_DELTA, maxDelta: SCANNER.TARGET_MAX_DELTA },
        'Phase 3: contract rejected — delta out of range'
      )
      continue
    }

    const bid = cd.close // Use last close as proxy for bid
    const ask = bid * 1.02 // Estimate ask from close if not available separately
    const oi = cd.openInterest ?? 0
    const vol = cd.volume

    if (oi < SCANNER.MIN_OPEN_INTEREST) {
      rejectedOI++
      log.info(
        { contractData: cd, minOI: SCANNER.MIN_OPEN_INTEREST },
        'Phase 3: contract rejected — low open interest'
      )
      continue
    }

    if (vol < SCANNER.MIN_OPTION_VOLUME) {
      rejectedVolume++
      log.info(
        { contractData: cd, minVolume: SCANNER.MIN_OPTION_VOLUME },
        'Phase 3: contract rejected — low volume'
      )
      continue
    }

    const mid = (bid + ask) / 2
    const spreadPct = mid > 0 ? (ask - bid) / mid : 1
    if (spreadPct > SCANNER.MAX_SPREAD_PCT) {
      rejectedSpread++
      log.debug(
        { contractData: cd, spreadPct: parseFloat(spreadPct.toFixed(4)), maxSpread: SCANNER.MAX_SPREAD_PCT },
        'Phase 3: contract rejected — spread too wide'
      )
      continue
    }

    const premiumYield = computePremiumYield(bid, cd.strike, dte)
    if (premiumYield < SCANNER.MIN_PREMIUM_YIELD) {
      rejectedYield++
      log.info(
        { contractData: cd, premiumYield: parseFloat(premiumYield.toFixed(2)), minYield: SCANNER.MIN_PREMIUM_YIELD },
        'Phase 3: contract rejected — premium yield too low'
      )
      continue
    }

    log.info({
      contractData: cd,
      dte,
      bid,
      ask,
      spreadPct: parseFloat(spreadPct.toFixed(4)),
      premiumYield: parseFloat(premiumYield.toFixed(2)),
    }, 'Phase 3: contract qualifies as candidate')

    candidates.push({
      contract: cd,
      dte,
      delta: cd.delta,
      theta: cd.theta,
      bid,
      ask,
      iv: cd.impliedVolatility,
      openInterest: oi,
      optionVolume: vol,
      premiumYield,
    })
  }

  log.debug({
    totalContracts: contractDataList.length,
    rejectedDte,
    rejectedDelta,
    rejectedOI,
    rejectedVolume,
    rejectedSpread,
    rejectedYield,
    qualifyingCandidates: candidates.length,
  }, 'Phase 3: contract selection summary')

  if (candidates.length === 0) {
    return { passed: false, reason: 'No contracts meet DTE/delta/yield/liquidity criteria' }
  }

  // Pick highest premium yield among candidates
  candidates.sort((a, b) => b.premiumYield - a.premiumYield)
  const best = candidates[0]
  log.debug({
    selected: best.contract.identifier,
    strike: best.contract.strike,
    expiration: best.contract.expiration,
    dte: best.dte,
    delta: best.delta,
    bid: best.bid,
    premiumYield: parseFloat(best.premiumYield.toFixed(2)),
    openInterest: best.openInterest,
    totalCandidates: candidates.length,
  }, 'Phase 3: best contract selected')

  return { passed: true, selected: best }
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

  log.debug({
    inputs: {
      premiumYield: parseFloat(premiumYield.toFixed(2)),
      ivRank: parseFloat(ivRank.toFixed(1)),
      delta,
      openInterest,
      spreadPct: parseFloat(spreadPct.toFixed(4)),
    },
    scores: {
      yieldScore: parseFloat(yieldScore.toFixed(1)),
      ivScore: parseFloat(ivScore.toFixed(1)),
      deltaScore: parseFloat(deltaScore.toFixed(1)),
      liquidityScore: parseFloat(liquidityScore.toFixed(1)),
      trendScore: parseFloat(trendScore.toFixed(1)),
      compositeScore: parseFloat(compositeScore.toFixed(1)),
    },
    weights: SCANNER.WEIGHTS,
  }, 'Phase 4: scores computed')

  return { yieldScore, ivScore, deltaScore, liquidityScore, trendScore, compositeScore }
}

// === Phase 5: Portfolio Checks ===

export async function checkPortfolio(
  userId: string,
  ticker: string
): Promise<{ hasOpenCSP: boolean; hasAssignedPos: boolean; portfolioFlag?: string }> {
  log.debug({ ticker, userId }, 'Phase 5: checking portfolio for conflicts')

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

  log.debug({ ticker, hasOpenCSP, hasAssignedPos }, 'Phase 5: portfolio check results')

  let portfolioFlag: string | undefined
  if (hasOpenCSP) {
    portfolioFlag = 'Open CSP exists — skip or sell covered call instead'
    log.warn({ ticker, portfolioFlag }, 'Phase 5: portfolio conflict — open CSP detected')
  } else if (hasAssignedPos) {
    portfolioFlag = 'Holding assigned shares — consider covered call'
    log.warn({ ticker, portfolioFlag }, 'Phase 5: portfolio conflict — assigned position detected')
  } else {
    log.debug({ ticker }, 'Phase 5: no portfolio conflicts')
  }

  return { hasOpenCSP, hasAssignedPos, portfolioFlag }
}

// === scanTicker: 5-Phase Pipeline ===

export async function scanTicker(ticker: string, userId: string): Promise<ScanTickerResult> {
  const scanStart = Date.now()
  log.info({ ticker }, 'scanTicker: starting 5-phase scan')

  const result: ScanTickerResult = {
    ticker,
    passedPhase1: false,
    passedPhase2: false,
    passedPhase3: false,
    hasOpenCSP: false,
    hasAssignedPos: false,
    passed: false,
  }

  // ── Phase 1: Stock Universe Filter ──────────────────────────────────────────
  log.debug({ ticker }, 'Phase 1: fetching stock price history')
  const priceHistory = await fetchStockPriceHistory(ticker)

  if (!priceHistory.success) {
    log.warn({ ticker, error: priceHistory.error }, 'Phase 1: price history fetch failed — ticker eliminated')
    result.phase1Reason = priceHistory.error
    result.finalReason = `Phase 1 failed: ${priceHistory.error}`
    return result
  }

  log.debug({ ticker, recordCount: priceHistory.records.length }, 'Phase 1: price history fetched, running filters')
  const p1 = runPhase1(priceHistory.records)
  result.stockPrice = p1.stockPrice
  result.sma200 = p1.sma200 ?? undefined
  result.sma50 = p1.sma50 ?? undefined
  result.avgVolume = p1.avgVolume
  result.trendDirection = p1.trendDirection
  result.passedPhase1 = p1.passed
  result.phase1Reason = p1.reason

  if (!p1.passed) {
    log.info(
      { ticker, reason: p1.reason, stockPrice: p1.stockPrice, sma200: p1.sma200 },
      'Phase 1: FAILED — ticker eliminated'
    )
    result.finalReason = `Phase 1: ${p1.reason}`
    return result
  }

  log.info(
    { ticker, stockPrice: p1.stockPrice, sma200: p1.sma200, avgVolume: Math.round(p1.avgVolume), trendDirection: p1.trendDirection },
    'Phase 1: PASSED'
  )

  // ── Phase 2: IV Screen ───────────────────────────────────────────────────────
  log.debug({ ticker }, 'Phase 2: fetching option chain')
  const chainResult = await fetchOptionChain(ticker, SCANNER.TARGET_MIN_DTE)

  if (!chainResult.success) {
    log.warn({ ticker, error: chainResult.error }, 'Phase 2: option chain fetch failed — ticker eliminated')
    result.phase2Reason = chainResult.error
    result.finalReason = `Phase 2 failed: ${chainResult.error}`
    return result
  }

  const putContracts = chainResult.contracts.filter((c) => c.type === OptionType.Put)
  const otmPuts = putContracts.filter((c) => c.strike <= p1.stockPrice)
  log.debug(
    {
      ticker,
      totalContracts: chainResult.contracts.length,
      putContracts: putContracts.length,
      itmPutsRemoved: putContracts.length - otmPuts.length,
      otmPuts: otmPuts.length,
      stockPrice: p1.stockPrice,
    },
    'Phase 2: option chain filtered to OTM puts (strike <= stock price)'
  )

  if (otmPuts.length === 0) {
    log.warn({ ticker }, 'Phase 2: no OTM put contracts in chain — ticker eliminated')
    result.phase2Reason = 'No OTM put contracts available'
    result.finalReason = 'Phase 2: No OTM put contracts available'
    return result
  }

  // Pick the nearest-to-ATM put for IV data
  const atmPut = otmPuts.reduce((best, c) =>
    Math.abs(c.strike - p1.stockPrice) < Math.abs(best.strike - p1.stockPrice) ? c : best
  )
  log.debug(
    { ticker, atmContract: atmPut.identifier, atmStrike: atmPut.strike, stockPrice: p1.stockPrice, strikeDiff: Math.abs(atmPut.strike - p1.stockPrice) },
    'Phase 2: ATM put selected for IV data'
  )

  const greeksResult = await fetchOptionGreeks(atmPut.identifier)
  if (!greeksResult.success) {
    log.warn({ ticker, contract: atmPut.identifier, error: greeksResult.error }, 'Phase 2: greeks fetch failed — ticker eliminated')
    result.phase2Reason = greeksResult.error
    result.finalReason = `Phase 2 failed: ${greeksResult.error}`
    return result
  }

  log.debug(
    { ticker, contract: atmPut.identifier, greeksRecordCount: greeksResult.records.length },
    'Phase 2: greeks fetched, running IV screen'
  )
  const p2 = runPhase2(greeksResult.records)
  result.currentIV = p2.currentIV
  result.ivHigh52w = p2.ivHigh52w
  result.ivLow52w = p2.ivLow52w
  result.ivRank = p2.ivRank
  result.passedPhase2 = p2.passed
  result.phase2Reason = p2.reason

  if (!p2.passed) {
    log.info(
      { ticker, reason: p2.reason, ivRank: p2.ivRank, currentIV: p2.currentIV },
      'Phase 2: FAILED — ticker eliminated'
    )
    result.finalReason = `Phase 2: ${p2.reason}`
    return result
  }

  log.info(
    { ticker, ivRank: parseFloat(p2.ivRank.toFixed(1)), currentIV: p2.currentIV, ivHigh52w: p2.ivHigh52w, ivLow52w: p2.ivLow52w },
    'Phase 2: PASSED'
  )

  // ── Phase 3: Option Selection ────────────────────────────────────────────────
  const now = new Date()
  const candidatePuts = otmPuts.filter((c) => {
    const dte = computeDTE(new Date(c.expiration), now)
    return dte >= SCANNER.TARGET_MIN_DTE && dte <= SCANNER.TARGET_MAX_DTE
  })

  log.debug({
    ticker,
    totalOtmPuts: otmPuts.length,
    candidatesInDteWindow: candidatePuts.length,
    dteMin: SCANNER.TARGET_MIN_DTE,
    dteMax: SCANNER.TARGET_MAX_DTE,
  }, 'Phase 3: filtered puts to DTE window')

  const contractDataList: ContractData[] = []

  for (const contract of candidatePuts) {
    log.debug({ ticker, contract: contract.identifier, strike: contract.strike, expiration: contract.expiration }, 'Phase 3: fetching greeks + prices for candidate contract')

    const [gResult, pResult] = await Promise.all([
      fetchOptionGreeks(contract.identifier),
      fetchOptionPrices(contract.identifier),
    ])

    if (!gResult.success || gResult.records.length === 0) {
      log.warn(
        { ticker, contract: contract.identifier, success: gResult.success, recordCount: gResult.records.length, error: gResult.error },
        'Phase 3: greeks fetch failed or returned no records — skipping contract'
      )
      continue
    }

    if (!pResult.success || pResult.records.length === 0) {
      log.warn(
        { ticker, contract: contract.identifier, success: pResult.success, recordCount: pResult.records.length, error: pResult.error },
        'Phase 3: prices fetch failed or returned no records — skipping contract'
      )
      continue
    }

    const g = [...gResult.records].sort((a, b) => b.date.localeCompare(a.date))[0]
    const p = [...pResult.records].sort((a, b) => b.date.localeCompare(a.date))[0]

    const cd: ContractData = {
      identifier: contract.identifier,
      strike: contract.strike,
      expiration: contract.expiration,
      type: contract.type,
      greeksDate: g.date,
      delta: g.delta,
      gamma: g.gamma,
      theta: g.theta,
      vega: g.vega,
      rho: g.rho,
      impliedVolatility: g.impliedVolatility,
      pricesDate: p.date,
      open: p.open,
      high: p.high,
      low: p.low,
      close: p.close,
      volume: p.volume,
      openInterest: p.openInterest,
    }

    contractDataList.push(cd)
    log.debug({ ticker, contractData: cd }, 'Phase 3: contract data assembled')
  }

  log.debug(
    { ticker, candidateContracts: candidatePuts.length, contractDataAssembled: contractDataList.length },
    'Phase 3: data loaded for all candidates, running selection'
  )

  const p3 = selectBestContract(contractDataList, now)
  result.passedPhase3 = p3.passed
  result.phase3Reason = p3.reason

  if (!p3.passed || !p3.selected) {
    log.info({ ticker, reason: p3.reason }, 'Phase 3: FAILED — no qualifying contract found')
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

  log.info({
    ticker,
    contract: sel.contract.identifier,
    strike: sel.contract.strike,
    expiration: sel.contract.expiration,
    dte: sel.dte,
    delta: sel.delta,
    bid: sel.bid,
    premiumYield: parseFloat(sel.premiumYield.toFixed(2)),
    openInterest: sel.openInterest,
  }, 'Phase 3: PASSED — contract selected')

  // ── Phase 4: Scoring ─────────────────────────────────────────────────────────
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

  log.info(
    { ticker, compositeScore: parseFloat(scores.compositeScore.toFixed(1)), yieldScore: parseFloat(scores.yieldScore.toFixed(1)), ivScore: parseFloat(scores.ivScore.toFixed(1)), deltaScore: parseFloat(scores.deltaScore.toFixed(1)), liquidityScore: parseFloat(scores.liquidityScore.toFixed(1)), trendScore: parseFloat(scores.trendScore.toFixed(1)) },
    'Phase 4: COMPLETE'
  )

  // ── Phase 5: Portfolio Checks ────────────────────────────────────────────────
  const portfolio = await checkPortfolio(userId, ticker)
  result.hasOpenCSP = portfolio.hasOpenCSP
  result.hasAssignedPos = portfolio.hasAssignedPos
  result.portfolioFlag = portfolio.portfolioFlag

  result.passed = true
  const elapsed = Date.now() - scanStart

  log.info({
    ticker,
    passed: true,
    compositeScore: parseFloat(scores.compositeScore.toFixed(1)),
    contract: sel.contract.identifier,
    hasPortfolioConflict: portfolio.hasOpenCSP || portfolio.hasAssignedPos,
    portfolioFlag: portfolio.portfolioFlag ?? null,
    elapsedMs: elapsed,
  }, 'scanTicker: COMPLETE — ticker is a CANDIDATE')

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
  const scanStart = Date.now()

  log.info({ userId, scanDate: scanDate.toISOString() }, 'runFullScan: starting full scan')

  const watchlist = await prisma.watchlistTicker.findMany({
    where: { userId },
    select: { ticker: true },
  })

  log.info({ userId, watchlistCount: watchlist.length, tickers: watchlist.map((w) => w.ticker) }, 'runFullScan: watchlist loaded')

  // Delete previous scan results (keep only latest scan)
  const deleted = await prisma.scanResult.deleteMany({ where: { userId } })
  log.debug({ userId, deletedCount: deleted.count }, 'runFullScan: previous scan results cleared')

  const results: ScanTickerResult[] = []

  // Process tickers sequentially to respect rate limits
  for (const { ticker } of watchlist) {
    log.info({ ticker, progress: `${results.length + 1}/${watchlist.length}` }, 'runFullScan: scanning ticker')

    try {
      const tickerResult = await scanTicker(ticker, userId)
      results.push(tickerResult)

      log.info({
        ticker,
        passed: tickerResult.passed,
        passedPhase1: tickerResult.passedPhase1,
        passedPhase2: tickerResult.passedPhase2,
        passedPhase3: tickerResult.passedPhase3,
        compositeScore: tickerResult.compositeScore ?? null,
        finalReason: tickerResult.finalReason ?? null,
      }, 'runFullScan: ticker result recorded')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      const stack = error instanceof Error ? error.stack : undefined
      log.error({ ticker, error: message, stack }, 'runFullScan: unexpected error scanning ticker')
      results.push({
        ticker,
        passedPhase1: false,
        passedPhase2: false,
        passedPhase3: false,
        hasOpenCSP: false,
        hasAssignedPos: false,
        passed: false,
        finalReason: `Scan error: ${message}`,
      })
    }
  }

  // Save all results to database
  log.debug({ userId, resultCount: results.length }, 'runFullScan: saving results to database')
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

  const elapsed = Date.now() - scanStart
  const passedP1 = results.filter((r) => r.passedPhase1).length
  const passedP2 = results.filter((r) => r.passedPhase2).length
  const passedP3 = results.filter((r) => r.passedPhase3).length
  const totalPassed = results.filter((r) => r.passed).length

  log.info({
    userId,
    totalScanned: results.length,
    passedPhase1: passedP1,
    passedPhase2: passedP2,
    passedPhase3: passedP3,
    totalPassed,
    elapsedMs: elapsed,
    elapsedMin: parseFloat((elapsed / 60000).toFixed(1)),
    topCandidates: results
      .filter((r) => r.passed)
      .sort((a, b) => (b.compositeScore ?? 0) - (a.compositeScore ?? 0))
      .slice(0, 5)
      .map((r) => ({ ticker: r.ticker, score: r.compositeScore, contract: r.contractName })),
  }, 'runFullScan: COMPLETE')

  return {
    scanDate,
    results,
    totalScanned: results.length,
    totalPassed,
  }
}
