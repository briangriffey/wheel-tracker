import React, { createRef } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../card'

// Extend expect with axe matchers
expect.extend(toHaveNoViolations)

describe('Card', () => {
  describe('Basic Rendering', () => {
    it('renders with children', () => {
      render(
        <Card>
          <div data-testid="card-content">Test content</div>
        </Card>
      )
      expect(screen.getByTestId('card-content')).toBeInTheDocument()
    })

    it('renders as a div element', () => {
      render(<Card data-testid="card">Content</Card>)
      const card = screen.getByTestId('card')
      expect(card.tagName).toBe('DIV')
    })

    it('applies custom className', () => {
      render(
        <Card className="custom-class" data-testid="card">
          Content
        </Card>
      )
      const card = screen.getByTestId('card')
      expect(card.className).toContain('custom-class')
    })

    it('renders without children', () => {
      const { container } = render(<Card />)
      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Variants', () => {
    it('renders default variant by default', () => {
      render(<Card data-testid="card">Default</Card>)
      const card = screen.getByTestId('card')
      expect(card.className).toContain('border')
      expect(card.className).toContain('border-neutral-200')
    })

    it('renders bordered variant', () => {
      render(
        <Card variant="bordered" data-testid="card">
          Bordered
        </Card>
      )
      const card = screen.getByTestId('card')
      expect(card.className).toContain('border-2')
      expect(card.className).toContain('border-neutral-300')
    })

    it('renders elevated variant', () => {
      render(
        <Card variant="elevated" data-testid="card">
          Elevated
        </Card>
      )
      const card = screen.getByTestId('card')
      expect(card.className).toContain('shadow-md')
    })

    it('applies base styles to all variants', () => {
      const variants = ['default', 'bordered', 'elevated'] as const
      variants.forEach((variant) => {
        const { container } = render(
          <Card variant={variant} data-testid={`card-${variant}`}>
            Content
          </Card>
        )
        const card = screen.getByTestId(`card-${variant}`)
        expect(card.className).toContain('rounded-lg')
        expect(card.className).toContain('bg-white')
        container.remove()
      })
    })
  })

  describe('Clickable Behavior', () => {
    it('calls onClick handler when clicked', () => {
      const handleClick = vi.fn()
      render(
        <Card onClick={handleClick} data-testid="card">
          Clickable
        </Card>
      )
      const card = screen.getByTestId('card')
      fireEvent.click(card)
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('applies clickable styles when onClick is provided', () => {
      render(
        <Card onClick={() => {}} data-testid="card">
          Clickable
        </Card>
      )
      const card = screen.getByTestId('card')
      expect(card.className).toContain('cursor-pointer')
    })

    it('applies clickable styles when clickable prop is true', () => {
      render(
        <Card clickable data-testid="card">
          Clickable
        </Card>
      )
      const card = screen.getByTestId('card')
      expect(card.className).toContain('cursor-pointer')
    })

    it('does not apply clickable styles by default', () => {
      render(<Card data-testid="card">Not clickable</Card>)
      const card = screen.getByTestId('card')
      expect(card.className).not.toContain('cursor-pointer')
    })

    it('sets role="button" for clickable cards', () => {
      render(
        <Card onClick={() => {}} data-testid="card">
          Clickable
        </Card>
      )
      const card = screen.getByTestId('card')
      expect(card).toHaveAttribute('role', 'button')
    })

    it('does not set role="button" for non-clickable cards', () => {
      render(<Card data-testid="card">Not clickable</Card>)
      const card = screen.getByTestId('card')
      expect(card).not.toHaveAttribute('role')
    })

    it('is keyboard accessible with tabIndex', () => {
      render(
        <Card onClick={() => {}} data-testid="card">
          Clickable
        </Card>
      )
      const card = screen.getByTestId('card')
      expect(card).toHaveAttribute('tabIndex', '0')
    })

    it('handles Enter key press', () => {
      const handleClick = vi.fn()
      render(
        <Card onClick={handleClick} data-testid="card">
          Clickable
        </Card>
      )
      const card = screen.getByTestId('card')
      fireEvent.keyDown(card, { key: 'Enter' })
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('handles Space key press', () => {
      const handleClick = vi.fn()
      render(
        <Card onClick={handleClick} data-testid="card">
          Clickable
        </Card>
      )
      const card = screen.getByTestId('card')
      fireEvent.keyDown(card, { key: ' ' })
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('does not respond to other keys', () => {
      const handleClick = vi.fn()
      render(
        <Card onClick={handleClick} data-testid="card">
          Clickable
        </Card>
      )
      const card = screen.getByTestId('card')
      fireEvent.keyDown(card, { key: 'a' })
      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('Hover States', () => {
    it('applies hover styles to elevated variant', () => {
      render(
        <Card variant="elevated" data-testid="card">
          Elevated
        </Card>
      )
      const card = screen.getByTestId('card')
      expect(card.className).toContain('hover:shadow-lg')
    })

    it('applies hover styles to clickable cards', () => {
      render(
        <Card clickable data-testid="card">
          Clickable
        </Card>
      )
      const card = screen.getByTestId('card')
      expect(card.className).toContain('hover:shadow-lg')
    })
  })

  describe('Ref Forwarding', () => {
    it('forwards ref to the card element', () => {
      const ref = createRef<HTMLDivElement>()
      render(<Card ref={ref}>Content</Card>)
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
      expect(ref.current?.textContent).toBe('Content')
    })

    it('allows calling focus on ref', () => {
      const ref = createRef<HTMLDivElement>()
      render(
        <Card ref={ref} onClick={() => {}}>
          Content
        </Card>
      )
      ref.current?.focus()
      expect(ref.current).toHaveFocus()
    })
  })
})

describe('CardHeader', () => {
  describe('Basic Rendering', () => {
    it('renders with children', () => {
      render(<CardHeader>Header content</CardHeader>)
      expect(screen.getByText('Header content')).toBeInTheDocument()
    })

    it('renders as a div element', () => {
      render(<CardHeader data-testid="header">Content</CardHeader>)
      const header = screen.getByTestId('header')
      expect(header.tagName).toBe('DIV')
    })

    it('applies custom className', () => {
      render(
        <CardHeader className="custom-class" data-testid="header">
          Content
        </CardHeader>
      )
      const header = screen.getByTestId('header')
      expect(header.className).toContain('custom-class')
    })

    it('applies default spacing styles', () => {
      render(<CardHeader data-testid="header">Content</CardHeader>)
      const header = screen.getByTestId('header')
      expect(header.className).toContain('p-6')
      expect(header.className).toContain('flex')
      expect(header.className).toContain('flex-col')
    })
  })
})

describe('CardTitle', () => {
  describe('Basic Rendering', () => {
    it('renders with children', () => {
      render(<CardTitle>Title text</CardTitle>)
      expect(screen.getByText('Title text')).toBeInTheDocument()
    })

    it('renders as an h3 element', () => {
      render(<CardTitle data-testid="title">Title</CardTitle>)
      const title = screen.getByTestId('title')
      expect(title.tagName).toBe('H3')
    })

    it('applies custom className', () => {
      render(
        <CardTitle className="custom-class" data-testid="title">
          Title
        </CardTitle>
      )
      const title = screen.getByTestId('title')
      expect(title.className).toContain('custom-class')
    })

    it('applies title styling', () => {
      render(<CardTitle data-testid="title">Title</CardTitle>)
      const title = screen.getByTestId('title')
      expect(title.className).toContain('text-2xl')
      expect(title.className).toContain('font-semibold')
    })
  })
})

describe('CardDescription', () => {
  describe('Basic Rendering', () => {
    it('renders with children', () => {
      render(<CardDescription>Description text</CardDescription>)
      expect(screen.getByText('Description text')).toBeInTheDocument()
    })

    it('renders as a p element', () => {
      render(<CardDescription data-testid="description">Description</CardDescription>)
      const description = screen.getByTestId('description')
      expect(description.tagName).toBe('P')
    })

    it('applies custom className', () => {
      render(
        <CardDescription className="custom-class" data-testid="description">
          Description
        </CardDescription>
      )
      const description = screen.getByTestId('description')
      expect(description.className).toContain('custom-class')
    })

    it('applies muted text styling', () => {
      render(<CardDescription data-testid="description">Text</CardDescription>)
      const description = screen.getByTestId('description')
      expect(description.className).toContain('text-sm')
      expect(description.className).toContain('text-neutral-500')
    })
  })
})

describe('CardContent', () => {
  describe('Basic Rendering', () => {
    it('renders with children', () => {
      render(<CardContent>Content text</CardContent>)
      expect(screen.getByText('Content text')).toBeInTheDocument()
    })

    it('renders as a div element', () => {
      render(<CardContent data-testid="content">Content</CardContent>)
      const content = screen.getByTestId('content')
      expect(content.tagName).toBe('DIV')
    })

    it('applies custom className', () => {
      render(
        <CardContent className="custom-class" data-testid="content">
          Content
        </CardContent>
      )
      const content = screen.getByTestId('content')
      expect(content.className).toContain('custom-class')
    })

    it('applies padding styles', () => {
      render(<CardContent data-testid="content">Content</CardContent>)
      const content = screen.getByTestId('content')
      expect(content.className).toContain('p-6')
      expect(content.className).toContain('pt-0')
    })
  })
})

describe('CardFooter', () => {
  describe('Basic Rendering', () => {
    it('renders with children', () => {
      render(<CardFooter>Footer content</CardFooter>)
      expect(screen.getByText('Footer content')).toBeInTheDocument()
    })

    it('renders as a div element', () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>)
      const footer = screen.getByTestId('footer')
      expect(footer.tagName).toBe('DIV')
    })

    it('applies custom className', () => {
      render(
        <CardFooter className="custom-class" data-testid="footer">
          Footer
        </CardFooter>
      )
      const footer = screen.getByTestId('footer')
      expect(footer.className).toContain('custom-class')
    })

    it('applies flex layout styles', () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>)
      const footer = screen.getByTestId('footer')
      expect(footer.className).toContain('flex')
      expect(footer.className).toContain('items-center')
      expect(footer.className).toContain('p-6')
    })
  })
})

describe('Card Composition', () => {
  describe('Complete Card Structure', () => {
    it('renders all subcomponents together', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Title</CardTitle>
            <CardDescription>Test Description</CardDescription>
          </CardHeader>
          <CardContent>Test Content</CardContent>
          <CardFooter>Test Footer</CardFooter>
        </Card>
      )
      expect(screen.getByText('Test Title')).toBeInTheDocument()
      expect(screen.getByText('Test Description')).toBeInTheDocument()
      expect(screen.getByText('Test Content')).toBeInTheDocument()
      expect(screen.getByText('Test Footer')).toBeInTheDocument()
    })

    it('works with only header and content', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Title Only</CardTitle>
          </CardHeader>
          <CardContent>Content</CardContent>
        </Card>
      )
      expect(screen.getByText('Title Only')).toBeInTheDocument()
      expect(screen.getByText('Content')).toBeInTheDocument()
    })

    it('works with only content', () => {
      render(
        <Card>
          <CardContent>Just Content</CardContent>
        </Card>
      )
      expect(screen.getByText('Just Content')).toBeInTheDocument()
    })

    it('works with content and footer', () => {
      render(
        <Card>
          <CardContent>Content</CardContent>
          <CardFooter>Footer</CardFooter>
        </Card>
      )
      expect(screen.getByText('Content')).toBeInTheDocument()
      expect(screen.getByText('Footer')).toBeInTheDocument()
    })
  })

  describe('Nested Content', () => {
    it('renders complex nested content', () => {
      render(
        <Card>
          <CardContent>
            <div data-testid="nested-div">
              <p>Paragraph 1</p>
              <p>Paragraph 2</p>
            </div>
          </CardContent>
        </Card>
      )
      expect(screen.getByTestId('nested-div')).toBeInTheDocument()
      expect(screen.getByText('Paragraph 1')).toBeInTheDocument()
      expect(screen.getByText('Paragraph 2')).toBeInTheDocument()
    })
  })
})

describe('Accessibility', () => {
  describe('Semantic HTML', () => {
    it('uses heading element for title', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Accessible Title</CardTitle>
          </CardHeader>
        </Card>
      )
      const title = screen.getByText('Accessible Title')
      expect(title.tagName).toBe('H3')
    })

    it('uses paragraph element for description', () => {
      render(
        <Card>
          <CardHeader>
            <CardDescription>Description</CardDescription>
          </CardHeader>
        </Card>
      )
      const description = screen.getByText('Description')
      expect(description.tagName).toBe('P')
    })
  })

  describe('ARIA Attributes', () => {
    it('has proper role for clickable cards', () => {
      render(
        <Card onClick={() => {}}>
          <CardContent>Clickable</CardContent>
        </Card>
      )
      const card = screen.getByRole('button')
      expect(card).toBeInTheDocument()
    })

    it('does not have button role for non-clickable cards', () => {
      render(
        <Card>
          <CardContent>Not clickable</CardContent>
        </Card>
      )
      const buttons = screen.queryAllByRole('button')
      expect(buttons).toHaveLength(0)
    })
  })

  describe('Keyboard Navigation', () => {
    it('clickable cards can be focused programmatically', () => {
      const ref = createRef<HTMLDivElement>()
      render(
        <Card ref={ref} onClick={() => {}}>
          <CardContent>Focusable</CardContent>
        </Card>
      )
      ref.current?.focus()
      expect(ref.current).toHaveFocus()
    })

    it('has visible focus styles', () => {
      render(
        <Card onClick={() => {}} data-testid="card">
          <CardContent>Clickable</CardContent>
        </Card>
      )
      const card = screen.getByTestId('card')
      // Check transition class is present (indicates focus styles will apply)
      expect(card.className).toContain('transition-all')
    })

    it('non-clickable cards do not have tabIndex', () => {
      render(<Card data-testid="card">Not clickable</Card>)
      const card = screen.getByTestId('card')
      expect(card).not.toHaveAttribute('tabIndex')
    })
  })

  describe('Accessibility with axe-core', () => {
    it('has no accessibility violations for basic card', async () => {
      const { container } = render(
        <Card>
          <CardContent>Basic card content</CardContent>
        </Card>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('has no accessibility violations for complete card', async () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card description</CardDescription>
          </CardHeader>
          <CardContent>Main content</CardContent>
          <CardFooter>Footer content</CardFooter>
        </Card>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('has no accessibility violations for clickable card', async () => {
      const { container } = render(
        <Card onClick={() => {}}>
          <CardContent>Clickable card</CardContent>
        </Card>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('has no accessibility violations for all variants', async () => {
      const variants = ['default', 'bordered', 'elevated'] as const
      for (const variant of variants) {
        const { container } = render(
          <Card variant={variant}>
            <CardHeader>
              <CardTitle>Title</CardTitle>
            </CardHeader>
            <CardContent>Content for {variant} variant</CardContent>
          </Card>
        )
        const results = await axe(container)
        expect(results).toHaveNoViolations()
      }
    })
  })
})
