import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WheelOverview } from '../wheel-overview'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

// Mock server actions
vi.mock('@/lib/actions/wheels', () => ({
  pauseWheel: vi.fn(),
  completeWheel: vi.fn(),
}))

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

const baseWheel = {
  id: 'wheel-1',
  ticker: 'TSLA',
  status: 'ACTIVE',
  cycleCount: 2,
  totalPremiums: 2000,
  totalRealizedPL: 600,
  startedAt: new Date('2024-02-01'),
  lastActivityAt: new Date('2024-07-01'),
  completedAt: null,
  notes: null,
  deployedCapital: 20000,
}

describe('WheelOverview — deployed capital', () => {
  it('shows Capital Deployed metric with dollar amount and percentage', () => {
    render(<WheelOverview wheel={baseWheel} accountValue={50000} />)

    expect(screen.getByText('Capital Deployed')).toBeInTheDocument()
    // Dollar amount shown
    expect(screen.getByText('$20,000.00')).toBeInTheDocument()
    // Percentage: 20000 / 50000 = 40.0%
    expect(screen.getByText('(40.0%)')).toBeInTheDocument()
  })

  it('shows N/A when accountValue is 0', () => {
    render(<WheelOverview wheel={baseWheel} accountValue={0} />)

    expect(screen.getByText('Capital Deployed')).toBeInTheDocument()
    expect(screen.getByText('N/A')).toBeInTheDocument()
  })

  it('calculates percentage correctly for various account values', () => {
    const wheel100 = { ...baseWheel, deployedCapital: 10000 }
    render(<WheelOverview wheel={wheel100} accountValue={40000} />)

    // 10000 / 40000 = 25.0%
    expect(screen.getByText('(25.0%)')).toBeInTheDocument()
  })

  it('renders all 5 metrics including capital deployed', () => {
    render(<WheelOverview wheel={baseWheel} accountValue={50000} />)

    expect(screen.getByText('Cycles Completed')).toBeInTheDocument()
    expect(screen.getByText('Total Realized P&L')).toBeInTheDocument()
    expect(screen.getByText('Total Premiums Collected')).toBeInTheDocument()
    expect(screen.getByText('Avg Cycle P&L')).toBeInTheDocument()
    expect(screen.getByText('Capital Deployed')).toBeInTheDocument()
  })

  it('renders ticker name', () => {
    render(<WheelOverview wheel={baseWheel} accountValue={50000} />)

    expect(screen.getByText('TSLA')).toBeInTheDocument()
  })
})
