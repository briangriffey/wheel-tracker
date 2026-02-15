import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BenchmarkComparisonSection } from '../benchmark-comparison-section'
import * as benchmarkActions from '@/lib/actions/benchmarks'
import type { BenchmarkComparison } from '@/lib/calculations/benchmark'

// Mock the benchmark actions module
vi.mock('@/lib/actions/benchmarks', () => ({
  getComparison: vi.fn(),
}))

const mockComparison: BenchmarkComparison = {
  wheelStrategy: {
    totalPnL: 5000,
    returnPercent: 25,
    capitalDeployed: 20000,
  },
  benchmark: {
    ticker: 'SPY',
    initialCapital: 20000,
    setupDate: new Date('2024-01-01'),
    initialPrice: 450,
    shares: 44.44,
    currentPrice: 475,
    currentValue: 21109,
    gainLoss: 1109,
    returnPercent: 5.55,
    lastUpdated: new Date('2024-03-01'),
  },
  difference: {
    pnlDifference: 3891,
    returnDifference: 19.45,
    outperforming: true,
  },
}

describe('BenchmarkComparisonSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    vi.mocked(benchmarkActions.getComparison).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    render(<BenchmarkComparisonSection timeRange="All" />)

    const skeleton = document.querySelector('.animate-pulse')
    expect(skeleton).toBeInTheDocument()
  })

  it('renders comparison data when loaded successfully', async () => {
    vi.mocked(benchmarkActions.getComparison).mockResolvedValue({
      success: true,
      data: mockComparison,
    })

    render(<BenchmarkComparisonSection timeRange="All" />)

    await waitFor(() => {
      expect(screen.getByText('Benchmark Comparison')).toBeInTheDocument()
    })

    expect(screen.getByText('Wheel Strategy')).toBeInTheDocument()
    expect(screen.getByText('SPY Benchmark')).toBeInTheDocument()
    expect(screen.getByText('$5,000.00')).toBeInTheDocument() // Wheel P&L
    expect(screen.getByText('25.00%')).toBeInTheDocument() // Wheel return
    expect(screen.getByText('$1,109.00')).toBeInTheDocument() // Benchmark P&L
  })

  it('displays outperforming status correctly', async () => {
    vi.mocked(benchmarkActions.getComparison).mockResolvedValue({
      success: true,
      data: mockComparison,
    })

    render(<BenchmarkComparisonSection timeRange="All" />)

    await waitFor(() => {
      expect(screen.getByText('↑ Outperforming')).toBeInTheDocument()
    })

    expect(screen.getByText('+$3,891.00')).toBeInTheDocument() // P&L difference
    expect(screen.getByText('+19.45%')).toBeInTheDocument() // Return difference
  })

  it('displays underperforming status correctly', async () => {
    const underperformingComparison: BenchmarkComparison = {
      ...mockComparison,
      wheelStrategy: {
        totalPnL: 500,
        returnPercent: 2.5,
        capitalDeployed: 20000,
      },
      difference: {
        pnlDifference: -609,
        returnDifference: -3.05,
        outperforming: false,
      },
    }

    vi.mocked(benchmarkActions.getComparison).mockResolvedValue({
      success: true,
      data: underperformingComparison,
    })

    render(<BenchmarkComparisonSection timeRange="All" />)

    await waitFor(() => {
      expect(screen.getByText('↓ Underperforming')).toBeInTheDocument()
    })
  })

  it('renders error state when fetch fails', async () => {
    vi.mocked(benchmarkActions.getComparison).mockResolvedValue({
      success: false,
      error: 'Benchmark for SPY not found',
    })

    render(<BenchmarkComparisonSection timeRange="All" />)

    await waitFor(() => {
      expect(screen.getByText('Benchmark for SPY not found')).toBeInTheDocument()
    })

    expect(screen.getByText(/You may need to set up a benchmark first/i)).toBeInTheDocument()
  })

  it('changes benchmark when selector is used', async () => {
    const user = userEvent.setup()

    vi.mocked(benchmarkActions.getComparison).mockResolvedValue({
      success: true,
      data: mockComparison,
    })

    render(<BenchmarkComparisonSection timeRange="All" />)

    await waitFor(() => {
      expect(screen.getByLabelText('Select benchmark to compare against')).toBeInTheDocument()
    })

    const select = screen.getByLabelText('Select benchmark to compare against')
    await user.selectOptions(select, 'QQQ')

    await waitFor(() => {
      expect(benchmarkActions.getComparison).toHaveBeenCalledWith({ ticker: 'QQQ' })
    })
  })

  it('refetches data when time range changes', async () => {
    vi.mocked(benchmarkActions.getComparison).mockResolvedValue({
      success: true,
      data: mockComparison,
    })

    const { rerender } = render(<BenchmarkComparisonSection timeRange="All" />)

    await waitFor(() => {
      expect(benchmarkActions.getComparison).toHaveBeenCalledTimes(1)
    })

    rerender(<BenchmarkComparisonSection timeRange="1M" />)

    await waitFor(() => {
      expect(benchmarkActions.getComparison).toHaveBeenCalledTimes(2)
    })
  })

  it('toggles info tooltip when info button is clicked', async () => {
    const user = userEvent.setup()

    vi.mocked(benchmarkActions.getComparison).mockResolvedValue({
      success: true,
      data: mockComparison,
    })

    render(<BenchmarkComparisonSection timeRange="All" />)

    await waitFor(() => {
      expect(screen.getByLabelText('Show calculation details')).toBeInTheDocument()
    })

    // Info should not be visible initially
    expect(screen.queryByText('How is this calculated?')).not.toBeInTheDocument()

    // Click info button
    const infoButton = screen.getByLabelText('Show calculation details')
    await user.click(infoButton)

    // Info should now be visible
    expect(screen.getByText('How is this calculated?')).toBeInTheDocument()
    expect(screen.getByText(/Total P&L from all your trades/i)).toBeInTheDocument()

    // Click again to hide
    await user.click(infoButton)

    // Info should be hidden again
    await waitFor(() => {
      expect(screen.queryByText('How is this calculated?')).not.toBeInTheDocument()
    })
  })

  it('handles exception during fetch gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    vi.mocked(benchmarkActions.getComparison).mockRejectedValue(new Error('Network error'))

    render(<BenchmarkComparisonSection timeRange="All" />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load benchmark comparison')).toBeInTheDocument()
    })

    consoleErrorSpy.mockRestore()
  })

  it('displays performance difference section', async () => {
    vi.mocked(benchmarkActions.getComparison).mockResolvedValue({
      success: true,
      data: mockComparison,
    })

    render(<BenchmarkComparisonSection timeRange="All" />)

    await waitFor(() => {
      expect(screen.getByText('Performance Difference')).toBeInTheDocument()
    })

    expect(screen.getByText('P&L Difference')).toBeInTheDocument()
    expect(screen.getByText('Return Difference')).toBeInTheDocument()
  })
})
