'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/design-system/button/button'
import { Input } from '@/components/design-system/input/input'
import { Badge } from '@/components/design-system/badge/badge'
import { addWatchlistTicker, removeWatchlistTicker } from '@/lib/actions/watchlist'
import type { WatchlistTickerData } from '@/lib/actions/watchlist'
import type { ScanResultData, ScanMetadata } from '@/lib/queries/scanner'

interface ScannerClientProps {
  initialWatchlist: WatchlistTickerData[]
  initialScanResults: ScanResultData[]
  initialMetadata: ScanMetadata
}

export function ScannerClient({
  initialWatchlist,
  initialScanResults,
  initialMetadata,
}: ScannerClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [tickerInput, setTickerInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null)

  const handleAddTicker = async () => {
    if (!tickerInput.trim()) return
    setError(null)

    const result = await addWatchlistTicker({ ticker: tickerInput.trim() })
    if (result.success) {
      setTickerInput('')
      startTransition(() => router.refresh())
    } else {
      setError(result.error)
    }
  }

  const handleRemoveTicker = async (id: string) => {
    const result = await removeWatchlistTicker({ id })
    if (result.success) {
      startTransition(() => router.refresh())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTicker()
    }
  }

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  const formatPercent = (value: number | null) => {
    if (value === null) return '-'
    return `${value.toFixed(1)}%`
  }

  const passedResults = initialScanResults.filter((r) => r.passed)
  const failedResults = initialScanResults.filter((r) => !r.passed)

  // Group failed results by the phase where they failed
  const phase1Failures = failedResults.filter((r) => !r.passedPhase1)
  const phase2Failures = failedResults.filter((r) => r.passedPhase1 && !r.passedPhase2)
  const phase3Failures = failedResults.filter((r) => r.passedPhase2 && !r.passedPhase3)

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Options Scanner</h1>
          <p className="text-gray-600 mt-2">
            Scan your watchlist for wheel strategy put-selling candidates
          </p>
        </div>

        {/* Scan Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Last Scan</h3>
            <p className="text-lg font-semibold text-gray-900">
              {formatDate(initialMetadata.lastScanDate)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Tickers Scanned</h3>
            <p className="text-2xl font-bold text-gray-900">{initialMetadata.totalScanned}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Candidates Found</h3>
            <p className="text-2xl font-bold text-green-600">{initialMetadata.totalPassed}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Funnel</h3>
            <div className="text-sm text-gray-600 space-y-0.5">
              <div>{initialMetadata.totalScanned} scanned</div>
              <div>{initialMetadata.passedPhase1} passed stock filter</div>
              <div>{initialMetadata.passedPhase2} passed IV screen</div>
              <div>{initialMetadata.passedPhase3} passed option selection</div>
            </div>
          </div>
        </div>

        {/* Results Table */}
        {passedResults.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Candidates</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ticker
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Strike
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      DTE
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Delta
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bid/Ask
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IV Rank
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Yield%
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Flags
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {passedResults.map((result) => {
                    const scoreColor =
                      (result.compositeScore ?? 0) > 70
                        ? 'text-green-600'
                        : (result.compositeScore ?? 0) > 40
                          ? 'text-yellow-600'
                          : 'text-gray-600'

                    return (
                      <tr
                        key={result.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() =>
                          setExpandedTicker(expandedTicker === result.id ? null : result.id)
                        }
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {result.ticker}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatCurrency(result.stockPrice)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatCurrency(result.strike)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {result.dte ?? '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {result.delta !== null ? result.delta.toFixed(4) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {result.bid !== null && result.ask !== null
                            ? `${formatCurrency(result.bid)} / ${formatCurrency(result.ask)}`
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatPercent(result.ivRank)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatPercent(result.premiumYield)}
                        </td>
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${scoreColor}`}
                        >
                          {result.compositeScore?.toFixed(1) ?? '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {result.hasOpenCSP && (
                            <Badge variant="warning" size="sm">
                              CSP
                            </Badge>
                          )}
                          {result.hasAssignedPos && (
                            <Badge variant="info" size="sm">
                              Shares
                            </Badge>
                          )}
                          {!result.hasOpenCSP && !result.hasAssignedPos && (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty state for results */}
        {initialMetadata.totalScanned === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center mb-6">
            <p className="text-gray-500 text-lg">No scan results yet.</p>
            <p className="text-sm text-gray-400 mt-1">
              Add tickers to your watchlist below. Results will appear after the next nightly scan.
            </p>
          </div>
        )}

        {/* Filtered tickers section */}
        {failedResults.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            <details>
              <summary className="px-6 py-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50">
                <span className="text-lg font-semibold text-gray-900">
                  Filtered Tickers ({failedResults.length})
                </span>
              </summary>
              <div className="px-6 py-4 space-y-4">
                {phase1Failures.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Phase 1: Stock Filter ({phase1Failures.length})
                    </h4>
                    <div className="space-y-1">
                      {phase1Failures.map((r) => (
                        <div key={r.id} className="text-sm text-gray-600">
                          <span className="font-medium">{r.ticker}</span>: {r.phase1Reason}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {phase2Failures.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Phase 2: IV Screen ({phase2Failures.length})
                    </h4>
                    <div className="space-y-1">
                      {phase2Failures.map((r) => (
                        <div key={r.id} className="text-sm text-gray-600">
                          <span className="font-medium">{r.ticker}</span>: {r.phase2Reason}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {phase3Failures.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Phase 3: Option Selection ({phase3Failures.length})
                    </h4>
                    <div className="space-y-1">
                      {phase3Failures.map((r) => (
                        <div key={r.id} className="text-sm text-gray-600">
                          <span className="font-medium">{r.ticker}</span>: {r.phase3Reason}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </details>
          </div>
        )}

        {/* Watchlist Management */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Watchlist</h2>
            <p className="text-sm text-gray-500 mt-1">
              {initialWatchlist.length} ticker{initialWatchlist.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="px-6 py-4">
            {/* Add ticker input */}
            <div className="flex gap-3 mb-4">
              <div className="flex-1 max-w-xs">
                <Input
                  placeholder="Enter ticker (e.g. AAPL)"
                  value={tickerInput}
                  onChange={(e) => {
                    setTickerInput(e.target.value)
                    setError(null)
                  }}
                  onKeyDown={handleKeyDown}
                  state={error ? 'error' : 'default'}
                  error={error ?? undefined}
                />
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={handleAddTicker}
                loading={isPending}
                disabled={!tickerInput.trim()}
              >
                Add
              </Button>
            </div>

            {/* Watchlist tickers */}
            {initialWatchlist.length === 0 ? (
              <p className="text-gray-500 text-sm py-4">
                No tickers in your watchlist. Add some above to start scanning.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {initialWatchlist.map((item) => (
                  <Badge
                    key={item.id}
                    variant="default"
                    size="md"
                    removable
                    onRemove={() => handleRemoveTicker(item.id)}
                  >
                    {item.ticker}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
