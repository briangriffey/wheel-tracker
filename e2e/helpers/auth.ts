import { Page } from '@playwright/test'
import { TEST_USERS } from './db'

/**
 * Navigate to login page and authenticate a user
 */
export async function login(
  page: Page,
  credentials = TEST_USERS.default
): Promise<void> {
  await page.goto('/login')

  // Fill in login form
  await page.fill('input[name="email"]', credentials.email)
  await page.fill('input[name="password"]', credentials.password)

  // Submit form
  await page.click('button[type="submit"]')

  // Wait for navigation to complete (should redirect to dashboard or home)
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 5000,
  })
}

/**
 * Register a new user
 */
export async function register(
  page: Page,
  userData = TEST_USERS.default
): Promise<void> {
  await page.goto('/register')

  // Fill in registration form
  await page.fill('input[name="name"]', userData.name)
  await page.fill('input[name="email"]', userData.email)
  await page.fill('input[name="password"]', userData.password)

  // Submit form
  await page.click('button[type="submit"]')

  // Wait for redirect to login page
  await page.waitForURL(/\/login/, { timeout: 5000 })
}

/**
 * Logout the current user
 */
export async function logout(page: Page): Promise<void> {
  // Look for logout button/link in the UI
  await page.click('text=/sign out|logout/i')

  // Wait for redirect to home/login
  await page.waitForURL((url) =>
    url.pathname === '/' || url.pathname === '/login',
    { timeout: 5000 }
  )
}

/**
 * Check if user is authenticated by checking for protected route elements
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  // Try to navigate to a protected page
  await page.goto('/dashboard')

  // If redirected to login, not authenticated
  const url = page.url()
  return !url.includes('/login')
}
