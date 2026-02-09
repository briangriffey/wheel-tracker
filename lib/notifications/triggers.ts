'use server'

import { prisma } from '@/lib/db'
import { getUpcomingExpirations, getITMOptions, getPositionsWithoutCalls } from '@/lib/actions/notifications'
import type { NotificationType } from '@/lib/generated/prisma'

/**
 * Create a notification for a user
 */
async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  actionUrl?: string,
  relatedTradeId?: string,
  relatedPositionId?: string
) {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        actionUrl,
        relatedTradeId,
        relatedPositionId,
      },
    })
  } catch (error) {
    console.error('Error creating notification:', error)
  }
}

/**
 * Generate notifications for expiring options
 *
 * Checks for options expiring in the next 3 days and creates
 * notifications if they don't already exist.
 */
export async function generateExpiringNotifications(userId: string) {
  const result = await getUpcomingExpirations(3)

  if (!result.success) {
    console.error('Failed to fetch upcoming expirations:', result.error)
    return
  }

  for (const expiration of result.data) {
    // Check if notification already exists
    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        type: 'EXPIRING_SOON',
        relatedTradeId: expiration.id,
        createdAt: {
          // Only check for notifications created in the last 24 hours
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    })

    if (!existing) {
      await createNotification(
        userId,
        'EXPIRING_SOON',
        `${expiration.ticker} ${expiration.type} expiring soon`,
        `Your ${expiration.ticker} ${expiration.type} option at $${expiration.strikePrice} strike expires in ${expiration.daysUntilExpiration} day(s)`,
        `/trades/${expiration.id}`,
        expiration.id
      )
    }
  }
}

/**
 * Generate notifications for in-the-money options
 *
 * Checks for ITM options and creates notifications if they don't exist.
 */
export async function generateITMNotifications(userId: string) {
  const result = await getITMOptions()

  if (!result.success) {
    console.error('Failed to fetch ITM options:', result.error)
    return
  }

  for (const itm of result.data) {
    // Check if notification already exists
    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        type: 'ITM_OPTION',
        relatedTradeId: itm.id,
        createdAt: {
          // Only check for notifications created in the last 24 hours
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    })

    if (!existing) {
      await createNotification(
        userId,
        'ITM_OPTION',
        `${itm.ticker} ${itm.type} is in-the-money`,
        `Your ${itm.ticker} ${itm.type} option at $${itm.strikePrice} strike is ITM (current price: $${itm.currentPrice})`,
        `/trades/${itm.id}`,
        itm.id
      )
    }
  }
}

/**
 * Generate notifications for positions without covered calls
 *
 * Checks for positions that have been without covered calls for 7+ days.
 */
export async function generateNoCoveredCallNotifications(userId: string) {
  const result = await getPositionsWithoutCalls()

  if (!result.success) {
    console.error('Failed to fetch positions without calls:', result.error)
    return
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  for (const position of result.data) {
    // Only notify for positions held for 7+ days
    if (position.acquiredDate > sevenDaysAgo) {
      continue
    }

    // Check if notification already exists
    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        type: 'NO_COVERED_CALL',
        relatedPositionId: position.id,
        createdAt: {
          // Only check for notifications created in the last 7 days
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    })

    if (!existing) {
      await createNotification(
        userId,
        'NO_COVERED_CALL',
        `${position.ticker} available for covered calls`,
        `Your ${position.shares} shares of ${position.ticker} have been without covered calls for 7+ days`,
        `/positions/${position.id}`,
        undefined,
        position.id
      )
    }
  }
}

/**
 * Run all notification generators for a user
 *
 * This is the main function that should be called by the cron job.
 */
export async function generateAllNotifications(userId: string) {
  console.log(`Generating notifications for user ${userId}`)

  await Promise.allSettled([
    generateExpiringNotifications(userId),
    generateITMNotifications(userId),
    generateNoCoveredCallNotifications(userId),
  ])

  console.log(`Finished generating notifications for user ${userId}`)
}
