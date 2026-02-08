import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UpcomingExpirationsWidget } from '../upcoming-expirations-widget'
import type { ExpirationTrade } from '@/lib/queries/expirations'
import { Prisma } from '@/lib/generated/prisma'

describe('UpcomingExpirationsWidget', () => {
  const mockExpirations: ExpirationTrade[] = [
    {
      id: 'trade-1',
      userId: 'user-1',
      ticker: 'AAPL',
      type: 'PUT',
      action: 'SELL_TO_OPEN',
      status: 'OPEN',
      strikePrice: new Prisma.Decimal(150.0),
      premium: new Prisma.Decimal(250.0),
      contracts: 2,
      shares: 200,
      expirationDate: new Date('2026-02-14'),
      openDate: new Date('2026-01-15'),
      closeDate: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      positionId: null,
      daysUntil: 7,
      colorClass: 'text-red-600 bg-red-50 border-red-200',
    },
    {
      id: 'trade-2',
      userId: 'user-1',
      ticker: 'MSFT',
      type: 'CALL',
      action: 'SELL_TO_OPEN',
      status: 'OPEN',
      strikePrice: new Prisma.Decimal(380.0),
      premium: new Prisma.Decimal(150.0),
      contracts: 1,
      shares: 100,
      expirationDate: new Date('2026-02-21'),
      openDate: new Date('2026-01-20'),
      closeDate: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      positionId: null,
      daysUntil: 14,
      colorClass: 'text-green-600 bg-green-50 border-green-200',
    },
  ]

  it('renders widget title', () => {
    render(<UpcomingExpirationsWidget expirations={mockExpirations} />)

    expect(screen.getByText('Upcoming Expirations')).toBeInTheDocument()
  })

  it('renders View All link', () => {
    render(<UpcomingExpirationsWidget expirations={mockExpirations} />)

    const link = screen.getByRole('link', { name: /View All/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/expirations')
  })

  it('renders all expirations', () => {
    render(<UpcomingExpirationsWidget expirations={mockExpirations} />)

    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('MSFT')).toBeInTheDocument()
  })

  it('displays ticker and type for each expiration', () => {
    render(<UpcomingExpirationsWidget expirations={mockExpirations} />)

    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('PUT')).toBeInTheDocument()
    expect(screen.getByText('MSFT')).toBeInTheDocument()
    expect(screen.getByText('CALL')).toBeInTheDocument()
  })

  it('displays strike price and contracts', () => {
    render(<UpcomingExpirationsWidget expirations={mockExpirations} />)

    expect(screen.getByText(/Strike: \$150\.00 • 2x/)).toBeInTheDocument()
    expect(screen.getByText(/Strike: \$380\.00 • 1x/)).toBeInTheDocument()
  })

  it('displays days until expiration', () => {
    render(<UpcomingExpirationsWidget expirations={mockExpirations} />)

    expect(screen.getByText('7d')).toBeInTheDocument()
    expect(screen.getByText('14d')).toBeInTheDocument()
  })

  it('displays "Today" for 0 days', () => {
    const todayExpirations = [
      {
        ...mockExpirations[0],
        daysUntil: 0,
      },
    ]
    render(<UpcomingExpirationsWidget expirations={todayExpirations} />)

    expect(screen.getByText('Today')).toBeInTheDocument()
  })

  it('displays "Tomorrow" for 1 day', () => {
    const tomorrowExpirations = [
      {
        ...mockExpirations[0],
        daysUntil: 1,
      },
    ]
    render(<UpcomingExpirationsWidget expirations={tomorrowExpirations} />)

    expect(screen.getByText('Tomorrow')).toBeInTheDocument()
  })

  it('displays "Past due" for negative days', () => {
    const pastExpirations = [
      {
        ...mockExpirations[0],
        daysUntil: -2,
      },
    ]
    render(<UpcomingExpirationsWidget expirations={pastExpirations} />)

    expect(screen.getByText('Past due')).toBeInTheDocument()
  })

  it('applies correct color class for urgent expirations', () => {
    render(<UpcomingExpirationsWidget expirations={mockExpirations} />)

    const urgentBadge = screen.getByText('7d')
    expect(urgentBadge).toHaveClass('text-red-600', 'bg-red-50')
  })

  it('applies correct color class for later expirations', () => {
    render(<UpcomingExpirationsWidget expirations={mockExpirations} />)

    const laterBadge = screen.getByText('14d')
    expect(laterBadge).toHaveClass('text-green-600', 'bg-green-50')
  })

  it('displays total premium in footer', () => {
    render(<UpcomingExpirationsWidget expirations={mockExpirations} />)

    expect(screen.getByText(/Total premium: \$400\.00/)).toBeInTheDocument()
  })

  it('displays count of urgent expirations in footer', () => {
    render(<UpcomingExpirationsWidget expirations={mockExpirations} />)

    expect(screen.getByText('1 urgent')).toBeInTheDocument()
  })

  it('displays empty state when no expirations', () => {
    render(<UpcomingExpirationsWidget expirations={[]} />)

    expect(screen.getByText('No upcoming expirations')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Create a trade/i })).toBeInTheDocument()
  })

  it('does not display footer when no expirations', () => {
    render(<UpcomingExpirationsWidget expirations={[]} />)

    expect(screen.queryByText(/Total premium/)).not.toBeInTheDocument()
    expect(screen.queryByText(/urgent/)).not.toBeInTheDocument()
  })

  it('formats dates correctly', () => {
    render(<UpcomingExpirationsWidget expirations={mockExpirations} />)

    // Check that dates are formatted as "Feb 14", "Feb 21", etc.
    expect(screen.getByText(/Feb 14/)).toBeInTheDocument()
    expect(screen.getByText(/Feb 21/)).toBeInTheDocument()
  })

  it('applies correct badge color for PUT type', () => {
    render(<UpcomingExpirationsWidget expirations={mockExpirations} />)

    const putBadge = screen.getByText('PUT')
    expect(putBadge).toHaveClass('bg-blue-100', 'text-blue-800')
  })

  it('applies correct badge color for CALL type', () => {
    render(<UpcomingExpirationsWidget expirations={mockExpirations} />)

    const callBadge = screen.getByText('CALL')
    expect(callBadge).toHaveClass('bg-purple-100', 'text-purple-800')
  })
})
