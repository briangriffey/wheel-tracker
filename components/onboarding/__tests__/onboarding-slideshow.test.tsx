import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OnboardingSlideshow } from '../onboarding-slideshow'

// Mock the server action
vi.mock('@/lib/actions/onboarding', () => ({
  completeOnboarding: vi.fn().mockResolvedValue({ success: true }),
}))

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

import { completeOnboarding } from '@/lib/actions/onboarding'

describe('OnboardingSlideshow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset body overflow in case a previous test left it locked
    document.body.style.overflow = ''
  })

  it('renders the first slide on open', () => {
    render(<OnboardingSlideshow isOpen={true} />)

    expect(screen.getByText('Welcome to GreekWheel')).toBeInTheDocument()
    expect(
      screen.getByText(/Your personal tracker for the options wheel strategy/)
    ).toBeInTheDocument()
  })

  it('does not render when isOpen is false', () => {
    render(<OnboardingSlideshow isOpen={false} />)

    expect(screen.queryByText('Welcome to GreekWheel')).not.toBeInTheDocument()
  })

  it('shows the Skip link on every slide', () => {
    render(<OnboardingSlideshow isOpen={true} />)

    expect(screen.getByRole('button', { name: /skip onboarding/i })).toBeInTheDocument()
  })

  it('hides Back button on the first slide', () => {
    render(<OnboardingSlideshow isOpen={true} />)

    expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument()
  })

  it('navigates forward when Next is clicked', () => {
    render(<OnboardingSlideshow isOpen={true} />)

    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    expect(screen.getByText('Track Your Wheel Rotations')).toBeInTheDocument()
  })

  it('navigates backward when Back is clicked', () => {
    render(<OnboardingSlideshow isOpen={true} />)

    // Go to slide 2
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText('Track Your Wheel Rotations')).toBeInTheDocument()

    // Go back to slide 1
    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(screen.getByText('Welcome to GreekWheel')).toBeInTheDocument()
  })

  it('shows 6 progress dots', () => {
    render(<OnboardingSlideshow isOpen={true} />)

    const dots = screen.getAllByRole('tab')
    expect(dots).toHaveLength(6)
  })

  it('clicking a progress dot jumps to that slide', () => {
    render(<OnboardingSlideshow isOpen={true} />)

    // Click dot 4 (index 3 = slide 4)
    const dots = screen.getAllByRole('tab')
    fireEvent.click(dots[3])

    expect(screen.getByText('Log Your Trades')).toBeInTheDocument()
  })

  it('shows CTA buttons on the final slide', () => {
    render(<OnboardingSlideshow isOpen={true} />)

    // Navigate to slide 6
    const dots = screen.getAllByRole('tab')
    fireEvent.click(dots[5])

    expect(screen.getByRole('button', { name: /record a deposit/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create a trade/i })).toBeInTheDocument()
    expect(screen.getByText(/explore on my own/i)).toBeInTheDocument()
  })

  it('does not show Next or Back buttons on the final slide', () => {
    render(<OnboardingSlideshow isOpen={true} />)

    const dots = screen.getAllByRole('tab')
    fireEvent.click(dots[5])

    expect(screen.queryByRole('button', { name: /^next$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^back$/i })).not.toBeInTheDocument()
  })

  it('calls completeOnboarding when Skip is clicked', async () => {
    render(<OnboardingSlideshow isOpen={true} />)

    fireEvent.click(screen.getByRole('button', { name: /skip onboarding/i }))

    // Allow async completeOnboarding to be called
    await vi.waitFor(() => {
      expect(completeOnboarding).toHaveBeenCalledTimes(1)
    })
  })

  it('navigates forward with ArrowRight key', () => {
    render(<OnboardingSlideshow isOpen={true} />)

    fireEvent.keyDown(document, { key: 'ArrowRight' })

    expect(screen.getByText('Track Your Wheel Rotations')).toBeInTheDocument()
  })

  it('navigates backward with ArrowLeft key', () => {
    render(<OnboardingSlideshow isOpen={true} />)

    // Move to slide 2 first
    fireEvent.keyDown(document, { key: 'ArrowRight' })
    expect(screen.getByText('Track Your Wheel Rotations')).toBeInTheDocument()

    // Go back
    fireEvent.keyDown(document, { key: 'ArrowLeft' })
    expect(screen.getByText('Welcome to GreekWheel')).toBeInTheDocument()
  })

  it('calls completeOnboarding when Escape is pressed', async () => {
    render(<OnboardingSlideshow isOpen={true} />)

    fireEvent.keyDown(document, { key: 'Escape' })

    await vi.waitFor(() => {
      expect(completeOnboarding).toHaveBeenCalledTimes(1)
    })
  })

  it('calls completeOnboarding and navigates when Record a Deposit is clicked', async () => {
    render(<OnboardingSlideshow isOpen={true} />)

    const dots = screen.getAllByRole('tab')
    fireEvent.click(dots[5])

    fireEvent.click(screen.getByRole('button', { name: /record a deposit/i }))

    await vi.waitFor(() => {
      expect(completeOnboarding).toHaveBeenCalledTimes(1)
      expect(mockPush).toHaveBeenCalledWith('/deposits')
    })
  })

  it('calls completeOnboarding and navigates when Create a Trade is clicked', async () => {
    render(<OnboardingSlideshow isOpen={true} />)

    const dots = screen.getAllByRole('tab')
    fireEvent.click(dots[5])

    fireEvent.click(screen.getByRole('button', { name: /create a trade/i }))

    await vi.waitFor(() => {
      expect(completeOnboarding).toHaveBeenCalledTimes(1)
      expect(mockPush).toHaveBeenCalledWith('/trades/new')
    })
  })
})
