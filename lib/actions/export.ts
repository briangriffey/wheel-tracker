'use server'

import { prisma } from '@/lib/db'

/**
 * Get the current user ID
 */
async function getCurrentUserId(): Promise<string> {
  const user = await prisma.user.findFirst()
  if (!user) {
    throw new Error('No user found. Please create a user first.')
  }
  return user.id
}

/**
 * Export trades to CSV format
 */
export async function exportTradesToCSV(tradeIds: string[]): Promise<string> {
  try {
    const userId = await getCurrentUserId()

    // Fetch trades
    const trades = await prisma.trade.findMany({
      where: {
        id: { in: tradeIds },
        userId,
      },
      orderBy: {
        expirationDate: 'asc',
      },
    })

    if (trades.length === 0) {
      throw new Error('No trades found')
    }

    // CSV Header
    const headers = [
      'Ticker',
      'Type',
      'Action',
      'Status',
      'Strike Price',
      'Premium',
      'Contracts',
      'Shares',
      'Expiration Date',
      'Open Date',
      'Close Date',
      'Tags',
      'Outcome',
      'Notes',
    ]

    // CSV Rows
    const rows = trades.map((trade) => [
      trade.ticker,
      trade.type,
      trade.action,
      trade.status,
      trade.strikePrice.toString(),
      trade.premium.toString(),
      trade.contracts.toString(),
      trade.shares.toString(),
      trade.expirationDate.toISOString().split('T')[0],
      trade.openDate.toISOString().split('T')[0],
      trade.closeDate ? trade.closeDate.toISOString().split('T')[0] : '',
      trade.tags.join('; '),
      trade.outcome || '',
      trade.notes ? `"${trade.notes.replace(/"/g, '""')}"` : '', // Escape quotes in notes
    ])

    // Combine header and rows
    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')

    return csv
  } catch (error) {
    console.error('Error exporting trades to CSV:', error)
    throw error
  }
}
