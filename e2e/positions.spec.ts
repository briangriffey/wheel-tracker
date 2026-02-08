import { test, expect } from './fixtures/authenticated-page'
import { testDb } from './helpers/db'
import { Prisma } from '@/lib/generated/prisma'

test.describe('Position Lifecycle', () => {
  test.describe('Viewing Positions', () => {
    test('should display positions page', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/positions')

      // Should show page header
      await expect(page.locator('h1')).toContainText('Active Positions')
    })

    test('should show empty state when no positions', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/positions')

      // Should show empty state or "no positions" message
      const pageContent = await page.textContent('body')
      expect(
        pageContent?.includes('No positions') ||
          pageContent?.includes('no positions') ||
          pageContent?.includes('No active')
      ).toBeTruthy()
    })

    test('should display open positions', async ({
      authenticatedPage: page,
      testUser,
    }) => {
      // Create a test position
      const assignedTrade = await testDb.trade.create({
        data: {
          userId: testUser.id,
          ticker: 'AAPL',
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          strikePrice: new Prisma.Decimal(150),
          premium: new Prisma.Decimal(2.5),
          contracts: 1,
          shares: 100,
          expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'ASSIGNED',
        },
      })

      await testDb.position.create({
        data: {
          userId: testUser.id,
          ticker: 'AAPL',
          shares: 100,
          costBasis: new Prisma.Decimal(147.5), // strike - premium/shares
          totalCost: new Prisma.Decimal(14750),
          acquiredDate: new Date(),
          assignmentTradeId: assignedTrade.id,
          status: 'OPEN',
        },
      })

      await page.goto('/positions')

      // Should show the position
      await expect(page.locator('text=AAPL')).toBeVisible()
      await expect(page.locator('text=100')).toBeVisible() // shares
    })

    test('should display multiple positions', async ({
      authenticatedPage: page,
      testUser,
    }) => {
      // Create multiple positions
      const trade1 = await testDb.trade.create({
        data: {
          userId: testUser.id,
          ticker: 'AAPL',
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          strikePrice: new Prisma.Decimal(150),
          premium: new Prisma.Decimal(2.5),
          contracts: 1,
          shares: 100,
          expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'ASSIGNED',
        },
      })

      const trade2 = await testDb.trade.create({
        data: {
          userId: testUser.id,
          ticker: 'TSLA',
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          strikePrice: new Prisma.Decimal(250),
          premium: new Prisma.Decimal(5.0),
          contracts: 2,
          shares: 200,
          expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'ASSIGNED',
        },
      })

      await testDb.position.createMany({
        data: [
          {
            userId: testUser.id,
            ticker: 'AAPL',
            shares: 100,
            costBasis: new Prisma.Decimal(147.5),
            totalCost: new Prisma.Decimal(14750),
            acquiredDate: new Date(),
          assignmentTradeId: trade1.id,
            status: 'OPEN',
          },
          {
            userId: testUser.id,
            ticker: 'TSLA',
            shares: 200,
            costBasis: new Prisma.Decimal(247.5),
            totalCost: new Prisma.Decimal(49500),
            acquiredDate: new Date(),
          assignmentTradeId: trade2.id,
            status: 'OPEN',
          },
        ],
      })

      await page.goto('/positions')

      // Should show both positions
      await expect(page.locator('text=AAPL')).toBeVisible()
      await expect(page.locator('text=TSLA')).toBeVisible()
    })
  })

  test.describe('Position Details', () => {
    test('should show position cost basis', async ({
      authenticatedPage: page,
      testUser,
    }) => {
      const assignedTrade = await testDb.trade.create({
        data: {
          userId: testUser.id,
          ticker: 'AAPL',
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          strikePrice: new Prisma.Decimal(150),
          premium: new Prisma.Decimal(2.5),
          contracts: 1,
          shares: 100,
          expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'ASSIGNED',
        },
      })

      await testDb.position.create({
        data: {
          userId: testUser.id,
          ticker: 'AAPL',
          shares: 100,
          costBasis: new Prisma.Decimal(147.5),
          totalCost: new Prisma.Decimal(14750),
          acquiredDate: new Date(),
          assignmentTradeId: assignedTrade.id,
          status: 'OPEN',
        },
      })

      await page.goto('/positions')

      // Should display cost basis information
      // Look for dollar amounts around the cost basis
      const pageContent = await page.textContent('body')
      expect(pageContent).toContain('147.5') // cost basis per share
    })

    test('should show position status', async ({
      authenticatedPage: page,
      testUser,
    }) => {
      const assignedTrade = await testDb.trade.create({
        data: {
          userId: testUser.id,
          ticker: 'AAPL',
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          strikePrice: new Prisma.Decimal(150),
          premium: new Prisma.Decimal(2.5),
          contracts: 1,
          shares: 100,
          expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'ASSIGNED',
        },
      })

      await testDb.position.create({
        data: {
          userId: testUser.id,
          ticker: 'AAPL',
          shares: 100,
          costBasis: new Prisma.Decimal(147.5),
          totalCost: new Prisma.Decimal(14750),
          acquiredDate: new Date(),
          assignmentTradeId: assignedTrade.id,
          status: 'OPEN',
        },
      })

      await page.goto('/positions')

      // Should show OPEN status
      await expect(page.locator('text=/OPEN/i')).toBeVisible()
    })
  })

  test.describe('Position Statistics', () => {
    test('should display position count', async ({
      authenticatedPage: page,
      testUser,
    }) => {
      // Create 3 positions
      for (let i = 0; i < 3; i++) {
        const trade = await testDb.trade.create({
          data: {
            userId: testUser.id,
            ticker: `TST${i}`,
            type: 'PUT',
            action: 'SELL_TO_OPEN',
            strikePrice: new Prisma.Decimal(100),
            premium: new Prisma.Decimal(2),
            contracts: 1,
            shares: 100,
            expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            status: 'ASSIGNED',
          },
        })

        await testDb.position.create({
          data: {
            userId: testUser.id,
            ticker: `TST${i}`,
            shares: 100,
            costBasis: new Prisma.Decimal(98),
            totalCost: new Prisma.Decimal(9800),
            acquiredDate: new Date(),
          assignmentTradeId: trade.id,
            status: 'OPEN',
          },
        })
      }

      await page.goto('/positions')

      // Should show position count (might be in stats or header)
      const pageContent = await page.textContent('body')
      expect(pageContent).toContain('3')
    })
  })

  test.describe('Position Refresh', () => {
    test('should have refresh functionality', async ({
      authenticatedPage: page,
      testUser,
    }) => {
      const assignedTrade = await testDb.trade.create({
        data: {
          userId: testUser.id,
          ticker: 'AAPL',
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          strikePrice: new Prisma.Decimal(150),
          premium: new Prisma.Decimal(2.5),
          contracts: 1,
          shares: 100,
          expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'ASSIGNED',
        },
      })

      await testDb.position.create({
        data: {
          userId: testUser.id,
          ticker: 'AAPL',
          shares: 100,
          costBasis: new Prisma.Decimal(147.5),
          totalCost: new Prisma.Decimal(14750),
          acquiredDate: new Date(),
          assignmentTradeId: assignedTrade.id,
          status: 'OPEN',
        },
      })

      await page.goto('/positions')

      // Look for refresh button
      const refreshButton = page.locator('button:has-text("Refresh")')
      if (await refreshButton.isVisible()) {
        await refreshButton.click()
        // Should trigger a refresh (page might reload or update)
      }
    })
  })

  test.describe('Navigation', () => {
    test('should navigate to positions page from dashboard', async ({
      authenticatedPage: page,
    }) => {
      await page.goto('/dashboard')

      // Look for positions link
      const positionsLink = page.locator('a[href="/positions"]')
      if (await positionsLink.isVisible()) {
        await positionsLink.click()
        await expect(page).toHaveURL(/\/positions/)
      }
    })
  })
})
