import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getCashDeposits, getDepositSummary } from '@/lib/actions/deposits'
import { RecordDepositButton } from '@/components/deposits/record-deposit-button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/design-system'
import { formatCurrency } from '@/lib/utils/format'

export const metadata = {
  title: 'Deposit History | Wheel Tracker',
  description: 'View and manage your cash deposits and withdrawals',
}

export default async function DepositsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  const [depositsResult, summaryResult] = await Promise.all([
    getCashDeposits(),
    getDepositSummary(),
  ])

  const deposits = depositsResult.success ? depositsResult.data : []
  const summary = summaryResult.success ? summaryResult.data : null

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Deposit History</h1>
            <p className="text-sm text-gray-600 mt-1">
              Track your capital deposits and benchmark allocation
            </p>
          </div>
          <RecordDepositButton />
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card variant="default">
              <CardContent className="p-4">
                <h3 className="text-sm font-medium text-gray-600 mb-1">Net Invested</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(summary.netInvested)}
                </p>
              </CardContent>
            </Card>

            <Card variant="default">
              <CardContent className="p-4">
                <h3 className="text-sm font-medium text-gray-600 mb-1">Total Deposits</h3>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(summary.totalDeposits)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{summary.depositCount} deposits</p>
              </CardContent>
            </Card>

            <Card variant="default">
              <CardContent className="p-4">
                <h3 className="text-sm font-medium text-gray-600 mb-1">Total Withdrawals</h3>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(summary.totalWithdrawals)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{summary.withdrawalCount} withdrawals</p>
              </CardContent>
            </Card>

            <Card variant="default">
              <CardContent className="p-4">
                <h3 className="text-sm font-medium text-gray-600 mb-1">SPY Shares</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {summary.totalSpyShares.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Avg: {formatCurrency(summary.avgCostBasis)}/share
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Deposits Table */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Deposit History</CardTitle>
          </CardHeader>
          <CardContent>
            {deposits.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No deposits yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by recording your first deposit
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SPY Price
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SPY Shares
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {deposits.map((deposit) => (
                      <tr key={deposit.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(deposit.depositDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              deposit.type === 'DEPOSIT'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {deposit.type}
                          </span>
                        </td>
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                            deposit.amount >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {formatCurrency(Math.abs(deposit.amount))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatCurrency(deposit.spyPrice)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {Math.abs(deposit.spyShares).toFixed(4)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {deposit.notes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
