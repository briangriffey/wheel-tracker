import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ExpirationCard } from '../expiration-card'
import type { ExpirationTrade } from '@/lib/queries/expirations'
import { Prisma } from '@/lib/generated/prisma'

// Mock the actions
vi.mock('@/lib/actions/expirations', () => ({
  markExpired: vi.fn(),
  markAssigned: vi.fn(),
  rollOption: vi.fn(),
}))

describe('ExpirationCard', () => {
  const mockTrade: ExpirationTrade = {
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
    notes: 'Test trade',
    createdAt: new Date(),
    updatedAt: new Date(),
    positionId: null,
    daysUntil: 7,
    colorClass: 'text-red-600 bg-red-50 border-red-200',
  }

  it('renders trade information correctly', () => {
    render(<ExpirationCard trade={mockTrade} />)

    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('PUT')).toBeInTheDocument()
    expect(screen.getByText('$150.00')).toBeInTheDocument()
    expect(screen.getByText('$250.00')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('Test trade')).toBeInTheDocument()
  })

  it('displays urgency badge for 7 days', () => {
    render(<ExpirationCard trade={mockTrade} />)

    expect(screen.getByText('7 DAYS')).toBeInTheDocument()
  })

  it('displays TODAY badge for 0 days', () => {
    const todayTrade = { ...mockTrade, daysUntil: 0 }
    render(<ExpirationCard trade={todayTrade} />)

    expect(screen.getByText('TODAY')).toBeInTheDocument()
  })

  it('displays TOMORROW badge for 1 day', () => {
    const tomorrowTrade = { ...mockTrade, daysUntil: 1 }
    render(<ExpirationCard trade={tomorrowTrade} />)

    expect(screen.getByText('TOMORROW')).toBeInTheDocument()
  })

  it('displays PAST DUE badge for negative days', () => {
    const pastTrade = { ...mockTrade, daysUntil: -1 }
    render(<ExpirationCard trade={pastTrade} />)

    expect(screen.getByText('PAST DUE')).toBeInTheDocument()
  })

  it('applies red border for urgent trades (<7 days)', () => {
    const { container } = render(<ExpirationCard trade={mockTrade} />)

    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('border-red-500')
  })

  it('applies yellow border for soon trades (7-14 days)', () => {
    const soonTrade = { ...mockTrade, daysUntil: 10 }
    const { container } = render(<ExpirationCard trade={soonTrade} />)

    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('border-yellow-500')
  })

  it('applies green border for later trades (14+ days)', () => {
    const laterTrade = { ...mockTrade, daysUntil: 20 }
    const { container } = render(<ExpirationCard trade={laterTrade} />)

    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('border-green-500')
  })

  it('renders Mark Expired button', () => {
    render(<ExpirationCard trade={mockTrade} />)

    expect(screen.getByRole('button', { name: /Mark AAPL as expired/i })).toBeInTheDocument()
  })

  it('renders Mark Assigned button', () => {
    render(<ExpirationCard trade={mockTrade} />)

    expect(screen.getByRole('button', { name: /Mark AAPL as assigned/i })).toBeInTheDocument()
  })

  it('renders Roll Option button', () => {
    render(<ExpirationCard trade={mockTrade} />)

    expect(screen.getByRole('button', { name: /Roll AAPL option/i })).toBeInTheDocument()
  })

  it('calls markExpired when Mark Expired button is clicked', async () => {
    const { markExpired } = await import('@/lib/actions/expirations')
    vi.mocked(markExpired).mockResolvedValue({ success: true, data: { id: 'trade-1' } })

    const onUpdate = vi.fn()
    render(<ExpirationCard trade={mockTrade} onUpdate={onUpdate} />)

    const button = screen.getByRole('button', { name: /Mark AAPL as expired/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(markExpired).toHaveBeenCalledWith('trade-1')
      expect(onUpdate).toHaveBeenCalled()
    })
  })

  it('displays error message when action fails', async () => {
    const { markExpired } = await import('@/lib/actions/expirations')
    vi.mocked(markExpired).mockResolvedValue({ success: false, error: 'Failed to update' })

    render(<ExpirationCard trade={mockTrade} />)

    const button = screen.getByRole('button', { name: /Mark AAPL as expired/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Failed to update')).toBeInTheDocument()
    })
  })

  it('disables buttons while processing', async () => {
    const { markExpired } = await import('@/lib/actions/expirations')
    vi.mocked(markExpired).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ success: true, data: { id: 'trade-1' } }), 100))
    )

    render(<ExpirationCard trade={mockTrade} />)

    const button = screen.getByRole('button', { name: /Mark AAPL as expired/i })
    fireEvent.click(button)

    // Check immediately after click
    await waitFor(() => {
      expect(button).toBeDisabled()
    })

    // Wait for processing to complete
    await waitFor(() => {
      expect(button).not.toBeDisabled()
    }, { timeout: 200 })
  })

  it('does not render notes section when notes are null', () => {
    const tradeWithoutNotes = { ...mockTrade, notes: null }
    render(<ExpirationCard trade={tradeWithoutNotes} />)

    expect(screen.queryByText('Notes:')).not.toBeInTheDocument()
  })

  it('displays CALL type badge correctly', () => {
    const callTrade = { ...mockTrade, type: 'CALL' as const }
    render(<ExpirationCard trade={callTrade} />)

    const badge = screen.getByText('CALL')
    expect(badge).toHaveClass('bg-purple-100', 'text-purple-800')
  })
})
