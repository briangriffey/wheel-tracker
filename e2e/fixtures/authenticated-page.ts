import { test as base, Page } from '@playwright/test'
import { createTestUser, cleanupTestUsers, TEST_USERS } from '../helpers/db'
import { login } from '../helpers/auth'

/**
 * Extended test fixture that provides an authenticated page
 *
 * Usage:
 * ```typescript
 * import { test, expect } from './fixtures/authenticated-page'
 *
 * test('my authenticated test', async ({ authenticatedPage, testUser }) => {
 *   // authenticatedPage is already logged in
 *   await authenticatedPage.goto('/dashboard')
 *   // testUser contains { id, email, name }
 * })
 * ```
 */
export const test = base.extend<{
  testUser: { id: string; email: string; name: string }
  authenticatedPage: Page
}>({
  testUser: async ({}, use) => {
    // Setup: Create test user
    const user = await createTestUser()

    // Provide user to test
    await use(user)

    // Teardown: Clean up test user
    await cleanupTestUsers()
  },

  authenticatedPage: async ({ page }, use) => {
    // Setup: Log in the test user
    await login(page, TEST_USERS.default)

    // Provide authenticated page to test
    await use(page)

    // Teardown handled by testUser fixture
  },
})

export { expect } from '@playwright/test'
