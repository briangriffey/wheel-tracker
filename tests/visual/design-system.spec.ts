import { test, expect } from '@playwright/test'

/**
 * Visual Regression Tests for Design System Components
 *
 * These tests capture screenshots of all design system components and compare
 * them against baseline images to detect visual regressions.
 *
 * To update baselines: pnpm test:visual:update
 */

test.describe('Design System Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to design system gallery
    await page.goto('/design-system')

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle')
  })

  test('full page screenshot', async ({ page }) => {
    // Take full page screenshot
    await expect(page).toHaveScreenshot('design-system-full-page.png', {
      fullPage: true,
    })
  })

  test('header section', async ({ page }) => {
    const header = page.locator('header')
    await expect(header).toHaveScreenshot('design-system-header.png')
  })

  test('introduction section', async ({ page }) => {
    const intro = page.locator('section').first()
    await expect(intro).toHaveScreenshot('design-system-intro.png')
  })

  test('color palette section', async ({ page }) => {
    const colorSection = page.locator('section').nth(1)
    await expect(colorSection).toHaveScreenshot('design-system-colors.png')
  })

  test.describe('Button Component', () => {
    test('button variants', async ({ page }) => {
      const buttonSection = page.locator('#button')
      await buttonSection.scrollIntoViewIfNeeded()
      await expect(buttonSection).toHaveScreenshot('button-variants.png')
    })

    test('button hover state', async ({ page }) => {
      const primaryButton = page.locator('button:has-text("Primary")').first()
      await primaryButton.scrollIntoViewIfNeeded()
      await primaryButton.hover()
      await expect(primaryButton).toHaveScreenshot('button-primary-hover.png')
    })
  })

  test.describe('Badge Component', () => {
    test('badge variants', async ({ page }) => {
      const badgeSection = page.locator('#badge')
      await badgeSection.scrollIntoViewIfNeeded()
      await expect(badgeSection).toHaveScreenshot('badge-variants.png')
    })
  })

  test.describe('Alert Component', () => {
    test('alert variants', async ({ page }) => {
      const alertSection = page.locator('#alert')
      await alertSection.scrollIntoViewIfNeeded()
      await expect(alertSection).toHaveScreenshot('alert-variants.png')
    })
  })

  test.describe('Input Component', () => {
    test('input sizes and states', async ({ page }) => {
      const inputSection = page.locator('#input')
      await inputSection.scrollIntoViewIfNeeded()
      await expect(inputSection).toHaveScreenshot('input-variants.png')
    })

    test('input focus state', async ({ page }) => {
      const input = page.locator('input[placeholder="Default state"]').first()
      await input.scrollIntoViewIfNeeded()
      await input.focus()
      await expect(input).toHaveScreenshot('input-focus.png')
    })

    test('input error state', async ({ page }) => {
      const errorInput = page.locator('input[placeholder="Error state"]').first()
      await errorInput.scrollIntoViewIfNeeded()
      await expect(errorInput).toHaveScreenshot('input-error.png')
    })
  })

  test.describe('Select Component', () => {
    test('select variants', async ({ page }) => {
      const selectSection = page.locator('#select')
      await selectSection.scrollIntoViewIfNeeded()
      await expect(selectSection).toHaveScreenshot('select-variants.png')
    })
  })

  test.describe('Spinner Component', () => {
    test('spinner sizes', async ({ page }) => {
      const spinnerSection = page.locator('#spinner')
      await spinnerSection.scrollIntoViewIfNeeded()
      await expect(spinnerSection).toHaveScreenshot('spinner-variants.png')
    })
  })

  test.describe('Skeleton Component', () => {
    test('skeleton variants', async ({ page }) => {
      const skeletonSection = page.locator('#skeleton')
      await skeletonSection.scrollIntoViewIfNeeded()
      await expect(skeletonSection).toHaveScreenshot('skeleton-variants.png')
    })
  })

  test.describe('Dialog Component', () => {
    test('dialog closed state', async ({ page }) => {
      const dialogSection = page.locator('#dialog')
      await dialogSection.scrollIntoViewIfNeeded()
      await expect(dialogSection).toHaveScreenshot('dialog-closed.png')
    })

    test('dialog open state', async ({ page }) => {
      const dialogButton = page.locator('button:has-text("Open Dialog")')
      await dialogButton.scrollIntoViewIfNeeded()
      await dialogButton.click()

      // Wait for dialog to be visible
      await page.waitForSelector('[role="dialog"]', { state: 'visible' })

      const dialog = page.locator('[role="dialog"]')
      await expect(dialog).toHaveScreenshot('dialog-open.png')
    })
  })

  test.describe('Modal Component', () => {
    test('modal closed state', async ({ page }) => {
      const modalSection = page.locator('#modal')
      await modalSection.scrollIntoViewIfNeeded()
      await expect(modalSection).toHaveScreenshot('modal-closed.png')
    })

    test('modal open state', async ({ page }) => {
      const modalButton = page.locator('button:has-text("Open Modal")')
      await modalButton.scrollIntoViewIfNeeded()
      await modalButton.click()

      // Wait for modal backdrop
      await page.waitForSelector('[class*="fixed"][class*="inset-0"]', {
        state: 'visible',
      })

      // Screenshot the entire page to capture modal with backdrop
      await expect(page).toHaveScreenshot('modal-open.png')
    })
  })

  test.describe('Empty State Component', () => {
    test('empty state variants', async ({ page }) => {
      const emptyStateSection = page.locator('#empty-state')
      await emptyStateSection.scrollIntoViewIfNeeded()
      await expect(emptyStateSection).toHaveScreenshot('empty-state-variants.png')
    })
  })

  test.describe('Error Message Component', () => {
    test('error message variants', async ({ page }) => {
      const errorSection = page.locator('#error-message')
      await errorSection.scrollIntoViewIfNeeded()
      await expect(errorSection).toHaveScreenshot('error-message-variants.png')
    })
  })

  test.describe('Help Icon Component', () => {
    test('help icon variants', async ({ page }) => {
      const helpSection = page.locator('#help-icon')
      await helpSection.scrollIntoViewIfNeeded()
      await expect(helpSection).toHaveScreenshot('help-icon-variants.png')
    })

    test('help icon tooltip hover', async ({ page }) => {
      const helpIcon = page.locator('[class*="cursor-help"]').first()
      await helpIcon.scrollIntoViewIfNeeded()
      await helpIcon.hover()

      // Wait for tooltip to appear
      await page.waitForTimeout(200)

      await expect(page).toHaveScreenshot('help-icon-tooltip-hover.png')
    })
  })
})
