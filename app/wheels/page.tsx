import { Suspense } from 'react'
import { getWheels } from '@/lib/actions/wheels'
import { WheelsList } from '@/components/wheels/wheels-list'
import { EmptyState } from '@/components/ui/empty-state'

export const metadata = {
  title: 'Wheels | Wheel Tracker',
  description: 'View and manage your wheel strategy cycles with comprehensive metrics',
}

// Loading skeleton component
function WheelsListSkeleton() {
  return (
    <div className="w-full">
      {/* Summary Stats Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>

      {/* Filter Tabs Skeleton */}
      <div className="mb-6 animate-pulse">
        <div className="flex space-x-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-gray-200 rounded w-24"></div>
          ))}
        </div>
      </div>

      {/* Wheel Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Main server component
export default async function WheelsPage() {
  const result = await getWheels()

  if (!result.success) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error loading wheels: {result.error}</p>
        </div>
      </div>
    )
  }

  const wheels = result.data

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Wheel Strategy Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Track your wheel strategy cycles with comprehensive metrics and performance insights.
        </p>
      </div>

      {/* Content */}
      {wheels.length === 0 ? (
        <EmptyState
          title="No wheels yet"
          description="Start your first wheel strategy by selling a PUT option and tracking the complete cycle from assignment to covered calls."
          actionLabel="Create Trade"
          actionHref="/trades/new"
          icon={
            <svg
              className="h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          }
        />
      ) : (
        <Suspense fallback={<WheelsListSkeleton />}>
          <WheelsList initialWheels={wheels} />
        </Suspense>
      )}
    </div>
  )
}
