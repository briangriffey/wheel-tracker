import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getCashDeposits, getDepositSummary } from '@/lib/actions/deposits'
import { fetchCurrentStockPrice } from '@/lib/actions/stock-price'
import { DepositsClient } from './deposits-client'

export const metadata = {
  title: 'Deposits & Withdrawals | GreekWheel',
  description: 'Track your cash deposits and withdrawals for benchmark comparison',
}

export default async function DepositsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  // Fetch deposits, summary, and current SPY price in parallel
  const [depositsResult, summaryResult, spyPriceResult] = await Promise.all([
    getCashDeposits(),
    getDepositSummary(),
    fetchCurrentStockPrice('SPY'),
  ])

  const deposits = depositsResult.success ? depositsResult.data : []
  const summary = summaryResult.success ? summaryResult.data : null
  const currentSpyPrice = spyPriceResult.success && spyPriceResult.price ? spyPriceResult.price : null

  return <DepositsClient initialDeposits={deposits} initialSummary={summary} currentSpyPrice={currentSpyPrice} />
}
