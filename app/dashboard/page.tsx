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
import { AlertsWidget } from '@/components/dashboard/alerts-widget'
import {
  getUpcomingExpirations,
  getITMOptions,
  getPositionsWithoutCalls,
} from '@/lib/actions/notifications'
import { prisma } from '@/lib/db'

// Dynamic rendering — dashboard is user-specific, cannot be statically cached
export const dynamic = 'force-dynamic'

// Add metadata for SEO
export const metadata = {
  title: 'Dashboard | GreekWheel',
  description: 'Track your options trading performance with the wheel strategy',
}

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  // Fetch initial dashboard data for 'All' time range and notifications
  const [metrics, plOverTime, plByTicker, winRateData, expirations, itmOptions, positions, onboardingUser] =
    await Promise.all([
      getDashboardMetrics('All'),
      getPLOverTime('All'),
      getPLByTicker('All'),
      getWinRateData('All'),
      getUpcomingExpirations(7),
      getITMOptions(),
      getPositionsWithoutCalls(),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { onboardingCompletedAt: true },
      }),
    ])

  const showOnboarding = onboardingUser ? onboardingUser.onboardingCompletedAt === null : false

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Alerts Widget */}
        <div className="mb-6">
          <AlertsWidget
            upcomingExpirations={expirations.success ? expirations.data : []}
            itmOptions={itmOptions.success ? itmOptions.data : []}
            positionsWithoutCalls={positions.success ? positions.data : []}
          />
        </div>

        <PLDashboard
          initialMetrics={metrics}
          initialPLOverTime={plOverTime}
          initialPLByTicker={plByTicker}
          initialWinRateData={winRateData}
          showOnboarding={showOnboarding}
        />
        <div className="mb-6">
          <PLExportButton />
        </div>
      </div>
    </div>
  )
}
