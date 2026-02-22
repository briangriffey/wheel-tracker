import { prisma } from '../lib/db'
import { runFullScan } from '../lib/services/scanner'
import { logger } from '../lib/logger'

const log = logger.child({ module: 'run-scanner' })

async function main() {
  log.info({ startedAt: new Date().toISOString() }, '[SCANNER] Starting nightly scan')

  const users = await prisma.watchlistTicker.findMany({
    select: { userId: true },
    distinct: ['userId'],
  })

  log.info({ userCount: users.length }, '[SCANNER] Users with watchlists found')

  if (users.length === 0) {
    log.info('[SCANNER] No users with watchlists, exiting')
    await prisma.$disconnect()
    process.exit(0)
  }

  for (const { userId } of users) {
    log.info({ userId }, '[SCANNER] Starting scan for user')

    const result = await runFullScan(userId)

    log.info({
      userId,
      totalScanned: result.totalScanned,
      totalPassed: result.totalPassed,
      scanDate: result.scanDate.toISOString(),
    }, '[SCANNER] User scan complete')
  }

  log.info('[SCANNER] All scans complete')
  await prisma.$disconnect()
  process.exit(0)
}

main().catch(async (err) => {
  logger.error(
    { error: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined },
    '[SCANNER] Fatal error'
  )
  await prisma.$disconnect()
  process.exit(1)
})
