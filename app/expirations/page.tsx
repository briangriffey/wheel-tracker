import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import {
  getExpiringTrades,
  groupTradesByExpiration,
  getUniqueTickers,
} from '@/lib/queries/expirations'
import { getLatestPrices } from '@/lib/actions/prices'
import { ExpirationCalendar } from '@/components/expirations/expiration-calendar'

export default async function ExpirationsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  // Fetch all expiring trades (next 30 days)
  const trades = await getExpiringTrades(30)

  // Group trades by expiration date
  const groupedTrades = groupTradesByExpiration(trades)

  // Get unique tickers to fetch prices
  const uniqueTickers = getUniqueTickers(trades)

  // Fetch current stock prices for all tickers
  const pricesResult = await getLatestPrices(uniqueTickers)
  const prices = pricesResult.success ? pricesResult.data : {}

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Expiration Calendar</h1>
          <p className="text-gray-600 mt-2">
            Manage upcoming option expirations with batch actions
          </p>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Total Expiring</div>
            <div className="text-2xl font-bold text-gray-900">{trades.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Expiration Dates</div>
            <div className="text-2xl font-bold text-gray-900">{groupedTrades.size}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Unique Tickers</div>
            <div className="text-2xl font-bold text-gray-900">{uniqueTickers.length}</div>
          </div>
        </div>

        {/* Expiration Calendar Component */}
        <ExpirationCalendar
          groupedTrades={groupedTrades}
          prices={prices}
        />
      </div>
    </div>
  )
}
