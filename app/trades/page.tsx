import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getTrades } from '@/lib/queries/trades'
import { TradeList, NewTradeButton } from '@/components/trades'

export default async function TradesPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  // Fetch all trades for the current user
  const trades = await getTrades()

  return (
    <div className="min-h-screen bg-neutral-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Trades</h1>
            <p className="text-neutral-600 mt-2">
              View and manage your options trades
            </p>
          </div>
          <div className="flex-shrink-0">
            <NewTradeButton />
          </div>
        </div>

        {/* Trade List Component */}
        <TradeList initialTrades={trades} />
      </div>
    </div>
  )
}
