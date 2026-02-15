import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Input, InputLabel, InputError, InputGroup } from '../input'

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

  it('renders with success state', () => {
    render(<Input state="success" data-testid="input" />)
    const input = screen.getByTestId('input')
    expect(input).toHaveClass('border-success')
    expect(input).toHaveAttribute('aria-invalid', 'false')
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

  it('renders with suffix', () => {
    render(<Input suffix=".com" placeholder="Domain" />)
    const suffix = screen.getByText('.com')
    expect(suffix).toBeInTheDocument()
  })

  it('renders with both prefix and suffix', () => {
    render(<Input prefix="$" suffix=".00" placeholder="Price" />)
    const prefix = screen.getByText('$')
    const suffix = screen.getByText('.00')
    expect(prefix).toBeInTheDocument()
    expect(suffix).toBeInTheDocument()
  })

  it('renders disabled state', () => {
    render(<Input disabled placeholder="Disabled input" />)
    const input = screen.getByPlaceholderText('Disabled input')
    expect(input).toBeDisabled()
  })

  it('renders readonly state', () => {
    render(<Input readOnly placeholder="Readonly input" />)
    const input = screen.getByPlaceholderText('Readonly input')
    expect(input).toHaveAttribute('readonly')
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

  it('error prop overrides state prop', () => {
    render(<Input state="success" error="Error message" data-testid="input" />)
    const input = screen.getByTestId('input')
    expect(input).toHaveClass('border-error')
    expect(screen.getByText('Error message')).toBeInTheDocument()
  })

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLInputElement>()
    render(<Input ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })
})

describe('InputLabel', () => {
  it('renders label text', () => {
    render(<InputLabel htmlFor="email">Email Address</InputLabel>)
    const label = screen.getByText('Email Address')
    expect(label).toBeInTheDocument()
    expect(label.tagName).toBe('LABEL')
    expect(label).toHaveAttribute('for', 'email')
  })

  it('renders required indicator', () => {
    render(
      <InputLabel htmlFor="password" required>
        Password
      </InputLabel>
    )
    const label = screen.getByText('Password')
    const asterisk = screen.getByLabelText('required')
    expect(label).toBeInTheDocument()
    expect(asterisk).toBeInTheDocument()
    expect(asterisk).toHaveTextContent('*')
  })

  it('does not render required indicator by default', () => {
    render(<InputLabel htmlFor="username">Username</InputLabel>)
    const asterisk = screen.queryByLabelText('required')
    expect(asterisk).not.toBeInTheDocument()
  })

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLLabelElement>()
    render(<InputLabel ref={ref}>Label</InputLabel>)
    expect(ref.current).toBeInstanceOf(HTMLLabelElement)
  })

  it('applies custom className', () => {
    render(<InputLabel className="custom-class">Label</InputLabel>)
    const label = screen.getByText('Label')
    expect(label).toHaveClass('custom-class')
  })
})

describe('InputError', () => {
  it('renders error message', () => {
    render(<InputError>This field is required</InputError>)
    const error = screen.getByText('This field is required')
    expect(error).toBeInTheDocument()
    expect(error).toHaveAttribute('role', 'alert')
  })

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLParagraphElement>()
    render(<InputError ref={ref}>Error</InputError>)
    expect(ref.current).toBeInstanceOf(HTMLParagraphElement)
  })

  it('applies custom className', () => {
    render(<InputError className="custom-error">Error</InputError>)
    const error = screen.getByText('Error')
    expect(error).toHaveClass('custom-error')
  })

  it('applies correct styling', () => {
    render(<InputError id="test-error">Error message</InputError>)
    const error = screen.getByText('Error message')
    expect(error).toHaveClass('text-error', 'text-sm')
  })
})

describe('InputGroup', () => {
  it('renders children', () => {
    render(
      <InputGroup>
        <Input placeholder="Test input" />
      </InputGroup>
    )
    const input = screen.getByPlaceholderText('Test input')
    expect(input).toBeInTheDocument()
  })

  it('renders label when provided', () => {
    render(
      <InputGroup label="Email Address" htmlFor="email">
        <Input id="email" />
      </InputGroup>
    )
    const label = screen.getByText('Email Address')
    expect(label).toBeInTheDocument()
    expect(label).toHaveAttribute('for', 'email')
  })

  it('renders required indicator on label', () => {
    render(
      <InputGroup label="Password" required htmlFor="password">
        <Input id="password" type="password" />
      </InputGroup>
    )
    const asterisk = screen.getByLabelText('required')
    expect(asterisk).toBeInTheDocument()
  })

  it('renders error message', () => {
    render(
      <InputGroup label="Email" error="Email is required" htmlFor="email">
        <Input id="email" />
      </InputGroup>
    )
    const error = screen.getByText('Email is required')
    expect(error).toBeInTheDocument()
    expect(error).toHaveAttribute('role', 'alert')
    expect(error).toHaveAttribute('id', 'email-error')
  })

  it('renders help text when no error', () => {
    render(
      <InputGroup label="Username" helpText="Choose a unique username" htmlFor="username">
        <Input id="username" />
      </InputGroup>
    )
    const helpText = screen.getByText('Choose a unique username')
    expect(helpText).toBeInTheDocument()
    expect(helpText).toHaveAttribute('id', 'username-help')
  })

  it('hides help text when error is present', () => {
    render(
      <InputGroup
        label="Email"
        error="Email is required"
        helpText="Enter your email"
        htmlFor="email"
      >
        <Input id="email" />
      </InputGroup>
    )
    const error = screen.getByText('Email is required')
    const helpText = screen.queryByText('Enter your email')
    expect(error).toBeInTheDocument()
    expect(helpText).not.toBeInTheDocument()
  })

  it('works without label', () => {
    render(
      <InputGroup error="This field is required">
        <Input placeholder="Unlabeled input" />
      </InputGroup>
    )
    const input = screen.getByPlaceholderText('Unlabeled input')
    const error = screen.getByText('This field is required')
    expect(input).toBeInTheDocument()
    expect(error).toBeInTheDocument()
  })

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>()
    render(
      <InputGroup ref={ref}>
        <Input />
      </InputGroup>
    )
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('applies custom className', () => {
    render(
      <InputGroup className="custom-group" data-testid="group">
        <Input />
      </InputGroup>
    )
    const group = screen.getByTestId('group')
    expect(group).toHaveClass('custom-group')
  })
})

describe('Input Integration with InputGroup', () => {
  it('works together for complete form field', () => {
    render(
      <InputGroup label="Email Address" required error="Invalid email format" htmlFor="email">
        <Input id="email" type="email" placeholder="you@example.com" />
      </InputGroup>
    )

    const label = screen.getByText('Email Address')
    const input = screen.getByPlaceholderText('you@example.com')
    const error = screen.getByText('Invalid email format')
    const asterisk = screen.getByLabelText('required')

    expect(label).toBeInTheDocument()
    expect(input).toBeInTheDocument()
    expect(error).toBeInTheDocument()
    expect(asterisk).toBeInTheDocument()
  })
})
