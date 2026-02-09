'use server'

import { prisma } from '@/lib/db'

/**
 * Server action result type
 */
type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown }

/**
 * Get the current user ID
 * TODO: Replace with actual session-based authentication
 */
async function getCurrentUserId(): Promise<string> {
  const user = await prisma.user.findFirst()
  if (!user) {
    throw new Error('No user found. Please create a user first.')
  }
  return user.id
}

/**
 * CSV row type for wheel export
 */
interface WheelExportRow {
  wheelId: string
  ticker: string
  wheelStatus: string
  cycleCount: number
  totalPremiums: number
  totalRealizedPL: number
  wheelStartedAt: string
  tradeId: string
  tradeType: string
  tradeAction: string
  tradeStatus: string
  tradeStrikePrice: number
  tradePremium: number
  tradeContracts: number
  tradeShares: number
  tradeOpenDate: string
  tradeExpirationDate: string
  tradeCloseDate: string
  positionId: string
  positionShares: number
  positionCostBasis: number
  positionTotalCost: number
  positionStatus: string
  positionRealizedGainLoss: number | null
  positionAcquiredDate: string
  positionClosedDate: string
}

/**
 * Format date for CSV (YYYY-MM-DD format)
 */
function formatDateForCSV(date: Date | null | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  return d.toISOString().split('T')[0]
}

/**
 * Format number for CSV (2 decimal places)
 */
function formatNumberForCSV(num: number | null | undefined): string {
  if (num === null || num === undefined) return ''
  return num.toFixed(2)
}

/**
 * Escape CSV field (handle quotes and commas)
 */
