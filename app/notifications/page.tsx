import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getAllNotifications } from '@/lib/actions/notifications'
import { NotificationList } from '@/components/notifications/notification-list'

export const metadata = {
  title: 'Notifications | Wheel Tracker',
  description: 'View all your notifications',
}

export default async function NotificationsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  const result = await getAllNotifications()

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600 mt-2">
            Stay updated on your options trading activity
          </p>
        </div>

        <NotificationList
          notifications={result.success && result.data ? result.data : []}
          error={result.success ? undefined : result.error}
        />
      </div>
    </div>
  )
}
