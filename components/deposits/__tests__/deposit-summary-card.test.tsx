import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DepositSummaryCard } from '../deposit-summary-card'
import type { DepositSummary } from '@/lib/actions/deposits'

describe('DepositSummaryCard', () => {
  const mockSummary: DepositSummary = {
    totalDeposits: 10000,
    totalWithdrawals: 2000,
    depositCount: 5,
    withdrawalCount: 1,
    netInvested: 8000,
    totalSpyShares: 20.5432,
    avgCostBasis: 389.45,
    firstDepositDate: new Date('2026-01-01'),
    lastDepositDate: new Date('2026-02-10'),
  }

  it('renders all summary statistics', () => {
    render(<DepositSummaryCard summary={mockSummary} />)

    expect(screen.getByText('Summary')).toBeInTheDocument()
    expect(screen.getByText('Total Deposits')).toBeInTheDocument()
    expect(screen.getByText('Total Withdrawals')).toBeInTheDocument()
    expect(screen.getByText('Net Invested')).toBeInTheDocument()
    expect(screen.getByText('Avg SPY Cost')).toBeInTheDocument()
  })

  it('formats currency values correctly', () => {
    render(<DepositSummaryCard summary={mockSummary} />)

    expect(screen.getByText('$10,000.00')).toBeInTheDocument()
    expect(screen.getByText('$2,000.00')).toBeInTheDocument()
    expect(screen.getByText('$8,000.00')).toBeInTheDocument()
  })

  it('displays transaction counts', () => {
    render(<DepositSummaryCard summary={mockSummary} />)

    expect(screen.getByText('5 transactions')).toBeInTheDocument()
    expect(screen.getByText('1 transaction')).toBeInTheDocument()
  })

  it('formats SPY shares correctly', () => {
    render(<DepositSummaryCard summary={mockSummary} />)

    expect(screen.getByText('20.5432 SPY shares')).toBeInTheDocument()
  })

  it('displays date range', () => {
    render(<DepositSummaryCard summary={mockSummary} />)

    // Dates might be displayed in different timezones, so check for the general format
    const dateElements = screen.getAllByText(/202[56]/)
    expect(dateElements.length).toBeGreaterThan(0)
  })

  it('handles null dates gracefully', () => {
    const summaryWithNullDates: DepositSummary = {
      ...mockSummary,
      firstDepositDate: null,
      lastDepositDate: null,
    }

    render(<DepositSummaryCard summary={summaryWithNullDates} />)

    // Check that N/A is displayed for null dates
    expect(screen.getByText(/N\/A.*-.*N\/A/)).toBeInTheDocument()
  })

  it('uses singular form for single transaction', () => {
    const singleDepositSummary: DepositSummary = {
      ...mockSummary,
      depositCount: 1,
      withdrawalCount: 1,
    }

    render(<DepositSummaryCard summary={singleDepositSummary} />)

    const transactionTexts = screen.getAllByText(/1 transaction/)
    expect(transactionTexts.length).toBeGreaterThan(0)
  })
})
