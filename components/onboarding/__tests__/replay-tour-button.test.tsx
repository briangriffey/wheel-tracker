import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ReplayTourButton } from '../replay-tour-button'

const mockPush = vi.fn()

vi.mock('@/lib/actions/onboarding', () => ({
  resetOnboarding: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

import { resetOnboarding } from '@/lib/actions/onboarding'
import toast from 'react-hot-toast'

describe('ReplayTourButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders "Replay Intro Tour" text', () => {
    render(<ReplayTourButton />)

    expect(screen.getByRole('button', { name: /replay intro tour/i })).toBeInTheDocument()
  })

  it('calls resetOnboarding when clicked', async () => {
    render(<ReplayTourButton />)

    fireEvent.click(screen.getByRole('button', { name: /replay intro tour/i }))

    await vi.waitFor(() => {
      expect(resetOnboarding).toHaveBeenCalledTimes(1)
    })
  })

  it('redirects to /dashboard on success', async () => {
    render(<ReplayTourButton />)

    fireEvent.click(screen.getByRole('button', { name: /replay intro tour/i }))

    await vi.waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('shows error toast on failure', async () => {
    vi.mocked(resetOnboarding).mockResolvedValueOnce({ success: false, error: 'Failed to reset onboarding' })

    render(<ReplayTourButton />)

    fireEvent.click(screen.getByRole('button', { name: /replay intro tour/i }))

    await vi.waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to reset onboarding')
    })
  })

  it('shows loading state while processing', async () => {
    let resolveReset: (value: { success: true }) => void
    vi.mocked(resetOnboarding).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveReset = resolve
      })
    )

    render(<ReplayTourButton />)

    fireEvent.click(screen.getByRole('button'))

    expect(screen.getByRole('button')).toHaveTextContent('Resetting...')
    expect(screen.getByRole('button')).toBeDisabled()

    resolveReset!({ success: true })

    await vi.waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })
})
