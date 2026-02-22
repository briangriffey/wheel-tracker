import { prisma } from '../lib/db'
import { runFullScan } from '../lib/services/scanner'

async function main() {
  console.log('[SCANNER] Starting nightly scan at', new Date().toISOString())

  const users = await prisma.watchlistTicker.findMany({
    select: { userId: true },
    distinct: ['userId'],
  })

  if (users.length === 0) {
    console.log('[SCANNER] No users with watchlists, exiting')
    await prisma.$disconnect()
    process.exit(0)
  }

  for (const { userId } of users) {
    console.log(`[SCANNER] Scanning for user ${userId}`)
    const result = await runFullScan(userId)
    console.log(
      `[SCANNER] User ${userId}: ${result.totalScanned} scanned, ${result.totalPassed} candidates`
    )
  }

  console.log('[SCANNER] Scan complete')
  await prisma.$disconnect()
  process.exit(0)
}

main().catch(async (err) => {
  console.error('[SCANNER] Fatal error:', err)
  await prisma.$disconnect()
  process.exit(1)
})
