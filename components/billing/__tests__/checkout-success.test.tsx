import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CheckoutSuccess } from '../checkout-success'

vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}))

describe('CheckoutSuccess', () => {
  it('renders welcome message', () => {
    render(<CheckoutSuccess />)
    expect(screen.getByText('Welcome to Pro!')).toBeInTheDocument()
  })

  it('renders upgrade confirmation text', () => {
    render(<CheckoutSuccess />)
    expect(screen.getByText(/unlimited trade tracking/)).toBeInTheDocument()
  })

  it('renders navigation links', () => {
    render(<CheckoutSuccess />)
    expect(screen.getByRole('link', { name: /start tracking trades/i })).toHaveAttribute('href', '/trades/new')
    expect(screen.getByRole('link', { name: /go to dashboard/i })).toHaveAttribute('href', '/dashboard')
  })
})
