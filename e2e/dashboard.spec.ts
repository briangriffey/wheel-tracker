import { test, expect } from './fixtures/authenticated-page'
import { testDb } from './helpers/db'
import { Prisma } from '@/lib/generated/prisma'

test.describe('P&L Dashboard and Export', () => {
  test.describe('Dashboard Access', () => {
    test('should display dashboard page', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/dashboard')

      // Should load successfully
      await expect(page).toHaveURL(/\/dashboard/)
    })

    test('should redirect unauthenticated users to login', async ({
      page,
    }) => {
      await page.goto('/dashboard')

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
    })
  })

  test.describe('Dashboard Metrics', () => {
    test('should display metrics with no trades', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/dashboard')

      // Dashboard should load even with no data
      const pageContent = await page.textContent('body')
      expect(pageContent).toBeTruthy()
    })

    test('should display P&L metrics with trades', async ({
      authenticatedPage: page,
      testUser,
    }) => {
      // Create some closed trades with premium
      await testDb.trade.create({
        data: {
          userId: testUser.id,
          ticker: 'AAPL',
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          strikePrice: new Prisma.Decimal(150),
          premium: new Prisma.Decimal(250), // $2.50 * 100
          contracts: 1,
          shares: 100,
          expirationDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Expired
          status: 'EXPIRED',
          openDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          closeDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      })

      await page.goto('/dashboard')

      // Should show some P&L metrics
      const pageContent = await page.textContent('body')
      expect(pageContent).toContain('250') // Premium amount
    })

    test('should display win rate', async ({
      authenticatedPage: page,
      testUser,
    }) => {
      // Create some trades - mix of wins and losses
      await testDb.trade.createMany({
        data: [
          {
            userId: testUser.id,
            ticker: 'AAPL',
            type: 'PUT',
            action: 'SELL_TO_OPEN',
            strikePrice: new Prisma.Decimal(150),
            premium: new Prisma.Decimal(250),
            contracts: 1,
            shares: 100,
            expirationDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            status: 'EXPIRED', // Win
            openDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            closeDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
          {
            userId: testUser.id,
            ticker: 'TSLA',
            type: 'PUT',
            action: 'SELL_TO_OPEN',
            strikePrice: new Prisma.Decimal(250),
            premium: new Prisma.Decimal(500),
            contracts: 1,
            shares: 100,
            expirationDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            status: 'EXPIRED', // Win
            openDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            closeDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        ],
      })

      await page.goto('/dashboard')

      // Should show win rate
      const pageContent = await page.textContent('body')
      expect(pageContent).toContain('100') // 100% win rate or 2/2
    })
  })

  test.describe('Time Range Filtering', () => {
    test('should have time range filter options', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/dashboard')

      // Look for time range filter (All, 1M, 3M, 6M, 1Y, etc.)
      const filterOptions = page.locator(
        'select,button:has-text("All"),button:has-text("1M")'
      )

      // Should have some filtering mechanism
      const count = await filterOptions.count()
      expect(count).toBeGreaterThan(0)
    })
  })

  test.describe('Benchmark Comparison', () => {
    test('should display benchmark comparison section', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/dashboard')

      // Look for benchmark comparison section
      const pageContent = await page.textContent('body')
      expect(
        pageContent?.includes('Benchmark') ||
          pageContent?.includes('benchmark') ||
          pageContent?.includes('SPY') ||
          pageContent?.includes('S&P 500')
      ).toBeTruthy()
    })
  })

  test.describe('CSV Export', () => {
    test('should have export button', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard')

      // Look for export button
      const exportButton = page.locator(
        'button:has-text("Export"),a:has-text("Export")'
      )
      const count = await exportButton.count()
      expect(count).toBeGreaterThan(0)
    })

    test('should export CSV when export button clicked', async ({
      authenticatedPage: page,
      testUser,
    }) => {
      // Create a trade to export
      await testDb.trade.create({
        data: {
          userId: testUser.id,
          ticker: 'AAPL',
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          strikePrice: new Prisma.Decimal(150),
          premium: new Prisma.Decimal(250),
          contracts: 1,
          shares: 100,
          expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'OPEN',
          openDate: new Date(),
        },
      })

      await page.goto('/dashboard')

      // Start waiting for download before clicking
      const downloadPromise = page.waitForEvent('download', {
        timeout: 10000,
      })

      // Click export button
      const exportButton = page
        .locator('button:has-text("Export"),a:has-text("Export")')
        .first()
      await exportButton.click()

      // Wait for download to complete
      const download = await downloadPromise

      // Verify download
      expect(download.suggestedFilename()).toMatch(/\.csv$/)

      // Verify file content
      const path = await download.path()
      if (path) {
        const fs = require('fs')
        const content = fs.readFileSync(path, 'utf-8')

        // Should contain CSV headers
        expect(content).toContain('Date Opened')
        expect(content).toContain('Ticker')
        expect(content).toContain('Premium')

        // Should contain trade data
        expect(content).toContain('AAPL')
      }
    })

    test('should export CSV via API endpoint', async ({
      authenticatedPage: page,
      testUser,
    }) => {
      // Create a trade to export
      await testDb.trade.create({
        data: {
          userId: testUser.id,
          ticker: 'TSLA',
          type: 'CALL',
          action: 'SELL_TO_OPEN',
          strikePrice: new Prisma.Decimal(250),
          premium: new Prisma.Decimal(500),
          contracts: 1,
          shares: 100,
          expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'OPEN',
          openDate: new Date(),
        },
      })

      // Navigate to the export API endpoint directly
      await page.goto('/api/export/pl')

      // Should download a CSV file
      const content = await page.textContent('body')

      // If the API returns CSV directly, check the content
      if (content) {
        expect(content).toContain('Date Opened')
        expect(content).toContain('TSLA')
      }
    })

    test('should include summary in CSV export', async ({
      authenticatedPage: page,
      testUser,
    }) => {
      // Create multiple trades
      await testDb.trade.createMany({
        data: [
          {
            userId: testUser.id,
            ticker: 'AAPL',
            type: 'PUT',
            action: 'SELL_TO_OPEN',
            strikePrice: new Prisma.Decimal(150),
            premium: new Prisma.Decimal(250),
            contracts: 1,
            shares: 100,
            expirationDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            status: 'EXPIRED',
            openDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            closeDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
          {
            userId: testUser.id,
            ticker: 'TSLA',
            type: 'PUT',
            action: 'SELL_TO_OPEN',
            strikePrice: new Prisma.Decimal(250),
            premium: new Prisma.Decimal(500),
            contracts: 1,
            shares: 100,
            expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            status: 'OPEN',
            openDate: new Date(),
          },
        ],
      })

      // Get CSV export
      await page.goto('/api/export/pl')
      const content = await page.textContent('body')

      if (content) {
        // Should include summary section
        expect(content).toContain('Summary')
        expect(content).toContain('Total Trades')
        expect(content).toContain('Total Premium')
      }
    })
  })

  test.describe('Charts and Visualizations', () => {
    test('should display P&L charts', async ({
      authenticatedPage: page,
      testUser,
    }) => {
      // Create some historical trades
      await testDb.trade.createMany({
        data: [
          {
            userId: testUser.id,
            ticker: 'AAPL',
            type: 'PUT',
            action: 'SELL_TO_OPEN',
            strikePrice: new Prisma.Decimal(150),
            premium: new Prisma.Decimal(250),
            contracts: 1,
            shares: 100,
            expirationDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            status: 'EXPIRED',
            openDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            closeDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        ],
      })

      await page.goto('/dashboard')

      // Look for charts (Recharts uses SVG)
      const charts = page.locator('svg.recharts-surface')
      const count = await charts.count()

      // Should have at least one chart
      expect(count).toBeGreaterThan(0)
    })
  })

  test.describe('Navigation', () => {
    test('should navigate to dashboard from home when authenticated', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/')

      // Should redirect to dashboard or have a link to it
      const url = page.url()
      if (url.includes('/dashboard')) {
        await expect(page).toHaveURL(/\/dashboard/)
      } else {
        const dashboardLink = page.locator('a[href="/dashboard"]')
        if (await dashboardLink.isVisible()) {
          await dashboardLink.click()
          await expect(page).toHaveURL(/\/dashboard/)
        }
      }
    })
  })
})
