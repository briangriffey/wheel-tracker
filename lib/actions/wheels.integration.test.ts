import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import {
  createWheel,
  getWheels,
  getWheelDetail,
  updateWheel,
  pauseWheel,
  completeWheel,
} from './wheels'
import { Prisma } from '@/lib/generated/prisma'

// Test data IDs (will be set during test setup)
let testUserId: string

describe('Wheel CRUD Integration Tests', () => {
  // Set up test user and clean database before all tests
  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.wheel.deleteMany()
    await prisma.position.deleteMany()
    await prisma.trade.deleteMany()
    await prisma.user.deleteMany()

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'test-wheel@example.com',
        name: 'Wheel Test User',
      },
    })
    testUserId = user.id
  })

  // Clean up after all tests
  afterAll(async () => {
    await prisma.wheel.deleteMany()
    await prisma.position.deleteMany()
    await prisma.trade.deleteMany()
    await prisma.user.deleteMany({ where: { id: testUserId } })
    await prisma.$disconnect()
  })

  // Clean up wheels, positions, and trades before each test
  beforeEach(async () => {
    await prisma.wheel.deleteMany({ where: { userId: testUserId } })
    await prisma.position.deleteMany({ where: { userId: testUserId } })
    await prisma.trade.deleteMany({ where: { userId: testUserId } })
  })

  describe('createWheel', () => {
    it('should create a new wheel with valid input', async () => {
      const result = await createWheel({
        ticker: 'AAPL',
        notes: 'Starting AAPL wheel strategy',
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.ticker).toBe('AAPL')
      expect(result.data.id).toBeDefined()

      // Verify wheel was created in database
      const wheel = await prisma.wheel.findUnique({
        where: { id: result.data.id },
      })

      expect(wheel).toBeDefined()
      expect(wheel?.ticker).toBe('AAPL')
      expect(wheel?.status).toBe('ACTIVE')
      expect(wheel?.cycleCount).toBe(0)
      expect(Number(wheel?.totalPremiums)).toBe(0)
      expect(Number(wheel?.totalRealizedPL)).toBe(0)
      expect(wheel?.notes).toBe('Starting AAPL wheel strategy')
    })

    it('should create a wheel without notes', async () => {
      const result = await createWheel({
        ticker: 'TSLA',
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      const wheel = await prisma.wheel.findUnique({
        where: { id: result.data.id },
      })

      expect(wheel?.ticker).toBe('TSLA')
      expect(wheel?.notes).toBeNull()
    })

    it('should normalize ticker to uppercase', async () => {
      const result = await createWheel({
        ticker: 'msft',
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.ticker).toBe('MSFT')
    })

    it('should prevent creating multiple ACTIVE wheels for same ticker', async () => {
      // Create first wheel
      const first = await createWheel({ ticker: 'AAPL' })
      expect(first.success).toBe(true)

      // Try to create second active wheel for same ticker
      const second = await createWheel({ ticker: 'AAPL' })

      expect(second.success).toBe(false)
      if (second.success) return
      expect(second.error).toContain('active wheel already exists')
      expect(second.error).toContain('AAPL')
    })

    it('should allow creating wheel for same ticker after completing previous one', async () => {
      // Create and complete first wheel
      const first = await createWheel({ ticker: 'AAPL' })
      expect(first.success).toBe(true)
      if (!first.success) return

      const completed = await completeWheel(first.data.id)
      expect(completed.success).toBe(true)

      // Create second wheel for same ticker
      const second = await createWheel({ ticker: 'AAPL' })
      expect(second.success).toBe(true)
      if (!second.success) return

      expect(second.data.id).not.toBe(first.data.id)
    })

    it('should allow creating wheel for same ticker after pausing previous one', async () => {
      // Create and pause first wheel
      const first = await createWheel({ ticker: 'NVDA' })
      expect(first.success).toBe(true)
      if (!first.success) return

      const paused = await pauseWheel(first.data.id)
      expect(paused.success).toBe(true)

      // Create second wheel for same ticker
      const second = await createWheel({ ticker: 'NVDA' })
      expect(second.success).toBe(true)
      if (!second.success) return

      expect(second.data.id).not.toBe(first.data.id)
    })

    it('should reject invalid ticker (too long)', async () => {
      const result = await createWheel({ ticker: 'TOOLONG' })

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.error).toBeDefined()
    })

    it('should reject empty ticker', async () => {
      const result = await createWheel({ ticker: '' })

      expect(result.success).toBe(false)
    })
  })

  describe('getWheels', () => {
    it('should return all user wheels', async () => {
      // Create multiple wheels
      await createWheel({ ticker: 'AAPL' })
      await createWheel({ ticker: 'MSFT' })
      await createWheel({ ticker: 'TSLA' })

      const result = await getWheels()

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data).toHaveLength(3)
      expect(result.data.map((w) => w.ticker)).toContain('AAPL')
      expect(result.data.map((w) => w.ticker)).toContain('MSFT')
      expect(result.data.map((w) => w.ticker)).toContain('TSLA')
    })

    it('should filter wheels by ticker', async () => {
      await createWheel({ ticker: 'AAPL' })
      await createWheel({ ticker: 'MSFT' })

      const result = await getWheels({ ticker: 'AAPL' })

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data).toHaveLength(1)
      expect(result.data[0].ticker).toBe('AAPL')
    })

    it('should filter wheels by status', async () => {
      const wheel1 = await createWheel({ ticker: 'AAPL' })
      const wheel2 = await createWheel({ ticker: 'MSFT' })
      expect(wheel1.success && wheel2.success).toBe(true)
      if (!wheel1.success || !wheel2.success) return

      // Pause one wheel
      await pauseWheel(wheel1.data.id)

      const activeResult = await getWheels({ status: 'ACTIVE' })
      expect(activeResult.success).toBe(true)
      if (!activeResult.success) return
      expect(activeResult.data).toHaveLength(1)
      expect(activeResult.data[0].ticker).toBe('MSFT')

      const pausedResult = await getWheels({ status: 'PAUSED' })
      expect(pausedResult.success).toBe(true)
      if (!pausedResult.success) return
      expect(pausedResult.data).toHaveLength(1)
      expect(pausedResult.data[0].ticker).toBe('AAPL')
    })

    it('should return empty array when no wheels exist', async () => {
      const result = await getWheels()

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data).toEqual([])
    })

    it('should include trade and position counts', async () => {
      const wheel = await createWheel({ ticker: 'AAPL' })
      expect(wheel.success).toBe(true)
      if (!wheel.success) return

      // Create a trade linked to the wheel
      await prisma.trade.create({
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
          wheelId: wheel.data.id,
        },
      })

      const result = await getWheels()

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data).toHaveLength(1)
      expect(result.data[0].tradeCount).toBe(1)
      expect(result.data[0].positionCount).toBe(0)
    })

    it('should convert Decimal fields to numbers', async () => {
      await createWheel({ ticker: 'AAPL' })

      const result = await getWheels()

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data).toHaveLength(1)
      expect(typeof result.data[0].totalPremiums).toBe('number')
      expect(typeof result.data[0].totalRealizedPL).toBe('number')
    })
  })

  describe('getWheelDetail', () => {
    it('should return wheel with full details', async () => {
      const wheel = await createWheel({
        ticker: 'AAPL',
        notes: 'Test wheel',
      })
      expect(wheel.success).toBe(true)
      if (!wheel.success) return

      const result = await getWheelDetail(wheel.data.id)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.id).toBe(wheel.data.id)
      expect(result.data.ticker).toBe('AAPL')
      expect(result.data.status).toBe('ACTIVE')
      expect(result.data.notes).toBe('Test wheel')
      expect(result.data.trades).toEqual([])
      expect(result.data.positions).toEqual([])
    })

    it('should include related trades', async () => {
      const wheel = await createWheel({ ticker: 'AAPL' })
      expect(wheel.success).toBe(true)
      if (!wheel.success) return

      // Create trades
      const trade1 = await prisma.trade.create({
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
          wheelId: wheel.data.id,
        },
      })

      const trade2 = await prisma.trade.create({
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
          expirationDate: new Date('2026-04-15'),
          wheelId: wheel.data.id,
        },
      })

      const result = await getWheelDetail(wheel.data.id)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.trades).toHaveLength(2)
      expect(result.data.trades.map((t) => t.id)).toContain(trade1.id)
      expect(result.data.trades.map((t) => t.id)).toContain(trade2.id)
      expect(result.data.trades[0].type).toBeDefined()
      expect(result.data.trades[0].strikePrice).toBeDefined()
      expect(typeof result.data.trades[0].strikePrice).toBe('number')
    })

    it('should include related positions', async () => {
      const wheel = await createWheel({ ticker: 'AAPL' })
      expect(wheel.success).toBe(true)
      if (!wheel.success) return

      // Create a PUT trade and position
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
          wheelId: wheel.data.id,
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
          wheelId: wheel.data.id,
        },
      })

      const result = await getWheelDetail(wheel.data.id)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.positions).toHaveLength(1)
      expect(result.data.positions[0].id).toBe(position.id)
      expect(result.data.positions[0].shares).toBe(100)
      expect(typeof result.data.positions[0].costBasis).toBe('number')
    })

    it('should return error for non-existent wheel', async () => {
      const result = await getWheelDetail('clxyz_nonexistent')

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.error).toBe('Wheel not found')
    })

    it('should convert all Decimal fields to numbers', async () => {
      const wheel = await createWheel({ ticker: 'AAPL' })
      expect(wheel.success).toBe(true)
      if (!wheel.success) return

      const result = await getWheelDetail(wheel.data.id)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(typeof result.data.totalPremiums).toBe('number')
      expect(typeof result.data.totalRealizedPL).toBe('number')
    })
  })

  describe('updateWheel', () => {
    it('should update wheel notes', async () => {
      const wheel = await createWheel({
        ticker: 'AAPL',
        notes: 'Original notes',
      })
      expect(wheel.success).toBe(true)
      if (!wheel.success) return

      const result = await updateWheel({
        id: wheel.data.id,
        notes: 'Updated notes',
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      // Verify update in database
      const updated = await prisma.wheel.findUnique({
        where: { id: wheel.data.id },
      })
      expect(updated?.notes).toBe('Updated notes')
    })

    it('should allow clearing notes', async () => {
      const wheel = await createWheel({
        ticker: 'AAPL',
        notes: 'Some notes',
      })
      expect(wheel.success).toBe(true)
      if (!wheel.success) return

      const result = await updateWheel({
        id: wheel.data.id,
        notes: null,
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      const updated = await prisma.wheel.findUnique({
        where: { id: wheel.data.id },
      })
      expect(updated?.notes).toBeNull()
    })

    it('should return error for non-existent wheel', async () => {
      const result = await updateWheel({
        id: 'clxyz_nonexistent',
        notes: 'New notes',
      })

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.error).toBe('Wheel not found')
    })

    it('should not modify other wheel fields', async () => {
      const wheel = await createWheel({ ticker: 'AAPL' })
      expect(wheel.success).toBe(true)
      if (!wheel.success) return

      const before = await prisma.wheel.findUnique({
        where: { id: wheel.data.id },
      })

      await updateWheel({
        id: wheel.data.id,
        notes: 'New notes',
      })

      const after = await prisma.wheel.findUnique({
        where: { id: wheel.data.id },
      })

      expect(after?.ticker).toBe(before?.ticker)
      expect(after?.status).toBe(before?.status)
      expect(after?.cycleCount).toBe(before?.cycleCount)
      expect(after?.totalPremiums).toEqual(before?.totalPremiums)
    })
  })

  describe('pauseWheel', () => {
    it('should pause an active wheel', async () => {
      const wheel = await createWheel({ ticker: 'AAPL' })
      expect(wheel.success).toBe(true)
      if (!wheel.success) return

      const result = await pauseWheel(wheel.data.id)

      expect(result.success).toBe(true)

      // Verify status changed to PAUSED
      const paused = await prisma.wheel.findUnique({
        where: { id: wheel.data.id },
      })
      expect(paused?.status).toBe('PAUSED')
    })

    it('should update lastActivityAt when pausing', async () => {
      const wheel = await createWheel({ ticker: 'AAPL' })
      expect(wheel.success).toBe(true)
      if (!wheel.success) return

      const before = await prisma.wheel.findUnique({
        where: { id: wheel.data.id },
      })
      const beforeTime = before?.lastActivityAt

      // Wait a moment to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10))

      await pauseWheel(wheel.data.id)

      const after = await prisma.wheel.findUnique({
        where: { id: wheel.data.id },
      })
      const afterTime = after?.lastActivityAt

      expect(afterTime).not.toEqual(beforeTime)
      expect(afterTime! > beforeTime!).toBe(true)
    })

    it('should reject pausing non-active wheel', async () => {
      const wheel = await createWheel({ ticker: 'AAPL' })
      expect(wheel.success).toBe(true)
      if (!wheel.success) return

      // Pause it once
      await pauseWheel(wheel.data.id)

      // Try to pause again
      const result = await pauseWheel(wheel.data.id)

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.error).toContain('Only ACTIVE wheels can be paused')
      expect(result.error).toContain('paused')
    })

    it('should reject pausing completed wheel', async () => {
      const wheel = await createWheel({ ticker: 'AAPL' })
      expect(wheel.success).toBe(true)
      if (!wheel.success) return

      await completeWheel(wheel.data.id)

      const result = await pauseWheel(wheel.data.id)

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.error).toContain('Only ACTIVE wheels can be paused')
    })

    it('should return error for non-existent wheel', async () => {
      const result = await pauseWheel('clxyz_nonexistent')

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.error).toBe('Wheel not found')
    })
  })

  describe('completeWheel', () => {
    it('should complete an active wheel', async () => {
      const wheel = await createWheel({ ticker: 'AAPL' })
      expect(wheel.success).toBe(true)
      if (!wheel.success) return

      const result = await completeWheel(wheel.data.id)

      expect(result.success).toBe(true)

      // Verify status changed to COMPLETED
      const completed = await prisma.wheel.findUnique({
        where: { id: wheel.data.id },
      })
      expect(completed?.status).toBe('COMPLETED')
      expect(completed?.completedAt).toBeDefined()
    })

    it('should complete a paused wheel', async () => {
      const wheel = await createWheel({ ticker: 'AAPL' })
      expect(wheel.success).toBe(true)
      if (!wheel.success) return

      await pauseWheel(wheel.data.id)

      const result = await completeWheel(wheel.data.id)

      expect(result.success).toBe(true)

      const completed = await prisma.wheel.findUnique({
        where: { id: wheel.data.id },
      })
      expect(completed?.status).toBe('COMPLETED')
    })

    it('should set completedAt timestamp', async () => {
      const wheel = await createWheel({ ticker: 'AAPL' })
      expect(wheel.success).toBe(true)
      if (!wheel.success) return

      const before = await prisma.wheel.findUnique({
        where: { id: wheel.data.id },
      })
      expect(before?.completedAt).toBeNull()

      await completeWheel(wheel.data.id)

      const after = await prisma.wheel.findUnique({
        where: { id: wheel.data.id },
      })
      expect(after?.completedAt).toBeDefined()
      expect(after?.completedAt).toBeInstanceOf(Date)
    })

    it('should reject completing already completed wheel', async () => {
      const wheel = await createWheel({ ticker: 'AAPL' })
      expect(wheel.success).toBe(true)
      if (!wheel.success) return

      await completeWheel(wheel.data.id)

      const result = await completeWheel(wheel.data.id)

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.error).toContain('already completed')
    })

    it('should update lastActivityAt when completing', async () => {
      const wheel = await createWheel({ ticker: 'AAPL' })
      expect(wheel.success).toBe(true)
      if (!wheel.success) return

      const before = await prisma.wheel.findUnique({
        where: { id: wheel.data.id },
      })
      const beforeTime = before?.lastActivityAt

      await new Promise((resolve) => setTimeout(resolve, 10))

      await completeWheel(wheel.data.id)

      const after = await prisma.wheel.findUnique({
        where: { id: wheel.data.id },
      })
      const afterTime = after?.lastActivityAt

      expect(afterTime! > beforeTime!).toBe(true)
    })

    it('should return error for non-existent wheel', async () => {
      const result = await completeWheel('clxyz_nonexistent')

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.error).toBe('Wheel not found')
    })
  })
})
