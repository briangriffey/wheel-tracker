import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PLExportButton } from '@/components/export/pl-export-button'

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600">
              Welcome, {session.user.name || session.user.email}!
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This is your protected dashboard. Only authenticated users can see
              this page.
            </p>
          </div>

          <PLExportButton />
        </div>
      </div>
    </div>
  )
}
