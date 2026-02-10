import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { TradeList } from '../trade-list'
import type { Trade } from '@/lib/generated/prisma'
import type { StockPriceResult } from '@/lib/services/market-data'

// Mock dependencies
vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}))

vi.mock('@/lib/actions/trades', () => ({
    deleteTrade: vi.fn(),
    updateTradeStatus: vi.fn(),
}))

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
        refresh: vi.fn(),
    }),
}))

describe('TradeList Component Reproduction', () => {
    it('crashes when premium is a string/number instead of Decimal', () => {
        // Simulate serialized data passed from Server Component
        const serializedTrades = [
            {
                id: '1',
                userId: 'user1',
                ticker: 'AAPL',
                type: 'PUT',
                action: 'SELL_TO_OPEN',
                status: 'OPEN',
                // In the actual error case, these are numbers or strings, lacking .toNumber()
                strikePrice: 150.0,
                premium: 2.50,
                contracts: 1,
                shares: 100,
                expirationDate: new Date('2026-03-15'),
                openDate: new Date('2026-02-01'),
                closeDate: null,
                notes: 'Test',
                createdAt: new Date(),
                updatedAt: new Date(),
                positionId: null,
            },
            // Test string case too
            {
                id: '2',
                userId: 'user1',
                ticker: 'TSLA',
                type: 'CALL',
                action: 'SELL_TO_OPEN',
                status: 'OPEN',
                strikePrice: "200.0",
                premium: "5.0",
                contracts: 1,
                shares: 100,
                expirationDate: new Date('2026-03-15'),
                openDate: new Date('2026-02-01'),
                closeDate: null,
                notes: 'Test',
                createdAt: new Date(),
                updatedAt: new Date(),
                positionId: null,
            }
        ] as unknown as Trade[]

        // Create mock prices map
        const mockPrices = new Map<string, StockPriceResult>([
            ['AAPL', { ticker: 'AAPL', success: true, price: 155.0, date: new Date() }],
            ['TSLA', { ticker: 'TSLA', success: true, price: 210.0, date: new Date() }],
        ])

        // This should now succeed
        expect(() => render(<TradeList initialTrades={serializedTrades} prices={mockPrices} />)).not.toThrow()

        // Check if values are formatted correctly
        expect(screen.getAllByText('$150.00')).toBeDefined()
        expect(screen.getAllByText('$2.50')).toBeDefined()
    })
})
