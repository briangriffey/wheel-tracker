import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getCashDeposits } from '@/lib/actions/deposits'
import {
  arrayToCSV,
  formatDateForCSV,
  formatNumberForCSV,
  generateExportFilename,
} from '@/lib/utils/csv'

/**
 * GET /api/export/deposits
 * Export deposits history as CSV file
 *
 * Response:
 * - CSV file with deposit/withdrawal data and summary
 */
export async function GET() {
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

    // 2. Fetch all deposits
    const result = await getCashDeposits()

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to fetch deposits',
        },
        { status: 500 }
      )
    }

    const deposits = result.data

    // 3. Format data for CSV
    const csvRows: (string | number)[][] = []

    // Add header row
    csvRows.push(['Date', 'Type', 'Amount', 'SPY Price', 'SPY Shares', 'Notes'])

    // Add data rows
    let totalDeposits = 0
    let totalWithdrawals = 0
    let depositCount = 0
    let withdrawalCount = 0
    let totalSpyShares = 0

    for (const deposit of deposits) {
      const amount = Math.abs(deposit.amount)
      const shares = Math.abs(deposit.spyShares)

      if (deposit.type === 'DEPOSIT') {
        totalDeposits += amount
        depositCount++
      } else {
        totalWithdrawals += amount
        withdrawalCount++
      }

      totalSpyShares += deposit.spyShares

      csvRows.push([
        formatDateForCSV(deposit.depositDate),
        deposit.type,
        formatNumberForCSV(amount),
        formatNumberForCSV(deposit.spyPrice),
        formatNumberForCSV(shares),
        deposit.notes || '',
      ])
    }

    // 4. Add summary section
    const netInvested = totalDeposits - totalWithdrawals
    const avgCostBasis = totalSpyShares !== 0 ? netInvested / totalSpyShares : 0

    csvRows.push([]) // Empty row
    csvRows.push(['Summary'])
    csvRows.push(['Total Deposits', formatNumberForCSV(totalDeposits)])
    csvRows.push(['Deposit Count', depositCount])
    csvRows.push(['Total Withdrawals', formatNumberForCSV(totalWithdrawals)])
    csvRows.push(['Withdrawal Count', withdrawalCount])
    csvRows.push(['Net Invested', formatNumberForCSV(netInvested)])
    csvRows.push(['Total SPY Shares', formatNumberForCSV(totalSpyShares)])
    csvRows.push(['Average SPY Cost Basis', formatNumberForCSV(avgCostBasis)])
    csvRows.push(['Total Transactions', deposits.length])

    if (deposits.length > 0) {
      const firstDeposit = deposits[deposits.length - 1] // sorted desc, so last is first
      const lastDeposit = deposits[0]
      csvRows.push([]) // Empty row
      csvRows.push(['Date Range'])
      csvRows.push(['First Transaction', formatDateForCSV(firstDeposit.depositDate)])
      csvRows.push(['Last Transaction', formatDateForCSV(lastDeposit.depositDate)])
    }

    // 5. Convert to CSV string
    const csvContent = arrayToCSV(csvRows)

    // 6. Generate filename
    const filename = generateExportFilename('deposits-export')

    // 7. Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error generating deposits CSV export:', error)

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
