'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DepositForm } from '@/components/forms/deposit-form'
import { WithdrawalForm } from '@/components/forms/withdrawal-form'
import { Button } from '@/components/design-system/button/button'
import type { CashDepositData, DepositSummary } from '@/lib/actions/deposits'

interface DepositsClientProps {
  initialDeposits: CashDepositData[]
  initialSummary: DepositSummary | null
}

export function DepositsClient({ initialDeposits, initialSummary }: DepositsClientProps) {
  const router = useRouter()
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false)

  const handleDepositSuccess = () => {
    setShowDepositModal(false)
    router.refresh()
  }

  const handleWithdrawalSuccess = () => {
    setShowWithdrawalModal(false)
    router.refresh()
  }

  const formatCurrency = (amount: number) => {
    const absAmount = Math.abs(amount)
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(absAmount)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Deposits & Withdrawals</h1>
            <p className="text-gray-600 mt-2">
              Track cash flow for accurate benchmark comparison
            </p>
          </div>
          <div className="flex-shrink-0 flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowWithdrawalModal(true)}
              className="whitespace-nowrap"
            >
              Record Withdrawal
            </Button>
            <Button
              variant="primary"
              onClick={() => setShowDepositModal(true)}
              className="whitespace-nowrap"
            >
              Record Deposit
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {initialSummary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Total Deposits</h3>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(initialSummary.totalDeposits)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {initialSummary.depositCount} deposits
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Total Withdrawals</h3>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(initialSummary.totalWithdrawals)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {initialSummary.withdrawalCount} withdrawals
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Net Invested</h3>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(initialSummary.netInvested)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Current capital
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-1">SPY Shares</h3>
              <p className="text-2xl font-bold text-purple-600">
                {initialSummary.totalSpyShares.toFixed(4)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Avg cost: {formatCurrency(initialSummary.avgCostBasis)}
              </p>
            </div>
          </div>
        )}

        {/* Deposits/Withdrawals List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Transaction History</h2>
          </div>

          {initialDeposits.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">No deposits or withdrawals recorded yet.</p>
              <p className="text-sm text-gray-400 mt-1">
                Click &ldquo;Record Deposit&rdquo; to add your first transaction.
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
                  {initialDeposits.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(item.depositDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            item.type === 'DEPOSIT'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {item.type === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'}
                        </span>
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                          item.type === 'DEPOSIT' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {item.type === 'DEPOSIT' ? '+' : '-'}
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(item.spyPrice)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {item.spyShares > 0 ? '+' : ''}
                        {item.spyShares.toFixed(4)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {item.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => setShowDepositModal(false)}
            />

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="mb-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  Record Cash Deposit
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Add a new cash deposit to your account
                </p>
              </div>
              <DepositForm
                onSuccess={handleDepositSuccess}
                onCancel={() => setShowDepositModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Modal */}
      {showWithdrawalModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => setShowWithdrawalModal(false)}
            />

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="mb-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  Record Cash Withdrawal
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Record a cash withdrawal from your account
                </p>
              </div>
              <WithdrawalForm
                onSuccess={handleWithdrawalSuccess}
                onCancel={() => setShowWithdrawalModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
