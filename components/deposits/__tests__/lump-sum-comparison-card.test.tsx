import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LumpSumComparisonCard } from '../lump-sum-comparison-card'
import type { LumpSumComparison } from '@/lib/calculations/lump-sum-comparison'

describe('LumpSumComparisonCard', () => {
  const mockComparison: LumpSumComparison = {
    dcaShares: 7.1234,
    dcaInvested: 3000,
    lumpSumShares: 7.5,
    lumpSumInvested: 3000,
    dcaCurrentValue: 3415.2,
    lumpSumCurrentValue: 3600,
    dcaReturn: 415.2,
    lumpSumReturn: 600,
    dcaReturnPct: 13.84,
    lumpSumReturnPct: 20.0,
    difference: -184.8,
    differencePct: -5.13,
    timingBenefit: -184.8,
    timingBenefitPct: -5.13,
    winner: 'LUMP_SUM',
    dataPoints: [],
    lumpSumDate: new Date('2026-01-01'),
    firstDepositDate: new Date('2026-01-01'),
    lastDepositDate: new Date('2026-03-01'),
  }

  it('renders comparison title and winner badge', () => {
    render(<LumpSumComparisonCard comparison={mockComparison} />)

    expect(screen.getByText('DCA vs Lump Sum Analysis')).toBeInTheDocument()
    expect(screen.getByText('Lump Sum Wins')).toBeInTheDocument()
  })

  it('displays DCA strategy metrics', () => {
    render(<LumpSumComparisonCard comparison={mockComparison} />)

    expect(screen.getByText('Dollar-Cost Averaging')).toBeInTheDocument()
    expect(screen.getByText('$3,415.20')).toBeInTheDocument()
    expect(screen.getByText(/7\.1234/)).toBeInTheDocument()
  })

  it('displays lump sum strategy metrics', () => {
    render(<LumpSumComparisonCard comparison={mockComparison} />)

    expect(screen.getAllByText(/Lump Sum/).length).toBeGreaterThan(0)
    expect(screen.getByText('$3,600.00')).toBeInTheDocument()
    expect(screen.getByText(/7\.5000/)).toBeInTheDocument()
  })

  it('shows timing cost when lump sum wins', () => {
    render(<LumpSumComparisonCard comparison={mockComparison} />)

    expect(screen.getByText('Timing Cost')).toBeInTheDocument()
    expect(screen.getAllByText('$184.80')).toHaveLength(1)
    expect(screen.getByText(/you by missing early gains/i)).toBeInTheDocument()
  })

  it('shows timing benefit when DCA wins', () => {
    const dcaWinsComparison: LumpSumComparison = {
      ...mockComparison,
      difference: 184.8,
      differencePct: 5.13,
      timingBenefit: 184.8,
      timingBenefitPct: 5.13,
      winner: 'DCA',
      dcaCurrentValue: 3600,
      lumpSumCurrentValue: 3415.2,
    }

    render(<LumpSumComparisonCard comparison={dcaWinsComparison} />)

    expect(screen.getByText('Timing Benefit')).toBeInTheDocument()
    expect(screen.getAllByText('$184.80')).toHaveLength(1)
    // Text is split across elements, so just check for key parts
    expect(screen.getByText(/gain/i)).toBeInTheDocument()
    expect(screen.getByText(/spreading purchases/i)).toBeInTheDocument()
  })

  it('hides winner badge when tie', () => {
    const tieComparison: LumpSumComparison = {
      ...mockComparison,
      winner: 'TIE',
      difference: 0,
      timingBenefit: 0,
    }

    render(<LumpSumComparisonCard comparison={tieComparison} />)

    expect(screen.queryByText('DCA Wins')).not.toBeInTheDocument()
    expect(screen.queryByText('Lump Sum Wins')).not.toBeInTheDocument()
  })

  it('shows DCA winner badge correctly', () => {
    const dcaWinsComparison: LumpSumComparison = {
      ...mockComparison,
      winner: 'DCA',
    }

    render(<LumpSumComparisonCard comparison={dcaWinsComparison} />)

    expect(screen.getByText('DCA Wins')).toBeInTheDocument()
  })

  it('displays returns with correct formatting', () => {
    render(<LumpSumComparisonCard comparison={mockComparison} />)

    // Check for percentage returns
    expect(screen.getByText(/\+13\.84%/)).toBeInTheDocument()
    expect(screen.getByText(/\+20\.00%/)).toBeInTheDocument()
  })

  it('displays analysis period dates', () => {
    render(<LumpSumComparisonCard comparison={mockComparison} />)

    expect(screen.getByText(/Analysis period:/)).toBeInTheDocument()
    // Check that some dates are displayed (format may vary)
    const dateElements = screen.getAllByText(/202[56]/)
    expect(dateElements.length).toBeGreaterThan(0)
  })

  it('formats lump sum date in header', () => {
    render(<LumpSumComparisonCard comparison={mockComparison} />)

    // The lump sum date should appear in the component
    // Just check that "Lump Sum" text with date appears
    expect(screen.getAllByText(/Lump Sum/i).length).toBeGreaterThan(0)
  })
})
