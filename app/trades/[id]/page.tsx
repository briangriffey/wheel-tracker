import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getTrade } from '@/lib/queries/trades'
import { TradeDetailClient } from './trade-detail-client'

interface TradeDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function TradeDetailPage({ params }: TradeDetailPageProps) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  // Await params (Next.js 15 requirement)
  const { id } = await params

  // Fetch the trade
  const trade = await getTrade(id)

  if (!trade) {
    notFound()
  }

  // Convert Decimal types to numbers for serialization
  const serializedTrade = {
    ...trade,
    strikePrice: Number(trade.strikePrice),
    premium: Number(trade.premium),
    position: trade.position
      ? {
          ...trade.position,
          costBasis: Number(trade.position.costBasis),
        }
      : null,
    createdPosition: trade.createdPosition
      ? {
          ...trade.createdPosition,
          costBasis: Number(trade.createdPosition.costBasis),
        }
      : null,
  }

  return <TradeDetailClient trade={serializedTrade} />
}
