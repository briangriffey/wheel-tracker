import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { Prisma } from '@/lib/generated/prisma'

/**
 * Wheel Model Schema Verification Tests
 *
 * These tests verify that the Wheel model schema and its relationships
 * are correctly defined in the database and work as expected.
 */

let testUserId: string

describe('Wheel Schema and Migration Verification', () => {
  beforeAll(async () => {
    // Clean up test data
    await prisma.wheel.deleteMany()
    await prisma.position.deleteMany()
    await prisma.trade.deleteMany()
    await prisma.user.deleteMany()

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'test-schema@example.com',
        name: 'Schema Test User',
      },
    })
    testUserId = user.id
  })

  afterAll(async () => {
    await prisma.wheel.deleteMany()
    await prisma.position.deleteMany()
    await prisma.trade.deleteMany()
    await prisma.user.deleteMany({ where: { id: testUserId } })
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await prisma.wheel.deleteMany({ where: { userId: testUserId } })
    await prisma.position.deleteMany({ where: { userId: testUserId } })
    await prisma.trade.deleteMany({ where: { userId: testUserId } })
  })

  describe('Wheel Model Structure', () => {
    it('should create wheel with all required fields', async () => {
      const wheel = await prisma.wheel.create({
        data: {
          userId: testUserId,
          ticker: 'AAPL',
          status: 'ACTIVE',
        },
      })

      expect(wheel.id).toBeDefined()
      expect(wheel.userId).toBe(testUserId)
      expect(wheel.ticker).toBe('AAPL')
      expect(wheel.status).toBe('ACTIVE')
      expect(wheel.cycleCount).toBe(0)
      expect(Number(wheel.totalPremiums)).toBe(0)
      expect(Number(wheel.totalRealizedPL)).toBe(0)
      expect(wheel.startedAt).toBeInstanceOf(Date)
      expect(wheel.lastActivityAt).toBeInstanceOf(Date)
      expect(wheel.completedAt).toBeNull()
      expect(wheel.notes).toBeNull()
      expect(wheel.createdAt).toBeInstanceOf(Date)
      expect(wheel.updatedAt).toBeInstanceOf(Date)
    })

    it('should create wheel with optional fields', async () => {
      const now = new Date()
      const wheel = await prisma.wheel.create({
        data: {
          userId: testUserId,
          ticker: 'TSLA',
          status: 'PAUSED',
          cycleCount: 5,
          totalPremiums: new Prisma.Decimal(2500),
          totalRealizedPL: new Prisma.Decimal(1800),
          notes: 'Test notes',
          completedAt: now,
        },
      })

      expect(wheel.status).toBe('PAUSED')
      expect(wheel.cycleCount).toBe(5)
      expect(Number(wheel.totalPremiums)).toBe(2500)
      expect(Number(wheel.totalRealizedPL)).toBe(1800)
      expect(wheel.notes).toBe('Test notes')
      expect(wheel.completedAt).toEqual(now)
    })

    it('should use default values for omitted fields', async () => {
      const wheel = await prisma.wheel.create({
        data: {
          userId: testUserId,
          ticker: 'MSFT',
        },
      })

      expect(wheel.status).toBe('ACTIVE')
      expect(wheel.cycleCount).toBe(0)
      expect(Number(wheel.totalPremiums)).toBe(0)
      expect(Number(wheel.totalRealizedPL)).toBe(0)
      expect(wheel.notes).toBeNull()
      expect(wheel.completedAt).toBeNull()
    })
  })

  describe('WheelStatus Enum', () => {
    it('should accept ACTIVE status', async () => {
      const wheel = await prisma.wheel.create({
        data: {
          userId: testUserId,
          ticker: 'AAPL',
          status: 'ACTIVE',
        },
      })

      expect(wheel.status).toBe('ACTIVE')
    })

    it('should accept IDLE status', async () => {
      const wheel = await prisma.wheel.create({
        data: {
          userId: testUserId,
          ticker: 'AAPL',
          status: 'IDLE',
        },
      })

      expect(wheel.status).toBe('IDLE')
    })

    it('should accept PAUSED status', async () => {
      const wheel = await prisma.wheel.create({
        data: {
          userId: testUserId,
          ticker: 'AAPL',
          status: 'PAUSED',
        },
      })

      expect(wheel.status).toBe('PAUSED')
    })

    it('should accept COMPLETED status', async () => {
      const wheel = await prisma.wheel.create({
        data: {
          userId: testUserId,
          ticker: 'AAPL',
          status: 'COMPLETED',
        },
      })

      expect(wheel.status).toBe('COMPLETED')
    })

    it('should reject invalid status value', async () => {
      await expect(
        prisma.wheel.create({
          data: {
            userId: testUserId,
            ticker: 'AAPL',
            // @ts-expect-error - Testing invalid enum value
            status: 'INVALID',
          },
        })
      ).rejects.toThrow()
    })
  })

  describe('User Relationship', () => {
    it('should link wheel to user', async () => {
      const wheel = await prisma.wheel.create({
        data: {
          userId: testUserId,
          ticker: 'AAPL',
        },
        include: {
          user: true,
        },
      })

      expect(wheel.user).toBeDefined()
      expect(wheel.user.id).toBe(testUserId)
      expect(wheel.user.email).toBe('test-schema@example.com')
    })

    it('should enforce foreign key constraint on userId', async () => {
      await expect(
        prisma.wheel.create({
          data: {
            userId: 'nonexistent_user_id',
            ticker: 'AAPL',
          },
        })
      ).rejects.toThrow()
    })

    it('should cascade delete wheels when user is deleted', async () => {
      // Create a separate user for this test
      const tempUser = await prisma.user.create({
        data: {
          email: 'temp-user@example.com',
          name: 'Temp User',
        },
      })

      const wheel = await prisma.wheel.create({
        data: {
          userId: tempUser.id,
          ticker: 'AAPL',
        },
      })

      // Delete the user
      await prisma.user.delete({ where: { id: tempUser.id } })

      // Verify wheel was deleted
      const deletedWheel = await prisma.wheel.findUnique({
        where: { id: wheel.id },
      })
      expect(deletedWheel).toBeNull()
    })
  })

  describe('Trade Relationship', () => {
    it('should link trades to wheel', async () => {
      const wheel = await prisma.wheel.create({
        data: {
          userId: testUserId,
          ticker: 'AAPL',
        },
      })

      const trade = await prisma.trade.create({
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
          wheelId: wheel.id,
        },
      })

      const wheelWithTrades = await prisma.wheel.findUnique({
        where: { id: wheel.id },
        include: { trades: true },
      })

      expect(wheelWithTrades?.trades).toHaveLength(1)
      expect(wheelWithTrades?.trades[0].id).toBe(trade.id)
    })

    it('should allow multiple trades per wheel', async () => {
      const wheel = await prisma.wheel.create({
        data: {
          userId: testUserId,
          ticker: 'AAPL',
        },
      })

      await prisma.trade.createMany({
        data: [
          {
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
            wheelId: wheel.id,
          },
          {
            userId: testUserId,
            ticker: 'AAPL',
            type: 'CALL',
            action: 'SELL_TO_OPEN',
            status: 'OPEN',
            strikePrice: new Prisma.Decimal(155),
            premium: new Prisma.Decimal(200),
            contracts: 1,
            shares: 100,
            expirationDate: new Date('2026-04-15'),
            wheelId: wheel.id,
          },
        ],
      })

      const wheelWithTrades = await prisma.wheel.findUnique({
        where: { id: wheel.id },
        include: { trades: true },
      })

      expect(wheelWithTrades?.trades).toHaveLength(2)
    })

    it('should allow trades without wheel (wheelId is optional)', async () => {
      const trade = await prisma.trade.create({
        data: {
          userId: testUserId,
          ticker: 'NVDA',
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          status: 'OPEN',
          strikePrice: new Prisma.Decimal(400),
          premium: new Prisma.Decimal(800),
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2026-03-15'),
        },
      })

      expect(trade.wheelId).toBeNull()
    })
  })

  describe('Position Relationship', () => {
    it('should link positions to wheel', async () => {
      const wheel = await prisma.wheel.create({
        data: {
          userId: testUserId,
          ticker: 'AAPL',
        },
      })

      // Create PUT trade first (required for position)
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
          wheelId: wheel.id,
        },
      })

      const position = await prisma.position.create({
        data: {
          userId: testUserId,
          ticker: 'AAPL',
          shares: 100,
          costBasis: new Prisma.Decimal(147.5),
          totalCost: new Prisma.Decimal(14750),
          status: 'OPEN',
          acquiredDate: new Date('2026-03-15'),
          assignmentTradeId: putTrade.id,
          wheelId: wheel.id,
        },
      })

      const wheelWithPositions = await prisma.wheel.findUnique({
        where: { id: wheel.id },
        include: { positions: true },
      })

      expect(wheelWithPositions?.positions).toHaveLength(1)
      expect(wheelWithPositions?.positions[0].id).toBe(position.id)
    })

    it('should allow positions without wheel (wheelId is optional)', async () => {
      const putTrade = await prisma.trade.create({
        data: {
          userId: testUserId,
          ticker: 'MSFT',
          type: 'PUT',
          action: 'SELL_TO_OPEN',
          status: 'ASSIGNED',
          strikePrice: new Prisma.Decimal(300),
          premium: new Prisma.Decimal(600),
          contracts: 1,
          shares: 100,
          expirationDate: new Date('2026-03-15'),
        },
      })

      const position = await prisma.position.create({
        data: {
          userId: testUserId,
          ticker: 'MSFT',
          shares: 100,
          costBasis: new Prisma.Decimal(294),
          totalCost: new Prisma.Decimal(29400),
          status: 'OPEN',
          acquiredDate: new Date('2026-03-15'),
          assignmentTradeId: putTrade.id,
        },
      })

      expect(position.wheelId).toBeNull()
    })
  })

  describe('Database Indexes', () => {
    it('should efficiently query wheels by userId and ticker', async () => {
      // Create multiple wheels
      await prisma.wheel.createMany({
        data: [
          { userId: testUserId, ticker: 'AAPL', status: 'ACTIVE' },
          { userId: testUserId, ticker: 'MSFT', status: 'ACTIVE' },
          { userId: testUserId, ticker: 'TSLA', status: 'PAUSED' },
        ],
      })

      const wheels = await prisma.wheel.findMany({
        where: {
          userId: testUserId,
          ticker: 'AAPL',
        },
      })

      expect(wheels).toHaveLength(1)
      expect(wheels[0].ticker).toBe('AAPL')
    })

    it('should efficiently query wheels by status', async () => {
      await prisma.wheel.createMany({
        data: [
          { userId: testUserId, ticker: 'AAPL', status: 'ACTIVE' },
          { userId: testUserId, ticker: 'MSFT', status: 'ACTIVE' },
          { userId: testUserId, ticker: 'TSLA', status: 'PAUSED' },
        ],
      })

      const activeWheels = await prisma.wheel.findMany({
        where: { status: 'ACTIVE' },
      })

      expect(activeWheels).toHaveLength(2)
      expect(activeWheels.every((w) => w.status === 'ACTIVE')).toBe(true)
    })

    it('should efficiently query wheels by userId', async () => {
      // Create another user for comparison
      const otherUser = await prisma.user.create({
        data: {
          email: 'other-user@example.com',
          name: 'Other User',
        },
      })

      await prisma.wheel.createMany({
        data: [
          { userId: testUserId, ticker: 'AAPL', status: 'ACTIVE' },
          { userId: otherUser.id, ticker: 'MSFT', status: 'ACTIVE' },
        ],
      })

      const userWheels = await prisma.wheel.findMany({
        where: { userId: testUserId },
      })

      expect(userWheels).toHaveLength(1)
      expect(userWheels[0].ticker).toBe('AAPL')

      // Cleanup
      await prisma.wheel.deleteMany({ where: { userId: otherUser.id } })
      await prisma.user.delete({ where: { id: otherUser.id } })
    })
  })

  describe('Decimal Field Precision', () => {
    it('should store and retrieve totalPremiums with correct precision', async () => {
      const wheel = await prisma.wheel.create({
        data: {
          userId: testUserId,
          ticker: 'AAPL',
          totalPremiums: new Prisma.Decimal('1234.56'),
        },
      })

      const retrieved = await prisma.wheel.findUnique({
        where: { id: wheel.id },
      })

      expect(Number(retrieved?.totalPremiums)).toBe(1234.56)
    })

    it('should store and retrieve totalRealizedPL with correct precision', async () => {
      const wheel = await prisma.wheel.create({
        data: {
          userId: testUserId,
          ticker: 'AAPL',
          totalRealizedPL: new Prisma.Decimal('-567.89'),
        },
      })

      const retrieved = await prisma.wheel.findUnique({
        where: { id: wheel.id },
      })

      expect(Number(retrieved?.totalRealizedPL)).toBe(-567.89)
    })

    it('should handle large decimal values', async () => {
      const wheel = await prisma.wheel.create({
        data: {
          userId: testUserId,
          ticker: 'AAPL',
          totalPremiums: new Prisma.Decimal('99999999.99'),
          totalRealizedPL: new Prisma.Decimal('-99999999.99'),
        },
      })

      const retrieved = await prisma.wheel.findUnique({
        where: { id: wheel.id },
      })

      expect(Number(retrieved?.totalPremiums)).toBe(99999999.99)
      expect(Number(retrieved?.totalRealizedPL)).toBe(-99999999.99)
    })
  })

  describe('Timestamp Fields', () => {
    it('should auto-set createdAt on creation', async () => {
      const before = new Date()
      const wheel = await prisma.wheel.create({
        data: {
          userId: testUserId,
          ticker: 'AAPL',
        },
      })
      const after = new Date()

      expect(wheel.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(wheel.createdAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })

    it('should auto-update updatedAt on update', async () => {
      const wheel = await prisma.wheel.create({
        data: {
          userId: testUserId,
          ticker: 'AAPL',
        },
      })

      const originalUpdatedAt = wheel.updatedAt

      // Wait a moment to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10))

      const updated = await prisma.wheel.update({
        where: { id: wheel.id },
        data: { notes: 'Updated notes' },
      })

      expect(updated.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      )
    })

    it('should auto-set startedAt and lastActivityAt with default value', async () => {
      const wheel = await prisma.wheel.create({
        data: {
          userId: testUserId,
          ticker: 'AAPL',
        },
      })

      expect(wheel.startedAt).toBeInstanceOf(Date)
      expect(wheel.lastActivityAt).toBeInstanceOf(Date)
      expect(wheel.startedAt.getTime()).toBeLessThanOrEqual(
        wheel.lastActivityAt.getTime()
      )
    })
  })
})
