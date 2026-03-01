import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WheelsList } from '../wheels-list'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

interface WheelData {
  id: string
  ticker: string
  status: string
  cycleCount: number
  totalPremiums: number
  totalRealizedPL: number
  startedAt: Date
  lastActivityAt: Date
  completedAt: Date | null
  notes: string | null
  tradeCount: number
  positionCount: number
  deployedCapital: number
}

const makeWheel = (overrides: Partial<WheelData> = {}): WheelData => ({
  id: 'wheel-1',
  ticker: 'AAPL',
  status: 'ACTIVE',
  cycleCount: 2,
  totalPremiums: 1200,
  totalRealizedPL: 500,
  startedAt: new Date('2024-01-01'),
  lastActivityAt: new Date('2024-06-01'),
  completedAt: null,
  notes: null,
  tradeCount: 4,
  positionCount: 0,
  deployedCapital: 12000,
  ...overrides,
})

const baseWheels: WheelData[] = [
  makeWheel({ id: 'wheel-1', ticker: 'AAPL', deployedCapital: 12000 }),
  makeWheel({ id: 'wheel-2', ticker: 'TSLA', status: 'IDLE', deployedCapital: 0 }),
]

describe('WheelsList — deployed capital', () => {
  it('passes accountValue to each WheelCard', () => {
    render(<WheelsList initialWheels={baseWheels} accountValue={40000} />)

    // AAPL: 12000 / 40000 = 30.0%
    expect(screen.getByText('30.0%')).toBeInTheDocument()
  })

  it('renders without errors when accountValue is 0', () => {
    render(<WheelsList initialWheels={baseWheels} accountValue={0} />)

    // With accountValue=0, capital deployed rows should not render
    expect(screen.queryByText('Capital Deployed')).not.toBeInTheDocument()
    // Wheels still render
    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('TSLA')).toBeInTheDocument()
  })

  it('renders summary stats correctly', () => {
    render(<WheelsList initialWheels={baseWheels} accountValue={40000} />)

    expect(screen.getByText('Active Wheels')).toBeInTheDocument()
    expect(screen.getByText('Idle Wheels')).toBeInTheDocument()
    // "Total Premiums" appears in the summary card header
    expect(screen.getAllByText('Total Premiums').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Total Realized P&L')).toBeInTheDocument()
  })

  it('shows empty state when no wheels', () => {
    render(<WheelsList initialWheels={[]} accountValue={40000} />)

    expect(screen.getByText(/wheels found/)).toBeInTheDocument()
  })

  it('filters wheels by status tab', async () => {
    const user = userEvent.setup()
    render(<WheelsList initialWheels={baseWheels} accountValue={40000} />)

    const activeTab = screen.getByRole('button', { name: /^Active/ })
    await user.click(activeTab)

    // Only AAPL is ACTIVE, TSLA is IDLE
    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.queryByText('TSLA')).not.toBeInTheDocument()
  })
})
