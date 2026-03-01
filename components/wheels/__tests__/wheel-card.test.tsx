import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WheelCard } from '../wheel-card'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

const baseWheel = {
  id: 'wheel-1',
  ticker: 'AAPL',
  status: 'ACTIVE',
  cycleCount: 3,
  totalPremiums: 1500,
  totalRealizedPL: 800,
  startedAt: new Date('2024-01-01'),
  lastActivityAt: new Date('2024-06-01'),
  completedAt: null,
  notes: null,
  tradeCount: 5,
  positionCount: 0,
  deployedCapital: 15000,
}

describe('WheelCard — deployed capital', () => {
  it('shows capital deployed percentage when accountValue is positive', () => {
    render(<WheelCard wheel={baseWheel} accountValue={40000} />)

    // 15000 / 40000 = 37.5%
    expect(screen.getByText('37.5%')).toBeInTheDocument()
    expect(screen.getByText('Capital Deployed')).toBeInTheDocument()
  })

  it('hides capital deployed row when accountValue is 0', () => {
    render(<WheelCard wheel={baseWheel} accountValue={0} />)

    expect(screen.queryByText('Capital Deployed')).not.toBeInTheDocument()
  })

  it('hides capital deployed row when deployedCapital is 0', () => {
    const wheelNoCapital = { ...baseWheel, deployedCapital: 0 }
    render(<WheelCard wheel={wheelNoCapital} accountValue={40000} />)

    expect(screen.queryByText('Capital Deployed')).not.toBeInTheDocument()
  })

  it('calculates percentage correctly for 100% deployment', () => {
    const wheelFull = { ...baseWheel, deployedCapital: 40000 }
    render(<WheelCard wheel={wheelFull} accountValue={40000} />)

    expect(screen.getByText('100.0%')).toBeInTheDocument()
  })

  it('rounds percentage to one decimal place', () => {
    const wheelPartial = { ...baseWheel, deployedCapital: 10000 }
    render(<WheelCard wheel={wheelPartial} accountValue={30000} />)

    // 10000 / 30000 = 33.333...% → "33.3%"
    expect(screen.getByText('33.3%')).toBeInTheDocument()
  })

  it('renders ticker and status', () => {
    render(<WheelCard wheel={baseWheel} accountValue={40000} />)

    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('ACTIVE')).toBeInTheDocument()
  })
})
