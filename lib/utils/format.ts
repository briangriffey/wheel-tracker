/**
 * Formatting utility functions
 */

/**
 * Format currency value
 * @param value Numeric value
 * @returns Formatted currency string
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Format percentage value
 * @param value Numeric percentage
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

/**
 * Format a date as a relative time string (e.g., "just now", "5m ago", "2h ago", "1d ago")
 */
export function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - new Date(date).getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

/**
 * Format a future date as a relative countdown (e.g., "in 30m", "in 2h", "at market open")
 */
export function formatNextRefreshTime(date: Date | null): string {
  if (!date) return 'at market open'

  const now = new Date()
  const diffMs = new Date(date).getTime() - now.getTime()

  if (diffMs <= 0) return 'now'

  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

  if (diffMinutes < 60) return `in ${diffMinutes}m`
  if (diffHours < 24) {
    const remainingMinutes = diffMinutes % 60
    if (remainingMinutes > 0) return `in ${diffHours}h ${remainingMinutes}m`
    return `in ${diffHours}h`
  }

  return 'at market open'
}
