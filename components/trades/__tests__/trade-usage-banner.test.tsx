import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TradeUsageBanner } from '../trade-usage-banner'
import type { TradeUsage } from '@/lib/actions/subscription'
import { FREE_TRADE_LIMIT } from '@/lib/constants'

function makeUsage(overrides: Partial<TradeUsage> = {}): TradeUsage {
  const tradesUsed = overrides.tradesUsed ?? 0
  const tier = overrides.tier ?? 'FREE'
  const tradeLimit = tier === 'PRO' ? Infinity : FREE_TRADE_LIMIT
  const remaining = tier === 'PRO' ? Infinity : Math.max(0, FREE_TRADE_LIMIT - tradesUsed)
  const limitReached = tier === 'FREE' && tradesUsed >= FREE_TRADE_LIMIT

  return { tradesUsed, tradeLimit, tier, remaining, limitReached, ...overrides }
}

describe('TradeUsageBanner', () => {
  describe('hidden states', () => {
    it('renders nothing for PRO users', () => {
      const { container } = render(
        <TradeUsageBanner usage={makeUsage({ tier: 'PRO', tradesUsed: 50 })} />
      )
      expect(container.firstChild).toBeNull()
    })

    it('renders nothing when limit is reached (UpgradePrompt handles this)', () => {
      const { container } = render(
        <TradeUsageBanner usage={makeUsage({ tradesUsed: 20, limitReached: true })} />
      )
      expect(container.firstChild).toBeNull()
    })

    it('renders nothing at 0 trades', () => {
      const { container } = render(
        <TradeUsageBanner usage={makeUsage({ tradesUsed: 0 })} />
      )
      expect(container.firstChild).toBeNull()
    })

    it('renders nothing at 10 trades', () => {
      const { container } = render(
        <TradeUsageBanner usage={makeUsage({ tradesUsed: 10 })} />
      )
      expect(container.firstChild).toBeNull()
    })

    it('renders nothing at 14 trades', () => {
      const { container } = render(
        <TradeUsageBanner usage={makeUsage({ tradesUsed: 14 })} />
      )
      expect(container.firstChild).toBeNull()
    })
  })

  describe('15 trades — subtle info banner', () => {
    it('shows usage count at 15 trades', () => {
      render(<TradeUsageBanner usage={makeUsage({ tradesUsed: 15 })} />)
      expect(screen.getByText(/used 15 of 20 free trades/)).toBeInTheDocument()
    })

    it('uses role="status" for subtle banners', () => {
      render(<TradeUsageBanner usage={makeUsage({ tradesUsed: 15 })} />)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('uses neutral styling at 15 trades', () => {
      render(<TradeUsageBanner usage={makeUsage({ tradesUsed: 15 })} />)
      const banner = screen.getByRole('status')
      expect(banner.className).toContain('bg-neutral-50')
      expect(banner.className).toContain('text-neutral-600')
    })

    it('shows usage count at 16 trades', () => {
      render(<TradeUsageBanner usage={makeUsage({ tradesUsed: 16 })} />)
      expect(screen.getByText(/used 16 of 20 free trades/)).toBeInTheDocument()
    })

    it('shows usage count at 17 trades', () => {
      render(<TradeUsageBanner usage={makeUsage({ tradesUsed: 17 })} />)
      expect(screen.getByText(/used 17 of 20 free trades/)).toBeInTheDocument()
    })
  })

  describe('18 trades — warning with upgrade link', () => {
    it('shows remaining count and upgrade link at 18 trades', () => {
      render(<TradeUsageBanner usage={makeUsage({ tradesUsed: 18 })} />)
      expect(screen.getByText(/2 trades remaining/)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /upgrade for unlimited tracking/i })).toBeInTheDocument()
    })

    it('links to /pricing', () => {
      render(<TradeUsageBanner usage={makeUsage({ tradesUsed: 18 })} />)
      const link = screen.getByRole('link', { name: /upgrade for unlimited tracking/i })
      expect(link).toHaveAttribute('href', '/pricing')
    })

    it('uses amber warning styling at 18 trades', () => {
      render(<TradeUsageBanner usage={makeUsage({ tradesUsed: 18 })} />)
      const banner = screen.getByRole('status')
      expect(banner.className).toContain('bg-amber-50')
      expect(banner.className).toContain('text-amber-800')
    })
  })

  describe('19 trades — prominent warning', () => {
    it('shows prominent "1 trade remaining" message', () => {
      render(<TradeUsageBanner usage={makeUsage({ tradesUsed: 19 })} />)
      expect(screen.getByText(/1 trade remaining/)).toBeInTheDocument()
      expect(screen.getByText(/you'll need to upgrade/i)).toBeInTheDocument()
    })

    it('uses role="alert" for prominent warnings', () => {
      render(<TradeUsageBanner usage={makeUsage({ tradesUsed: 19 })} />)
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('uses amber warning styling at 19 trades', () => {
      render(<TradeUsageBanner usage={makeUsage({ tradesUsed: 19 })} />)
      const banner = screen.getByRole('alert')
      expect(banner.className).toContain('bg-amber-50')
      expect(banner.className).toContain('border-amber-300')
    })

    it('bolds the "1 trade remaining" text', () => {
      render(<TradeUsageBanner usage={makeUsage({ tradesUsed: 19 })} />)
      const bold = screen.getByText('1 trade remaining.')
      expect(bold.className).toContain('font-medium')
    })
  })

  describe('progressive escalation', () => {
    it('escalates from neutral to warning styling as trades increase', () => {
      const { rerender } = render(
        <TradeUsageBanner usage={makeUsage({ tradesUsed: 15 })} />
      )
      expect(screen.getByRole('status').className).toContain('bg-neutral-50')

      rerender(<TradeUsageBanner usage={makeUsage({ tradesUsed: 18 })} />)
      expect(screen.getByRole('status').className).toContain('bg-amber-50')

      rerender(<TradeUsageBanner usage={makeUsage({ tradesUsed: 19 })} />)
      expect(screen.getByRole('alert').className).toContain('bg-amber-50')
    })
  })
})
