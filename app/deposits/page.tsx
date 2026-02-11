import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getCashDeposits, getDepositSummary } from '@/lib/actions/deposits'
import { DepositsClient } from './deposits-client'

export const metadata = {
  title: 'Deposits & Withdrawals | Wheel Tracker',
  description: 'Track your cash deposits and withdrawals for benchmark comparison',
}

export default async function DepositsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  // Fetch deposits and summary in parallel
  const [depositsResult, summaryResult] = await Promise.all([
    getCashDeposits(),
    getDepositSummary(),
  ])

  const deposits = depositsResult.success ? depositsResult.data : []
  const summary = summaryResult.success ? summaryResult.data : null

  return <DepositsClient initialDeposits={deposits} initialSummary={summary} />
}
