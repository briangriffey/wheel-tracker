/**
 * CSV utility functions for exporting data
 */

/**
 * Escape a CSV field value
 * Handles quotes and commas according to RFC 4180
 */
export function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return ''
  }

  const stringValue = String(value)

  // If the value contains comma, quote, or newline, wrap it in quotes
  // and escape any existing quotes by doubling them
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  return stringValue
}

/**
 * Convert an array of rows into CSV format
 */
export function arrayToCSV(rows: (string | number | null | undefined)[][]): string {
  return rows.map(row => row.map(escapeCsvField).join(',')).join('\n')
}

/**
 * Format date for CSV export
 */
export function formatDateForCSV(date: Date | null | undefined): string {
  if (!date) return ''
  return date.toISOString().split('T')[0] // YYYY-MM-DD format
}

/**
 * Format number with 2 decimal places for CSV
 */
export function formatNumberForCSV(num: number | null | undefined): string {
  if (num === null || num === undefined) return ''
  return num.toFixed(2)
}

/**
 * Generate a filename for CSV export with timestamp
 */
export function generateExportFilename(prefix: string, extension = 'csv'): string {
  const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  return `${prefix}-${timestamp}.${extension}`
}
