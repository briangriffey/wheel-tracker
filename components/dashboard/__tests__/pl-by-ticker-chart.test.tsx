import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PLByTickerChart } from '../pl-by-ticker-chart'
import type { PLByTickerDataPoint } from '@/lib/queries/dashboard'

const makeTicker = (ticker: string): PLByTickerDataPoint => ({
  ticker,
  realizedPL: 100,
  unrealizedPL: 50,
  premiumPL: 25,
  totalPL: 175,
})

const twoTickers: PLByTickerDataPoint[] = [makeTicker('AAPL'), makeTicker('TSLA')]

const manyTickers: PLByTickerDataPoint[] = Array.from({ length: 10 }, (_, i) =>
  makeTicker(`TK${i}`)
)

describe('PLByTickerChart', () => {
  describe('loading state', () => {
    it('renders loading skeleton without expand button', () => {
      render(<PLByTickerChart data={[]} loading={true} />)
      expect(screen.queryByLabelText(/expand chart/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/collapse chart/i)).not.toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('renders empty message when data is empty', () => {
      render(<PLByTickerChart data={[]} loading={false} />)
      expect(screen.getByText(/no data available/i)).toBeInTheDocument()
    })

    it('does not render expand button when data is empty', () => {
      render(<PLByTickerChart data={[]} loading={false} />)
      expect(screen.queryByLabelText(/expand chart/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/collapse chart/i)).not.toBeInTheDocument()
    })

    it('renders the P&L by Ticker title in empty state', () => {
      render(<PLByTickerChart data={[]} loading={false} />)
      expect(screen.getByText('P&L by Ticker')).toBeInTheDocument()
    })
  })

  describe('expand/collapse toggle', () => {
    it('renders Maximize2 icon (expand button) by default when collapsed', () => {
      render(<PLByTickerChart data={twoTickers} />)
      expect(screen.getByLabelText('Expand chart')).toBeInTheDocument()
      expect(screen.queryByLabelText('Collapse chart')).not.toBeInTheDocument()
    })

    it('switches to Minimize2 icon after clicking expand', async () => {
      const user = userEvent.setup()
      render(<PLByTickerChart data={twoTickers} />)

      const expandBtn = screen.getByLabelText('Expand chart')
      await user.click(expandBtn)

      expect(screen.getByLabelText('Collapse chart')).toBeInTheDocument()
      expect(screen.queryByLabelText('Expand chart')).not.toBeInTheDocument()
    })

    it('returns to Maximize2 icon after clicking collapse', async () => {
      const user = userEvent.setup()
      render(<PLByTickerChart data={twoTickers} />)

      await user.click(screen.getByLabelText('Expand chart'))
      await user.click(screen.getByLabelText('Collapse chart'))

      expect(screen.getByLabelText('Expand chart')).toBeInTheDocument()
    })

    it('calls onExpandChange with true when expanded', async () => {
      const user = userEvent.setup()
      const onExpandChange = vi.fn()
      render(<PLByTickerChart data={twoTickers} onExpandChange={onExpandChange} />)

      await user.click(screen.getByLabelText('Expand chart'))

      expect(onExpandChange).toHaveBeenCalledOnce()
      expect(onExpandChange).toHaveBeenCalledWith(true)
    })

    it('calls onExpandChange with false when collapsed', async () => {
      const user = userEvent.setup()
      const onExpandChange = vi.fn()
      render(<PLByTickerChart data={twoTickers} onExpandChange={onExpandChange} />)

      await user.click(screen.getByLabelText('Expand chart'))
      await user.click(screen.getByLabelText('Collapse chart'))

      expect(onExpandChange).toHaveBeenCalledTimes(2)
      expect(onExpandChange).toHaveBeenLastCalledWith(false)
    })

    it('does not call onExpandChange when prop is not provided', async () => {
      const user = userEvent.setup()
      // Should not throw
      render(<PLByTickerChart data={twoTickers} />)
      await user.click(screen.getByLabelText('Expand chart'))
      // No assertion needed — test passes if no error thrown
    })
  })

  describe('chart height wrapper', () => {
    it('applies collapsed height class by default', () => {
      const { container } = render(<PLByTickerChart data={twoTickers} />)
      const heightWrapper = container.querySelector('.h-\\[300px\\]')
      expect(heightWrapper).toBeInTheDocument()
    })

    it('applies expanded height class after toggling', async () => {
      const user = userEvent.setup()
      const { container } = render(<PLByTickerChart data={twoTickers} />)

      await user.click(screen.getByLabelText('Expand chart'))

      // Should have expanded height class (mobile: 400px, desktop: 600px via Tailwind md: prefix)
      const expandedWrapper = container.querySelector('.h-\\[400px\\]')
      expect(expandedWrapper).toBeInTheDocument()
    })

    it('returns to collapsed height class after collapsing', async () => {
      const user = userEvent.setup()
      const { container } = render(<PLByTickerChart data={twoTickers} />)

      await user.click(screen.getByLabelText('Expand chart'))
      await user.click(screen.getByLabelText('Collapse chart'))

      const heightWrapper = container.querySelector('.h-\\[300px\\]')
      expect(heightWrapper).toBeInTheDocument()
    })
  })

  describe('card title', () => {
    it('renders P&L by Ticker title when data is present', () => {
      render(<PLByTickerChart data={twoTickers} />)
      expect(screen.getByText('P&L by Ticker')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('expand button has correct aria-label when collapsed', () => {
      render(<PLByTickerChart data={twoTickers} />)
      const btn = screen.getByRole('button', { name: 'Expand chart' })
      expect(btn).toBeInTheDocument()
    })

    it('expand button has correct aria-label when expanded', async () => {
      const user = userEvent.setup()
      render(<PLByTickerChart data={twoTickers} />)

      await user.click(screen.getByLabelText('Expand chart'))

      const btn = screen.getByRole('button', { name: 'Collapse chart' })
      expect(btn).toBeInTheDocument()
    })
  })

  describe('chart rendering with data', () => {
    it('renders single ResponsiveContainer when collapsed regardless of data count', () => {
      const { container } = render(<PLByTickerChart data={manyTickers} />)
      // In collapsed state, no scroll container is present
      expect(container.querySelector('.overflow-x-auto')).not.toBeInTheDocument()
    })
  })
})
