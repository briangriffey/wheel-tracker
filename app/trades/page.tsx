import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getTrades } from '@/lib/queries/trades'
import { getLatestPrices } from '@/lib/services/market-data'
import { TradeList, NewTradeButton, RefreshPricesButton } from '@/components/trades'

export default async function TradesPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  // Fetch all trades for the current user
  const trades = await getTrades()

  // Get unique tickers from trades
  const uniqueTickers = [...new Set(trades.map((trade) => trade.ticker))]

  // Fetch latest prices for all tickers
  const prices = await getLatestPrices(uniqueTickers)

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
            <RefreshPricesButton />
            <NewTradeButton />
          </div>
        </div>

        {/* Trade List Component */}
        <TradeList initialTrades={trades} prices={prices} />
      </div>
    </div>
  )
}
