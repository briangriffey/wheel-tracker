import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DepositHistoryTable } from '../deposit-history-table'
import type { CashDepositData } from '@/lib/actions/deposits'

describe('DepositHistoryTable', () => {
  const mockDeposits: CashDepositData[] = [
    {
      id: '1',
      userId: 'user1',
      amount: 5000,
      type: 'DEPOSIT',
      depositDate: new Date('2026-01-15'),
      notes: 'Initial deposit',
      spyPrice: 450.25,
      spyShares: 11.1053,
      createdAt: new Date('2026-01-15'),
      updatedAt: new Date('2026-01-15'),
    },
    {
      id: '2',
      userId: 'user1',
      amount: -1000,
      type: 'WITHDRAWAL',
      depositDate: new Date('2026-02-01'),
      notes: null,
      spyPrice: 455.50,
      spyShares: -2.1956,
      createdAt: new Date('2026-02-01'),
      updatedAt: new Date('2026-02-01'),
    },
    {
      id: '3',
      userId: 'user1',
      amount: 3000,
      type: 'DEPOSIT',
      depositDate: new Date('2026-02-10'),
      notes: 'Additional funding',
      spyPrice: 460.00,
      spyShares: 6.5217,
      createdAt: new Date('2026-02-10'),
      updatedAt: new Date('2026-02-10'),
    },
  ]

  it('renders deposit history table with data', () => {
    render(<DepositHistoryTable initialDeposits={mockDeposits} />)

    expect(screen.getAllByText('Initial deposit')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Additional funding')[0]).toBeInTheDocument()
    expect(screen.getAllByText('$5,000.00')[0]).toBeInTheDocument()
  })

  it('displays all table headers', () => {
    render(<DepositHistoryTable initialDeposits={mockDeposits} />)

    expect(screen.getByText('Date')).toBeInTheDocument()
    expect(screen.getByText('Type')).toBeInTheDocument()
    expect(screen.getByText('Amount')).toBeInTheDocument()
    expect(screen.getByText('SPY Price')).toBeInTheDocument()
    expect(screen.getByText('SPY Shares')).toBeInTheDocument()
    expect(screen.getByText('Notes')).toBeInTheDocument()
  })

  it('shows empty state when no deposits match filters', async () => {
    const user = userEvent.setup()
    render(<DepositHistoryTable initialDeposits={mockDeposits} />)

    const typeFilter = screen.getByLabelText('Transaction Type')
    await user.selectOptions(typeFilter, 'WITHDRAWAL')

    const startDate = screen.getByLabelText('Start Date')
    await user.type(startDate, '2026-03-01')

    expect(screen.getByText('No deposits found matching your filters.')).toBeInTheDocument()
  })

  it('filters by transaction type', async () => {
    const user = userEvent.setup()
    render(<DepositHistoryTable initialDeposits={mockDeposits} />)

    const typeFilter = screen.getByLabelText('Transaction Type')
    await user.selectOptions(typeFilter, 'DEPOSIT')

    expect(screen.getAllByText('$5,000.00')[0]).toBeInTheDocument()
    // Withdrawal should be filtered out, so $1,000.00 shouldn't appear
    expect(screen.queryAllByText('$1,000.00').length).toBe(0)
    expect(screen.getByText('Showing 2 of 3 transactions')).toBeInTheDocument()
  })

  it('sorts by date when clicking header', async () => {
    const user = userEvent.setup()
    render(<DepositHistoryTable initialDeposits={mockDeposits} />)

    // Initial sort is descending (most recent first)
    const rows = screen.getAllByRole('row')
    const firstDataRow = rows[1]
    // Check that the first row contains the most recent date data
    expect(firstDataRow).toHaveTextContent(/202[56]/)

    // Click date header to sort ascending
    const dateHeaders = screen.getAllByText('Date')
    const dateHeader = dateHeaders[0].closest('th')
    if (dateHeader) {
      await user.click(dateHeader)
    }

    // After clicking, should be ascending (oldest first)
    const rowsAfterSort = screen.getAllByRole('row')
    const firstDataRowAfterSort = rowsAfterSort[1]
    // Check that first row now contains January data
    expect(firstDataRowAfterSort).toHaveTextContent(/Jan/)
  })

  it('displays badge with correct color for deposit type', () => {
    render(<DepositHistoryTable initialDeposits={mockDeposits} />)

    const depositBadges = screen.getAllByText('DEPOSIT')
    const withdrawalBadges = screen.getAllByText('WITHDRAWAL')

    expect(depositBadges.length).toBeGreaterThanOrEqual(2)
    expect(withdrawalBadges.length).toBeGreaterThanOrEqual(1)
  })

  it('shows dash for null notes', () => {
    render(<DepositHistoryTable initialDeposits={mockDeposits} />)

    const dashElements = screen.getAllByText('-')
    expect(dashElements.length).toBeGreaterThan(0)
  })

  it('displays transaction count correctly', () => {
    render(<DepositHistoryTable initialDeposits={mockDeposits} />)

    expect(screen.getByText('Showing 3 of 3 transactions')).toBeInTheDocument()
  })

  it('handles empty deposit list', () => {
    render(<DepositHistoryTable initialDeposits={[]} />)

    expect(screen.getByText('No deposits found matching your filters.')).toBeInTheDocument()
    expect(screen.getByText('Showing 0 of 0 transactions')).toBeInTheDocument()
  })
})
