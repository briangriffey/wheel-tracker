import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  arrayToCSV,
  formatDateForCSV,
  formatNumberForCSV,
  generateExportFilename,
} from '@/lib/utils/csv'

/**
 * GET /api/export/pl
 * Export P&L report as CSV file
 *
 * Query Parameters:
 * - startDate: ISO date string (optional) - filter trades opened on or after this date
 * - endDate: ISO date string (optional) - filter trades opened on or before this date
 *
 * Response:
 * - CSV file with trade data and P&L summary
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate the user
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // 2. Parse query parameters for date range filtering
    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    const whereClause: {
      userId: string
      openDate?: { gte?: Date; lte?: Date }
    } = { userId }

    if (startDateParam || endDateParam) {
      whereClause.openDate = {}
      if (startDateParam) {
        whereClause.openDate.gte = new Date(startDateParam)
      }
      if (endDateParam) {
        whereClause.openDate.lte = new Date(endDateParam)
      }
    }

    // 3. Fetch trades with related data
    const trades = await prisma.trade.findMany({
      where: whereClause,
      include: {
        createdPosition: {
          select: {
            realizedGainLoss: true,
            closedDate: true,
          },
        },
        position: {
          select: {
            realizedGainLoss: true,
            closedDate: true,
          },
        },
      },
      orderBy: {
        openDate: 'asc',
      },
    })

    // 4. Format data for CSV
    const csvRows: (string | number)[][] = []

    // Add header row
    csvRows.push([
      'Date Opened',
      'Date Closed',
      'Ticker',
      'Type',
      'Strike',
      'Premium',
      'Quantity',
      'Status',
      'Realized P&L',
      'Notes',
    ])

    // Add data rows
    let totalPremium = 0
    let totalRealizedPL = 0
    let closedTradesCount = 0

    for (const trade of trades) {
      const premium = Number(trade.premium)
      totalPremium += premium

      // Calculate realized P&L based on trade type
      let realizedPL = 0
      let closedDate: Date | null = null

      if (trade.status === 'CLOSED' || trade.status === 'EXPIRED') {
        // For closed/expired options, the premium is the realized P&L
        realizedPL = premium
        closedDate = trade.closeDate
        closedTradesCount++
      } else if (trade.status === 'ASSIGNED') {
        // For assigned trades, get P&L from the position
        if (trade.createdPosition?.realizedGainLoss) {
          // This PUT was assigned and created a position
          realizedPL = Number(trade.createdPosition.realizedGainLoss) + premium
          closedDate = trade.createdPosition.closedDate
          if (closedDate) closedTradesCount++
        } else if (trade.position?.realizedGainLoss) {
          // This CALL was assigned against a position
          realizedPL = Number(trade.position.realizedGainLoss) + premium
          closedDate = trade.position.closedDate
          if (closedDate) closedTradesCount++
        }
      }

      if (closedDate) {
        totalRealizedPL += realizedPL
      }

      csvRows.push([
        formatDateForCSV(trade.openDate),
        formatDateForCSV(closedDate),
        trade.ticker,
        trade.type,
        formatNumberForCSV(Number(trade.strikePrice)),
        formatNumberForCSV(premium),
        trade.contracts,
        trade.status,
        closedDate ? formatNumberForCSV(realizedPL) : '',
        trade.notes || '',
      ])
    }

    // 5. Add summary section
    csvRows.push([]) // Empty row
    csvRows.push(['Summary'])
    csvRows.push(['Total Trades', trades.length])
    csvRows.push(['Closed Trades', closedTradesCount])
    csvRows.push(['Open Trades', trades.length - closedTradesCount])
    csvRows.push(['Total Premium Collected', formatNumberForCSV(totalPremium)])
    csvRows.push(['Total Realized P&L', formatNumberForCSV(totalRealizedPL)])

    if (totalPremium > 0) {
      const avgPremiumPerTrade = totalPremium / trades.length
      csvRows.push(['Average Premium per Trade', formatNumberForCSV(avgPremiumPerTrade)])
    }

    // Add date range to summary if filtering was applied
    if (startDateParam || endDateParam) {
      csvRows.push([]) // Empty row
      csvRows.push(['Date Range'])
      if (startDateParam) {
        csvRows.push(['Start Date', formatDateForCSV(new Date(startDateParam))])
      }
      if (endDateParam) {
        csvRows.push(['End Date', formatDateForCSV(new Date(endDateParam))])
      }
    }

    // 6. Convert to CSV string
    const csvContent = arrayToCSV(csvRows)

    // 7. Generate filename
    const filename = generateExportFilename('pl-report')

    // 8. Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error generating CSV export:', error)

    const message = error instanceof Error ? error.message : 'Unknown error occurred'

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate CSV export',
        details: message,
      },
      { status: 500 }
    )
  }
}
