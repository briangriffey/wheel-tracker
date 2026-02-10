import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { PositionsList } from '../positions-list'
import type { PositionWithCalculations } from '@/lib/queries/positions'

// Mock dependencies
vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}))

vi.mock('../assign-call-dialog', () => ({
    AssignCallDialog: () => <div data-testid="assign-call-dialog" />,
}))

vi.mock('@/components/ui/dialog', () => ({
    Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        refresh: vi.fn(),
        push: vi.fn(),
    }),
}))

describe('PositionsList Component Reproduction', () => {
    it('crashes when decimal fields are strings/numbers instead of Decimal objects', () => {
        // Simulate serialized data passed from Server Component
        const serializedPositions = [
            {
                id: '1',
                userId: 'user1',
                ticker: 'AAPL',
                shares: 500,
                // Serialized values
                costBasis: 150.0,
                totalCost: 75000.0,
                currentValue: 77500.0,
                realizedGainLoss: null,
                status: 'OPEN',
                acquiredDate: new Date('2026-01-15'),
                closedDate: null,
                notes: 'Test position 1',
                createdAt: new Date('2026-01-15'),
                updatedAt: new Date('2026-02-07'),
                wheelId: null,
                assignmentTradeId: 'trade1',
                assignmentTrade: {
                    id: 'trade1',
                    ticker: 'AAPL',
                    strikePrice: 150.0,
                    premium: 500.0,
                    expirationDate: new Date('2026-01-15'),
                },
                coveredCalls: [],
                unrealizedPL: 2500,
                unrealizedPLPercent: 3.33,
                daysHeld: 23,
                coveredCallsPremium: 0,
                netCostBasis: 150,
            }
        ] as unknown as PositionWithCalculations[]

        // This should now succeed
        expect(() => render(<PositionsList initialPositions={serializedPositions} />)).not.toThrow()

        // Check if values are formatted correctly
        expect(screen.getAllByText('$150.00')).toBeDefined()
        expect(screen.getAllByText('$75,000.00')).toBeDefined()
    })
})
