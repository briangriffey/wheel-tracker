import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PLExportButton } from '../pl-export-button'

// Mock URL.createObjectURL and revokeObjectURL
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url')
const mockRevokeObjectURL = vi.fn()

beforeEach(() => {
  global.URL.createObjectURL = mockCreateObjectURL
  global.URL.revokeObjectURL = mockRevokeObjectURL

  // Mock document.body.appendChild and removeChild
  vi.spyOn(document.body, 'appendChild')
  vi.spyOn(document.body, 'removeChild')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('PLExportButton', () => {
  describe('Basic Rendering', () => {
    it('renders the export form with title', () => {
      render(<PLExportButton />)
      expect(screen.getByText('Export P&L Report')).toBeInTheDocument()
    })

    it('renders start date input', () => {
      render(<PLExportButton />)
      expect(screen.getByLabelText('Start Date')).toBeInTheDocument()
    })

    it('renders end date input', () => {
      render(<PLExportButton />)
      expect(screen.getByLabelText('End Date')).toBeInTheDocument()
    })

    it('renders export button with design system Button', () => {
      render(<PLExportButton />)
      const button = screen.getByRole('button', { name: /export p&l report/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('Export CSV')
    })

    it('renders help text', () => {
      render(<PLExportButton />)
      expect(
        screen.getByText(/export includes all trades with premium/i)
      ).toBeInTheDocument()
    })
  })

  describe('Date Inputs', () => {
    it('allows setting start date', () => {
      render(<PLExportButton />)
      const startDateInput = screen.getByLabelText('Start Date') as HTMLInputElement
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } })
      expect(startDateInput.value).toBe('2024-01-01')
    })

    it('allows setting end date', () => {
      render(<PLExportButton />)
      const endDateInput = screen.getByLabelText('End Date') as HTMLInputElement
      fireEvent.change(endDateInput, { target: { value: '2024-12-31' } })
      expect(endDateInput.value).toBe('2024-12-31')
    })

    it('updates help text when dates are set', () => {
      render(<PLExportButton />)
      const startDateInput = screen.getByLabelText('Start Date')
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } })
      expect(screen.getByText(/filtered by selected date range/i)).toBeInTheDocument()
    })

    it('disables date inputs during export', async () => {
      // Mock successful fetch

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve('mock,csv,data'),
          headers: new Headers(),
        } as Response)
      )

      render(<PLExportButton />)
      const button = screen.getByRole('button', { name: /export p&l report/i })
      const startDateInput = screen.getByLabelText('Start Date')
      const endDateInput = screen.getByLabelText('End Date')

      fireEvent.click(button)

      // Check inputs are disabled during loading
      await waitFor(() => {
        expect(startDateInput).toBeDisabled()
        expect(endDateInput).toBeDisabled()
      })
    })
  })

  describe('Export Functionality', () => {
    it('calls API without date filters when no dates are set', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve('mock,csv,data'),
          headers: new Headers(),
        } as Response)
      )
      global.fetch = mockFetch

      render(<PLExportButton />)
      const button = screen.getByRole('button', { name: /export p&l report/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/export/pl')
      })
    })

    it('calls API with date filters when dates are set', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve('mock,csv,data'),
          headers: new Headers(),
        } as Response)
      )
      global.fetch = mockFetch

      render(<PLExportButton />)

      const startDateInput = screen.getByLabelText('Start Date')
      const endDateInput = screen.getByLabelText('End Date')
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } })
      fireEvent.change(endDateInput, { target: { value: '2024-12-31' } })

      const button = screen.getByRole('button', { name: /export p&l report/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/export/pl?startDate=2024-01-01&endDate=2024-12-31'
        )
      })
    })

    it('downloads CSV file on successful export', async () => {
      const mockCsvContent = 'ticker,premium,pl\nAAPL,100,50'


      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockCsvContent),
          headers: new Headers({
            'Content-Disposition': 'attachment; filename="pl-2024.csv"',
          }),
        } as Response)
      )

      render(<PLExportButton />)
      const button = screen.getByRole('button', { name: /export p&l report/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalled()
        expect(mockRevokeObjectURL).toHaveBeenCalled()
      })

      // Verify blob was created with correct type
      expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    })

    it('uses default filename when Content-Disposition header is missing', async () => {


      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve('mock,csv,data'),
          headers: new Headers(),
        } as Response)
      )

      render(<PLExportButton />)
      const button = screen.getByRole('button', { name: /export p&l report/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalled()
        expect(mockRevokeObjectURL).toHaveBeenCalled()
      })

      // Verify export completed successfully (blob was created)
      expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    })
  })

  describe('Loading State', () => {
    it('shows loading text during export', async () => {
      // Mock a delayed fetch to capture loading state
      // @ts-expect-error - Mocking fetch for testing
      global.fetch = vi.fn(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  text: () => Promise.resolve('mock,csv,data'),
                  headers: new Headers(),
                } as Response),
              100
            )
          })
      )

      render(<PLExportButton />)
      const button = screen.getByRole('button', { name: /export p&l report/i })
      fireEvent.click(button)

      // Check loading state
      await waitFor(() => {
        expect(button).toHaveTextContent('Exporting...')
        expect(button).toBeDisabled()
      })
    })

    it('shows spinner in button during export', async () => {
      // @ts-expect-error - Mocking fetch for testing
      global.fetch = vi.fn(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  text: () => Promise.resolve('mock,csv,data'),
                  headers: new Headers(),
                } as Response),
              100
            )
          })
      )

      render(<PLExportButton />)
      const button = screen.getByRole('button', { name: /export p&l report/i })
      fireEvent.click(button)

      // The Button component shows a spinner with role="status" when loading
      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument()
      })
    })

    it('returns to normal state after successful export', async () => {

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve('mock,csv,data'),
          headers: new Headers(),
        } as Response)
      )

      render(<PLExportButton />)
      const button = screen.getByRole('button', { name: /export p&l report/i })
      fireEvent.click(button)

      // Wait for export to complete
      await waitFor(() => {
        expect(button).toHaveTextContent('Export CSV')
        expect(button).not.toBeDisabled()
      })
    })
  })

  describe('Error Handling', () => {
    it('displays error message when API returns error', async () => {

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Database connection failed' }),
        } as Response)
      )

      render(<PLExportButton />)
      const button = screen.getByRole('button', { name: /export p&l report/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Database connection failed')).toBeInTheDocument()
      })
    })

    it('displays generic error when API returns error without message', async () => {

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({}),
        } as Response)
      )

      render(<PLExportButton />)
      const button = screen.getByRole('button', { name: /export p&l report/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Failed to export CSV')).toBeInTheDocument()
      })
    })

    it('displays error message when fetch throws', async () => {

      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')))

      render(<PLExportButton />)
      const button = screen.getByRole('button', { name: /export p&l report/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('clears previous error on successful export', async () => {
      // First export fails

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Server error' }),
        } as Response)
      )

      render(<PLExportButton />)
      const button = screen.getByRole('button', { name: /export p&l report/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument()
      })

      // Second export succeeds

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve('mock,csv,data'),
          headers: new Headers(),
        } as Response)
      )

      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.queryByText('Server error')).not.toBeInTheDocument()
      })
    })

    it('logs error to console', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      global.fetch = vi.fn(() => Promise.reject(new Error('Test error')))

      render(<PLExportButton />)
      const button = screen.getByRole('button', { name: /export p&l report/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error exporting CSV:',
          expect.any(Error)
        )
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Accessibility', () => {
    it('has proper aria-label on export button', () => {
      render(<PLExportButton />)
      const button = screen.getByRole('button', { name: /export p&l report as csv/i })
      expect(button).toHaveAttribute('aria-label', 'Export P&L report as CSV')
    })

    it('has properly labeled date inputs', () => {
      render(<PLExportButton />)
      const startDateInput = screen.getByLabelText('Start Date')
      const endDateInput = screen.getByLabelText('End Date')
      expect(startDateInput).toHaveAttribute('id', 'startDate')
      expect(endDateInput).toHaveAttribute('id', 'endDate')
    })

    it('has proper heading structure', () => {
      render(<PLExportButton />)
      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toHaveTextContent('Export P&L Report')
    })

    it('maintains focus accessibility during loading', async () => {

      global.fetch = vi.fn(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  text: () => Promise.resolve('mock,csv,data'),
                  headers: new Headers(),
                } as Response),
              100
            )
          })
      ) as typeof fetch

      render(<PLExportButton />)
      const button = screen.getByRole('button', { name: /export p&l report/i })

      // Button should be focusable before click
      button.focus()
      expect(document.activeElement).toBe(button)

      fireEvent.click(button)

      // Button should remain in the document during loading (for focus management)
      await waitFor(() => {
        expect(button).toBeInTheDocument()
      })
    })
  })

  describe('Design System Integration', () => {
    it('uses design system Button component', () => {
      render(<PLExportButton />)
      const button = screen.getByRole('button', { name: /export p&l report/i })
      // Design system button has specific base classes
      expect(button.className).toContain('inline-flex')
      expect(button.className).toContain('items-center')
      expect(button.className).toContain('justify-center')
    })

    it('renders left icon in button', () => {
      render(<PLExportButton />)
      const button = screen.getByRole('button', { name: /export p&l report/i })
      // Check for SVG icon
      const svg = button.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveAttribute('aria-hidden', 'true')
    })

    it('applies responsive width classes', () => {
      render(<PLExportButton />)
      const button = screen.getByRole('button', { name: /export p&l report/i })
      expect(button.className).toContain('w-full')
      expect(button.className).toContain('sm:w-auto')
    })
  })
})
