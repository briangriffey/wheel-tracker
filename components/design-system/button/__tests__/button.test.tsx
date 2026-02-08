import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { axe } from 'jest-axe'
import { Button } from '../button'

// Mock icon component for testing
const TestIcon = () => <svg data-testid="test-icon" />

describe('Button', () => {
  describe('Basic Rendering', () => {
    it('renders with text content', () => {
      render(<Button>Click me</Button>)
      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
    })

    it('renders as a button element', () => {
      render(<Button>Test</Button>)
      const button = screen.getByRole('button')
      expect(button.tagName).toBe('BUTTON')
    })

    it('applies custom className', () => {
      render(<Button className="custom-class">Test</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('custom-class')
    })

    it('sets default type to button', () => {
      render(<Button>Test</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('type', 'button')
    })

    it('allows custom type attribute', () => {
      render(<Button type="submit">Submit</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('type', 'submit')
    })
  })

  describe('Variants', () => {
    it('renders primary variant by default', () => {
      render(<Button>Primary</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('bg-primary-500')
    })

    it('renders secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('bg-accent-500')
    })

    it('renders outline variant', () => {
      render(<Button variant="outline">Outline</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('border-2')
      expect(button.className).toContain('border-neutral-300')
    })

    it('renders ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('bg-transparent')
    })

    it('renders destructive variant', () => {
      render(<Button variant="destructive">Delete</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('bg-red-600')
    })
  })

  describe('Sizes', () => {
    it('renders medium size by default', () => {
      render(<Button>Medium</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('h-10')
      expect(button.className).toContain('px-4')
    })

    it('renders small size', () => {
      render(<Button size="sm">Small</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('h-8')
      expect(button.className).toContain('px-3')
      expect(button.className).toContain('text-sm')
    })

    it('renders large size', () => {
      render(<Button size="lg">Large</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('h-12')
      expect(button.className).toContain('px-6')
      expect(button.className).toContain('text-lg')
    })
  })

  describe('Loading State', () => {
    it('shows loading spinner when loading', () => {
      render(<Button loading>Loading</Button>)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('disables button when loading', () => {
      render(<Button loading>Loading</Button>)
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('sets aria-busy attribute when loading', () => {
      render(<Button loading>Loading</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-busy', 'true')
    })

    it('hides left icon when loading', () => {
      render(
        <Button loading leftIcon={<TestIcon />}>
          Loading
        </Button>
      )
      expect(screen.queryByTestId('test-icon')).not.toBeInTheDocument()
    })

    it('still shows right icon when loading', () => {
      render(
        <Button loading rightIcon={<TestIcon />}>
          Loading
        </Button>
      )
      expect(screen.getByTestId('test-icon')).toBeInTheDocument()
    })

    it('still shows button text when loading', () => {
      render(<Button loading>Saving changes</Button>)
      expect(screen.getByText('Saving changes')).toBeInTheDocument()
    })
  })

  describe('Disabled State', () => {
    it('disables button when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>)
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('sets aria-disabled attribute when disabled', () => {
      render(<Button disabled>Disabled</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-disabled', 'true')
    })

    it('applies disabled styles', () => {
      render(<Button disabled>Disabled</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('disabled:opacity-50')
      expect(button.className).toContain('disabled:cursor-not-allowed')
    })

    it('does not trigger onClick when disabled', () => {
      const handleClick = vi.fn()
      render(
        <Button disabled onClick={handleClick}>
          Disabled
        </Button>
      )
      const button = screen.getByRole('button')
      fireEvent.click(button)
      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('Icons', () => {
    it('renders left icon', () => {
      render(<Button leftIcon={<TestIcon />}>With Icon</Button>)
      expect(screen.getByTestId('test-icon')).toBeInTheDocument()
    })

    it('renders right icon', () => {
      render(<Button rightIcon={<TestIcon />}>With Icon</Button>)
      expect(screen.getByTestId('test-icon')).toBeInTheDocument()
    })

    it('renders both left and right icons', () => {
      render(
        <Button
          leftIcon={<svg data-testid="left-icon" />}
          rightIcon={<svg data-testid="right-icon" />}
        >
          With Icons
        </Button>
      )
      expect(screen.getByTestId('left-icon')).toBeInTheDocument()
      expect(screen.getByTestId('right-icon')).toBeInTheDocument()
    })

    it('renders without text (icon only)', () => {
      render(<Button leftIcon={<TestIcon />} aria-label="Icon button" />)
      expect(screen.getByTestId('test-icon')).toBeInTheDocument()
      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })

  describe('Event Handlers', () => {
    it('triggers onClick handler when clicked', () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Click me</Button>)
      const button = screen.getByRole('button')
      fireEvent.click(button)
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('does not trigger onClick when loading', () => {
      const handleClick = vi.fn()
      render(
        <Button loading onClick={handleClick}>
          Loading
        </Button>
      )
      const button = screen.getByRole('button')
      fireEvent.click(button)
      expect(handleClick).not.toHaveBeenCalled()
    })

    it('forwards additional props to button element', () => {
      render(
        <Button data-testid="custom-button" aria-label="Custom label">
          Test
        </Button>
      )
      const button = screen.getByTestId('custom-button')
      expect(button).toHaveAttribute('aria-label', 'Custom label')
    })
  })

  describe('Accessibility', () => {
    it('has proper button role', () => {
      render(<Button>Accessible</Button>)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('supports aria-label', () => {
      render(<Button aria-label="Custom label">Icon</Button>)
      expect(screen.getByLabelText('Custom label')).toBeInTheDocument()
    })

    it('has focus styles', () => {
      render(<Button>Focus me</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('focus:outline-none')
      expect(button.className).toContain('focus:ring-2')
    })

    it('indicates loading state with aria-busy', () => {
      render(<Button loading>Loading</Button>)
      expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
    })

    it('indicates disabled state with aria-disabled', () => {
      render(<Button disabled>Disabled</Button>)
      expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true')
    })
  })

  describe('Variant and Size Combinations', () => {
    it('combines primary variant with small size', () => {
      render(
        <Button variant="primary" size="sm">
          Primary Small
        </Button>
      )
      const button = screen.getByRole('button')
      expect(button.className).toContain('bg-primary-500')
      expect(button.className).toContain('h-8')
    })

    it('combines destructive variant with large size', () => {
      render(
        <Button variant="destructive" size="lg">
          Delete Large
        </Button>
      )
      const button = screen.getByRole('button')
      expect(button.className).toContain('bg-red-600')
      expect(button.className).toContain('h-12')
    })

    it('combines outline variant with loading state', () => {
      render(
        <Button variant="outline" loading>
          Loading
        </Button>
      )
      const button = screen.getByRole('button')
      expect(button.className).toContain('border-2')
      expect(button).toBeDisabled()
      expect(screen.getByRole('status')).toBeInTheDocument()
    })
  })

  describe('Ref Forwarding', () => {
    it('forwards ref to button element', () => {
      const ref = React.createRef<HTMLButtonElement>()
      render(<Button ref={ref}>Test</Button>)
      expect(ref.current).toBeInstanceOf(HTMLButtonElement)
      expect(ref.current?.tagName).toBe('BUTTON')
    })

    it('allows calling focus() on ref', () => {
      const ref = React.createRef<HTMLButtonElement>()
      render(<Button ref={ref}>Test</Button>)
      ref.current?.focus()
      expect(document.activeElement).toBe(ref.current)
    })
  })

  describe('Keyboard Navigation', () => {
    it('can be focused programmatically', () => {
      render(<Button>Focusable</Button>)
      const button = screen.getByRole('button')
      button.focus()
      expect(document.activeElement).toBe(button)
    })

    it('is keyboard accessible (not disabled by default)', () => {
      render(<Button>Accessible</Button>)
      const button = screen.getByRole('button')
      expect(button).not.toHaveAttribute('disabled')
      expect(button).not.toHaveAttribute('tabindex', '-1')
    })

    it('disabled button cannot be focused', () => {
      render(<Button disabled>Disabled</Button>)
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('loading button cannot be focused', () => {
      render(<Button loading>Loading</Button>)
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('shows visible focus ring styles', () => {
      render(<Button>Focus Ring</Button>)
      const button = screen.getByRole('button')
      button.focus()
      expect(button).toHaveFocus()
      expect(button.className).toContain('focus:ring-2')
      expect(button.className).toContain('focus:outline-none')
    })

    it('focus ring is visible for keyboard users (not outline-none only)', () => {
      render(<Button>Focus Visible</Button>)
      const button = screen.getByRole('button')
      // Ensure focus styles are present
      expect(button.className).toContain('focus:ring')
    })
  })

  describe('Accessibility with axe-core', () => {
    it('has no accessibility violations in default state', async () => {
      const { container } = render(<Button>Accessible Button</Button>)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('has no violations with icon only button', async () => {
      const { container } = render(<Button aria-label="Icon button" leftIcon={<TestIcon />} />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('has no violations in disabled state', async () => {
      const { container } = render(<Button disabled>Disabled Button</Button>)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('has no violations in loading state', async () => {
      const { container } = render(<Button loading>Loading Button</Button>)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('has no violations with all variants', async () => {
      const variants = ['primary', 'secondary', 'outline', 'ghost', 'destructive'] as const
      for (const variant of variants) {
        const { container } = render(<Button variant={variant}>{variant} Button</Button>)
        const results = await axe(container)
        expect(results).toHaveNoViolations()
      }
    })

    it('has no violations with all sizes', async () => {
      const sizes = ['sm', 'md', 'lg'] as const
      for (const size of sizes) {
        const { container } = render(<Button size={size}>{size} Button</Button>)
        const results = await axe(container)
        expect(results).toHaveNoViolations()
      }
    })
  })
})
