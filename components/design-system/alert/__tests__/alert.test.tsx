import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Alert, AlertTitle, AlertDescription } from '../alert'

describe('Alert', () => {
  describe('Rendering', () => {
    it('renders alert with default info variant', () => {
      render(
        <Alert>
          <AlertTitle>Test Title</AlertTitle>
          <AlertDescription>Test Description</AlertDescription>
        </Alert>
      )

      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('Test Title')).toBeInTheDocument()
      expect(screen.getByText('Test Description')).toBeInTheDocument()
    })

    it('renders alert with custom className', () => {
      render(
        <Alert className="custom-class">
          <AlertTitle>Test</AlertTitle>
        </Alert>
      )

      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass('custom-class')
    })

    it('renders AlertTitle with custom className', () => {
      render(
        <Alert>
          <AlertTitle className="title-custom">Title</AlertTitle>
        </Alert>
      )

      const title = screen.getByText('Title')
      expect(title).toHaveClass('title-custom')
    })

    it('renders AlertDescription with custom className', () => {
      render(
        <Alert>
          <AlertDescription className="desc-custom">Description</AlertDescription>
        </Alert>
      )

      const description = screen.getByText('Description')
      expect(description).toHaveClass('desc-custom')
    })
  })

  describe('Variants', () => {
    it('renders info variant with correct styling', () => {
      render(
        <Alert variant="info">
          <AlertTitle>Info Alert</AlertTitle>
        </Alert>
      )

      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass('bg-blue-50')
      expect(alert).toHaveClass('border-blue-200')
    })

    it('renders success variant with correct styling', () => {
      render(
        <Alert variant="success">
          <AlertTitle>Success Alert</AlertTitle>
        </Alert>
      )

      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass('bg-green-50')
      expect(alert).toHaveClass('border-green-200')
    })

    it('renders warning variant with correct styling', () => {
      render(
        <Alert variant="warning">
          <AlertTitle>Warning Alert</AlertTitle>
        </Alert>
      )

      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass('bg-yellow-50')
      expect(alert).toHaveClass('border-yellow-200')
    })

    it('renders error variant with correct styling', () => {
      render(
        <Alert variant="error">
          <AlertTitle>Error Alert</AlertTitle>
        </Alert>
      )

      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass('bg-red-50')
      expect(alert).toHaveClass('border-red-200')
    })

    it('renders correct icon for info variant', () => {
      const { container } = render(
        <Alert variant="info">
          <AlertTitle>Info</AlertTitle>
        </Alert>
      )

      // Check for SVG icon presence
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveAttribute('aria-hidden', 'true')
    })

    it('renders correct icon for success variant', () => {
      const { container } = render(
        <Alert variant="success">
          <AlertTitle>Success</AlertTitle>
        </Alert>
      )

      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveAttribute('aria-hidden', 'true')
    })

    it('renders correct icon for warning variant', () => {
      const { container } = render(
        <Alert variant="warning">
          <AlertTitle>Warning</AlertTitle>
        </Alert>
      )

      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveAttribute('aria-hidden', 'true')
    })

    it('renders correct icon for error variant', () => {
      const { container } = render(
        <Alert variant="error">
          <AlertTitle>Error</AlertTitle>
        </Alert>
      )

      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('Dismissible', () => {
    it('does not render dismiss button by default', () => {
      render(
        <Alert>
          <AlertTitle>Test</AlertTitle>
        </Alert>
      )

      expect(screen.queryByLabelText('Dismiss alert')).not.toBeInTheDocument()
    })

    it('renders dismiss button when dismissible is true', () => {
      render(
        <Alert dismissible>
          <AlertTitle>Test</AlertTitle>
        </Alert>
      )

      expect(screen.getByLabelText('Dismiss alert')).toBeInTheDocument()
    })

    it('hides alert when dismiss button is clicked', () => {
      render(
        <Alert dismissible>
          <AlertTitle>Test Alert</AlertTitle>
        </Alert>
      )

      const dismissButton = screen.getByLabelText('Dismiss alert')
      fireEvent.click(dismissButton)

      expect(screen.queryByText('Test Alert')).not.toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('calls onDismiss callback when dismissed', () => {
      const handleDismiss = vi.fn()

      render(
        <Alert dismissible onDismiss={handleDismiss}>
          <AlertTitle>Test</AlertTitle>
        </Alert>
      )

      const dismissButton = screen.getByLabelText('Dismiss alert')
      fireEvent.click(dismissButton)

      expect(handleDismiss).toHaveBeenCalledTimes(1)
    })

    it('dismiss button has proper accessibility attributes', () => {
      render(
        <Alert dismissible>
          <AlertTitle>Test</AlertTitle>
        </Alert>
      )

      const dismissButton = screen.getByLabelText('Dismiss alert')
      expect(dismissButton).toHaveAttribute('type', 'button')
      expect(dismissButton).toHaveAttribute('aria-label', 'Dismiss alert')

      // Check for screen reader text
      expect(screen.getByText('Dismiss')).toHaveClass('sr-only')
    })
  })

  describe('Accessibility', () => {
    it('has role="alert" attribute', () => {
      render(
        <Alert>
          <AlertTitle>Test</AlertTitle>
        </Alert>
      )

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('has aria-live="polite" attribute', () => {
      render(
        <Alert>
          <AlertTitle>Test</AlertTitle>
        </Alert>
      )

      const alert = screen.getByRole('alert')
      expect(alert).toHaveAttribute('aria-live', 'polite')
    })

    it('icons have aria-hidden="true"', () => {
      const { container } = render(
        <Alert variant="success">
          <AlertTitle>Test</AlertTitle>
        </Alert>
      )

      const icons = container.querySelectorAll('svg')
      icons.forEach((icon) => {
        expect(icon).toHaveAttribute('aria-hidden', 'true')
      })
    })
  })

  describe('Component Composition', () => {
    it('renders alert with only title', () => {
      render(
        <Alert>
          <AlertTitle>Only Title</AlertTitle>
        </Alert>
      )

      expect(screen.getByText('Only Title')).toBeInTheDocument()
    })

    it('renders alert with only description', () => {
      render(
        <Alert>
          <AlertDescription>Only Description</AlertDescription>
        </Alert>
      )

      expect(screen.getByText('Only Description')).toBeInTheDocument()
    })

    it('renders alert with title and description', () => {
      render(
        <Alert>
          <AlertTitle>Title</AlertTitle>
          <AlertDescription>Description</AlertDescription>
        </Alert>
      )

      expect(screen.getByText('Title')).toBeInTheDocument()
      expect(screen.getByText('Description')).toBeInTheDocument()
    })

    it('renders alert with multiple descriptions', () => {
      render(
        <Alert>
          <AlertTitle>Title</AlertTitle>
          <AlertDescription>First paragraph</AlertDescription>
          <AlertDescription>Second paragraph</AlertDescription>
        </Alert>
      )

      expect(screen.getByText('First paragraph')).toBeInTheDocument()
      expect(screen.getByText('Second paragraph')).toBeInTheDocument()
    })

    it('renders alert with custom children', () => {
      render(
        <Alert>
          <AlertTitle>Title</AlertTitle>
          <div data-testid="custom-content">Custom Content</div>
        </Alert>
      )

      expect(screen.getByTestId('custom-content')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty children gracefully', () => {
      render(<Alert>{null}</Alert>)

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('can be dismissed multiple times without error', () => {
      const { rerender } = render(
        <Alert dismissible>
          <AlertTitle>Test</AlertTitle>
        </Alert>
      )

      const dismissButton = screen.getByLabelText('Dismiss alert')
      fireEvent.click(dismissButton)

      // Re-render with new key to show alert again
      rerender(
        <Alert dismissible key="new">
          <AlertTitle>Test</AlertTitle>
        </Alert>
      )

      const newDismissButton = screen.getByLabelText('Dismiss alert')
      fireEvent.click(newDismissButton)

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('applies multiple class names correctly', () => {
      render(
        <Alert className="mb-4 shadow-lg">
          <AlertTitle>Test</AlertTitle>
        </Alert>
      )

      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass('mb-4')
      expect(alert).toHaveClass('shadow-lg')
    })
  })
})
