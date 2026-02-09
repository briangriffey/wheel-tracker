'use client'

import { useState, useEffect } from 'react'
import { getUnreadNotificationCount, getRecentNotifications } from '@/lib/actions/notifications'
import { NotificationPanel } from '@/components/notifications/notification-panel'
import type { Notification } from '@/lib/generated/prisma'

/**
 * Bell icon component
 */
function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

/**
 * Notification Bell Component
 *
 * Displays a bell icon with unread notification count badge.
 * Clicking the bell opens a dropdown panel with recent notifications.
 */
export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Fetch unread count on mount and periodically
  useEffect(() => {
    const fetchUnreadCount = async () => {
      const result = await getUnreadNotificationCount()
      if (result.success) {
        setUnreadCount(result.data)
      }
    }

    fetchUnreadCount()

    // Poll every 60 seconds for new notifications
    const interval = setInterval(fetchUnreadCount, 60000)

    return () => clearInterval(interval)
  }, [])

  // Fetch recent notifications when panel opens
  useEffect(() => {
    if (isOpen && notifications.length === 0) {
      setIsLoading(true)
      getRecentNotifications(10).then((result) => {
        if (result.success && result.data) {
          setNotifications(result.data)
        }
        setIsLoading(false)
      })
    }
  }, [isOpen, notifications.length])

  const handleToggle = () => {
    setIsOpen(!isOpen)
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  const handleNotificationRead = async () => {
    // Refresh unread count after marking as read
    const result = await getUnreadNotificationCount()
    if (result.success) {
      setUnreadCount(result.data)
    }

    // Refresh notifications list
    const notifResult = await getRecentNotifications(10)
    if (notifResult.success && notifResult.data) {
      setNotifications(notifResult.data)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
      >
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationPanel
          notifications={notifications}
          isLoading={isLoading}
          onClose={handleClose}
          onNotificationRead={handleNotificationRead}
        />
      )}
    </div>
  )
}
