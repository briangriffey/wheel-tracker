/**
 * Tests for notification actions
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prisma } from '@/lib/db'
import {
  getUpcomingExpirations,
  getITMOptions,
  getPositionsWithoutCalls,
  getUnreadNotificationCount,
  getRecentNotifications,
  getAllNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../notifications'
import * as pricesModule from '../prices'

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
    },
    trade: {
      findMany: vi.fn(),
    },
    position: {
      findMany: vi.fn(),
    },
    notification: {
      count: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))

// Mock prices module
vi.mock('../prices', () => ({
  getLatestPrice: vi.fn(),
}))

describe('Notification Actions', () => {
  const mockUserId = 'user-123'

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock getCurrentUserId
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: mockUserId } as never)
  })

  describe('getUpcomingExpirations', () => {
    it('should return trades expiring within 7 days', async () => {
      const now = new Date()
      const futureDate = new Date()
      futureDate.setDate(now.getDate() + 5) // 5 days from now

      const mockTrade = {
        id: 'trade-1',
        ticker: 'AAPL',
        type: 'PUT',
        strikePrice: { toNumber: () => 150 },
        expirationDate: futureDate,
        premium: { toNumber: () => 250 },
        contracts: 1,
      }

      vi.mocked(prisma.trade.findMany).mockResolvedValue([mockTrade] as never)

      const result = await getUpcomingExpirations(7)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0].ticker).toBe('AAPL')
        expect(result.data[0].type).toBe('PUT')
        expect(result.data[0].daysUntilExpiration).toBeGreaterThanOrEqual(4)
        expect(result.data[0].daysUntilExpiration).toBeLessThanOrEqual(5)
      }
    })

    it('should return empty array when no trades are expiring', async () => {
      vi.mocked(prisma.trade.findMany).mockResolvedValue([] as never)

      const result = await getUpcomingExpirations(7)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })

    it('should handle errors gracefully', async () => {
      vi.mocked(prisma.trade.findMany).mockRejectedValue(new Error('Database error'))

      const result = await getUpcomingExpirations(7)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Database error')
      }
    })
  })

  describe('getITMOptions', () => {
    it('should return ITM PUT options when stock price < strike price', async () => {
      const mockTrade = {
        id: 'trade-1',
        ticker: 'AAPL',
        type: 'PUT',
        strikePrice: { toNumber: () => 150 },
        expirationDate: new Date('2024-03-15'),
        premium: { toNumber: () => 250 },
        contracts: 1,
      }

      vi.mocked(prisma.trade.findMany).mockResolvedValue([mockTrade] as never)
      vi.mocked(pricesModule.getLatestPrice).mockResolvedValue({
        success: true,
        data: { price: 140 } as never,
      })

      const result = await getITMOptions()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0].ticker).toBe('AAPL')
        expect(result.data[0].type).toBe('PUT')
        expect(result.data[0].strikePrice).toBe(150)
        expect(result.data[0].currentPrice).toBe(140)
        expect(result.data[0].intrinsicValue).toBe(1000) // (150 - 140) * 1 * 100
      }
    })

    it('should return ITM CALL options when stock price > strike price', async () => {
      const mockTrade = {
        id: 'trade-1',
        ticker: 'AAPL',
        type: 'CALL',
        strikePrice: { toNumber: () => 150 },
        expirationDate: new Date('2024-03-15'),
        premium: { toNumber: () => 250 },
        contracts: 1,
      }

      vi.mocked(prisma.trade.findMany).mockResolvedValue([mockTrade] as never)
      vi.mocked(pricesModule.getLatestPrice).mockResolvedValue({
        success: true,
        data: { price: 160 } as never,
      })

      const result = await getITMOptions()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0].ticker).toBe('AAPL')
        expect(result.data[0].type).toBe('CALL')
        expect(result.data[0].intrinsicValue).toBe(1000) // (160 - 150) * 1 * 100
      }
    })

    it('should not return OTM options', async () => {
      const mockTrades = [
        {
          id: 'trade-1',
          ticker: 'AAPL',
          type: 'PUT',
          strikePrice: { toNumber: () => 150 },
          expirationDate: new Date('2024-03-15'),
          premium: { toNumber: () => 250 },
          contracts: 1,
        },
        {
          id: 'trade-2',
          ticker: 'AAPL',
          type: 'CALL',
          strikePrice: { toNumber: () => 160 },
          expirationDate: new Date('2024-03-15'),
          premium: { toNumber: () => 200 },
          contracts: 1,
        },
      ]

      vi.mocked(prisma.trade.findMany).mockResolvedValue(mockTrades as never)
      // Both options are OTM at price 155
      vi.mocked(pricesModule.getLatestPrice).mockResolvedValue({
        success: true,
        data: { price: 155 } as never,
      })

      const result = await getITMOptions()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })

    it('should handle missing price data', async () => {
      const mockTrade = {
        id: 'trade-1',
        ticker: 'AAPL',
        type: 'PUT',
        strikePrice: { toNumber: () => 150 },
        expirationDate: new Date('2024-03-15'),
        premium: { toNumber: () => 250 },
        contracts: 1,
      }

      vi.mocked(prisma.trade.findMany).mockResolvedValue([mockTrade] as never)
      vi.mocked(pricesModule.getLatestPrice).mockResolvedValue({
        success: false,
        error: 'Price not found',
      } as never)

      const result = await getITMOptions()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0) // Skip trades without price data
      }
    })
  })

  describe('getPositionsWithoutCalls', () => {
    it('should return positions without covered calls', async () => {
      const mockPosition = {
        id: 'pos-1',
        ticker: 'AAPL',
        shares: 100,
        costBasis: { toNumber: () => 150 },
        currentValue: { toNumber: () => 15000 },
        acquiredDate: new Date('2024-01-01'),
        coveredCalls: [], // No covered calls
      }

      vi.mocked(prisma.position.findMany).mockResolvedValue([mockPosition] as never)

      const result = await getPositionsWithoutCalls()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0].ticker).toBe('AAPL')
        expect(result.data[0].shares).toBe(100)
        expect(result.data[0].costBasis).toBe(150)
        expect(result.data[0].currentValue).toBe(15000)
      }
    })

    it('should not return positions with covered calls', async () => {
      const mockPositions = [
        {
          id: 'pos-1',
          ticker: 'AAPL',
          shares: 100,
          costBasis: { toNumber: () => 150 },
          currentValue: { toNumber: () => 15000 },
          acquiredDate: new Date('2024-01-01'),
          coveredCalls: [{ id: 'call-1' }], // Has covered call
        },
        {
          id: 'pos-2',
          ticker: 'MSFT',
          shares: 100,
          costBasis: { toNumber: () => 300 },
          currentValue: { toNumber: () => 30000 },
          acquiredDate: new Date('2024-01-01'),
          coveredCalls: [], // No covered calls
        },
      ]

      vi.mocked(prisma.position.findMany).mockResolvedValue(mockPositions as never)

      const result = await getPositionsWithoutCalls()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0].ticker).toBe('MSFT')
      }
    })

    it('should handle null currentValue', async () => {
      const mockPosition = {
        id: 'pos-1',
        ticker: 'AAPL',
        shares: 100,
        costBasis: { toNumber: () => 150 },
        currentValue: null,
        acquiredDate: new Date('2024-01-01'),
        coveredCalls: [],
      }

      vi.mocked(prisma.position.findMany).mockResolvedValue([mockPosition] as never)

      const result = await getPositionsWithoutCalls()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0].currentValue).toBeNull()
      }
    })

    it('should return empty array when no positions exist', async () => {
      vi.mocked(prisma.position.findMany).mockResolvedValue([] as never)

      const result = await getPositionsWithoutCalls()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })

    it('should handle errors gracefully', async () => {
      vi.mocked(prisma.position.findMany).mockRejectedValue(new Error('Database error'))

      const result = await getPositionsWithoutCalls()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Database error')
      }
    })
  })

  describe('getUnreadNotificationCount', () => {
    it('should return count of unread notifications', async () => {
      vi.mocked(prisma.notification.count).mockResolvedValue(5 as never)

      const result = await getUnreadNotificationCount()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(5)
      }
    })

    it('should return 0 when no unread notifications', async () => {
      vi.mocked(prisma.notification.count).mockResolvedValue(0 as never)

      const result = await getUnreadNotificationCount()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(0)
      }
    })

    it('should handle errors gracefully', async () => {
      vi.mocked(prisma.notification.count).mockRejectedValue(new Error('Database error'))

      const result = await getUnreadNotificationCount()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Database error')
      }
    })
  })

  describe('getRecentNotifications', () => {
    it('should return recent notifications', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          userId: mockUserId,
          type: 'EXPIRING_SOON',
          title: 'AAPL PUT expiring soon',
          message: 'Your option expires in 2 days',
          read: false,
          actionUrl: '/trades/trade-1',
          relatedTradeId: 'trade-1',
          relatedPositionId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(prisma.notification.findMany).mockResolvedValue(mockNotifications as never)

      const result = await getRecentNotifications(10)

      expect(result.success).toBe(true)
      if (result.success && result.data) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0].title).toBe('AAPL PUT expiring soon')
      }
    })

    it('should handle errors gracefully', async () => {
      vi.mocked(prisma.notification.findMany).mockRejectedValue(new Error('Database error'))

      const result = await getRecentNotifications(10)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Database error')
      }
    })
  })

  describe('getAllNotifications', () => {
    it('should return all notifications', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          userId: mockUserId,
          type: 'EXPIRING_SOON',
          title: 'AAPL PUT expiring soon',
          message: 'Your option expires in 2 days',
          read: false,
          actionUrl: '/trades/trade-1',
          relatedTradeId: 'trade-1',
          relatedPositionId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'notif-2',
          userId: mockUserId,
          type: 'ITM_OPTION',
          title: 'MSFT CALL is in-the-money',
          message: 'Your option is ITM',
          read: true,
          actionUrl: '/trades/trade-2',
          relatedTradeId: 'trade-2',
          relatedPositionId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(prisma.notification.findMany).mockResolvedValue(mockNotifications as never)

      const result = await getAllNotifications()

      expect(result.success).toBe(true)
      if (result.success && result.data) {
        expect(result.data).toHaveLength(2)
      }
    })
  })

  describe('markNotificationAsRead', () => {
    it('should mark notification as read', async () => {
      vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 1 } as never)

      const result = await markNotificationAsRead('notif-1')

      expect(result.success).toBe(true)
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'notif-1',
          userId: mockUserId,
        },
        data: {
          read: true,
        },
      })
    })

    it('should handle errors gracefully', async () => {
      vi.mocked(prisma.notification.updateMany).mockRejectedValue(new Error('Database error'))

      const result = await markNotificationAsRead('notif-1')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Database error')
      }
    })
  })

  describe('markAllNotificationsAsRead', () => {
    it('should mark all notifications as read', async () => {
      vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 5 } as never)

      const result = await markAllNotificationsAsRead()

      expect(result.success).toBe(true)
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          read: false,
        },
        data: {
          read: true,
        },
      })
    })

    it('should handle errors gracefully', async () => {
      vi.mocked(prisma.notification.updateMany).mockRejectedValue(new Error('Database error'))

      const result = await markAllNotificationsAsRead()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Database error')
      }
    })
  })
})
