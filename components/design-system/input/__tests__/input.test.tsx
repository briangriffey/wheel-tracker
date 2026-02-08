import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Input } from '../input'

describe('Input', () => {
  it('renders basic input', () => {
    render(<Input placeholder="Enter text" />)
    const input = screen.getByPlaceholderText('Enter text')
    expect(input).toBeInTheDocument()
  })

  it('renders with error state', () => {
    render(<Input error="This field is required" id="test-input" />)
    const errorMessage = screen.getByText('This field is required')
    expect(errorMessage).toBeInTheDocument()

    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', 'test-input-error')
  })

  it('renders with help text', () => {
    render(<Input helpText="Enter your email" id="test-input" />)
    const helpText = screen.getByText('Enter your email')
    expect(helpText).toBeInTheDocument()

    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('aria-describedby', 'test-input-help')
  })

  it('renders with prefix', () => {
    render(<Input prefix="$" placeholder="Amount" />)
    const prefix = screen.getByText('$')
    expect(prefix).toBeInTheDocument()
  })

  it('renders disabled state', () => {
    render(<Input disabled placeholder="Disabled input" />)
    const input = screen.getByPlaceholderText('Disabled input')
    expect(input).toBeDisabled()
  })

  it('applies size variants correctly', () => {
    const { rerender } = render(<Input size="sm" data-testid="input" />)
    let input = screen.getByTestId('input')
    expect(input).toHaveClass('h-8', 'text-sm')

    rerender(<Input size="md" data-testid="input" />)
    input = screen.getByTestId('input')
    expect(input).toHaveClass('h-10', 'text-base')

    rerender(<Input size="lg" data-testid="input" />)
    input = screen.getByTestId('input')
    expect(input).toHaveClass('h-12', 'text-lg')
  })

  it('applies state variants correctly', () => {
    const { rerender } = render(<Input state="default" data-testid="input" />)
    let input = screen.getByTestId('input')
    expect(input).toHaveClass('border-neutral-300')

    rerender(<Input state="error" data-testid="input" />)
    input = screen.getByTestId('input')
    expect(input).toHaveClass('border-error')

    rerender(<Input state="success" data-testid="input" />)
    input = screen.getByTestId('input')
    expect(input).toHaveClass('border-success')
  })

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLInputElement>()
    render(<Input ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })
})
