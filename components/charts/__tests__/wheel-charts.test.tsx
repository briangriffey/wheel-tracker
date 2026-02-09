import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WheelCharts } from '../wheel-charts'

const mockWheelData = {
  trades: [
    {
      id: '1',
      type: 'PUT',
      action: 'SELL_TO_OPEN',
      status: 'CLOSED',
      strikePrice: 150,
      premium: 500,
      contracts: 1,
      expirationDate: new Date('2024-02-01'),
      openDate: new Date('2024-01-01'),
      closeDate: new Date('2024-01-15'),
    },
    {
      id: '2',
      type: 'CALL',
      action: 'SELL_TO_OPEN',
      status: 'CLOSED',
      strikePrice: 155,
      premium: 300,
      contracts: 1,
      expirationDate: new Date('2024-03-01'),
      openDate: new Date('2024-02-01'),
      closeDate: new Date('2024-02-15'),
    },
    {
      id: '3',
      type: 'PUT',
      action: 'SELL_TO_OPEN',
      status: 'ASSIGNED',
      strikePrice: 150,
      premium: 400,
      contracts: 1,
      expirationDate: new Date('2024-03-15'),
      openDate: new Date('2024-03-01'),
      closeDate: null,
    },
  ],
  positions: [
    {
      id: '1',
      shares: 100,
      costBasis: 150,
      totalCost: 15000,
      status: 'CLOSED',
      realizedGainLoss: 800,
      acquiredDate: new Date('2024-01-15'),
      closedDate: new Date('2024-02-28'),
    },
    {
      id: '2',
      shares: 100,
      costBasis: 150,
      totalCost: 15000,
      status: 'CLOSED',
      realizedGainLoss: -200,
      acquiredDate: new Date('2024-03-01'),
      closedDate: new Date('2024-04-15'),
    },
  ],
  startedAt: new Date('2024-01-01'),
}

describe('WheelCharts', () => {
  it('renders all four chart sections', () => {
    render(<WheelCharts wheelData={mockWheelData} />)

    expect(screen.getByText('P&L Over Time')).toBeInTheDocument()
    expect(screen.getByText('Premiums by Month')).toBeInTheDocument()
    expect(screen.getByText('Win Rate')).toBeInTheDocument()
    expect(screen.getByText('Cycle Duration')).toBeInTheDocument()
  })

  it('displays loading state when loading prop is true', () => {
    render(<WheelCharts wheelData={mockWheelData} loading={true} />)

    // Loading state shows skeleton UI
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('shows empty state when no closed trades exist', () => {
    const emptyData = {
      trades: [],
      positions: [],
      startedAt: new Date('2024-01-01'),
    }

    render(<WheelCharts wheelData={emptyData} />)

    expect(screen.getByText('No closed trades yet')).toBeInTheDocument()
  })

  it('calculates and displays win rate correctly', () => {
    render(<WheelCharts wheelData={mockWheelData} />)

    // 1 winner out of 2 closed positions = 50% win rate
    expect(screen.getByText('50.0%')).toBeInTheDocument()
    expect(screen.getByText(/1 winners out of 2 closed positions/)).toBeInTheDocument()
  })

  it('shows empty state for win rate when no closed positions exist', () => {
    const dataWithoutClosedPositions = {
      ...mockWheelData,
      positions: [
        {
          id: '1',
          shares: 100,
          costBasis: 150,
          totalCost: 15000,
          status: 'OPEN',
          realizedGainLoss: null,
          acquiredDate: new Date('2024-01-15'),
          closedDate: null,
        },
      ],
    }

    render(<WheelCharts wheelData={dataWithoutClosedPositions} />)

    expect(screen.getByText('No closed positions yet')).toBeInTheDocument()
  })

  it('displays premiums by month', () => {
    render(<WheelCharts wheelData={mockWheelData} />)

    // Should have a chart showing monthly premium data
    expect(screen.getByText('Premiums by Month')).toBeInTheDocument()
  })

  it('shows empty state when no premium data available', () => {
    const dataWithoutPremiums = {
      trades: [
        {
          id: '1',
          type: 'PUT',
          action: 'BUY_TO_CLOSE',
          status: 'CLOSED',
          strikePrice: 150,
          premium: -500, // Negative premium (buying to close)
          contracts: 1,
          expirationDate: new Date('2024-02-01'),
          openDate: new Date('2024-01-01'),
          closeDate: new Date('2024-01-15'),
        },
      ],
      positions: [],
      startedAt: new Date('2024-01-01'),
    }

    render(<WheelCharts wheelData={dataWithoutPremiums} />)

    expect(screen.getByText('No premium data available')).toBeInTheDocument()
  })

  it('displays cycle duration chart with average', () => {
    render(<WheelCharts wheelData={mockWheelData} />)

    expect(screen.getByText('Cycle Duration')).toBeInTheDocument()
    expect(screen.getByText('Average cycle duration')).toBeInTheDocument()
  })

  it('shows empty state when no completed cycles exist', () => {
    const dataWithoutCompletedCycles = {
      ...mockWheelData,
      positions: [],
    }

    render(<WheelCharts wheelData={dataWithoutCompletedCycles} />)

    expect(screen.getByText('No completed cycles yet')).toBeInTheDocument()
  })
})
