import { test, expect } from '@playwright/test'
import {
  createTestUser,
  cleanupTestUsers,
  TEST_USERS,
  testDb,
} from './helpers/db'
import { login, register } from './helpers/auth'

test.describe('Authentication', () => {
  test.beforeEach(async () => {
    // Clean up before each test
    await cleanupTestUsers()
  })

  test.afterEach(async () => {
    // Clean up after each test
    await cleanupTestUsers()
  })

  test.describe('Registration', () => {
    test('should register a new user successfully', async ({ page }) => {
      await page.goto('/register')

      // Fill out registration form
      await page.fill('input[name="name"]', TEST_USERS.default.name)
      await page.fill('input[name="email"]', TEST_USERS.default.email)
      await page.fill('input[name="password"]', TEST_USERS.default.password)

      // Submit form
      await page.click('button[type="submit"]')

      // Should redirect to login page with success message
      await expect(page).toHaveURL(/\/login/)
      await expect(page.locator('text=/registered=true/')).toBeVisible()

      // Verify user was created in database
      const user = await testDb.user.findUnique({
        where: { email: TEST_USERS.default.email },
      })
      expect(user).toBeTruthy()
      expect(user?.name).toBe(TEST_USERS.default.name)
    })

    test('should show error for duplicate email', async ({ page }) => {
      // Create user first
      await createTestUser()

      // Try to register with same email
      await page.goto('/register')
      await page.fill('input[name="name"]', 'Another User')
      await page.fill('input[name="email"]', TEST_USERS.default.email)
      await page.fill('input[name="password"]', TEST_USERS.default.password)
      await page.click('button[type="submit"]')

      // Should show error message
      await expect(
        page.locator('text=/User with this email already exists/')
      ).toBeVisible()
    })

    test('should validate password length', async ({ page }) => {
      await page.goto('/register')

      // Try short password
      await page.fill('input[name="name"]', TEST_USERS.default.name)
      await page.fill('input[name="email"]', TEST_USERS.default.email)
      await page.fill('input[name="password"]', 'short')

      // HTML5 validation should prevent submission
      const passwordInput = page.locator('input[name="password"]')
      const minLength = await passwordInput.getAttribute('minLength')
      expect(minLength).toBe('8')
    })

    test('should validate required fields', async ({ page }) => {
      await page.goto('/register')

      // Try to submit empty form
      const submitButton = page.locator('button[type="submit"]')
      await submitButton.click()

      // HTML5 validation should prevent submission
      const nameInput = page.locator('input[name="name"]')
      const isRequired = await nameInput.getAttribute('required')
      expect(isRequired).not.toBeNull()
    })

    test('should navigate to login page', async ({ page }) => {
      await page.goto('/register')

      // Click "sign in" link
      await page.click('text=/sign in to your existing account/')

      // Should navigate to login
      await expect(page).toHaveURL(/\/login/)
    })
  })

  test.describe('Login', () => {
    test('should login with valid credentials', async ({ page }) => {
      // Create test user
      await createTestUser()

      // Navigate to login
      await page.goto('/login')

      // Fill out login form
      await page.fill('input[name="email"]', TEST_USERS.default.email)
      await page.fill('input[name="password"]', TEST_USERS.default.password)

      // Submit form
      await page.click('button[type="submit"]')

      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
    })

    test('should show error for invalid credentials', async ({ page }) => {
      // Create test user
      await createTestUser()

      // Navigate to login
      await page.goto('/login')

      // Fill out login form with wrong password
      await page.fill('input[name="email"]', TEST_USERS.default.email)
      await page.fill('input[name="password"]', 'WrongPassword123!')
      await page.click('button[type="submit"]')

      // Should show error message
      await expect(
        page.locator('text=/Invalid email or password/')
      ).toBeVisible()

      // Should stay on login page
      await expect(page).toHaveURL(/\/login/)
    })

    test('should show error for non-existent user', async ({ page }) => {
      await page.goto('/login')

      // Try to login with non-existent user
      await page.fill('input[name="email"]', 'nonexistent@example.com')
      await page.fill('input[name="password"]', 'SomePassword123!')
      await page.click('button[type="submit"]')

      // Should show error message
      await expect(
        page.locator('text=/Invalid email or password/')
      ).toBeVisible()
    })

    test('should show loading state during login', async ({ page }) => {
      await createTestUser()
      await page.goto('/login')

      await page.fill('input[name="email"]', TEST_USERS.default.email)
      await page.fill('input[name="password"]', TEST_USERS.default.password)

      // Click submit and immediately check for loading state
      const submitButton = page.locator('button[type="submit"]')
      await submitButton.click()

      // Button should show loading text or be disabled
      const isDisabled = await submitButton.isDisabled()
      expect(isDisabled).toBe(true)
    })

    test('should navigate to registration page', async ({ page }) => {
      await page.goto('/login')

      // Click "create a new account" link
      await page.click('text=/create a new account/')

      // Should navigate to register
      await expect(page).toHaveURL(/\/register/)
    })

    test('should display success message after registration', async ({
      page,
    }) => {
      // Navigate directly to login with registered=true param
      await page.goto('/login?registered=true')

      // Should show success message
      await expect(
        page.locator('text=/Account created successfully/')
      ).toBeVisible()
    })
  })

  test.describe('Protected Routes', () => {
    test('should redirect to login when accessing protected route unauthenticated', async ({
      page,
    }) => {
      // Try to access dashboard without login
      await page.goto('/dashboard')

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
    })

    test('should allow access to protected routes when authenticated', async ({
      page,
    }) => {
      // Create and login user
      await createTestUser()
      await login(page)

      // Navigate to dashboard
      await page.goto('/dashboard')

      // Should stay on dashboard
      await expect(page).toHaveURL(/\/dashboard/)
    })

    test('should allow access to trades page when authenticated', async ({
      page,
    }) => {
      await createTestUser()
      await login(page)

      await page.goto('/trades')
      await expect(page).toHaveURL(/\/trades/)
    })

    test('should allow access to positions page when authenticated', async ({
      page,
    }) => {
      await createTestUser()
      await login(page)

      await page.goto('/positions')
      await expect(page).toHaveURL(/\/positions/)
    })
  })

  test.describe('Session Persistence', () => {
    test('should maintain session across page reloads', async ({ page }) => {
      await createTestUser()
      await login(page)

      // Navigate to dashboard
      await page.goto('/dashboard')
      await expect(page).toHaveURL(/\/dashboard/)

      // Reload page
      await page.reload()

      // Should still be on dashboard (session maintained)
      await expect(page).toHaveURL(/\/dashboard/)
    })

    test('should maintain session across navigation', async ({ page }) => {
      await createTestUser()
      await login(page)

      // Navigate between protected pages
      await page.goto('/dashboard')
      await expect(page).toHaveURL(/\/dashboard/)

      await page.goto('/trades')
      await expect(page).toHaveURL(/\/trades/)

      await page.goto('/positions')
      await expect(page).toHaveURL(/\/positions/)

      // Should remain authenticated
      await page.goto('/dashboard')
      await expect(page).toHaveURL(/\/dashboard/)
    })
  })
})
