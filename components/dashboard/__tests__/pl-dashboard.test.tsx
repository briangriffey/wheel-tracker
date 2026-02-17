import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PLDashboard } from '../pl-dashboard'
import type {
  DashboardMetrics,
  PLOverTimeDataPoint,
  PLByTickerDataPoint,
  WinRateData,
} from '@/lib/queries/dashboard'

// Mock fetch
global.fetch = vi.fn()

const mockMetrics: DashboardMetrics = {
  totalPortfolioValue: 50000,
  spyComparisonValue: 48000,
  cashDeposits: 40000,
  totalPL: 5000,
  realizedPL: 3000,
  unrealizedPL: 2000,
  distinctStockCount: 5,
  totalPremiumCollected: 10000,
  winRate: 75,
  assignmentRate: 25,
  openContracts: 10,
}

const mockPLOverTime: PLOverTimeDataPoint[] = [
  { date: '2024-01-01', realizedPL: 1000, unrealizedPL: 500, premiumPL: 0, totalPL: 1500 },
  { date: '2024-02-01', realizedPL: 2000, unrealizedPL: 1000, premiumPL: 0, totalPL: 3000 },
]

const mockPLByTicker: PLByTickerDataPoint[] = [
  { ticker: 'AAPL', realizedPL: 1000, unrealizedPL: 500, premiumPL: 0, totalPL: 1500 },
  { ticker: 'TSLA', realizedPL: 500, unrealizedPL: 250, premiumPL: 0, totalPL: 750 },
]

const mockWinRateData: WinRateData = {
  winners: 15,
  losers: 5,
  breakeven: 0,
  totalTrades: 20,
  winRate: 75,
}

describe('PLDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dashboard with initial data', () => {
    render(
      <PLDashboard
        initialMetrics={mockMetrics}
        initialPLOverTime={mockPLOverTime}
        initialPLByTicker={mockPLByTicker}
        initialWinRateData={mockWinRateData}
      />
    )

    // Check header
    expect(screen.getByText('P&L Dashboard')).toBeInTheDocument()

    // Check section headers
    expect(screen.getByText('Portfolio Overview')).toBeInTheDocument()
    expect(screen.getByText('Stocks')).toBeInTheDocument()
    expect(screen.getByText('Options')).toBeInTheDocument()

    // Check portfolio overview metrics
    expect(screen.getByText('Total Portfolio Value')).toBeInTheDocument()
    expect(screen.getByText('$50,000.00')).toBeInTheDocument()
    expect(screen.getByText('If You Bought SPY')).toBeInTheDocument()
    expect(screen.getByText('$48,000.00')).toBeInTheDocument()
    expect(screen.getByText('vs SPY')).toBeInTheDocument()
    expect(screen.getAllByText('$2,000.00').length).toBeGreaterThanOrEqual(1)

    // Check stock metrics
    expect(screen.getByText('Total Stock P&L')).toBeInTheDocument()
    expect(screen.getByText('$5,000.00')).toBeInTheDocument()
    expect(screen.getByText('Realized P&L')).toBeInTheDocument()
    expect(screen.getByText('Stocks Owned')).toBeInTheDocument()

    // Check options metrics
    expect(screen.getByText('Premium Collected')).toBeInTheDocument()
    expect(screen.getByText('$10,000.00')).toBeInTheDocument()
    expect(screen.getAllByText('Win Rate').length).toBeGreaterThan(0)
    expect(screen.getByText('75.00%')).toBeInTheDocument()
  })

  it('renders time range selector with default "All" selected', () => {
    render(
      <PLDashboard
        initialMetrics={mockMetrics}
        initialPLOverTime={mockPLOverTime}
        initialPLByTicker={mockPLByTicker}
        initialWinRateData={mockWinRateData}
      />
    )

    const allButton = screen.getByRole('button', { name: 'All' })
    // Check that "All" button has primary variant styles (design system)
    expect(allButton).toHaveClass('bg-primary-500')
  })

  it('fetches new data when time range changes', async () => {
    const user = userEvent.setup()

    const newData = {
      metrics: { ...mockMetrics, totalPL: 6000 },
      plOverTime: mockPLOverTime,
      plByTicker: mockPLByTicker,
      winRateData: mockWinRateData,
    }

    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => newData,
    })

    render(
      <PLDashboard
        initialMetrics={mockMetrics}
        initialPLOverTime={mockPLOverTime}
        initialPLByTicker={mockPLByTicker}
        initialWinRateData={mockWinRateData}
      />
    )

    // Click on 1M button
    const oneMonthButton = screen.getByRole('button', { name: '1M' })
    await user.click(oneMonthButton)

    // Verify fetch was called with correct time range
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/dashboard?timeRange=1M')
    })

    // Verify new data is displayed
    await waitFor(() => {
      expect(screen.getByText('$6,000.00')).toBeInTheDocument()
    })
  })

  it('renders charts with data', () => {
    render(
      <PLDashboard
        initialMetrics={mockMetrics}
        initialPLOverTime={mockPLOverTime}
        initialPLByTicker={mockPLByTicker}
        initialWinRateData={mockWinRateData}
      />
    )

    // Check chart titles
    expect(screen.getByText('P&L Over Time')).toBeInTheDocument()
    expect(screen.getByText('P&L by Ticker')).toBeInTheDocument()
    expect(screen.getAllByText('Win Rate').length).toBeGreaterThan(0)
  })

  it('handles fetch error gracefully', async () => {
    const user = userEvent.setup()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Failed to fetch'))

    render(
      <PLDashboard
        initialMetrics={mockMetrics}
        initialPLOverTime={mockPLOverTime}
        initialPLByTicker={mockPLByTicker}
        initialWinRateData={mockWinRateData}
      />
    )

    // Click on 1M button
    const oneMonthButton = screen.getByRole('button', { name: '1M' })
    await user.click(oneMonthButton)

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    consoleErrorSpy.mockRestore()
  })
})