function escapeCSVField(field: string | number | null | undefined): string {
  if (field === null || field === undefined) return ''
  const str = String(field)
  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Convert rows to CSV string
 */
function convertToCSV(rows: WheelExportRow[]): string {
  if (rows.length === 0) {
    return 'No data available'
  }

  // Define CSV headers
  const headers = [
    'Wheel ID',
    'Ticker',
    'Wheel Status',
    'Cycle Count',
    'Total Premiums',
    'Total Realized P/L',
    'Wheel Started',
    'Trade ID',
    'Trade Type',
    'Trade Action',
    'Trade Status',
    'Strike Price',
    'Premium',
    'Contracts',
    'Shares',
    'Trade Open Date',
    'Trade Expiration Date',
    'Trade Close Date',
    'Position ID',
    'Position Shares',
    'Position Cost Basis',
    'Position Total Cost',
    'Position Status',
    'Position Realized Gain/Loss',
    'Position Acquired Date',
    'Position Closed Date',
  ]

  // Create CSV header row
  const headerRow = headers.map(escapeCSVField).join(',')

  // Create CSV data rows
  const dataRows = rows.map((row) => {
    const fields = [
      row.wheelId,
      row.ticker,
      row.wheelStatus,
      row.cycleCount,
      formatNumberForCSV(row.totalPremiums),
      formatNumberForCSV(row.totalRealizedPL),
      row.wheelStartedAt,
      row.tradeId,
      row.tradeType,
      row.tradeAction,
      row.tradeStatus,
      formatNumberForCSV(row.tradeStrikePrice),
      formatNumberForCSV(row.tradePremium),
      row.tradeContracts,
      row.tradeShares,
      row.tradeOpenDate,
      row.tradeExpirationDate,
      row.tradeCloseDate,
      row.positionId,
      row.positionShares,
      formatNumberForCSV(row.positionCostBasis),
      formatNumberForCSV(row.positionTotalCost),
      row.positionStatus,
      formatNumberForCSV(row.positionRealizedGainLoss),
      row.positionAcquiredDate,
      row.positionClosedDate,
    ]
    return fields.map(escapeCSVField).join(',')
  })

  return [headerRow, ...dataRows].join('\n')
}

/**
 * Export wheel data to CSV
 *
 * Exports comprehensive wheel data including:
 * - All trades (date, type, action, strike, premium, status)
 * - All positions (acquired date, cost basis, realized P/L)
 * - Wheel summary statistics
 *
 * Format is suitable for tax reporting and record keeping.
 *
 * @param wheelId - Optional wheel ID to export specific wheel, or undefined for all wheels
 * @returns Promise resolving to CSV string
 *
 * @example
 * const result = await exportWheelData('wheel_123');
 * if (result.success) {
 *   // Download CSV file with result.data
 * }
 */
export async function exportWheelData(
  wheelId?: string
): Promise<ActionResult<string>> {
  try {
    const userId = await getCurrentUserId()

    // Build where clause for wheels
    const wheelWhere: { userId: string; id?: string } = { userId }
    if (wheelId) {
      wheelWhere.id = wheelId
    }

    // Fetch wheels with all related data
    const wheels = await prisma.wheel.findMany({
      where: wheelWhere,
      include: {
        trades: {
          orderBy: { openDate: 'asc' },
        },
        positions: {
          orderBy: { acquiredDate: 'asc' },
        },
      },
      orderBy: { startedAt: 'asc' },
    })

    if (wheels.length === 0) {
      return { success: false, error: 'No wheels found to export' }
    }

    // Build CSV rows
    const rows: WheelExportRow[] = []

    for (const wheel of wheels) {
      // If wheel has both trades and positions, create rows for each combination
      // This creates a denormalized view suitable for spreadsheet analysis

      if (wheel.trades.length > 0 && wheel.positions.length > 0) {
        // Create rows for each trade-position combination
        for (const trade of wheel.trades) {
          for (const position of wheel.positions) {
            rows.push({
              wheelId: wheel.id,
              ticker: wheel.ticker,
              wheelStatus: wheel.status,
              cycleCount: wheel.cycleCount,
              totalPremiums: Number(wheel.totalPremiums),
              totalRealizedPL: Number(wheel.totalRealizedPL),
              wheelStartedAt: formatDateForCSV(wheel.startedAt),
              tradeId: trade.id,
              tradeType: trade.type,
              tradeAction: trade.action,
              tradeStatus: trade.status,
              tradeStrikePrice: Number(trade.strikePrice),
              tradePremium: Number(trade.premium),
              tradeContracts: trade.contracts,
              tradeShares: trade.shares,
              tradeOpenDate: formatDateForCSV(trade.openDate),
              tradeExpirationDate: formatDateForCSV(trade.expirationDate),
              tradeCloseDate: formatDateForCSV(trade.closeDate),
              positionId: position.id,
              positionShares: position.shares,
              positionCostBasis: Number(position.costBasis),
              positionTotalCost: Number(position.totalCost),
              positionStatus: position.status,
              positionRealizedGainLoss: position.realizedGainLoss
                ? Number(position.realizedGainLoss)
                : null,
              positionAcquiredDate: formatDateForCSV(position.acquiredDate),
              positionClosedDate: formatDateForCSV(position.closedDate),
            })
          }
        }
      } else if (wheel.trades.length > 0) {
        // Create rows for trades without positions
        for (const trade of wheel.trades) {
          rows.push({
            wheelId: wheel.id,
            ticker: wheel.ticker,
            wheelStatus: wheel.status,
            cycleCount: wheel.cycleCount,
            totalPremiums: Number(wheel.totalPremiums),
            totalRealizedPL: Number(wheel.totalRealizedPL),
            wheelStartedAt: formatDateForCSV(wheel.startedAt),
            tradeId: trade.id,
            tradeType: trade.type,
            tradeAction: trade.action,
            tradeStatus: trade.status,
            tradeStrikePrice: Number(trade.strikePrice),
            tradePremium: Number(trade.premium),
            tradeContracts: trade.contracts,
            tradeShares: trade.shares,
            tradeOpenDate: formatDateForCSV(trade.openDate),
            tradeExpirationDate: formatDateForCSV(trade.expirationDate),
            tradeCloseDate: formatDateForCSV(trade.closeDate),
            positionId: '',
            positionShares: 0,
            positionCostBasis: 0,
            positionTotalCost: 0,
            positionStatus: '',
            positionRealizedGainLoss: null,
            positionAcquiredDate: '',
            positionClosedDate: '',
          })
        }
      } else if (wheel.positions.length > 0) {
        // Create rows for positions without trades
        for (const position of wheel.positions) {
          rows.push({
            wheelId: wheel.id,
            ticker: wheel.ticker,
            wheelStatus: wheel.status,
            cycleCount: wheel.cycleCount,
            totalPremiums: Number(wheel.totalPremiums),
            totalRealizedPL: Number(wheel.totalRealizedPL),
            wheelStartedAt: formatDateForCSV(wheel.startedAt),
            tradeId: '',
            tradeType: '',
            tradeAction: '',
            tradeStatus: '',
            tradeStrikePrice: 0,
            tradePremium: 0,
            tradeContracts: 0,
            tradeShares: 0,
            tradeOpenDate: '',
            tradeExpirationDate: '',
            tradeCloseDate: '',
            positionId: position.id,
            positionShares: position.shares,
            positionCostBasis: Number(position.costBasis),
            positionTotalCost: Number(position.totalCost),
            positionStatus: position.status,
            positionRealizedGainLoss: position.realizedGainLoss
              ? Number(position.realizedGainLoss)
              : null,
            positionAcquiredDate: formatDateForCSV(position.acquiredDate),
            positionClosedDate: formatDateForCSV(position.closedDate),
          })
        }
      } else {
        // Wheel with no trades or positions
        rows.push({
          wheelId: wheel.id,
          ticker: wheel.ticker,
          wheelStatus: wheel.status,
          cycleCount: wheel.cycleCount,
          totalPremiums: Number(wheel.totalPremiums),
          totalRealizedPL: Number(wheel.totalRealizedPL),
          wheelStartedAt: formatDateForCSV(wheel.startedAt),
          tradeId: '',
          tradeType: '',
          tradeAction: '',
          tradeStatus: '',
          tradeStrikePrice: 0,
          tradePremium: 0,
          tradeContracts: 0,
          tradeShares: 0,
          tradeOpenDate: '',
          tradeExpirationDate: '',
          tradeCloseDate: '',
          positionId: '',
          positionShares: 0,
          positionCostBasis: 0,
          positionTotalCost: 0,
          positionStatus: '',
          positionRealizedGainLoss: null,
          positionAcquiredDate: '',
          positionClosedDate: '',
        })
      }
    }

    // Convert to CSV
    const csv = convertToCSV(rows)

    return { success: true, data: csv }
  } catch (error) {
    console.error('Error exporting wheel data:', error)

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to export wheel data' }
  }
}
