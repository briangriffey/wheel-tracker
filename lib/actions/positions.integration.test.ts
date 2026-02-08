import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import {
  assignPut,
  assignCall,
  closePosition,
  getPositions,
  getActivePositions,
  getPosition,
} from './positions'
import { Prisma } from '@/lib/generated/prisma'

// Test data IDs (will be set during test setup)
let testUserId: string

describe('Position Assignment Integration Tests', () => {
  // Set up test user and clean database before all tests
  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.position.deleteMany()
    await prisma.trade.deleteMany()
    await prisma.user.deleteMany()

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'test-position@example.com',
        name: 'Position Test User',
      },
    })
    testUserId = user.id
  })

  // Clean up after all tests
  afterAll(async () => {
    await prisma.position.deleteMany()
    await prisma.trade.deleteMany()
    await prisma.user.deleteMany({ where: { id: testUserId } })
    await prisma.$disconnect()
  })

  // Clean up trades and positions before each test
  beforeEach(async () => {
    await prisma.position.deleteMany({ where: { userId: testUserId } })
    await prisma.trade.deleteMany({ where: { userId: testUserId } })
  })

  describe('assignPut', () => {
    it('should create a position when PUT is assigned', async () => {
      // Create a PUT trade
      const putTrade = await prisma.trade.create({
        data: {
          userId: testUserId,
          ticker: 'AAPL',
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          status: 'OPEN',
          strikePrice: new Prisma.Decimal(150),
          premium: new Prisma.Decimal(250), // $2.50/share premium
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2026-03-15'),
        },
      })

      // Assign the PUT
      const result = await assignPut({ tradeId: putTrade.id })

      // Verify success
      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.tradeId).toBe(putTrade.id)
      expect(result.data.positionId).toBeDefined()

      // Verify trade was updated to ASSIGNED
      const updatedTrade = await prisma.trade.findUnique({
        where: { id: putTrade.id },
      })
      expect(updatedTrade?.status).toBe('ASSIGNED')
      expect(updatedTrade?.closeDate).toBeDefined()

      // Verify position was created with correct values
      const position = await prisma.position.findUnique({
        where: { id: result.data.positionId },
      })
      expect(position).toBeDefined()
      expect(position?.ticker).toBe('AAPL')
      expect(position?.shares).toBe(100)
      expect(position?.status).toBe('OPEN')
      expect(position?.assignmentTradeId).toBe(putTrade.id)

      // Verify cost basis calculation: (strike * shares - premium) / shares
      // Strike: $150, Premium: $250, Shares: 100
      // Cost basis per share: $150 - $2.50 = $147.50
      // Total cost: $147.50 * 100 = $14,750
      expect(Number(position?.costBasis)).toBeCloseTo(147.5, 2)
      expect(Number(position?.totalCost)).toBeCloseTo(14750, 2)
    })

    it('should reject non-PUT trades', async () => {
      // Create a CALL trade
      const callTrade = await prisma.trade.create({
        data: {
          userId: testUserId,
          ticker: 'AAPL',
          type: 'CALL',
          action: 'SELL_TO_OPEN',
          status: 'OPEN',
          strikePrice: new Prisma.Decimal(160),
          premium: new Prisma.Decimal(200),
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2026-03-15'),
        },
      })

      const result = await assignPut({ tradeId: callTrade.id })

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.error).toContain('PUT')
    })

    it('should reject already assigned trades', async () => {
      // Create and immediately assign a PUT
      const putTrade = await prisma.trade.create({
        data: {
          userId: testUserId,
          ticker: 'AAPL',
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          status: 'ASSIGNED',
          strikePrice: new Prisma.Decimal(150),
          premium: new Prisma.Decimal(250),
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2026-03-15'),
        },
      })

      const result = await assignPut({ tradeId: putTrade.id })

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.error).toContain('OPEN')
    })

    it('should reject non-existent trade', async () => {
      const result = await assignPut({ tradeId: 'clxyz_nonexistent' })

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.error).toBe('Trade not found')
    })

    it('should calculate cost basis correctly for multiple contracts', async () => {
      // Create a PUT with multiple contracts
      const putTrade = await prisma.trade.create({
        data: {
          userId: testUserId,
          ticker: 'MSFT',
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          status: 'OPEN',
          strikePrice: new Prisma.Decimal(300),
          premium: new Prisma.Decimal(600), // $3/share premium for 2 contracts
          contracts: 2,
          shares: 200,
          expirationDate: new Date('2026-03-15'),
        },
      })

      const result = await assignPut({ tradeId: putTrade.id })

      expect(result.success).toBe(true)
      if (!result.success) return

      const position = await prisma.position.findUnique({
        where: { id: result.data.positionId },
      })

      // Cost basis: ($300 * 200 - $600) / 200 = $297/share
      // Total cost: $297 * 200 = $59,400
      expect(Number(position?.costBasis)).toBeCloseTo(297, 2)
      expect(Number(position?.totalCost)).toBeCloseTo(59400, 2)
      expect(position?.shares).toBe(200)
    })
  })

  describe('assignCall', () => {
    it('should close position when CALL is assigned', async () => {
      // Step 1: Create and assign a PUT to get a position
      const putTrade = await prisma.trade.create({
        data: {
          userId: testUserId,
          ticker: 'AAPL',
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          status: 'OPEN',
          strikePrice: new Prisma.Decimal(150),
          premium: new Prisma.Decimal(250),
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2026-02-15'),
        },
      })

      const putResult = await assignPut({ tradeId: putTrade.id })
      expect(putResult.success).toBe(true)
      if (!putResult.success) return

      const positionId = putResult.data.positionId

      // Step 2: Create a covered CALL against the position
      const callTrade = await prisma.trade.create({
        data: {
          userId: testUserId,
          ticker: 'AAPL',
          type: 'CALL',
          action: 'SELL_TO_OPEN',
          status: 'OPEN',
          strikePrice: new Prisma.Decimal(155), // Selling at $155
          premium: new Prisma.Decimal(200), // $2/share premium
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2026-03-15'),
          positionId: positionId,
        },
      })

      // Step 3: Assign the CALL
      const callResult = await assignCall({ tradeId: callTrade.id })

      expect(callResult.success).toBe(true)
      if (!callResult.success) return

      expect(callResult.data.positionId).toBe(positionId)
      expect(callResult.data.tradeId).toBe(callTrade.id)

      // Verify realized P&L calculation:
      // Cost basis: $14,750 (from PUT assignment)
      // Sale proceeds: $155 * 100 = $15,500
      // Total premiums: $250 (PUT) + $200 (CALL) = $450
      // Realized P&L: $15,500 + $450 - $14,750 = $1,200
      expect(callResult.data.realizedGainLoss).toBeCloseTo(1200, 2)

      // Verify trade was updated to ASSIGNED
      const updatedTrade = await prisma.trade.findUnique({
        where: { id: callTrade.id },
      })
      expect(updatedTrade?.status).toBe('ASSIGNED')
      expect(updatedTrade?.closeDate).toBeDefined()

      // Verify position was closed
      const position = await prisma.position.findUnique({
        where: { id: positionId },
      })
      expect(position?.status).toBe('CLOSED')
      expect(position?.closedDate).toBeDefined()
      expect(Number(position?.realizedGainLoss)).toBeCloseTo(1200, 2)
    })

    it('should reject CALL not linked to a position', async () => {
      // Create a CALL without a position
      const callTrade = await prisma.trade.create({
        data: {
          userId: testUserId,
          ticker: 'AAPL',
          type: 'CALL',
          action: 'SELL_TO_OPEN',
          status: 'OPEN',
          strikePrice: new Prisma.Decimal(160),
          premium: new Prisma.Decimal(200),
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2026-03-15'),
        },
      })

      const result = await assignCall({ tradeId: callTrade.id })

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.error).toContain('position')
    })

    it('should reject non-CALL trades', async () => {
      // Create a PUT trade
      const putTrade = await prisma.trade.create({
        data: {
          userId: testUserId,
          ticker: 'AAPL',
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          status: 'OPEN',
          strikePrice: new Prisma.Decimal(150),
          premium: new Prisma.Decimal(250),
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2026-03-15'),
        },
      })

      const result = await assignCall({ tradeId: putTrade.id })

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.error).toContain('CALL')
    })

    it('should calculate realized P&L correctly with loss', async () => {
      // Create and assign PUT at $150 strike
      const putTrade = await prisma.trade.create({
        data: {
          userId: testUserId,
          ticker: 'AAPL',
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          status: 'OPEN',
          strikePrice: new Prisma.Decimal(150),
          premium: new Prisma.Decimal(250),
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2026-02-15'),
        },
      })

      const putResult = await assignPut({ tradeId: putTrade.id })
      expect(putResult.success).toBe(true)
      if (!putResult.success) return

      // Create CALL at $145 strike (lower than PUT strike - potential loss scenario)
      const callTrade = await prisma.trade.create({
        data: {
          userId: testUserId,
          ticker: 'AAPL',
          type: 'CALL',
          action: 'SELL_TO_OPEN',
          status: 'OPEN',
          strikePrice: new Prisma.Decimal(145), // Selling at lower price
          premium: new Prisma.Decimal(100), // Small premium
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2026-03-15'),
          positionId: putResult.data.positionId,
        },
      })

      const callResult = await assignCall({ tradeId: callTrade.id })

      expect(callResult.success).toBe(true)
      if (!callResult.success) return

      // Cost basis: $14,750
      // Sale proceeds: $145 * 100 = $14,500
      // Total premiums: $250 + $100 = $350
      // Realized P&L: $14,500 + $350 - $14,750 = $100 (still profit due to premiums)
      expect(callResult.data.realizedGainLoss).toBeCloseTo(100, 2)
    })
  })

  describe('getPositions', () => {
    it('should return all user positions', async () => {
      // Create multiple positions
      const trades = await Promise.all([
        prisma.trade.create({
          data: {
            userId: testUserId,
            ticker: 'AAPL',
            type: 'PUT',
            action: 'SELL_TO_OPEN',
            status: 'OPEN',
            strikePrice: new Prisma.Decimal(150),
            premium: new Prisma.Decimal(250),
            contracts: 1,
            shares: 100,
            expirationDate: new Date('2026-03-15'),
          },
        }),
        prisma.trade.create({
          data: {
            userId: testUserId,
            ticker: 'MSFT',
            type: 'PUT',
            action: 'SELL_TO_OPEN',
            status: 'OPEN',
            strikePrice: new Prisma.Decimal(300),
            premium: new Prisma.Decimal(600),
            contracts: 1,
            shares: 100,
            expirationDate: new Date('2026-03-15'),
          },
        }),
      ])

      await assignPut({ tradeId: trades[0].id })
      await assignPut({ tradeId: trades[1].id })

      const result = await getPositions()

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data).toHaveLength(2)
      expect(result.data.map((p) => p.ticker)).toContain('AAPL')
      expect(result.data.map((p) => p.ticker)).toContain('MSFT')
    })

    it('should return empty array when no positions', async () => {
      const result = await getPositions()

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data).toEqual([])
    })
  })

  describe('getActivePositions', () => {
    it('should return only OPEN positions', async () => {
      // Create position 1 (will remain open)
      const put1 = await prisma.trade.create({
        data: {
          userId: testUserId,
          ticker: 'AAPL',
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          status: 'OPEN',
          strikePrice: new Prisma.Decimal(150),
          premium: new Prisma.Decimal(250),
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2026-03-15'),
        },
      })
      const result1 = await assignPut({ tradeId: put1.id })
      expect(result1.success).toBe(true)
      if (!result1.success) return

      // Create position 2 (will be closed)
      const put2 = await prisma.trade.create({
        data: {
          userId: testUserId,
          ticker: 'MSFT',
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          status: 'OPEN',
          strikePrice: new Prisma.Decimal(300),
          premium: new Prisma.Decimal(600),
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2026-03-15'),
        },
      })
      const result2 = await assignPut({ tradeId: put2.id })
      expect(result2.success).toBe(true)
      if (!result2.success) return

      // Close position 2 with a CALL
      const call2 = await prisma.trade.create({
        data: {
          userId: testUserId,
          ticker: 'MSFT',
          type: 'CALL',
          action: 'SELL_TO_OPEN',
          status: 'OPEN',
          strikePrice: new Prisma.Decimal(310),
          premium: new Prisma.Decimal(400),
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2026-04-15'),
          positionId: result2.data.positionId,
        },
      })
      await assignCall({ tradeId: call2.id })

      // Get active positions
      const activeResult = await getActivePositions()

      expect(activeResult.success).toBe(true)
      if (!activeResult.success) return

      expect(activeResult.data).toHaveLength(1)
      expect(activeResult.data[0].ticker).toBe('AAPL')
    })
  })

  describe('getPosition', () => {
    it('should return position with full details', async () => {
      // Create position
      const putTrade = await prisma.trade.create({
        data: {
          userId: testUserId,
          ticker: 'AAPL',
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          status: 'OPEN',
          strikePrice: new Prisma.Decimal(150),
          premium: new Prisma.Decimal(250),
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2026-03-15'),
        },
      })

      const assignResult = await assignPut({ tradeId: putTrade.id })
      expect(assignResult.success).toBe(true)
      if (!assignResult.success) return

      // Get position details
      const result = await getPosition(assignResult.data.positionId)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.id).toBe(assignResult.data.positionId)
      expect(result.data.ticker).toBe('AAPL')
      expect(result.data.shares).toBe(100)
      expect(result.data.assignmentTrade).toBeDefined()
      expect(result.data.assignmentTrade.id).toBe(putTrade.id)
      expect(result.data.coveredCalls).toEqual([])
    })

    it('should include covered calls in position details', async () => {
      // Create position
      const putTrade = await prisma.trade.create({
        data: {
          userId: testUserId,
          ticker: 'AAPL',
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          status: 'OPEN',
          strikePrice: new Prisma.Decimal(150),
          premium: new Prisma.Decimal(250),
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2026-02-15'),
        },
      })

      const assignResult = await assignPut({ tradeId: putTrade.id })
      expect(assignResult.success).toBe(true)
      if (!assignResult.success) return

      // Create a covered call
      await prisma.trade.create({
        data: {
          userId: testUserId,
          ticker: 'AAPL',
          type: 'CALL',
          action: 'SELL_TO_OPEN',
          status: 'OPEN',
          strikePrice: new Prisma.Decimal(155),
          premium: new Prisma.Decimal(200),
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2026-03-15'),
          positionId: assignResult.data.positionId,
        },
      })

      // Get position details
      const result = await getPosition(assignResult.data.positionId)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.coveredCalls).toHaveLength(1)
      expect(result.data.coveredCalls[0].strikePrice).toBe(155)
    })

    it('should return error for non-existent position', async () => {
      const result = await getPosition('clxyz_nonexistent')

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.error).toBe('Position not found')
    })
  })

  describe('closePosition', () => {
    it('should manually close an open position at specified price', async () => {
      // Create and assign a PUT to get a position
      const putTrade = await prisma.trade.create({
        data: {
          userId: testUserId,
          ticker: 'AAPL',
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          status: 'OPEN',
          strikePrice: new Prisma.Decimal(150),
          premium: new Prisma.Decimal(250), // $2.50/share premium
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2026-02-15'),
        },
      })

      const putResult = await assignPut({ tradeId: putTrade.id })
      expect(putResult.success).toBe(true)
      if (!putResult.success) return

      const positionId = putResult.data.positionId

      // Close position at $155/share
      const closeResult = await closePosition({
        positionId,
        closingPrice: 155,
      })

      expect(closeResult.success).toBe(true)
      if (!closeResult.success) return

      expect(closeResult.data.positionId).toBe(positionId)

      // Verify realized P&L calculation:
      // Cost basis: $14,750 (from PUT assignment)
      // Sale proceeds: $155 * 100 = $15,500
      // Total premiums: $250 (PUT)
      // Realized P&L: $15,500 + $250 - $14,750 = $1,000
      expect(closeResult.data.realizedGainLoss).toBeCloseTo(1000, 2)

      // Verify position was closed
      const position = await prisma.position.findUnique({
        where: { id: positionId },
      })
      expect(position?.status).toBe('CLOSED')
      expect(position?.closedDate).toBeDefined()
      expect(Number(position?.realizedGainLoss)).toBeCloseTo(1000, 2)
      expect(Number(position?.currentValue)).toBeCloseTo(15500, 2)
    })

    it('should include covered call premiums in P&L calculation', async () => {
      // Create and assign a PUT
      const putTrade = await prisma.trade.create({
        data: {
          userId: testUserId,
          ticker: 'AAPL',
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          status: 'OPEN',
          strikePrice: new Prisma.Decimal(150),
          premium: new Prisma.Decimal(250),
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2026-02-15'),
        },
      })

      const putResult = await assignPut({ tradeId: putTrade.id })
      expect(putResult.success).toBe(true)
      if (!putResult.success) return

      // Create multiple covered calls
      await prisma.trade.create({
        data: {
          userId: testUserId,
          ticker: 'AAPL',
          type: 'CALL',
          action: 'SELL_TO_OPEN',
          status: 'EXPIRED',
          strikePrice: new Prisma.Decimal(155),
          premium: new Prisma.Decimal(200), // $2/share
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2026-03-15'),
          positionId: putResult.data.positionId,
        },
      })

      await prisma.trade.create({
        data: {
          userId: testUserId,
          ticker: 'AAPL',
          type: 'CALL',
          action: 'SELL_TO_OPEN',
          status: 'OPEN',
          strikePrice: new Prisma.Decimal(157),
          premium: new Prisma.Decimal(150), // $1.50/share
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2026-04-15'),
          positionId: putResult.data.positionId,
        },
      })

      // Close position at $160/share
      const closeResult = await closePosition({
        positionId: putResult.data.positionId,
        closingPrice: 160,
      })

      expect(closeResult.success).toBe(true)
      if (!closeResult.success) return

      // Verify realized P&L calculation:
      // Cost basis: $14,750
      // Sale proceeds: $160 * 100 = $16,000
      // Total premiums: $250 (PUT) + $200 (CALL 1) + $150 (CALL 2) = $600
      // Realized P&L: $16,000 + $600 - $14,750 = $1,850
      expect(closeResult.data.realizedGainLoss).toBeCloseTo(1850, 2)
    })

    it('should calculate loss correctly when closing below cost basis', async () => {
      // Create and assign a PUT
      const putTrade = await prisma.trade.create({
        data: {
          userId: testUserId,
          ticker: 'AAPL',
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          status: 'OPEN',
          strikePrice: new Prisma.Decimal(150),
          premium: new Prisma.Decimal(250),
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2026-02-15'),
        },
      })

      const putResult = await assignPut({ tradeId: putTrade.id })
      expect(putResult.success).toBe(true)
      if (!putResult.success) return

      // Close position at $140/share (below cost basis)
      const closeResult = await closePosition({
        positionId: putResult.data.positionId,
        closingPrice: 140,
      })

      expect(closeResult.success).toBe(true)
      if (!closeResult.success) return

      // Verify realized P&L calculation:
      // Cost basis: $14,750
      // Sale proceeds: $140 * 100 = $14,000
      // Total premiums: $250 (PUT)
      // Realized P&L: $14,000 + $250 - $14,750 = -$500 (loss)
      expect(closeResult.data.realizedGainLoss).toBeCloseTo(-500, 2)

      const position = await prisma.position.findUnique({
        where: { id: putResult.data.positionId },
      })
      expect(Number(position?.realizedGainLoss)).toBeCloseTo(-500, 2)
    })

    it('should reject closing non-existent position', async () => {
      const result = await closePosition({
        positionId: 'clxyz_nonexistent',
        closingPrice: 100,
      })

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.error).toBe('Position not found')
    })

    it('should reject closing already closed position', async () => {
      // Create, assign, and close a position
      const putTrade = await prisma.trade.create({
        data: {
          userId: testUserId,
          ticker: 'AAPL',
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          status: 'OPEN',
          strikePrice: new Prisma.Decimal(150),
          premium: new Prisma.Decimal(250),
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2026-02-15'),
        },
      })

      const putResult = await assignPut({ tradeId: putTrade.id })
      expect(putResult.success).toBe(true)
      if (!putResult.success) return

      // Close the position
      const closeResult1 = await closePosition({
        positionId: putResult.data.positionId,
        closingPrice: 155,
      })
      expect(closeResult1.success).toBe(true)

      // Try to close again
      const closeResult2 = await closePosition({
        positionId: putResult.data.positionId,
        closingPrice: 160,
      })

      expect(closeResult2.success).toBe(false)
      if (closeResult2.success) return
      expect(closeResult2.error).toContain('closed')
    })

    it('should reject invalid closing price', async () => {
      // Create and assign a PUT
      const putTrade = await prisma.trade.create({
        data: {
          userId: testUserId,
          ticker: 'AAPL',
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          status: 'OPEN',
          strikePrice: new Prisma.Decimal(150),
          premium: new Prisma.Decimal(250),
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2026-02-15'),
        },
      })

      const putResult = await assignPut({ tradeId: putTrade.id })
      expect(putResult.success).toBe(true)
      if (!putResult.success) return

      // Try to close with invalid prices
      const result1 = await closePosition({
        positionId: putResult.data.positionId,
        closingPrice: 0,
      })
      expect(result1.success).toBe(false)

      const result2 = await closePosition({
        positionId: putResult.data.positionId,
        closingPrice: -10,
      })
      expect(result2.success).toBe(false)
    })
  })
})
