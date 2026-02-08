import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Select } from '../select'

describe('Select', () => {
  it('renders basic select', () => {
    render(
      <Select>
        <option value="">Choose option</option>
        <option value="1">Option 1</option>
        <option value="2">Option 2</option>
      </Select>
    )
    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()
    expect(screen.getByText('Choose option')).toBeInTheDocument()
    expect(screen.getByText('Option 1')).toBeInTheDocument()
    expect(screen.getByText('Option 2')).toBeInTheDocument()
  })

  it('renders with error state', () => {
    render(
      <Select error="This field is required" id="test-select">
        <option value="">Choose option</option>
      </Select>
    )
    const errorMessage = screen.getByText('This field is required')
    expect(errorMessage).toBeInTheDocument()

    const select = screen.getByRole('combobox')
    expect(select).toHaveAttribute('aria-invalid', 'true')
    expect(select).toHaveAttribute('aria-describedby', 'test-select-error')
  })

  it('renders with help text', () => {
    render(
      <Select helpText="Choose your option" id="test-select">
        <option value="1">Option 1</option>
      </Select>
    )
    const helpText = screen.getByText('Choose your option')
    expect(helpText).toBeInTheDocument()

    const select = screen.getByRole('combobox')
    expect(select).toHaveAttribute('aria-describedby', 'test-select-help')
  })

  it('renders disabled state', () => {
    render(
      <Select disabled>
        <option value="1">Option 1</option>
      </Select>
    )
    const select = screen.getByRole('combobox')
    expect(select).toBeDisabled()
  })

  it('applies size variants correctly', () => {
    const { rerender } = render(
      <Select size="sm" data-testid="select">
        <option value="1">Option 1</option>
      </Select>
    )
    let select = screen.getByTestId('select')
    expect(select).toHaveClass('h-8', 'text-sm')

    rerender(
      <Select size="md" data-testid="select">
        <option value="1">Option 1</option>
      </Select>
    )
    select = screen.getByTestId('select')
    expect(select).toHaveClass('h-10', 'text-base')

    rerender(
      <Select size="lg" data-testid="select">
        <option value="1">Option 1</option>
      </Select>
    )
    select = screen.getByTestId('select')
    expect(select).toHaveClass('h-12', 'text-lg')
  })

  it('applies state variants correctly', () => {
    const { rerender } = render(
      <Select state="default" data-testid="select">
        <option value="1">Option 1</option>
      </Select>
    )
    let select = screen.getByTestId('select')
    expect(select).toHaveClass('border-neutral-300')

    rerender(
      <Select state="error" data-testid="select">
        <option value="1">Option 1</option>
      </Select>
    )
    select = screen.getByTestId('select')
    expect(select).toHaveClass('border-error')

    rerender(
      <Select state="success" data-testid="select">
        <option value="1">Option 1</option>
      </Select>
    )
    select = screen.getByTestId('select')
    expect(select).toHaveClass('border-success')
  })

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLSelectElement>()
    render(
      <Select ref={ref}>
        <option value="1">Option 1</option>
      </Select>
    )
    expect(ref.current).toBeInstanceOf(HTMLSelectElement)
  })
})
