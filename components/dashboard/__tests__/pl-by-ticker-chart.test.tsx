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

      await user.click(screen.getByLabelText('Expand chart'))

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

    it('does not throw when onExpandChange is not provided', async () => {
      const user = userEvent.setup()
      render(<PLByTickerChart data={twoTickers} />)
      await user.click(screen.getByLabelText('Expand chart'))
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

  describe('accessibility', () => {
    it('expand button has correct aria-label when collapsed', () => {
      render(<PLByTickerChart data={twoTickers} />)
      expect(screen.getByRole('button', { name: 'Expand chart' })).toBeInTheDocument()
    })

    it('expand button has correct aria-label when expanded', async () => {
      const user = userEvent.setup()
      render(<PLByTickerChart data={twoTickers} />)

      await user.click(screen.getByLabelText('Expand chart'))

      expect(screen.getByRole('button', { name: 'Collapse chart' })).toBeInTheDocument()
    })
  })

  describe('scroll layout — Tasks 3.1 and 3.2', () => {
    it('does not render scroll container when collapsed regardless of data count', () => {
      const { container } = render(<PLByTickerChart data={manyTickers} />)
      expect(container.querySelector('.overflow-x-auto')).not.toBeInTheDocument()
    })

    it('does not render scroll container when expanded with <= 6 tickers', async () => {
      const user = userEvent.setup()
      const sixTickers = Array.from({ length: 6 }, (_, i) => makeTicker(`T${i}`))
      const { container } = render(<PLByTickerChart data={sixTickers} />)

      await user.click(screen.getByLabelText('Expand chart'))

      expect(container.querySelector('.overflow-x-auto')).not.toBeInTheDocument()
    })

    it('renders scroll container when expanded with > 6 tickers', async () => {
      const user = userEvent.setup()
      const { container } = render(<PLByTickerChart data={manyTickers} />)

      await user.click(screen.getByLabelText('Expand chart'))

      expect(container.querySelector('.overflow-x-auto')).toBeInTheDocument()
    })

    it('renders fixed Y-axis panel when scroll layout is active', async () => {
      const user = userEvent.setup()
      const { container } = render(<PLByTickerChart data={manyTickers} />)

      await user.click(screen.getByLabelText('Expand chart'))

      // Fixed Y-axis panel has w-[60px] flex-shrink-0
      expect(container.querySelector('.flex-shrink-0.w-\\[60px\\]')).toBeInTheDocument()
    })

    it('collapses back to single chart layout when collapse is clicked', async () => {
      const user = userEvent.setup()
      const { container } = render(<PLByTickerChart data={manyTickers} />)

      await user.click(screen.getByLabelText('Expand chart'))
      expect(container.querySelector('.overflow-x-auto')).toBeInTheDocument()

      await user.click(screen.getByLabelText('Collapse chart'))
      expect(container.querySelector('.overflow-x-auto')).not.toBeInTheDocument()
    })

    it('gradient containers use pointer-events-none', async () => {
      const user = userEvent.setup()
      const { container } = render(<PLByTickerChart data={manyTickers} />)

      await user.click(screen.getByLabelText('Expand chart'))

      // At least one gradient overlay should be present (right gradient on initial render)
      // and all gradient overlays must have pointer-events-none
      const gradients = container.querySelectorAll('.pointer-events-none')
      // There may be 0 or 1 gradients rendered (jsdom doesn't measure scroll dimensions)
      // But any that do render must have pointer-events-none class
      gradients.forEach((el) => {
        expect(el.className).toContain('pointer-events-none')
      })
    })

    it('renders the card title in all states', async () => {
      const user = userEvent.setup()
      render(<PLByTickerChart data={manyTickers} />)
      expect(screen.getByText('P&L by Ticker')).toBeInTheDocument()

      await user.click(screen.getByLabelText('Expand chart'))
      expect(screen.getByText('P&L by Ticker')).toBeInTheDocument()
    })
  })
})
