import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { TradeList } from '../trade-list'
import type { Trade } from '@/lib/generated/prisma'

// Mock dependencies
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
        refresh: vi.fn(),
    }),
}))

vi.mock('@/lib/actions/trades', () => ({
    deleteTrade: vi.fn(),
    updateTradeStatus: vi.fn(),
}))

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}))

describe('TradeList Component Update', () => {
    const mockTrades = [
        {
            id: 'trade-1',
            userId: 'user-1',
            ticker: 'AAPL',
            type: 'PUT',
            action: 'SELL_TO_OPEN',
            status: 'OPEN',
            strikePrice: 150,
            premium: 250,
            contracts: 1,
            shares: 100,
            expirationDate: new Date('2024-01-01'),
            openDate: new Date('2023-12-01'),
            closeDate: null,
            notes: null,
            positionId: null,
            wheelId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    ] as unknown as Trade[]

    it('updates when initialTrades prop changes', () => {
        // Initial render
        const { rerender } = render(<TradeList initialTrades={mockTrades} prices={new Map()} />)

        // Multiple elements might match in responsive view (desktop table + mobile card)
        expect(screen.getAllByText('AAPL').length).toBeGreaterThan(0)
        expect(screen.queryByText('GOOGL')).toBeNull()

        // Create new trades list with an additional trade
        const updatedTrades = [
            ...mockTrades,
            {
                id: 'trade-2',
                userId: 'user-1',
                ticker: 'GOOGL',
                type: 'CALL',
                action: 'SELL_TO_OPEN',
                status: 'OPEN',
                strikePrice: 2800,
                premium: 500,
                contracts: 1,
                shares: 100,
                expirationDate: new Date('2024-02-01'),
                openDate: new Date('2024-01-01'),
                closeDate: null,
                notes: null,
                positionId: null,
                wheelId: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ] as unknown as Trade[]

        // Rerender with new props
        rerender(<TradeList initialTrades={updatedTrades} prices={new Map()} />)

        // Verify both trades are present
        expect(screen.getAllByText('AAPL').length).toBeGreaterThan(0)
        expect(screen.getAllByText('GOOGL').length).toBeGreaterThan(0)
    })
})
