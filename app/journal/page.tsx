import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getTrades } from '@/lib/queries/trades'
import { JournalList } from '@/components/journal'
import Link from 'next/link'

export default async function JournalPage() {
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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Trade Journal</h1>
            <p className="text-gray-600 mt-2">
              Review your trades with notes, tags, and outcomes
            </p>
          </div>
          <Link
            href="/trades/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Add Trade
          </Link>
        </div>

        {/* Journal List Component */}
        <JournalList initialTrades={trades} />
      </div>
    </div>
  )
}
