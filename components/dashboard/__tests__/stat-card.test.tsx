import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatCard } from '../stat-card'

describe('StatCard', () => {
  it('renders label and value correctly', () => {
    render(<StatCard label="Active Positions" value={5} />)

    expect(screen.getByText('Active Positions')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('formats currency values correctly', () => {
    render(<StatCard label="Premium" value={1234.56} formatAs="currency" />)

    expect(screen.getByText('$1,234.56')).toBeInTheDocument()
  })

  it('formats percentage values correctly', () => {
    render(<StatCard label="Win Rate" value={75.5} formatAs="percentage" />)

    expect(screen.getByText('75.50%')).toBeInTheDocument()
  })

  it('formats number values with commas', () => {
    render(<StatCard label="Count" value={1000} formatAs="number" />)

    expect(screen.getByText('1,000')).toBeInTheDocument()
  })

  it('displays N/A for null values', () => {
    render(<StatCard label="Test" value={null} />)

    expect(screen.getByText('N/A')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    const { container } = render(<StatCard label="Test" value={100} loading />)

    expect(screen.queryByText('Test')).not.toBeInTheDocument()
    expect(screen.queryByText('100')).not.toBeInTheDocument()
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })
})
