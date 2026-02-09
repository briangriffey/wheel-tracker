import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { TradeDetailClient } from './trade-detail-client'

async function getCurrentUserId(): Promise<string> {
  // TODO: Replace with actual session-based authentication
  const user = await prisma.user.findFirst()
  if (!user) {
    throw new Error('No user found')
  }
  return user.id
}

async function getTrade(id: string, userId: string) {
  const trade = await prisma.trade.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      ticker: true,
      type: true,
      action: true,
      strikePrice: true,
      premium: true,
      contracts: true,
      shares: true,
      expirationDate: true,
      openDate: true,
      closeDate: true,
      status: true,
      notes: true,
      positionId: true,
      position: {
        select: {
          id: true,
          status: true,
          ticker: true,
          shares: true,
          costBasis: true,
        },
      },
    },
  })

  if (!trade) {
    return null
  }

  if (trade.userId !== userId) {
    return null
  }

  return {
    ...trade,
    strikePrice: Number(trade.strikePrice),
    premium: Number(trade.premium),
    position: trade.position
      ? {
          ...trade.position,
          costBasis: Number(trade.position.costBasis),
        }
      : null,
  }
}

export default async function TradeDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const userId = await getCurrentUserId()
  const trade = await getTrade(params.id, userId)

  if (!trade) {
    notFound()
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <TradeDetailClient trade={trade as any} />
    </div>
  )
}
