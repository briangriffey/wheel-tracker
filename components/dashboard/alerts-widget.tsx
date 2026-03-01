import React from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/design-system'
import type {
  ExpirationNotification,
  ITMNotification,
  PositionWithoutCallNotification,
} from '@/lib/actions/notifications'
import { formatCurrency } from '@/lib/utils/format'

interface AlertsWidgetProps {
  upcomingExpirations: ExpirationNotification[]
  itmOptions: ITMNotification[]
  positionsWithoutCalls: PositionWithoutCallNotification[]
}

/**
 * Bell icon for alerts
 */
function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

/**
 * Clock icon for expiring options
 */
function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

/**
 * TrendingUp icon for ITM options
 */
function TrendingUpIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

/**
 * FileText icon for positions without calls
 */
function FileTextIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

/**
 * Alerts Widget Component
 *
 * Displays important notifications and alerts on the dashboard:
 * - Options expiring soon
 * - In-the-money (ITM) options
 * - Positions without covered calls
 *
 * @example
 * ```tsx
 * <AlertsWidget
 *   upcomingExpirations={expirations}
 *   itmOptions={itmOptions}
 *   positionsWithoutCalls={positions}
 * />
 * ```
 */
export function AlertsWidget({
  upcomingExpirations,
  itmOptions,
  positionsWithoutCalls,
}: AlertsWidgetProps) {
  const totalAlerts = upcomingExpirations.length + itmOptions.length + positionsWithoutCalls.length

  // If no alerts, show empty state
  if (totalAlerts === 0) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BellIcon className="h-5 w-5 text-gray-500" />
              <CardTitle className="text-xl">Alerts</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <BellIcon className="h-12 w-12 mx-auto" />
            </div>
            <p className="text-gray-500 text-sm">No alerts at this time</p>
            <p className="text-gray-400 text-xs mt-1">You&apos;re all caught up!</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellIcon className="h-5 w-5 text-gray-700" />
            <CardTitle className="text-xl">Alerts</CardTitle>
          </div>
          <Badge variant="info">{totalAlerts}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Upcoming Expirations */}
          {upcomingExpirations.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ClockIcon className="h-4 w-4 text-yellow-600" />
                <h4 className="text-sm font-semibold text-gray-700">
                  Expiring Soon ({upcomingExpirations.length})
                </h4>
              </div>
              <div className="space-y-2">
                {upcomingExpirations.slice(0, 3).map((exp) => (
                  <Link
                    key={exp.id}
                    href={`/trades/${exp.id}`}
                    className="block p-3 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{exp.ticker}</span>
                          <Badge variant="warning" size="sm">
                            {exp.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Strike: {formatCurrency(exp.strikePrice)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Expires:{' '}
                          {new Date(exp.expirationDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            timeZone: 'UTC',
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-yellow-700">
                          {exp.daysUntilExpiration}d
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
                {upcomingExpirations.length > 3 && (
                  <Link
                    href="/trades?filter=expiring"
                    className="block text-center text-sm text-yellow-700 hover:text-yellow-800 py-2"
                  >
                    View {upcomingExpirations.length - 3} more
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* In-The-Money Options */}
          {itmOptions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUpIcon className="h-4 w-4 text-blue-600" />
                <h4 className="text-sm font-semibold text-gray-700">
                  In-The-Money ({itmOptions.length})
                </h4>
              </div>
              <div className="space-y-2">
                {itmOptions.slice(0, 3).map((itm) => (
                  <Link
                    key={itm.id}
                    href={`/trades/${itm.id}`}
                    className="block p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{itm.ticker}</span>
                          <Badge variant="info" size="sm">
                            {itm.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Strike: {formatCurrency(itm.strikePrice)} | Current:{' '}
                          {formatCurrency(itm.currentPrice)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Intrinsic Value: {formatCurrency(itm.intrinsicValue)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
                {itmOptions.length > 3 && (
                  <Link
                    href="/trades?filter=itm"
                    className="block text-center text-sm text-blue-700 hover:text-blue-800 py-2"
                  >
                    View {itmOptions.length - 3} more
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Positions Without Calls */}
          {positionsWithoutCalls.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileTextIcon className="h-4 w-4 text-green-600" />
                <h4 className="text-sm font-semibold text-gray-700">
                  Available for Covered Calls ({positionsWithoutCalls.length})
                </h4>
              </div>
              <div className="space-y-2">
                {positionsWithoutCalls.slice(0, 3).map((pos) => (
                  <Link
                    key={pos.id}
                    href={`/positions/${pos.id}`}
                    className="block p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-semibold text-gray-900">{pos.ticker}</span>
                        <p className="text-sm text-gray-600 mt-1">
                          {pos.shares} shares @ {formatCurrency(pos.costBasis)}
                        </p>
                        {pos.currentValue && (
                          <p className="text-xs text-gray-500 mt-1">
                            Current Value: {formatCurrency(pos.currentValue)}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
                {positionsWithoutCalls.length > 3 && (
                  <Link
                    href="/positions?filter=no-calls"
                    className="block text-center text-sm text-green-700 hover:text-green-800 py-2"
                  >
                    View {positionsWithoutCalls.length - 3} more
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
