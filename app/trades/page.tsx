import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getTrades } from '@/lib/queries/trades'
import { getLatestPrices, smartBatchRefresh } from '@/lib/services/market-data'
import { getActiveTickers, canRefreshPrice } from '@/lib/utils/market'
import { TradeList, NewTradeButton, RefreshPricesButton } from '@/components/trades'

export default async function TradesPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  // Fetch all trades for the current user
  const trades = await getTrades()

  // Get active tickers (open trades, open positions, SPY) and auto-refresh eligible ones
  const activeTickers = await getActiveTickers()
  await smartBatchRefresh(activeTickers)

  // Get unique tickers from trades (includes both active and closed trade tickers)
  const uniqueTickers = [...new Set(trades.map((trade) => trade.ticker))]

  // Fetch latest prices for all tickers (now freshly updated for eligible ones)
  const prices = await getLatestPrices(uniqueTickers)

  // Build refresh eligibility info for each ticker (serializable for client)
  const refreshInfo: Record<string, { canRefresh: boolean; nextRefreshAt: string | null; reason: string; lastUpdated: string }> = {}
  for (const [ticker, priceResult] of prices) {
    const eligibility = canRefreshPrice(priceResult.date)
    refreshInfo[ticker] = {
      canRefresh: eligibility.canRefresh,
      nextRefreshAt: eligibility.nextRefreshAt?.toISOString() ?? null,
      reason: eligibility.reason,
      lastUpdated: priceResult.date.toISOString(),
    }
  }

  // Check if any tickers are eligible for refresh (for the button)
  const hasEligiblePrices = Object.values(refreshInfo).some((info) => info.canRefresh)

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Trades</h1>
            <p className="text-gray-600 mt-2">View and manage your options trades</p>
          </div>
          <div className="flex-shrink-0 flex gap-3">
            <RefreshPricesButton hasEligiblePrices={hasEligiblePrices} />
            <NewTradeButton />
          </div>
        </div>

        {/* Trade List Component */}
        <TradeList initialTrades={trades} prices={prices} refreshInfo={refreshInfo} />
      </div>
    </div>
  )
}
