import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { batchExpire, batchAssign } from './batch'

describe('Batch Operations', () => {
  let userId: string
  let testTicker: string

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.position.deleteMany()
    await prisma.trade.deleteMany()
    await prisma.user.deleteMany()

    // Create a test user
    const user = await prisma.user.create({
      data: {
        email: 'batch-test@example.com',
        name: 'Batch Test User',
      },
    })
    userId = user.id
    testTicker = 'AAPL'
  })

  afterAll(async () => {
    // Cleanup: Delete test data
    await prisma.position.deleteMany({ where: { userId } })
    await prisma.trade.deleteMany({ where: { userId } })
    await prisma.user.deleteMany({ where: { id: userId } })
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Clean up trades and positions before each test
    await prisma.position.deleteMany({ where: { userId } })
    await prisma.trade.deleteMany({ where: { userId } })
  })

  describe('batchExpire', () => {
    it('should expire multiple OPEN trades successfully', async () => {
      // Create multiple open trades
      const trade1 = await prisma.trade.create({
        data: {
          userId,
          ticker: testTicker,
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          status: 'OPEN',
          strikePrice: 150,
          premium: 250,
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2024-12-31'),
        },
      })

      const trade2 = await prisma.trade.create({
        data: {
          userId,
          ticker: 'MSFT',
          type: 'CALL',
          action: 'SELL_TO_OPEN',
          status: 'OPEN',
          strikePrice: 380,
          premium: 300,
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2024-12-31'),
        },
      })

      // Batch expire both trades
      const result = await batchExpire({
        tradeIds: [trade1.id, trade2.id],
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.successCount).toBe(2)
        expect(result.data.failureCount).toBe(0)
        expect(result.data.expiredTrades).toHaveLength(2)
        expect(result.data.errors).toHaveLength(0)

        // Verify trades are marked as expired
        const updatedTrade1 = await prisma.trade.findUnique({
          where: { id: trade1.id },
        })
        const updatedTrade2 = await prisma.trade.findUnique({
          where: { id: trade2.id },
        })

        expect(updatedTrade1?.status).toBe('EXPIRED')
        expect(updatedTrade1?.closeDate).toBeTruthy()
        expect(updatedTrade2?.status).toBe('EXPIRED')
        expect(updatedTrade2?.closeDate).toBeTruthy()
      }
    })

    it('should skip non-OPEN trades and report errors', async () => {
      // Create trades with different statuses
      const openTrade = await prisma.trade.create({
        data: {
          userId,
          ticker: testTicker,
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          status: 'OPEN',
          strikePrice: 150,
          premium: 250,
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2024-12-31'),
        },
      })

      const closedTrade = await prisma.trade.create({
        data: {
          userId,
          ticker: 'MSFT',
          type: 'CALL',
          action: 'SELL_TO_OPEN',
          status: 'CLOSED',
          strikePrice: 380,
          premium: 300,
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2024-12-31'),
          closeDate: new Date(),
        },
      })

      // Attempt to expire both
      const result = await batchExpire({
        tradeIds: [openTrade.id, closedTrade.id],
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.successCount).toBe(1)
        expect(result.data.failureCount).toBe(1)
        expect(result.data.expiredTrades).toHaveLength(1)
        expect(result.data.errors).toHaveLength(1)
        expect(result.data.errors[0].tradeId).toBe(closedTrade.id)
        expect(result.data.errors[0].error).toContain('Cannot expire')
      }
    })

    it('should handle non-existent trade IDs', async () => {
      // Use a valid CUID format
      const result = await batchExpire({
        tradeIds: ['clh0000000000'],
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('No valid trades to expire')
        expect(result.details).toBeDefined()
      }
    })

    it('should validate input schema', async () => {
      // Empty array should return error
      const emptyResult = await batchExpire({ tradeIds: [] })
      expect(emptyResult.success).toBe(false)
      if (!emptyResult.success) {
        expect(emptyResult.error).toContain('At least one trade ID')
      }

      // Too many trades (> 100) should return error
      const tooManyIds = Array.from({ length: 101 }, (_, i) => `clh${i.toString().padStart(9, '0')}`)
      const tooManyResult = await batchExpire({ tradeIds: tooManyIds })
      expect(tooManyResult.success).toBe(false)
      if (!tooManyResult.success) {
        expect(tooManyResult.error).toContain('Cannot expire more than 100')
      }
    })
  })

  describe('batchAssign', () => {
    it('should assign multiple PUTs and create positions', async () => {
      // Create multiple PUT trades
      const put1 = await prisma.trade.create({
        data: {
          userId,
          ticker: testTicker,
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          status: 'OPEN',
          strikePrice: 150,
          premium: 250,
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2024-12-31'),
        },
      })

      const put2 = await prisma.trade.create({
        data: {
          userId,
          ticker: 'MSFT',
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          status: 'OPEN',
          strikePrice: 380,
          premium: 500,
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2024-12-31'),
        },
      })

      // Batch assign both PUTs
      const result = await batchAssign({
        tradeIds: [put1.id, put2.id],
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.successCount).toBe(2)
        expect(result.data.failureCount).toBe(0)
        expect(result.data.assignedPuts).toHaveLength(2)
        expect(result.data.assignedCalls).toHaveLength(0)
        expect(result.data.errors).toHaveLength(0)

        // Verify positions were created
        const positions = await prisma.position.findMany({
          where: { userId },
        })
        expect(positions).toHaveLength(2)

        // Verify trades are marked as assigned
        const updatedPut1 = await prisma.trade.findUnique({
          where: { id: put1.id },
        })
        expect(updatedPut1?.status).toBe('ASSIGNED')
        expect(updatedPut1?.closeDate).toBeTruthy()

        // Verify cost basis calculation for first PUT
        const position1 = positions.find((p) => p.ticker === testTicker)
        expect(position1).toBeDefined()
        if (position1) {
          const expectedCostBasis = 150 - 250 / 100 // strike - premium/shares
          expect(Number(position1.costBasis)).toBeCloseTo(expectedCostBasis, 2)
        }
      }
    })

    it('should assign multiple CALLs and close positions', async () => {
      // Create PUT and position first
      const put = await prisma.trade.create({
        data: {
          userId,
          ticker: testTicker,
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          status: 'ASSIGNED',
          strikePrice: 150,
          premium: 250,
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2024-12-31'),
          closeDate: new Date(),
        },
      })

      const position = await prisma.position.create({
        data: {
          userId,
          ticker: testTicker,
          shares: 100,
          costBasis: 147.5,
          totalCost: 14750,
          status: 'OPEN',
          acquiredDate: new Date(),
          assignmentTradeId: put.id,
        },
      })

      // Create CALL against position
      const call = await prisma.trade.create({
        data: {
          userId,
          ticker: testTicker,
          type: 'CALL',
          action: 'SELL_TO_OPEN',
          status: 'OPEN',
          strikePrice: 155,
          premium: 200,
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2024-12-31'),
          positionId: position.id,
        },
      })

      // Batch assign CALL
      const result = await batchAssign({
        tradeIds: [call.id],
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.successCount).toBe(1)
        expect(result.data.failureCount).toBe(0)
        expect(result.data.assignedPuts).toHaveLength(0)
        expect(result.data.assignedCalls).toHaveLength(1)

        const assignedCall = result.data.assignedCalls[0]
        expect(assignedCall.tradeId).toBe(call.id)
        expect(assignedCall.positionId).toBe(position.id)

        // Verify realized gain/loss calculation
        // Sale: 155 * 100 = 15500
        // Premiums: 250 + 200 = 450
        // Cost: 14750
        // P&L: 15500 + 450 - 14750 = 1200
        expect(assignedCall.realizedGainLoss).toBeCloseTo(1200, 2)

        // Verify position is closed
        const closedPosition = await prisma.position.findUnique({
          where: { id: position.id },
        })
        expect(closedPosition?.status).toBe('CLOSED')
        expect(closedPosition?.closedDate).toBeTruthy()
      }
    })

    it('should handle mixed PUT and CALL assignments', async () => {
      // Create PUT trade
      const put = await prisma.trade.create({
        data: {
          userId,
          ticker: 'TSLA',
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          status: 'OPEN',
          strikePrice: 200,
          premium: 400,
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2024-12-31'),
        },
      })

      // Create existing position and CALL
      const existingPut = await prisma.trade.create({
        data: {
          userId,
          ticker: testTicker,
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          status: 'ASSIGNED',
          strikePrice: 150,
          premium: 250,
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2024-12-31'),
          closeDate: new Date(),
        },
      })

      const position = await prisma.position.create({
        data: {
          userId,
          ticker: testTicker,
          shares: 100,
          costBasis: 147.5,
          totalCost: 14750,
          status: 'OPEN',
          acquiredDate: new Date(),
          assignmentTradeId: existingPut.id,
        },
      })

      const call = await prisma.trade.create({
        data: {
          userId,
          ticker: testTicker,
          type: 'CALL',
          action: 'SELL_TO_OPEN',
          status: 'OPEN',
          strikePrice: 155,
          premium: 200,
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2024-12-31'),
          positionId: position.id,
        },
      })

      // Batch assign both PUT and CALL
      const result = await batchAssign({
        tradeIds: [put.id, call.id],
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.successCount).toBe(2)
        expect(result.data.assignedPuts).toHaveLength(1)
        expect(result.data.assignedCalls).toHaveLength(1)

        // Verify new position created for PUT
        const newPosition = await prisma.position.findFirst({
          where: { ticker: 'TSLA' },
        })
        expect(newPosition).toBeDefined()
        expect(newPosition?.status).toBe('OPEN')

        // Verify existing position closed for CALL
        const closedPosition = await prisma.position.findUnique({
          where: { id: position.id },
        })
        expect(closedPosition?.status).toBe('CLOSED')
      }
    })

    it('should skip invalid trades and report errors', async () => {
      // Create valid PUT
      const validPut = await prisma.trade.create({
        data: {
          userId,
          ticker: testTicker,
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          status: 'OPEN',
          strikePrice: 150,
          premium: 250,
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2024-12-31'),
        },
      })

      // Create CALL without position (invalid)
      const invalidCall = await prisma.trade.create({
        data: {
          userId,
          ticker: 'MSFT',
          type: 'CALL',
          action: 'SELL_TO_OPEN',
          status: 'OPEN',
          strikePrice: 380,
          premium: 300,
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2024-12-31'),
          // No positionId - invalid for assignment
        },
      })

      // Attempt to assign both
      const result = await batchAssign({
        tradeIds: [validPut.id, invalidCall.id],
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.successCount).toBe(1)
        expect(result.data.failureCount).toBe(1)
        expect(result.data.assignedPuts).toHaveLength(1)
        expect(result.data.errors).toHaveLength(1)
        expect(result.data.errors[0].tradeId).toBe(invalidCall.id)
        expect(result.data.errors[0].error).toContain('linked to a position')
      }
    })

    it('should validate input schema', async () => {
      // Empty array should return error
      const emptyResult = await batchAssign({ tradeIds: [] })
      expect(emptyResult.success).toBe(false)
      if (!emptyResult.success) {
        expect(emptyResult.error).toContain('At least one trade ID')
      }

      // Too many trades (> 50) should return error
      const tooManyIds = Array.from({ length: 51 }, (_, i) => `clh${i.toString().padStart(9, '0')}`)
      const tooManyResult = await batchAssign({ tradeIds: tooManyIds })
      expect(tooManyResult.success).toBe(false)
      if (!tooManyResult.success) {
        expect(tooManyResult.error).toContain('Cannot assign more than 50')
      }
    })

    it('should process valid trades and report errors for invalid ones', async () => {
      // This test verifies that valid trades are processed and invalid ones are reported as errors
      // Create a PUT that will succeed
      const put = await prisma.trade.create({
        data: {
          userId,
          ticker: testTicker,
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          status: 'OPEN',
          strikePrice: 150,
          premium: 250,
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2024-12-31'),
        },
      })

      // Try with a non-existent trade ID (valid CUID format but doesn't exist)
      const result = await batchAssign({
        tradeIds: [put.id, 'clh0000000000'],
      })

      expect(result.success).toBe(true)
      if (result.success) {
        // Should process only the valid one
        expect(result.data.successCount).toBe(1)
        expect(result.data.failureCount).toBe(1)
        expect(result.data.errors).toHaveLength(1)
        expect(result.data.errors[0].tradeId).toBe('clh0000000000')
      }
    })
  })
})
