'use client'

import { useState } from 'react'
import Link from 'next/link'
import { markNotificationAsRead, markAllNotificationsAsRead } from '@/lib/actions/notifications'
import type { Notification } from '@/lib/generated/prisma'
import { Card, CardContent, Badge } from '@/components/design-system'

interface NotificationListProps {
  notifications: Notification[]
  error?: string
}

/**
 * Get icon for notification type
 */
function getNotificationIcon(type: string) {
  switch (type) {
    case 'EXPIRING_SOON':
      return (
        <svg
          className="h-6 w-6 text-yellow-600"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      )
    case 'ITM_OPTION':
      return (
        <svg
          className="h-6 w-6 text-blue-600"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      )
    case 'NO_COVERED_CALL':
      return (
        <svg
          className="h-6 w-6 text-green-600"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      )
    case 'ASSIGNMENT':
      return (
        <svg
          className="h-6 w-6 text-purple-600"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      )
    default:
      return (
        <svg
          className="h-6 w-6 text-gray-600"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      )
  }
}

/**
 * Get badge variant for notification type
 */
function getBadgeVariant(type: string): 'warning' | 'info' | 'success' | 'default' {
  switch (type) {
    case 'EXPIRING_SOON':
      return 'warning'
    case 'ITM_OPTION':
      return 'info'
    case 'NO_COVERED_CALL':
      return 'success'
    default:
      return 'default'
  }
}

/**
 * Format notification type for display
 */
function formatNotificationType(type: string) {
  switch (type) {
    case 'EXPIRING_SOON':
      return 'Expiring Soon'
    case 'ITM_OPTION':
      return 'In-The-Money'
    case 'NO_COVERED_CALL':
      return 'Available for Calls'
    case 'ASSIGNMENT':
      return 'Assignment'
    default:
      return 'Notification'
  }
}

/**
 * Format date
 */
function formatDate(date: Date) {
  const now = new Date()
  const notifDate = new Date(date)
  const diffMs = now.getTime() - notifDate.getTime()
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffDays === 0) {
    return notifDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return `${diffDays} days ago`
  } else {
    return notifDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: notifDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }
}

/**
 * Notification List Component
 *
 * Displays all notifications for the user with filtering and actions.
 */
export function NotificationList({ notifications, error }: NotificationListProps) {
  const [localNotifications, setLocalNotifications] = useState(notifications)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const handleMarkAsRead = async (notificationId: string) => {
    await markNotificationAsRead(notificationId)

    // Update local state
    setLocalNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    )
  }

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead()

    // Update local state
    setLocalNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  if (error) {
    return (
      <Card variant="elevated">
        <CardContent>
          <div className="text-center py-12">
            <p className="text-red-600">Error loading notifications: {error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const filteredNotifications =
    filter === 'unread'
      ? localNotifications.filter((n) => !n.read)
      : localNotifications

  const unreadCount = localNotifications.filter((n) => !n.read).length

  return (
    <div className="space-y-4">
      {/* Actions bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({localNotifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'unread'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Mark all as read
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      {filteredNotifications.length === 0 ? (
        <Card variant="elevated">
          <CardContent>
            <div className="text-center py-12">
              <svg
                className="h-16 w-16 mx-auto text-gray-400 mb-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <p className="text-gray-500 text-lg">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                {filter === 'unread'
                  ? "You're all caught up!"
                  : "We'll notify you when something important happens"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              variant={notification.read ? 'default' : 'elevated'}
              className={!notification.read ? 'border-l-4 border-l-blue-600' : ''}
            >
              <CardContent className="p-4">
                <Link
                  href={notification.actionUrl || '#'}
                  onClick={() => {
                    if (!notification.read) {
                      handleMarkAsRead(notification.id)
                    }
                  }}
                  className="block hover:bg-gray-50 -m-4 p-4 rounded-lg transition-colors"
                >
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2">
                          <h3
                            className={`text-base font-semibold ${
                              notification.read ? 'text-gray-700' : 'text-gray-900'
                            }`}
                          >
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                          )}
                        </div>
                        <Badge variant={getBadgeVariant(notification.type)} size="sm">
                          {formatNotificationType(notification.type)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                      <p className="text-xs text-gray-500">{formatDate(notification.createdAt)}</p>
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
