import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getTrades } from '@/lib/queries/trades'
import { TradeList } from '@/components/trades'

export default async function TradesPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  // Fetch all trades for the current user
  const trades = await getTrades()

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Trades</h1>
          <p className="text-gray-600 mt-2">
            View and manage your options trades
          </p>
        </div>

        {/* Trade List Component */}
        <TradeList initialTrades={trades} />
      </div>
    </div>
  )
}
