import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { rollOption } from '../trades'
import { Prisma } from '@/lib/generated/prisma'

// Test data IDs
let testUserId: string

describe('Trade Actions Integration Tests', () => {
  beforeAll(async () => {
    // Clean up any existing test data (order matters for foreign keys)
    await prisma.position.deleteMany()
    await prisma.trade.deleteMany()
    await prisma.user.deleteMany()

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'test-trades@example.com',
        name: 'Trade Test User',
      },
    })
    testUserId = user.id
  })

  afterAll(async () => {
    // Clean up in order (positions first due to foreign keys)
    await prisma.position.deleteMany()
    await prisma.trade.deleteMany()
    await prisma.user.deleteMany({ where: { id: testUserId } })
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Clean up in order (positions first due to foreign keys)
    await prisma.position.deleteMany({ where: { userId: testUserId } })
    await prisma.trade.deleteMany({ where: { userId: testUserId } })
  })

  describe('rollOption', () => {
    it('should successfully roll a PUT option to a later expiration', async () => {
      // Create an open PUT trade
      const originalTrade = await prisma.trade.create({
        data: {
          userId: testUserId,
          ticker: 'AAPL',
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          status: 'OPEN',
          strikePrice: new Prisma.Decimal(150),
          premium: new Prisma.Decimal(250), // $250 premium
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2026-03-15'),
        },
      })

      // Roll the option
      const result = await rollOption({
        originalTradeId: originalTrade.id,
        newExpirationDate: new Date('2026-04-15'),
        newStrikePrice: 145,
        newPremium: 300, // $300 new premium
        closePremium: 100, // $100 to close original
      })

      // Verify success
      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.closeTradeId).toBeDefined()
      expect(result.data.openTradeId).toBeDefined()
      expect(result.data.netCredit).toBe(200) // $300 - $100 = $200 net credit

      // Verify original trade was marked as CLOSED
      const updatedOriginal = await prisma.trade.findUnique({
        where: { id: originalTrade.id },
      })
      expect(updatedOriginal?.status).toBe('CLOSED')
      expect(updatedOriginal?.closeDate).toBeDefined()
      expect(updatedOriginal?.notes).toContain('Rolled to new expiration')
      expect(updatedOriginal?.notes).toContain('net credit: $200.00')

      // Verify BUY_TO_CLOSE trade was created
      const closeTrade = await prisma.trade.findUnique({
        where: { id: result.data.closeTradeId },
      })
      expect(closeTrade).toBeDefined()
      expect(closeTrade?.ticker).toBe('AAPL')
      expect(closeTrade?.type).toBe('PUT')
      expect(closeTrade?.action).toBe('BUY_TO_CLOSE')
      expect(closeTrade?.status).toBe('CLOSED')
      expect(Number(closeTrade?.strikePrice)).toBe(150) // Original strike
      expect(Number(closeTrade?.premium)).toBe(100) // Close premium
      expect(closeTrade?.rollFromTradeId).toBe(originalTrade.id)

      // Verify SELL_TO_OPEN trade was created
      const openTrade = await prisma.trade.findUnique({
        where: { id: result.data.openTradeId },
      })
      expect(openTrade).toBeDefined()
      expect(openTrade?.ticker).toBe('AAPL')
      expect(openTrade?.type).toBe('PUT')
      expect(openTrade?.action).toBe('SELL_TO_OPEN')
      expect(openTrade?.status).toBe('OPEN')
      expect(Number(openTrade?.strikePrice)).toBe(145) // New strike
      expect(Number(openTrade?.premium)).toBe(300) // New premium
      expect(openTrade?.rollFromTradeId).toBe(originalTrade.id)
      expect(openTrade?.expirationDate.toISOString()).toBe(new Date('2026-04-15').toISOString())
    })

    it('should successfully roll a CALL option with net debit', async () => {
      // Create an open CALL trade
      const originalTrade = await prisma.trade.create({
        data: {
          userId: testUserId,
          ticker: 'TSLA',
          type: 'CALL',
          action: 'SELL_TO_OPEN',
          status: 'OPEN',
          strikePrice: new Prisma.Decimal(200),
          premium: new Prisma.Decimal(400),
          contracts: 2,
          shares: 200,
          expirationDate: new Date('2026-03-15'),
        },
      })

      // Roll with net debit (close costs more than new premium)
      const result = await rollOption({
        originalTradeId: originalTrade.id,
        newExpirationDate: new Date('2026-04-15'),
        newStrikePrice: 210,
        newPremium: 250, // $250 new premium
        closePremium: 400, // $400 to close
      })

      // Verify success with negative net credit (debit)
      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.netCredit).toBe(-150) // $250 - $400 = -$150 net debit

      // Verify notes indicate debit
      const updatedOriginal = await prisma.trade.findUnique({
        where: { id: originalTrade.id },
      })
      expect(updatedOriginal?.notes).toContain('net debit: $150.00')
    })

    it('should reject rolling a closed trade', async () => {
      // Create a closed trade
      const closedTrade = await prisma.trade.create({
        data: {
          userId: testUserId,
          ticker: 'NVDA',
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          status: 'CLOSED',
          strikePrice: new Prisma.Decimal(400),
          premium: new Prisma.Decimal(500),
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2026-03-15'),
          closeDate: new Date(),
        },
      })

      // Attempt to roll
      const result = await rollOption({
        originalTradeId: closedTrade.id,
        newExpirationDate: new Date('2026-04-15'),
        newStrikePrice: 395,
        newPremium: 450,
        closePremium: 200,
      })

      // Verify rejection
      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error).toContain('Cannot roll closed trade')
    })

    it('should reject rolling with invalid trade ID format', async () => {
      const result = await rollOption({
        originalTradeId: 'invalid-id',
        newExpirationDate: new Date('2026-04-15'),
        newStrikePrice: 100,
        newPremium: 100,
        closePremium: 50,
      })

      // Verify rejection due to invalid CUID format
      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error).toBeDefined()
    })

    it('should reject rolling a non-existent trade', async () => {
      // Use a valid CUID format that doesn't exist in DB
      const result = await rollOption({
        originalTradeId: 'clk1234567890abcdef',
        newExpirationDate: new Date('2026-04-15'),
        newStrikePrice: 100,
        newPremium: 100,
        closePremium: 50,
      })

      // Verify rejection
      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error).toContain('Original trade not found')
    })

    it('should preserve wheel and position relationships when rolling', async () => {
      // Create a position first
      const putTrade = await prisma.trade.create({
        data: {
          userId: testUserId,
          ticker: 'AMD',
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          status: 'ASSIGNED',
          strikePrice: new Prisma.Decimal(100),
          premium: new Prisma.Decimal(150),
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2026-02-15'),
          closeDate: new Date(),
        },
      })

      const position = await prisma.position.create({
        data: {
          userId: testUserId,
          ticker: 'AMD',
          shares: 100,
          costBasis: new Prisma.Decimal(98.5),
          totalCost: new Prisma.Decimal(9850),
          assignmentTradeId: putTrade.id,
          acquiredDate: new Date(),
        },
      })

      // Create a covered call on the position
      const callTrade = await prisma.trade.create({
        data: {
          userId: testUserId,
          ticker: 'AMD',
          type: 'CALL',
          action: 'SELL_TO_OPEN',
          status: 'OPEN',
          strikePrice: new Prisma.Decimal(105),
          premium: new Prisma.Decimal(200),
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2026-03-15'),
          positionId: position.id,
        },
      })

      // Roll the covered call
      const result = await rollOption({
        originalTradeId: callTrade.id,
        newExpirationDate: new Date('2026-04-15'),
        newStrikePrice: 110,
        newPremium: 180,
        closePremium: 80,
      })

      // Verify success
      expect(result.success).toBe(true)
      if (!result.success) return

      // Verify new trade is linked to the same position
      const newTrade = await prisma.trade.findUnique({
        where: { id: result.data.openTradeId },
      })
      expect(newTrade?.positionId).toBe(position.id)

      // Verify close trade is also linked to the position
      const closeTrade = await prisma.trade.findUnique({
        where: { id: result.data.closeTradeId },
      })
      expect(closeTrade?.positionId).toBe(position.id)
    })
  })
})
