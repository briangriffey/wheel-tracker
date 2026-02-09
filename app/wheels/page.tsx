import { Suspense } from 'react'
import { getWheels } from '@/lib/actions/wheels'
import { WheelsList } from '@/components/wheels'

export const metadata = {
  title: 'Wheels | Wheel Tracker',
  description: 'View and manage your wheel strategy cycles',
}

// Loading component
function WheelsListSkeleton() {
  return (
    <div className="w-full">
      {/* Stats Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>

      {/* Filters Skeleton */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((j) => (
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

  // Handle error case
  if (!result.success) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Wheels</h1>
          <p className="mt-2 text-gray-600">
            Track your wheel strategy cycles and performance.
          </p>
        </div>
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
        <h1 className="text-3xl font-bold text-gray-900">Wheels</h1>
        <p className="mt-2 text-gray-600">
          Track your wheel strategy cycles and performance across all tickers.
        </p>
      </div>

      {/* Wheels List */}
      <Suspense fallback={<WheelsListSkeleton />}>
        <WheelsList initialWheels={wheels} />
      </Suspense>
    </div>
  )
}
