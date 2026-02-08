import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getUpcomingExpirations, getExpirationStats } from '@/lib/queries/expirations'
import { ExpirationList } from '@/components/expirations/expiration-list'

export default async function ExpirationsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  // Fetch upcoming expirations (next 30 days) and stats
  const [expirations, stats] = await Promise.all([
    getUpcomingExpirations(30),
    getExpirationStats(),
  ])

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Option Expirations</h1>
          <p className="text-gray-600 mt-2">
            Track and manage upcoming option expirations for the next 30 days
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-gray-400">
            <p className="text-sm text-gray-500">Total Open</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-red-50 rounded-lg shadow-sm p-4 border-l-4 border-red-500">
            <p className="text-sm text-red-600">Urgent</p>
            <p className="text-2xl font-bold text-red-700">{stats.urgent}</p>
            <p className="text-xs text-red-500 mt-1">&lt;7 days</p>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow-sm p-4 border-l-4 border-yellow-500">
            <p className="text-sm text-yellow-600">Soon</p>
            <p className="text-2xl font-bold text-yellow-700">{stats.soon}</p>
            <p className="text-xs text-yellow-500 mt-1">7-14 days</p>
          </div>
          <div className="bg-green-50 rounded-lg shadow-sm p-4 border-l-4 border-green-500">
            <p className="text-sm text-green-600">Later</p>
            <p className="text-2xl font-bold text-green-700">{stats.later}</p>
            <p className="text-xs text-green-500 mt-1">14-30 days</p>
          </div>
        </div>

        {/* Expiration List */}
        <ExpirationList initialExpirations={expirations} />
      </div>
    </div>
  )
}
