import { test, expect } from './fixtures/authenticated-page'
import { testDb } from './helpers/db'

test.describe('Trade Lifecycle', () => {
  test.describe('Creating Trades', () => {
    test('should create a new PUT trade successfully', async ({
      authenticatedPage: page,
      testUser,
    }) => {
      await page.goto('/trades/new')

      // Verify we're on the create trade page
      await expect(page.locator('h1')).toContainText('Create New Trade')

      // Fill out the trade form
      await page.fill('input[name="ticker"]', 'AAPL')
      await page.selectOption('select[name="type"]', 'PUT')
      await page.selectOption('select[name="action"]', 'SELL_TO_OPEN')
      await page.fill('input[name="strikePrice"]', '150.00')
      await page.fill('input[name="premium"]', '2.50')
      await page.fill('input[name="contracts"]', '1')

      // Set expiration date to next month
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      const expirationDate = nextMonth.toISOString().split('T')[0]
      await page.fill('input[name="expirationDate"]', expirationDate)

      // Submit the form
      await page.click('button[type="submit"]')

      // Should show success message
      await expect(page.locator('text=/created successfully/i')).toBeVisible({
        timeout: 5000,
      })

      // Verify trade was created in database
      const trades = await testDb.trade.findMany({
        where: { userId: testUser.id, ticker: 'AAPL' },
      })
      expect(trades).toHaveLength(1)
      expect(trades[0].type).toBe('PUT')
      expect(trades[0].strikePrice.toNumber()).toBe(150.0)
      expect(trades[0].premium.toNumber()).toBe(2.5)
      expect(trades[0].contracts).toBe(1)
      expect(trades[0].shares).toBe(100) // contracts * 100
    })

    test('should create a new CALL trade successfully', async ({
      authenticatedPage: page,
      testUser,
    }) => {
      await page.goto('/trades/new')

      await page.fill('input[name="ticker"]', 'TSLA')
      await page.selectOption('select[name="type"]', 'CALL')
      await page.selectOption('select[name="action"]', 'SELL_TO_OPEN')
      await page.fill('input[name="strikePrice"]', '250.00')
      await page.fill('input[name="premium"]', '5.00')
      await page.fill('input[name="contracts"]', '2')

      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      await page.fill(
        'input[name="expirationDate"]',
        nextMonth.toISOString().split('T')[0]
      )

      await page.click('button[type="submit"]')

      await expect(page.locator('text=/created successfully/i')).toBeVisible({
        timeout: 5000,
      })

      const trades = await testDb.trade.findMany({
        where: { userId: testUser.id, ticker: 'TSLA' },
      })
      expect(trades).toHaveLength(1)
      expect(trades[0].type).toBe('CALL')
      expect(trades[0].contracts).toBe(2)
      expect(trades[0].shares).toBe(200)
    })

    test('should validate required fields', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/trades/new')

      // Try to submit empty form
      await page.click('button[type="submit"]')

      // Should show validation errors
      // Note: HTML5 validation might prevent submission
      const tickerInput = page.locator('input[name="ticker"]')
      const isRequired = await tickerInput.getAttribute('required')
      expect(isRequired).not.toBeNull()
    })

    test('should validate ticker format', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/trades/new')

      // Try invalid ticker (too long)
      await page.fill('input[name="ticker"]', 'TOOLONG')

      const tickerInput = page.locator('input[name="ticker"]')
      const maxLength = await tickerInput.getAttribute('maxLength')
      expect(maxLength).toBe('5')
    })

    test('should validate positive strike price', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/trades/new')

      // Fill required fields
      await page.fill('input[name="ticker"]', 'AAPL')
      await page.selectOption('select[name="type"]', 'PUT')

      // Try negative strike price
      await page.fill('input[name="strikePrice"]', '-10')

      const strikePriceInput = page.locator('input[name="strikePrice"]')
      const min = await strikePriceInput.getAttribute('min')
      expect(min).toBe('0')
    })

    test('should add optional notes', async ({
      authenticatedPage: page,
      testUser,
    }) => {
      await page.goto('/trades/new')

      await page.fill('input[name="ticker"]', 'NVDA')
      await page.selectOption('select[name="type"]', 'PUT')
      await page.fill('input[name="strikePrice"]', '500.00')
      await page.fill('input[name="premium"]', '10.00')
      await page.fill('input[name="contracts"]', '1')

      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      await page.fill(
        'input[name="expirationDate"]',
        nextMonth.toISOString().split('T')[0]
      )

      // Add notes
      const notes = 'Test trade with notes'
      await page.fill('textarea[name="notes"]', notes)

      await page.click('button[type="submit"]')

      await expect(page.locator('text=/created successfully/i')).toBeVisible({
        timeout: 5000,
      })

      const trades = await testDb.trade.findMany({
        where: { userId: testUser.id, ticker: 'NVDA' },
      })
      expect(trades[0].notes).toBe(notes)
    })
  })

  test.describe('Viewing Trades', () => {
    test('should display trade list', async ({
      authenticatedPage: page,
      testUser,
    }) => {
      // Create a test trade first
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1)

      await testDb.trade.create({
        data: {
          userId: testUser.id,
          ticker: 'AAPL',
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          strikePrice: 150,
          premium: 2.5,
          contracts: 1,
          shares: 100,
          expirationDate: nextMonth,
          status: 'OPEN',
        },
      })

      // Navigate to trades page
      await page.goto('/trades')

      // Should show the trade
      await expect(page.locator('text=AAPL')).toBeVisible()
      await expect(page.locator('text=PUT')).toBeVisible()
      await expect(page.locator('text=150')).toBeVisible()
    })

    test('should show empty state when no trades', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/trades')

      // Should show empty state or "no trades" message
      const pageContent = await page.textContent('body')
      expect(
        pageContent?.includes('No trades') ||
          pageContent?.includes('no trades') ||
          pageContent?.includes('Get started')
      ).toBeTruthy()
    })

    test('should display multiple trades', async ({
      authenticatedPage: page,
      testUser,
    }) => {
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1)

      // Create multiple trades
      await testDb.trade.createMany({
        data: [
          {
            userId: testUser.id,
            ticker: 'AAPL',
            type: 'PUT',
            action: 'SELL_TO_OPEN',
            strikePrice: 150,
            premium: 2.5,
            contracts: 1,
            shares: 100,
            expirationDate: nextMonth,
            status: 'OPEN',
          },
          {
            userId: testUser.id,
            ticker: 'TSLA',
            type: 'CALL',
            action: 'SELL_TO_OPEN',
            strikePrice: 250,
            premium: 5.0,
            contracts: 2,
            shares: 200,
            expirationDate: nextMonth,
            status: 'OPEN',
          },
        ],
      })

      await page.goto('/trades')

      // Should show both trades
      await expect(page.locator('text=AAPL')).toBeVisible()
      await expect(page.locator('text=TSLA')).toBeVisible()
    })

    test('should navigate to create trade page', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/trades')

      // Look for "New Trade" or "Create Trade" button
      const newTradeButton = page.locator(
        'text=/new trade|create trade|add trade/i'
      )

      if (await newTradeButton.isVisible()) {
        await newTradeButton.first().click()
        await expect(page).toHaveURL(/\/trades\/new/)
      }
    })
  })

  test.describe('Trade Status Updates', () => {
    test('should display trade status', async ({
      authenticatedPage: page,
      testUser,
    }) => {
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1)

      await testDb.trade.create({
        data: {
          userId: testUser.id,
          ticker: 'AAPL',
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          strikePrice: 150,
          premium: 2.5,
          contracts: 1,
          shares: 100,
          expirationDate: nextMonth,
          status: 'OPEN',
        },
      })

      await page.goto('/trades')

      // Should show status
      await expect(page.locator('text=/OPEN/i')).toBeVisible()
    })
  })

  test.describe('Navigation', () => {
    test('should navigate between trades pages', async ({
      authenticatedPage: page,
    }) => {
      // Go to trades list
      await page.goto('/trades')
      await expect(page).toHaveURL(/\/trades$/)

      // Navigate to new trade
      await page.goto('/trades/new')
      await expect(page).toHaveURL(/\/trades\/new/)

      // Should be able to go back to list
      await page.goto('/trades')
      await expect(page).toHaveURL(/\/trades$/)
    })
  })
})
