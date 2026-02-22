import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getWatchlistTickers } from '@/lib/actions/watchlist'
import {
  getLatestScanResults,
  getScanMetadata,
  getHistoricalPricesForTickers,
  type HistoricalPriceData,
} from '@/lib/queries/scanner'
import { ScannerClient } from './scanner-client'

export const metadata = {
  title: 'Scanner | GreekWheel',
  description: 'Wheel strategy options scanner with watchlist management',
}

export default async function ScannerPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  const [watchlistResult, scanResults, scanMetadata] = await Promise.all([
    getWatchlistTickers(),
    getLatestScanResults(),
    getScanMetadata(),
  ])

  const watchlist = watchlistResult.success ? watchlistResult.data : []

  // Fetch price history for passed candidates (chart data)
  const passedTickers = scanResults
    .filter((r) => r.passed)
    .map((r) => r.ticker)
  const priceHistoryMap = await getHistoricalPricesForTickers(passedTickers)

  // Convert Map to serializable object for client component
  const priceHistory: Record<string, HistoricalPriceData[]> = {}
  for (const [ticker, data] of priceHistoryMap) {
    priceHistory[ticker] = data
  }

  return (
    <ScannerClient
      initialWatchlist={watchlist}
      initialScanResults={scanResults}
      initialMetadata={scanMetadata}
      priceHistory={priceHistory}
    />
  )
}
