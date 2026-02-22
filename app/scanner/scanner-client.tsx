'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/design-system/button/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/design-system/input/input'
import { Badge } from '@/components/design-system/badge/badge'
import {
  addWatchlistTicker,
  removeWatchlistTicker,
  triggerManualScan,
} from '@/lib/actions/watchlist'
import type { WatchlistTickerData } from '@/lib/actions/watchlist'
import type { ScanResultData, ScanMetadata } from '@/lib/queries/scanner'

interface ScannerClientProps {
  initialWatchlist: WatchlistTickerData[]
  initialScanResults: ScanResultData[]
  initialMetadata: ScanMetadata
}

type SortField = 'compositeScore' | 'premiumYield' | 'ivRank'
type SortDirection = 'asc' | 'desc'

const WATCHLIST_SOFT_LIMIT = 50

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
  const [isScanning, setIsScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [showScanConfirm, setShowScanConfirm] = useState(false)
  const [sortField, setSortField] = useState<SortField>('compositeScore')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

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

  const handleRunScan = async () => {
    setIsScanning(true)
    setScanError(null)

    const result = await triggerManualScan()
    setIsScanning(false)

    if (result.success) {
      startTransition(() => router.refresh())
    } else {
      setScanError(result.error)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) return ''
    return sortDirection === 'desc' ? ' \u2193' : ' \u2191'
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

  const formatExpiration = (date: Date | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
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

  // Sort passed results
  const sortedResults = [...passedResults].sort((a, b) => {
    const aVal = a[sortField] ?? 0
    const bVal = b[sortField] ?? 0
    return sortDirection === 'desc' ? bVal - aVal : aVal - bVal
  })

  // Group failed results by the phase where they failed
  const phase1Failures = failedResults.filter((r) => !r.passedPhase1)
  const phase2Failures = failedResults.filter((r) => r.passedPhase1 && !r.passedPhase2)
  const phase3Failures = failedResults.filter((r) => r.passedPhase2 && !r.passedPhase3)

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Options Scanner</h1>
            <p className="text-gray-600 mt-2">
              Scan your watchlist for wheel strategy put-selling candidates
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => setShowScanConfirm(true)}
              loading={isScanning}
              disabled={isScanning || initialWatchlist.length === 0}
            >
              {isScanning ? 'Scanning...' : 'Run Scan'}
            </Button>
            {isScanning && (
              <p className="text-xs text-gray-500">
                This may take several minutes
              </p>
            )}
            {scanError && <p className="text-xs text-red-600">{scanError}</p>}
          </div>
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
              <div className="pl-2">{initialMetadata.passedPhase1} passed stock filter</div>
              <div className="pl-4">{initialMetadata.passedPhase2} passed IV screen</div>
              <div className="pl-6">{initialMetadata.passedPhase3} passed option selection</div>
            </div>
          </div>
        </div>

        {/* How does this work? */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <details>
            <summary className="px-6 py-4 cursor-pointer hover:bg-gray-50">
              <span className="text-lg font-semibold text-gray-900">
                How does this work?
              </span>
            </summary>
            <div className="px-6 py-4 border-t border-gray-200 space-y-6 text-sm text-gray-700">
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Getting Started</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Add tickers to your watchlist at the bottom of the page</li>
                  <li>The scanner runs automatically after market close each day, or you can trigger a manual scan</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-1">The 5-Phase Pipeline</h4>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>
                    <span className="font-medium">Stock Filter</span> — Price between $13–$150, avg volume above 1M, price above rising 200-day SMA
                  </li>
                  <li>
                    <span className="font-medium">IV Screen</span> — IV Rank must be at least 20 (elevated volatility = richer premiums)
                  </li>
                  <li>
                    <span className="font-medium">Option Selection</span> — Finds the best OTM put: 5–45 DTE, delta between -0.02 and -0.30, minimum 20 contracts volume, annualized yield above 8%
                  </li>
                  <li>
                    <span className="font-medium">Scoring</span> — Composite score from 5 weighted factors (see below)
                  </li>
                  <li>
                    <span className="font-medium">Portfolio Check</span> — Flags tickers where you already have an open CSP or assigned shares
                  </li>
                </ol>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Scoring Breakdown</h4>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-1.5 pr-4 font-medium text-gray-900">Factor</th>
                      <th className="py-1.5 pr-4 font-medium text-gray-900">Weight</th>
                      <th className="py-1.5 font-medium text-gray-900">What it measures</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-600">
                    <tr className="border-b border-gray-100">
                      <td className="py-1.5 pr-4">Yield</td>
                      <td className="py-1.5 pr-4">30%</td>
                      <td className="py-1.5">Annualized premium yield (8–24% range)</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-1.5 pr-4">IV Rank</td>
                      <td className="py-1.5 pr-4">25%</td>
                      <td className="py-1.5">Where current IV sits in its 52-week range (20–70)</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-1.5 pr-4">Delta</td>
                      <td className="py-1.5 pr-4">15%</td>
                      <td className="py-1.5">Proximity to the sweet spot (-0.22 to -0.25)</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-1.5 pr-4">Liquidity</td>
                      <td className="py-1.5 pr-4">15%</td>
                      <td className="py-1.5">Open interest relative to 500 preferred</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 pr-4">Trend</td>
                      <td className="py-1.5 pr-4">15%</td>
                      <td className="py-1.5">How far price is above the 200-day SMA</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Reading the Results</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Candidates are sorted by composite score by default</li>
                  <li>Click any row to expand detailed scores and contract info</li>
                  <li>Tickers that don&apos;t pass are grouped under &quot;Filtered Tickers&quot; with the reason</li>
                </ul>
              </div>
            </div>
          </details>
        </div>

        {/* Results Table */}
        {sortedResults.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Candidates ({sortedResults.length})
              </h2>
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
                      Exp
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      DTE
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Delta
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bid
                    </th>
                    <th
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort('ivRank')}
                    >
                      IV Rank{sortIndicator('ivRank')}
                    </th>
                    <th
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort('premiumYield')}
                    >
                      Yield%{sortIndicator('premiumYield')}
                    </th>
                    <th
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort('compositeScore')}
                    >
                      Score{sortIndicator('compositeScore')}
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Flags
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedResults.map((result) => {
                    const scoreColor =
                      (result.compositeScore ?? 0) > 70
                        ? 'text-green-600'
                        : (result.compositeScore ?? 0) > 40
                          ? 'text-yellow-600'
                          : 'text-gray-600'

                    const isExpanded = expandedTicker === result.id

                    return (
                      <TickerRow
                        key={result.id}
                        result={result}
                        scoreColor={scoreColor}
                        isExpanded={isExpanded}
                        onToggle={() =>
                          setExpandedTicker(isExpanded ? null : result.id)
                        }
                        formatCurrency={formatCurrency}
                        formatPercent={formatPercent}
                        formatExpiration={formatExpiration}
                      />
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
              Add tickers to your watchlist below, then click &quot;Run Scan&quot; or wait for
              the nightly scan.
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
              {initialWatchlist.length} / {WATCHLIST_SOFT_LIMIT} tickers
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
        {/* Scan Confirmation Dialog */}
        <Dialog
          isOpen={showScanConfirm}
          onClose={() => setShowScanConfirm(false)}
          title="Run Manual Scan?"
          maxWidth="md"
        >
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              The scanner runs <span className="font-medium text-gray-900">automatically every day after market close</span> (around 5:00 PM ET).
            </p>
            <p>
              Results will be populated overnight — no need to manually trigger unless you want fresh results right now.
            </p>
            <p>
              A manual scan may take <span className="font-medium text-gray-900">several minutes</span> depending on watchlist size.
            </p>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setShowScanConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setShowScanConfirm(false)
                handleRunScan()
              }}
            >
              Run Scan Now
            </Button>
          </div>
        </Dialog>
      </div>
    </div>
  )
}

