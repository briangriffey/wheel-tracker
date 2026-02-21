import { test, expect, Page } from '@playwright/test'

const TEST_USER = {
  name: 'E2E Nav Tester',
  email: 'e2e-mobile-nav@test.local',
  password: 'TestPassword123!',
}

async function ensureRegistered(page: Page) {
  await page.goto('/register')
  await page.getByLabel('Name').fill(TEST_USER.name)
  await page.getByLabel('Email address').fill(TEST_USER.email)
  await page.getByLabel('Password').fill(TEST_USER.password)
  await page.getByRole('button', { name: 'Create account' }).click()

  // Either redirects to login (success) or shows "already exists" (fine)
  await Promise.race([
    page.waitForURL('**/login**'),
    page.getByText('User with this email already exists').waitFor(),
  ])
}

async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email address').fill(TEST_USER.email)
  await page.getByLabel('Password').fill(TEST_USER.password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard')
  // Wait for React hydration — the hamburger button must have its click handler
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Open menu' }).waitFor({ state: 'visible' })
}

// Run serially so registration happens once before the rest
test.describe.configure({ mode: 'serial' })

test.describe('Mobile Navigation', () => {
  test('setup: register test user', async ({ page }) => {
    await ensureRegistered(page)
  })

  test('hamburger menu button is visible on mobile', async ({ page }) => {
    await login(page)
    const menuButton = page.getByRole('button', { name: 'Open menu' })
    await expect(menuButton).toBeVisible()
  })

  test('nav links are not visible when menu is closed', async ({ page }) => {
    await login(page)
    const mobileNav = page.getByRole('navigation', { name: 'Mobile navigation' })
    await expect(mobileNav).not.toBeVisible()
  })

  test('UserMenu is not visible on mobile', async ({ page }) => {
    await login(page)
    const userMenu = page.getByRole('navigation', { name: 'User menu' })
    await expect(userMenu).not.toBeVisible()
  })

  test('clicking hamburger opens the menu with all nav links', async ({ page }) => {
    await login(page)
    await page.getByRole('button', { name: 'Open menu' }).click()

    const mobileNav = page.getByRole('navigation', { name: 'Mobile navigation' })
    await expect(mobileNav).toBeVisible()

    await expect(mobileNav.getByText('Dashboard')).toBeVisible()
    await expect(mobileNav.getByText('Trades')).toBeVisible()
    await expect(mobileNav.getByText('Positions')).toBeVisible()
    await expect(mobileNav.getByText('Wheels')).toBeVisible()
    await expect(mobileNav.getByText('Deposits')).toBeVisible()
    await expect(mobileNav.getByText('Help')).toBeVisible()
    await expect(mobileNav.getByText('Billing')).toBeVisible()
  })

  test('open menu shows user name and Sign Out', async ({ page }) => {
    await login(page)
    await page.getByRole('button', { name: 'Open menu' }).click()

    const mobileNav = page.getByRole('navigation', { name: 'Mobile navigation' })
    await expect(mobileNav.getByText(TEST_USER.name)).toBeVisible()
    await expect(mobileNav.getByText('Sign Out')).toBeVisible()
  })

  test('clicking a nav link navigates and closes the menu', async ({ page }) => {
    await login(page)
    await page.getByRole('button', { name: 'Open menu' }).click()

    const mobileNav = page.getByRole('navigation', { name: 'Mobile navigation' })
    await mobileNav.getByText('Trades').click()

    // Menu should close
    await expect(mobileNav).not.toBeVisible()

    // Should have navigated to trades
    await expect(page).toHaveURL(/\/trades/)
  })

  test('clicking X button closes the menu', async ({ page }) => {
    await login(page)
    await page.getByRole('button', { name: 'Open menu' }).click()

    const mobileNav = page.getByRole('navigation', { name: 'Mobile navigation' })
    await expect(mobileNav).toBeVisible()

    await page.getByRole('button', { name: 'Close menu' }).click()
    await expect(mobileNav).not.toBeVisible()
  })

  test('hamburger button has correct aria-expanded state', async ({ page }) => {
    await login(page)

    const menuButton = page.getByRole('button', { name: 'Open menu' })
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false')

    await menuButton.click()

    const closeButton = page.getByRole('button', { name: 'Close menu' })
    await expect(closeButton).toHaveAttribute('aria-expanded', 'true')
  })
})
