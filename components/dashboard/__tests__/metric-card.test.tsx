import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MetricCard } from '../metric-card'

describe('MetricCard', () => {
  it('renders title and value correctly', () => {
    render(<MetricCard title="Total P&L" value={1500.5} formatAs="currency" />)

    expect(screen.getByText('Total P&L')).toBeInTheDocument()
    expect(screen.getByText('$1,500.50')).toBeInTheDocument()
  })

  it('formats currency values correctly', () => {
    render(<MetricCard title="Test" value={1234.56} formatAs="currency" />)

    expect(screen.getByText('$1,234.56')).toBeInTheDocument()
  })

  it('formats percentage values correctly', () => {
    render(<MetricCard title="Win Rate" value={75.5} formatAs="percentage" />)

    expect(screen.getByText('75.50%')).toBeInTheDocument()
  })

  it('formats number values correctly', () => {
    render(<MetricCard title="Count" value={42} formatAs="number" />)

    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('displays N/A for null values', () => {
    render(<MetricCard title="Test" value={null} />)

    expect(screen.getByText('N/A')).toBeInTheDocument()
  })

  it('applies green color for positive values when colorize is true', () => {
    render(<MetricCard title="P&L" value={100} formatAs="currency" colorize />)

    const valueElement = screen.getByText('$100.00')
    expect(valueElement).toHaveClass('text-green-600')
  })

  it('applies red color for negative values when colorize is true', () => {
    render(<MetricCard title="P&L" value={-100} formatAs="currency" colorize />)

    const valueElement = screen.getByText('-$100.00')
    expect(valueElement).toHaveClass('text-red-600')
  })

  it('does not apply color when colorize is false', () => {
    render(<MetricCard title="P&L" value={100} formatAs="currency" colorize={false} />)

    const valueElement = screen.getByText('$100.00')
    expect(valueElement).toHaveClass('text-gray-900')
  })

  it('displays subtitle when provided', () => {
    render(<MetricCard title="Test" value={100} subtitle="This is a subtitle" />)

    expect(screen.getByText('This is a subtitle')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    const { container } = render(<MetricCard title="Test" value={100} loading />)

    expect(screen.queryByText('Test')).not.toBeInTheDocument()
    expect(screen.queryByText('$100.00')).not.toBeInTheDocument()
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })
})
