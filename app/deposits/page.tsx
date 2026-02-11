import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getCashDeposits, getDepositSummary } from '@/lib/actions/deposits'
import { DepositHistoryTable } from '@/components/deposits/deposit-history-table'
import { DepositSummaryCard } from '@/components/deposits/deposit-summary-card'
import { ExportDepositsButton } from '@/components/deposits/export-deposits-button'

export default async function DepositsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  // Fetch all deposits for the current user
  const depositsResult = await getCashDeposits()
  const summaryResult = await getDepositSummary()

  const deposits = depositsResult.success ? depositsResult.data : []
  const summary = summaryResult.success ? summaryResult.data : null

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Deposit History</h1>
            <p className="text-gray-600 mt-2">
              Track your cash deposits and withdrawals with SPY benchmark tracking
            </p>
          </div>
          <div className="flex-shrink-0">
            <ExportDepositsButton />
          </div>
        </div>

        {/* Summary Card */}
        {summary && <DepositSummaryCard summary={summary} />}

        {/* Deposit History Table */}
        <DepositHistoryTable initialDeposits={deposits} />
      </div>
    </div>
  )
}
