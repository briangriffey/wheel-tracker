import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PLDashboard } from '@/components/dashboard/pl-dashboard'
import {
  getDashboardMetrics,
  getPLOverTime,
  getPLByTicker,
  getWinRateData,
} from '@/lib/queries/dashboard'
import { PLExportButton } from '@/components/export/pl-export-button'

// Enable ISR with 60 second revalidation
export const revalidate = 60

// Add metadata for SEO
export const metadata = {
  title: 'Dashboard | Wheel Tracker',
  description: 'Track your options trading performance with the wheel strategy',
}

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  // Fetch initial dashboard data for 'All' time range
  const [metrics, plOverTime, plByTicker, winRateData] = await Promise.all([
    getDashboardMetrics('All'),
    getPLOverTime('All'),
    getPLByTicker('All'),
    getWinRateData('All'),
  ])

  return (
    <div className="min-h-screen bg-neutral-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <PLExportButton />
        </div>
        <PLDashboard
          initialMetrics={metrics}
          initialPLOverTime={plOverTime}
          initialPLByTicker={plByTicker}
          initialWinRateData={winRateData}
        />
      </div>
    </div>
  )
}
