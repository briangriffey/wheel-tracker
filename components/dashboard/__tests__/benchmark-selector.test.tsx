import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BenchmarkSelector } from '../benchmark-selector'

describe('BenchmarkSelector', () => {
  it('renders with default selection', () => {
    const mockOnChange = vi.fn()
    render(<BenchmarkSelector selected="SPY" onChange={mockOnChange} />)

    const select = screen.getByLabelText('Select benchmark to compare against')
    expect(select).toBeInTheDocument()
    expect(select).toHaveValue('SPY')
  })

  it('displays all benchmark options', () => {
    const mockOnChange = vi.fn()
    render(<BenchmarkSelector selected="SPY" onChange={mockOnChange} />)

    const select = screen.getByLabelText('Select benchmark to compare against')
    const options = select.querySelectorAll('option')

    expect(options).toHaveLength(5)
    expect(options[0]).toHaveTextContent('SPY - S&P 500 ETF')
    expect(options[1]).toHaveTextContent('QQQ - Nasdaq-100 ETF')
    expect(options[2]).toHaveTextContent('VTI - Total Stock Market ETF')
    expect(options[3]).toHaveTextContent('DIA - Dow Jones ETF')
    expect(options[4]).toHaveTextContent('IWM - Russell 2000 ETF')
  })

  it('calls onChange when a different benchmark is selected', async () => {
    const user = userEvent.setup()
    const mockOnChange = vi.fn()
    render(<BenchmarkSelector selected="SPY" onChange={mockOnChange} />)

    const select = screen.getByLabelText('Select benchmark to compare against')
    await user.selectOptions(select, 'QQQ')

    expect(mockOnChange).toHaveBeenCalledWith('QQQ')
  })

  it('reflects the selected benchmark', () => {
    const mockOnChange = vi.fn()
    const { rerender } = render(<BenchmarkSelector selected="SPY" onChange={mockOnChange} />)

    expect(screen.getByLabelText('Select benchmark to compare against')).toHaveValue('SPY')

    rerender(<BenchmarkSelector selected="VTI" onChange={mockOnChange} />)
    expect(screen.getByLabelText('Select benchmark to compare against')).toHaveValue('VTI')
  })

  it('has accessible label', () => {
    const mockOnChange = vi.fn()
    render(<BenchmarkSelector selected="SPY" onChange={mockOnChange} />)

    expect(screen.getByText('Compare to:')).toBeInTheDocument()
    expect(screen.getByLabelText('Select benchmark to compare against')).toBeInTheDocument()
  })
})
