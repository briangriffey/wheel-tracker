import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Card, CardHeader, CardBody, CardFooter } from '../card'

describe('Card', () => {
  describe('Basic Rendering', () => {
    it('renders children correctly', () => {
      render(<Card>Test Card Content</Card>)
      expect(screen.getByText('Test Card Content')).toBeInTheDocument()
    })

    it('renders as a div by default', () => {
      const { container } = render(<Card>Content</Card>)
      const card = container.firstChild
      expect(card?.nodeName).toBe('DIV')
    })

    it('applies testId when provided', () => {
      render(<Card testId="test-card">Content</Card>)
      expect(screen.getByTestId('test-card')).toBeInTheDocument()
    })
  })

  describe('Variants', () => {
    it('renders default variant with correct classes', () => {
      const { container } = render(<Card variant="default">Default</Card>)
      const card = container.firstChild as HTMLElement
      expect(card).toHaveClass('bg-white', 'border', 'border-gray-200', 'shadow-sm')
    })

    it('renders bordered variant with correct classes', () => {
      const { container } = render(<Card variant="bordered">Bordered</Card>)
      const card = container.firstChild as HTMLElement
      expect(card).toHaveClass('bg-white', 'border-2', 'border-gray-300')
    })

    it('renders elevated variant with correct classes', () => {
      const { container } = render(<Card variant="elevated">Elevated</Card>)
      const card = container.firstChild as HTMLElement
      expect(card).toHaveClass('bg-white', 'border', 'border-gray-100', 'shadow-lg')
    })

    it('renders flat variant with correct classes', () => {
      const { container } = render(<Card variant="flat">Flat</Card>)
      const card = container.firstChild as HTMLElement
      expect(card).toHaveClass('bg-gray-50', 'border', 'border-transparent')
    })
  })

  describe('Padding', () => {
    it('renders with no padding when padding is none', () => {
      const { container } = render(<Card padding="none">No Padding</Card>)
      const card = container.firstChild as HTMLElement
      expect(card).not.toHaveClass('p-3', 'p-4', 'p-6')
    })

    it('renders with small padding', () => {
      const { container } = render(<Card padding="sm">Small Padding</Card>)
      const card = container.firstChild as HTMLElement
      expect(card).toHaveClass('p-3')
    })

    it('renders with medium padding by default', () => {
      const { container } = render(<Card>Default Padding</Card>)
      const card = container.firstChild as HTMLElement
      expect(card).toHaveClass('p-4')
    })

    it('renders with large padding', () => {
      const { container } = render(<Card padding="lg">Large Padding</Card>)
      const card = container.firstChild as HTMLElement
      expect(card).toHaveClass('p-6')
    })
  })

  describe('Interactive Functionality', () => {
    it('does not apply interactive styles when interactive is false', () => {
      const { container } = render(<Card interactive={false}>Not Interactive</Card>)
      const card = container.firstChild as HTMLElement
      expect(card).not.toHaveClass('hover:shadow-md', 'cursor-pointer')
    })

    it('applies interactive styles when interactive is true', () => {
      const { container } = render(
        <Card interactive onClick={() => {}}>
          Interactive
        </Card>
      )
      const card = container.firstChild as HTMLElement
      expect(card).toHaveClass('hover:shadow-md', 'cursor-pointer')
    })

    it('renders as button when interactive and onClick are provided', () => {
      const { container } = render(
        <Card interactive onClick={() => {}}>
          Button Card
        </Card>
      )
      const card = container.firstChild
      expect(card?.nodeName).toBe('BUTTON')
    })

    it('calls onClick when clicked and interactive is true', async () => {
      const user = userEvent.setup()
      const onClick = vi.fn()
      render(
        <Card interactive onClick={onClick}>
          Click Me
        </Card>
      )

      const card = screen.getByText('Click Me')
      await user.click(card)

      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('does not call onClick when interactive is false', async () => {
      const user = userEvent.setup()
      const onClick = vi.fn()
      render(
        <Card interactive={false} onClick={onClick}>
          Not Clickable
        </Card>
      )

      const card = screen.getByText('Not Clickable')
      await user.click(card)

      expect(onClick).not.toHaveBeenCalled()
    })
  })

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      const { container } = render(<Card className="custom-class">Custom</Card>)
      const card = container.firstChild as HTMLElement
      expect(card).toHaveClass('custom-class')
    })

    it('preserves base classes when custom className is applied', () => {
      const { container } = render(<Card className="custom-class">Custom</Card>)
      const card = container.firstChild as HTMLElement
      expect(card).toHaveClass('rounded-lg', 'transition-all')
    })
  })

  describe('Variant and Padding Combinations', () => {
    it('correctly combines variant and padding classes', () => {
      const { container } = render(
        <Card variant="elevated" padding="lg">
          Elevated Large
        </Card>
      )
      const card = container.firstChild as HTMLElement
      expect(card).toHaveClass('shadow-lg', 'p-6')
    })
  })

  describe('CardHeader', () => {
    it('renders children correctly', () => {
      render(
        <CardHeader>
          <h3>Header Title</h3>
        </CardHeader>
      )
      expect(screen.getByText('Header Title')).toBeInTheDocument()
    })

    it('applies default border and spacing classes', () => {
      const { container } = render(<CardHeader>Header</CardHeader>)
      const header = container.firstChild as HTMLElement
      expect(header).toHaveClass('border-b', 'border-gray-200', 'pb-3', 'mb-3')
    })

    it('applies custom className', () => {
      const { container } = render(<CardHeader className="custom-header">Header</CardHeader>)
      const header = container.firstChild as HTMLElement
      expect(header).toHaveClass('custom-header')
    })
  })

  describe('CardBody', () => {
    it('renders children correctly', () => {
      render(
        <CardBody>
          <p>Body content</p>
        </CardBody>
      )
      expect(screen.getByText('Body content')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(<CardBody className="custom-body">Body</CardBody>)
      const body = container.firstChild as HTMLElement
      expect(body).toHaveClass('custom-body')
    })
  })

  describe('CardFooter', () => {
    it('renders children correctly', () => {
      render(
        <CardFooter>
          <button>Footer Action</button>
        </CardFooter>
      )
      expect(screen.getByText('Footer Action')).toBeInTheDocument()
    })

    it('applies default border and spacing classes', () => {
      const { container } = render(<CardFooter>Footer</CardFooter>)
      const footer = container.firstChild as HTMLElement
      expect(footer).toHaveClass('border-t', 'border-gray-200', 'pt-3', 'mt-3')
    })

    it('applies custom className', () => {
      const { container } = render(<CardFooter className="custom-footer">Footer</CardFooter>)
      const footer = container.firstChild as HTMLElement
      expect(footer).toHaveClass('custom-footer')
    })
  })

  describe('Composed Card Structure', () => {
    it('renders complete card with header, body, and footer', () => {
      render(
        <Card>
          <CardHeader>
            <h3>Title</h3>
          </CardHeader>
          <CardBody>
            <p>Content</p>
          </CardBody>
          <CardFooter>
            <button>Action</button>
          </CardFooter>
        </Card>
      )

      expect(screen.getByText('Title')).toBeInTheDocument()
      expect(screen.getByText('Content')).toBeInTheDocument()
      expect(screen.getByText('Action')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has focus styles on interactive card', () => {
      const { container } = render(
        <Card interactive onClick={() => {}}>
          Focus Test
        </Card>
      )
      const card = container.firstChild as HTMLElement
      expect(card).toHaveClass('focus:outline-none', 'focus:ring-2')
    })

    it('button type is set correctly for interactive cards', () => {
      const { container } = render(
        <Card interactive onClick={() => {}}>
          Button Card
        </Card>
      )
      const card = container.firstChild as HTMLElement
      expect(card).toHaveAttribute('type', 'button')
    })
  })
})
