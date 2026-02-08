import { Suspense } from 'react'
import { getOpenPositions } from '@/lib/queries/positions'
import { PositionsList } from '@/components/positions'

export const metadata = {
  title: 'Active Positions | Wheel Tracker',
  description: 'View and manage your active stock positions',
}

// Loading component
function PositionsListSkeleton() {
  return (
    <div className="w-full">
      {/* Stats Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-neutral-200 rounded w-1/2 mb-3"></div>
            <div className="h-8 bg-neutral-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>

      {/* Filters Skeleton */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 animate-pulse">
        <div className="h-6 bg-neutral-200 rounded w-1/4 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="h-4 bg-neutral-200 rounded w-1/3 mb-2"></div>
              <div className="h-10 bg-neutral-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-6 bg-neutral-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="h-4 bg-neutral-200 rounded"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Main server component
export default async function PositionsPage() {
  const positions = await getOpenPositions()

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">Active Positions</h1>
        <p className="mt-2 text-neutral-600">
          Track and manage your active stock positions from assigned PUT options.
        </p>
      </div>

      {/* Positions List */}
      <Suspense fallback={<PositionsListSkeleton />}>
        <PositionsList initialPositions={positions} />
      </Suspense>
    </div>
  )
}