function TickerRow({
  result,
  scoreColor,
  isExpanded,
  onToggle,
  formatCurrency,
  formatPercent,
  formatExpiration,
}: {
  result: ScanResultData
  scoreColor: string
  isExpanded: boolean
  onToggle: () => void
  formatCurrency: (v: number | null) => string
  formatPercent: (v: number | null) => string
  formatExpiration: (v: Date | null) => string
}) {
  return (
    <>
      <tr className="hover:bg-gray-50 cursor-pointer" onClick={onToggle}>
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
          {formatExpiration(result.expiration)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
          {result.dte ?? '-'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
          {result.delta !== null ? result.delta.toFixed(4) : '-'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
          {result.bid !== null ? formatCurrency(result.bid) : '-'}
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
      {isExpanded && (
        <tr>
          <td colSpan={11} className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Component Scores */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Component Scores</h4>
                <div className="space-y-1.5">
                  <ScoreBar label="Yield (30%)" score={result.yieldScore} />
                  <ScoreBar label="IV Rank (25%)" score={result.ivScore} />
                  <ScoreBar label="Delta (15%)" score={result.deltaScore} />
                  <ScoreBar label="Liquidity (15%)" score={result.liquidityScore} />
                  <ScoreBar label="Trend (15%)" score={result.trendScore} />
                  <div className="pt-1 border-t border-gray-200">
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-gray-700">Composite</span>
                      <span className="font-bold">{result.compositeScore?.toFixed(1) ?? '-'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stock Data */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Stock Data</h4>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Price</dt>
                    <dd className="text-gray-900">{formatCurrency(result.stockPrice)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">200-day SMA</dt>
                    <dd className="text-gray-900">{formatCurrency(result.sma200)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">50-day SMA</dt>
                    <dd className="text-gray-900">{formatCurrency(result.sma50)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Trend</dt>
                    <dd className="text-gray-900 capitalize">{result.trendDirection ?? '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">IV Rank</dt>
                    <dd className="text-gray-900">{formatPercent(result.ivRank)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Current IV</dt>
                    <dd className="text-gray-900">
                      {result.currentIV !== null ? (result.currentIV * 100).toFixed(1) + '%' : '-'}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Contract Details */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Contract Details</h4>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Contract</dt>
                    <dd className="text-gray-900 font-mono text-xs">
                      {result.contractName ?? '-'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Strike</dt>
                    <dd className="text-gray-900">{formatCurrency(result.strike)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">DTE</dt>
                    <dd className="text-gray-900">{result.dte ?? '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Open Interest</dt>
                    <dd className="text-gray-900">
                      {result.openInterest?.toLocaleString() ?? '-'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Option Volume</dt>
                    <dd className="text-gray-900">
                      {result.optionVolume?.toLocaleString() ?? '-'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Theta</dt>
                    <dd className="text-gray-900">
                      {result.theta !== null ? result.theta.toFixed(4) : '-'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Portfolio Flag */}
            {result.portfolioFlag && (
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                {result.portfolioFlag}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

function ScoreBar({ label, score }: { label: string; score: number | null }) {
  const value = score ?? 0
  const barColor =
    value > 70 ? 'bg-green-500' : value > 40 ? 'bg-yellow-500' : 'bg-gray-400'

  return (
    <div>
      <div className="flex justify-between text-xs text-gray-600 mb-0.5">
        <span>{label}</span>
        <span>{score?.toFixed(1) ?? '-'}</span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  )
}
