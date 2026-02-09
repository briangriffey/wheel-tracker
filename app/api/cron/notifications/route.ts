import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateAllNotifications } from '@/lib/notifications/triggers'

/**
 * Cron job endpoint for generating notifications
 *
 * This endpoint should be called daily by Vercel Cron or similar service.
 * It generates notifications for all users based on their trading activity.
 *
 * To configure in Vercel:
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/notifications",
 *     "schedule": "0 9 * * *"
 *   }]
 * }
 *
 * Security: Uses CRON_SECRET environment variable for authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
      },
    })

    console.log(`Starting notification generation for ${users.length} users`)

    // Generate notifications for each user
    const results = await Promise.allSettled(
      users.map((user) => generateAllNotifications(user.id))
    )

    // Count successes and failures
    const successful = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length

    console.log(`Notification generation complete: ${successful} succeeded, ${failed} failed`)

    return NextResponse.json({
      success: true,
      message: 'Notification generation complete',
      stats: {
        total: users.length,
        successful,
        failed,
      },
    })
  } catch (error) {
    console.error('Error in notification cron job:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
