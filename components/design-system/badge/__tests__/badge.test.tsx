import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Badge } from '../badge'

describe('Badge', () => {
  describe('Basic Rendering', () => {
    it('renders children correctly', () => {
      render(<Badge>Test Badge</Badge>)
      expect(screen.getByText('Test Badge')).toBeInTheDocument()
    })

    it('has correct ARIA attributes', () => {
      render(<Badge>Status</Badge>)
      const badge = screen.getByRole('status')
      expect(badge).toHaveAttribute('aria-label', 'Badge: Status')
    })
  })

  describe('Variants', () => {
    it('renders default variant with correct classes', () => {
      const { container } = render(<Badge variant="default">Default</Badge>)
      const badge = container.querySelector('span')
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-800', 'border-gray-200')
    })

    it('renders success variant with correct classes', () => {
      const { container } = render(<Badge variant="success">Success</Badge>)
      const badge = container.querySelector('span')
      expect(badge).toHaveClass('bg-green-50', 'text-green-800', 'border-green-200')
    })

    it('renders error variant with correct classes', () => {
      const { container } = render(<Badge variant="error">Error</Badge>)
      const badge = container.querySelector('span')
      expect(badge).toHaveClass('bg-red-50', 'text-red-800', 'border-red-200')
    })

    it('renders warning variant with correct classes', () => {
      const { container } = render(<Badge variant="warning">Warning</Badge>)
      const badge = container.querySelector('span')
      expect(badge).toHaveClass('bg-yellow-50', 'text-yellow-800', 'border-yellow-200')
    })

    it('renders info variant with correct classes', () => {
      const { container } = render(<Badge variant="info">Info</Badge>)
      const badge = container.querySelector('span')
      expect(badge).toHaveClass('bg-blue-50', 'text-blue-800', 'border-blue-200')
    })

    it('renders outline variant with correct classes', () => {
      const { container } = render(<Badge variant="outline">Outline</Badge>)
      const badge = container.querySelector('span')
      expect(badge).toHaveClass('bg-transparent', 'text-gray-700', 'border-gray-300')
    })
  })

  describe('Sizes', () => {
    it('renders small size with correct classes', () => {
      const { container } = render(<Badge size="sm">Small</Badge>)
      const badge = container.querySelector('span')
      expect(badge).toHaveClass('px-2', 'py-0.5', 'text-xs', 'rounded')
    })

    it('renders medium size with correct classes', () => {
      const { container } = render(<Badge size="md">Medium</Badge>)
      const badge = container.querySelector('span')
      expect(badge).toHaveClass('px-2.5', 'py-1', 'text-sm', 'rounded-md')
    })

    it('renders large size with correct classes', () => {
      const { container } = render(<Badge size="lg">Large</Badge>)
      const badge = container.querySelector('span')
      expect(badge).toHaveClass('px-3', 'py-1.5', 'text-base', 'rounded-lg')
    })

    it('uses medium size by default', () => {
      const { container } = render(<Badge>Default Size</Badge>)
      const badge = container.querySelector('span')
      expect(badge).toHaveClass('px-2.5', 'py-1', 'text-sm', 'rounded-md')
    })
  })

  describe('Removable Functionality', () => {
    it('does not show close button when removable is false', () => {
      render(<Badge removable={false}>Not Removable</Badge>)
      expect(screen.queryByLabelText('Remove badge')).not.toBeInTheDocument()
    })

    it('shows close button when removable is true', () => {
      render(<Badge removable>Removable</Badge>)
      expect(screen.getByLabelText('Remove badge')).toBeInTheDocument()
    })

    it('calls onRemove when close button is clicked', async () => {
      const user = userEvent.setup()
      const onRemove = vi.fn()
      render(
        <Badge removable onRemove={onRemove}>
          Remove Me
        </Badge>
      )

      const closeButton = screen.getByLabelText('Remove badge')
      await user.click(closeButton)

      expect(onRemove).toHaveBeenCalledTimes(1)
    })

    it('renders close button icon with correct size for small badge', () => {
      const { container } = render(
        <Badge size="sm" removable>
          Small
        </Badge>
      )
      const icon = container.querySelector('svg')
      expect(icon).toHaveClass('h-3', 'w-3')
    })

    it('renders close button icon with correct size for medium badge', () => {
      const { container } = render(
        <Badge size="md" removable>
          Medium
        </Badge>
      )
      const icon = container.querySelector('svg')
      expect(icon).toHaveClass('h-3.5', 'w-3.5')
    })

    it('renders close button icon with correct size for large badge', () => {
      const { container } = render(
        <Badge size="lg" removable>
          Large
        </Badge>
      )
      const icon = container.querySelector('svg')
      expect(icon).toHaveClass('h-4', 'w-4')
    })
  })

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      const { container } = render(<Badge className="custom-class">Custom</Badge>)
      const badge = container.querySelector('span')
      expect(badge).toHaveClass('custom-class')
    })

    it('preserves base classes when custom className is applied', () => {
      const { container } = render(<Badge className="custom-class">Custom</Badge>)
      const badge = container.querySelector('span')
      expect(badge).toHaveClass('inline-flex', 'items-center', 'font-medium', 'border')
    })
  })

  describe('Variant and Size Combinations', () => {
    it('correctly combines variant and size classes', () => {
      const { container } = render(
        <Badge variant="success" size="lg">
          Large Success
        </Badge>
      )
      const badge = container.querySelector('span')
      expect(badge).toHaveClass('bg-green-50', 'text-green-800', 'px-3', 'py-1.5')
    })
  })

  describe('Accessibility', () => {
    it('close button has proper accessibility attributes', () => {
      render(<Badge removable>Accessible</Badge>)
      const closeButton = screen.getByLabelText('Remove badge')
      expect(closeButton).toHaveAttribute('type', 'button')
      expect(closeButton).toHaveAttribute('aria-label', 'Remove badge')
    })

    it('has focus styles on close button', () => {
      const { container } = render(<Badge removable>Focus Test</Badge>)
      const closeButton = container.querySelector('button')
      expect(closeButton).toHaveClass('focus:outline-none', 'focus:ring-2')
    })
  })
})
