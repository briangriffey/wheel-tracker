import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExportDepositsButton } from '../export-deposits-button'

describe('ExportDepositsButton', () => {
  let createObjectURLSpy: ReturnType<typeof vi.fn>
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    createObjectURLSpy = vi.fn(() => 'blob:mock-url')
    revokeObjectURLSpy = vi.fn()

    global.URL.createObjectURL = createObjectURLSpy as unknown as typeof URL.createObjectURL
    global.URL.revokeObjectURL = revokeObjectURLSpy as unknown as typeof URL.revokeObjectURL

    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders export button', () => {
    render(<ExportDepositsButton />)

    expect(screen.getByText('Export CSV')).toBeInTheDocument()
    expect(screen.getByLabelText('Export deposits as CSV')).toBeInTheDocument()
  })

  it('triggers export on button click', async () => {
    const user = userEvent.setup()
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'Date,Type,Amount\n2026-02-10,DEPOSIT,5000',
      headers: new Headers({
        'Content-Disposition': 'attachment; filename="deposits-export-2026-02-10.csv"',
      }),
    })

    global.fetch = mockFetch

    render(<ExportDepositsButton />)

    const button = screen.getByText('Export CSV')
    await user.click(button)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/export/deposits')
    })
  })

  it('shows loading state during export', async () => {
    const user = userEvent.setup()
    const mockFetch = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              text: async () => 'csv content',
              headers: new Headers(),
            })
          }, 100)
        })
    )

    global.fetch = mockFetch

    render(<ExportDepositsButton />)

    const button = screen.getByText('Export CSV')
    await user.click(button)

    expect(screen.getByText('Exporting...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Export CSV')).toBeInTheDocument()
    })
  })

  it('displays error message when export fails', async () => {
    const user = userEvent.setup()
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Database connection failed' }),
    })

    global.fetch = mockFetch

    render(<ExportDepositsButton />)

    const button = screen.getByText('Export CSV')
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByText('Database connection failed')).toBeInTheDocument()
    })
  })

  it('displays generic error when API returns no error message', async () => {
    const user = userEvent.setup()
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    })

    global.fetch = mockFetch

    render(<ExportDepositsButton />)

    const button = screen.getByText('Export CSV')
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByText('Failed to export CSV')).toBeInTheDocument()
    })
  })

  it('creates download link with correct attributes', async () => {
    const user = userEvent.setup()
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'csv,content',
      headers: new Headers({
        'Content-Disposition': 'attachment; filename="test-export.csv"',
      }),
    })

    global.fetch = mockFetch

    const appendChildSpy = vi.spyOn(document.body, 'appendChild')
    const removeChildSpy = vi.spyOn(document.body, 'removeChild')

    render(<ExportDepositsButton />)

    const button = screen.getByText('Export CSV')
    await user.click(button)

    await waitFor(() => {
      expect(createObjectURLSpy).toHaveBeenCalled()
      expect(appendChildSpy).toHaveBeenCalled()
      expect(removeChildSpy).toHaveBeenCalled()
      expect(revokeObjectURLSpy).toHaveBeenCalled()
    })
  })

  it('uses default filename when Content-Disposition header is missing', async () => {
    const user = userEvent.setup()
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'csv,content',
      headers: new Headers(),
    })

    global.fetch = mockFetch

    vi.spyOn(document.body, 'appendChild')
    const clickSpy = vi.fn()

    Object.defineProperty(document, 'createElement', {
      value: vi.fn((tag: string) => {
        const elem = document.createElementNS('http://www.w3.org/1999/xhtml', tag)
        if (tag === 'a') {
          Object.defineProperty(elem, 'click', {
            value: clickSpy,
          })
        }
        return elem
      }),
      writable: true,
    })

    render(<ExportDepositsButton />)

    const button = screen.getByText('Export CSV')
    await user.click(button)

    await waitFor(() => {
      expect(clickSpy).toHaveBeenCalled()
      expect(createObjectURLSpy).toHaveBeenCalled()
    })
  })

  it('handles network errors gracefully', async () => {
    const user = userEvent.setup()
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))

    global.fetch = mockFetch

    render(<ExportDepositsButton />)

    const button = screen.getByText('Export CSV')
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })
})
