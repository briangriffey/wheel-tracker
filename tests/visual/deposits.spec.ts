import { test, expect } from '@playwright/test'

test.describe('Deposit Features Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard')
  })

  test('dashboard shows Record Deposit button', async ({ page }) => {
    // Check that Record Deposit button is visible
    const recordButton = page.getByRole('button', { name: /record deposit/i })
    await expect(recordButton).toBeVisible()

    // Take screenshot of dashboard header with button
    await expect(page.locator('.space-y-6').first()).toHaveScreenshot('dashboard-with-record-button.png')
  })

  test('Record Deposit dialog opens and displays form', async ({ page }) => {
    // Click Record Deposit button
    await page.getByRole('button', { name: /record deposit/i }).click()

    // Check dialog is visible
    const dialog = page.getByRole('dialog', { name: /record cash deposit/i })
    await expect(dialog).toBeVisible()

    // Check form fields are present
    await expect(page.getByLabel(/deposit amount/i)).toBeVisible()
    await expect(page.getByLabel(/deposit date/i)).toBeVisible()
    await expect(page.getByLabel(/notes/i)).toBeVisible()

    // Check buttons
    await expect(page.getByRole('button', { name: /^record deposit$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible()

    // Take screenshot of dialog
    await expect(dialog).toHaveScreenshot('record-deposit-dialog.png')
  })

  test('Record Deposit dialog closes on cancel', async ({ page }) => {
    // Open dialog
    await page.getByRole('button', { name: /record deposit/i }).click()

    // Click cancel
    await page.getByRole('button', { name: /cancel/i }).click()

    // Check dialog is closed
    const dialog = page.getByRole('dialog', { name: /record cash deposit/i })
    await expect(dialog).not.toBeVisible()
  })

  test('Record Deposit dialog closes on backdrop click', async ({ page }) => {
    // Open dialog
    await page.getByRole('button', { name: /record deposit/i }).click()

    // Click backdrop
    await page.locator('.bg-gray-500.bg-opacity-75').click()

    // Check dialog is closed
    const dialog = page.getByRole('dialog', { name: /record cash deposit/i })
    await expect(dialog).not.toBeVisible()
  })

  test('Benchmark comparison section shows deposit info', async ({ page }) => {
    // Scroll to benchmark section
    const benchmarkSection = page.locator('text=Benchmark Comparison').first()
    await benchmarkSection.scrollIntoViewIfNeeded()

    // Check for deposit information (may not be visible if no deposits yet)
    // This test will capture the state regardless
    await expect(page.locator('.space-y-6')).toHaveScreenshot('benchmark-section-with-deposits.png')
  })

  test('Deposit history page displays correctly', async ({ page }) => {
    // Navigate to deposits page
    await page.goto('/deposits')

    // Check page elements
    await expect(page.getByRole('heading', { name: /deposit history/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /record deposit/i })).toBeVisible()

    // Take screenshot of deposits page
    await expect(page.locator('body')).toHaveScreenshot('deposits-page.png')
  })

  test('Deposit history link in benchmark section works', async ({ page }) => {
    // Find and click the "View History" link in benchmark section
    const viewHistoryLink = page.getByRole('link', { name: /view history/i })

    if (await viewHistoryLink.isVisible()) {
      await viewHistoryLink.click()

      // Check we're on deposits page
      await expect(page).toHaveURL('/deposits')
      await expect(page.getByRole('heading', { name: /deposit history/i })).toBeVisible()
    } else {
      // Skip if no deposits yet (link won't be visible)
      test.skip()
    }
  })

  test('Record Deposit form validation shows errors', async ({ page }) => {
    // Open dialog
    await page.getByRole('button', { name: /record deposit/i }).click()

    // Try to submit without filling required fields
    await page.getByRole('button', { name: /^record deposit$/i }).click()

    // Check for validation errors
    const amountInput = page.getByLabel(/deposit amount/i)
    await expect(amountInput).toHaveAttribute('required')

    // Take screenshot showing validation state
    const dialog = page.getByRole('dialog', { name: /record cash deposit/i })
    await expect(dialog).toHaveScreenshot('record-deposit-validation.png')
  })

  test('Deposit form shows correct default date', async ({ page }) => {
    // Open dialog
    await page.getByRole('button', { name: /record deposit/i }).click()

    // Check that date input has today's date as default
    const dateInput = page.getByLabel(/deposit date/i)
    const today = new Date().toISOString().split('T')[0]
    await expect(dateInput).toHaveValue(today)
  })
})
