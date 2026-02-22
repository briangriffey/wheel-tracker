import { cache } from 'react'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

async function getCurrentUserId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}

export interface ScanResultData {
  id: string
  scanDate: Date
  ticker: string

  // Phase 1
  stockPrice: number | null
  sma200: number | null
  sma50: number | null
  avgVolume: number | null
  trendDirection: string | null
  passedPhase1: boolean
  phase1Reason: string | null

  // Phase 2
  currentIV: number | null
  ivHigh52w: number | null
  ivLow52w: number | null
  ivRank: number | null
  passedPhase2: boolean
  phase2Reason: string | null

  // Phase 3
  contractName: string | null
  strike: number | null
  expiration: Date | null
  dte: number | null
  delta: number | null
  theta: number | null
  bid: number | null
  iv: number | null
  openInterest: number | null
  optionVolume: number | null
  premiumYield: number | null
  passedPhase3: boolean
  phase3Reason: string | null

  // Phase 4
  yieldScore: number | null
  ivScore: number | null
  deltaScore: number | null
  liquidityScore: number | null
  trendScore: number | null
  compositeScore: number | null

  // Phase 5
  hasOpenCSP: boolean
  hasAssignedPos: boolean
  portfolioFlag: string | null

  // Overall
  passed: boolean
  finalReason: string | null
}

export interface ScanMetadata {
  lastScanDate: Date | null
  totalScanned: number
  passedPhase1: number
  passedPhase2: number
  passedPhase3: number
  totalPassed: number
}

function decimalToNumber(val: { toNumber(): number } | null): number | null {
  return val ? val.toNumber() : null
}

export const getLatestScanResults = cache(async (): Promise<ScanResultData[]> => {
  const userId = await getCurrentUserId()
  if (!userId) return []

  // Find most recent scan date for this user
  const latestScan = await prisma.scanResult.findFirst({
    where: { userId },
    orderBy: { scanDate: 'desc' },
    select: { scanDate: true },
  })

  if (!latestScan) return []

  const results = await prisma.scanResult.findMany({
    where: { userId, scanDate: latestScan.scanDate },
    orderBy: [{ passed: 'desc' }, { compositeScore: 'desc' }],
  })

  return results.map((r) => ({
    id: r.id,
    scanDate: r.scanDate,
    ticker: r.ticker,
    stockPrice: decimalToNumber(r.stockPrice),
    sma200: decimalToNumber(r.sma200),
    sma50: decimalToNumber(r.sma50),
    avgVolume: decimalToNumber(r.avgVolume),
    trendDirection: r.trendDirection,
    passedPhase1: r.passedPhase1,
    phase1Reason: r.phase1Reason,
    currentIV: decimalToNumber(r.currentIV),
    ivHigh52w: decimalToNumber(r.ivHigh52w),
    ivLow52w: decimalToNumber(r.ivLow52w),
    ivRank: decimalToNumber(r.ivRank),
    passedPhase2: r.passedPhase2,
    phase2Reason: r.phase2Reason,
    contractName: r.contractName,
    strike: decimalToNumber(r.strike),
    expiration: r.expiration,
    dte: r.dte,
    delta: decimalToNumber(r.delta),
    theta: decimalToNumber(r.theta),
    bid: decimalToNumber(r.bid),
    iv: decimalToNumber(r.iv),
    openInterest: r.openInterest,
    optionVolume: r.optionVolume,
    premiumYield: decimalToNumber(r.premiumYield),
    passedPhase3: r.passedPhase3,
    phase3Reason: r.phase3Reason,
    yieldScore: decimalToNumber(r.yieldScore),
    ivScore: decimalToNumber(r.ivScore),
    deltaScore: decimalToNumber(r.deltaScore),
    liquidityScore: decimalToNumber(r.liquidityScore),
    trendScore: decimalToNumber(r.trendScore),
    compositeScore: decimalToNumber(r.compositeScore),
    hasOpenCSP: r.hasOpenCSP,
    hasAssignedPos: r.hasAssignedPos,
    portfolioFlag: r.portfolioFlag,
    passed: r.passed,
    finalReason: r.finalReason,
  }))
})

export interface HistoricalPriceData {
  date: Date
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export const getHistoricalPricesForTickers = cache(
  async (tickers: string[]): Promise<Map<string, HistoricalPriceData[]>> => {
    if (tickers.length === 0) return new Map()

    const rows = await prisma.historicalStockPrice.findMany({
      where: { ticker: { in: tickers } },
      orderBy: [{ ticker: 'asc' }, { date: 'asc' }],
    })

    const result = new Map<string, HistoricalPriceData[]>()
    for (const row of rows) {
      const entry: HistoricalPriceData = {
        date: row.date,
        open: row.open.toNumber(),
        high: row.high.toNumber(),
        low: row.low.toNumber(),
        close: row.close.toNumber(),
        volume: Number(row.volume),
      }
      const existing = result.get(row.ticker)
      if (existing) {
        existing.push(entry)
      } else {
        result.set(row.ticker, [entry])
      }
    }

    return result
  }
)

export const getScanMetadata = cache(async (): Promise<ScanMetadata> => {
  const userId = await getCurrentUserId()
  if (!userId) {
    return {
      lastScanDate: null,
      totalScanned: 0,
      passedPhase1: 0,
      passedPhase2: 0,
      passedPhase3: 0,
      totalPassed: 0,
    }
  }

  // Find most recent scan date
  const latestScan = await prisma.scanResult.findFirst({
    where: { userId },
    orderBy: { scanDate: 'desc' },
    select: { scanDate: true },
  })

  if (!latestScan) {
    return {
      lastScanDate: null,
      totalScanned: 0,
      passedPhase1: 0,
      passedPhase2: 0,
      passedPhase3: 0,
      totalPassed: 0,
    }
  }

  const scanDate = latestScan.scanDate

  const [totalScanned, passedPhase1, passedPhase2, passedPhase3, totalPassed] = await Promise.all([
    prisma.scanResult.count({ where: { userId, scanDate } }),
    prisma.scanResult.count({ where: { userId, scanDate, passedPhase1: true } }),
    prisma.scanResult.count({ where: { userId, scanDate, passedPhase2: true } }),
    prisma.scanResult.count({ where: { userId, scanDate, passedPhase3: true } }),
    prisma.scanResult.count({ where: { userId, scanDate, passed: true } }),
  ])

  return {
    lastScanDate: scanDate,
    totalScanned,
    passedPhase1,
    passedPhase2,
    passedPhase3,
    totalPassed,
  }
})
