import { describe, it, expect } from 'vitest'
import {
  calculatePortfolioMetrics,
  calculateOverallWinRate,
  calculateTickerPerformances,
  formatCurrency,
  formatPercentage,
  type WheelData,
  type PositionData,
} from './portfolio'

describe('calculatePortfolioMetrics', () => {
  it('should calculate metrics for empty portfolio', () => {
    const wheels: WheelData[] = []
    const positions: PositionData[] = []

    const metrics = calculatePortfolioMetrics(wheels, positions)

    expect(metrics).toEqual({
      totalWheels: {
        active: 0,
        idle: 0,
        paused: 0,
        completed: 0,
        total: 0,
      },
      totalCapitalDeployed: 0,
      totalPremiumsCollected: 0,
      totalRealizedPL: 0,
      overallWinRate: 0,
      bestPerformingTickers: [],
      worstPerformingTickers: [],
    })
  })

  it('should count wheels by status correctly', () => {
    const wheels: WheelData[] = [
      {
        id: '1',
        ticker: 'AAPL',
        status: 'ACTIVE',
        cycleCount: 2,
        totalPremiums: 500,
        totalRealizedPL: 1200,
      },
      {
        id: '2',
        ticker: 'MSFT',
        status: 'ACTIVE',
        cycleCount: 1,
        totalPremiums: 300,
        totalRealizedPL: 800,
      },
      {
        id: '3',
        ticker: 'TSLA',
        status: 'IDLE',
        cycleCount: 3,
        totalPremiums: 900,
        totalRealizedPL: 2100,
      },
      {
        id: '4',
        ticker: 'NVDA',
        status: 'PAUSED',
        cycleCount: 1,
        totalPremiums: 200,
        totalRealizedPL: -300,
      },
      {
        id: '5',
        ticker: 'GOOGL',
        status: 'COMPLETED',
        cycleCount: 5,
        totalPremiums: 1500,
        totalRealizedPL: 3500,
      },
    ]
    const positions: PositionData[] = []

    const metrics = calculatePortfolioMetrics(wheels, positions)

    expect(metrics.totalWheels).toEqual({
      active: 2,
      idle: 1,
      paused: 1,
      completed: 1,
      total: 5,
    })
  })

  it('should calculate total capital deployed from open positions', () => {
    const wheels: WheelData[] = []
    const positions: PositionData[] = [
      { totalCost: 14750, status: 'OPEN' },
      { totalCost: 38000, status: 'OPEN' },
      { totalCost: 21000, status: 'OPEN' },
    ]

    const metrics = calculatePortfolioMetrics(wheels, positions)

    expect(metrics.totalCapitalDeployed).toBe(73750)
  })

  it('should calculate total premiums collected', () => {
    const wheels: WheelData[] = [
      {
        id: '1',
        ticker: 'AAPL',
        status: 'ACTIVE',
        cycleCount: 2,
        totalPremiums: 500,
        totalRealizedPL: 1200,
      },
      {
        id: '2',
        ticker: 'MSFT',
        status: 'ACTIVE',
        cycleCount: 1,
        totalPremiums: 300,
        totalRealizedPL: 800,
      },
      {
        id: '3',
        ticker: 'TSLA',
        status: 'IDLE',
        cycleCount: 3,
        totalPremiums: 900,
        totalRealizedPL: 2100,
      },
    ]
    const positions: PositionData[] = []

    const metrics = calculatePortfolioMetrics(wheels, positions)

    expect(metrics.totalPremiumsCollected).toBe(1700)
  })

  it('should calculate total realized P&L', () => {
    const wheels: WheelData[] = [
      {
        id: '1',
        ticker: 'AAPL',
        status: 'ACTIVE',
        cycleCount: 2,
        totalPremiums: 500,
        totalRealizedPL: 1200,
      },
      {
        id: '2',
        ticker: 'MSFT',
        status: 'ACTIVE',
        cycleCount: 1,
        totalPremiums: 300,
        totalRealizedPL: 800,
      },
      {
        id: '3',
        ticker: 'NVDA',
        status: 'PAUSED',
        cycleCount: 1,
        totalPremiums: 200,
        totalRealizedPL: -300,
      },
    ]
    const positions: PositionData[] = []

    const metrics = calculatePortfolioMetrics(wheels, positions)

    expect(metrics.totalRealizedPL).toBe(1700) // 1200 + 800 - 300
  })

  it('should identify best and worst performing tickers', () => {
    const wheels: WheelData[] = [
      {
        id: '1',
        ticker: 'AAPL',
        status: 'ACTIVE',
        cycleCount: 2,
        totalPremiums: 500,
        totalRealizedPL: 1200,
      },
      {
        id: '2',
        ticker: 'MSFT',
        status: 'ACTIVE',
        cycleCount: 1,
        totalPremiums: 300,
        totalRealizedPL: 2500, // Best
      },
      {
        id: '3',
        ticker: 'NVDA',
        status: 'PAUSED',
        cycleCount: 1,
        totalPremiums: 200,
        totalRealizedPL: -300, // Worst
      },
    ]
    const positions: PositionData[] = []

    const metrics = calculatePortfolioMetrics(wheels, positions)

    expect(metrics.bestPerformingTickers[0].ticker).toBe('MSFT')
    expect(metrics.bestPerformingTickers[0].totalRealizedPL).toBe(2500)

    expect(metrics.worstPerformingTickers[0].ticker).toBe('NVDA')
    expect(metrics.worstPerformingTickers[0].totalRealizedPL).toBe(-300)
  })

  it('should limit best/worst to 5 tickers', () => {
    const wheels: WheelData[] = Array.from({ length: 10 }, (_, i) => ({
      id: String(i + 1),
      ticker: `TICK${i + 1}`,
      status: 'ACTIVE',
      cycleCount: 1,
      totalPremiums: 100,
      totalRealizedPL: (i + 1) * 100, // 100, 200, 300, ..., 1000
    }))
    const positions: PositionData[] = []

    const metrics = calculatePortfolioMetrics(wheels, positions)

    expect(metrics.bestPerformingTickers).toHaveLength(5)
    expect(metrics.worstPerformingTickers).toHaveLength(5)
  })

  it('should handle comprehensive portfolio', () => {
    const wheels: WheelData[] = [
      {
        id: '1',
        ticker: 'AAPL',
        status: 'ACTIVE',
        cycleCount: 2,
        totalPremiums: 500,
        totalRealizedPL: 1200,
      },
      {
        id: '2',
        ticker: 'MSFT',
        status: 'IDLE',
        cycleCount: 3,
        totalPremiums: 900,
        totalRealizedPL: 2100,
      },
    ]
    const positions: PositionData[] = [
      { totalCost: 14750, status: 'OPEN' },
      { totalCost: 38000, status: 'OPEN' },
    ]

    const metrics = calculatePortfolioMetrics(wheels, positions)

    expect(metrics.totalWheels.total).toBe(2)
    expect(metrics.totalWheels.active).toBe(1)
    expect(metrics.totalWheels.idle).toBe(1)
    expect(metrics.totalCapitalDeployed).toBe(52750)
    expect(metrics.totalPremiumsCollected).toBe(1400)
    expect(metrics.totalRealizedPL).toBe(3300)
    expect(metrics.overallWinRate).toBe(100) // Both wheels profitable
  })
})

describe('calculateOverallWinRate', () => {
  it('should return 0 for empty wheels array', () => {
    const wheels: WheelData[] = []
    const winRate = calculateOverallWinRate(wheels)
    expect(winRate).toBe(0)
  })

  it('should return 0 for wheels with no completed cycles', () => {
    const wheels: WheelData[] = [
      {
        id: '1',
        ticker: 'AAPL',
        status: 'ACTIVE',
        cycleCount: 0,
        totalPremiums: 500,
        totalRealizedPL: 0,
      },
      {
        id: '2',
        ticker: 'MSFT',
        status: 'ACTIVE',
        cycleCount: 0,
        totalPremiums: 300,
        totalRealizedPL: 0,
      },
    ]
    const winRate = calculateOverallWinRate(wheels)
    expect(winRate).toBe(0)
  })

  it('should calculate 100% win rate for all profitable wheels', () => {
    const wheels: WheelData[] = [
      {
        id: '1',
        ticker: 'AAPL',
        status: 'ACTIVE',
        cycleCount: 2,
        totalPremiums: 500,
        totalRealizedPL: 1200,
      },
      {
        id: '2',
        ticker: 'MSFT',
        status: 'ACTIVE',
        cycleCount: 3,
        totalPremiums: 900,
        totalRealizedPL: 2100,
      },
    ]
    const winRate = calculateOverallWinRate(wheels)
    expect(winRate).toBe(100)
  })

  it('should calculate 0% win rate for all unprofitable wheels', () => {
    const wheels: WheelData[] = [
      {
        id: '1',
        ticker: 'AAPL',
        status: 'ACTIVE',
        cycleCount: 2,
        totalPremiums: 500,
        totalRealizedPL: -300,
      },
      {
        id: '2',
        ticker: 'MSFT',
        status: 'ACTIVE',
        cycleCount: 3,
        totalPremiums: 900,
        totalRealizedPL: -500,
      },
    ]
    const winRate = calculateOverallWinRate(wheels)
    expect(winRate).toBe(0)
  })

  it('should calculate mixed win rate correctly', () => {
    const wheels: WheelData[] = [
      {
        id: '1',
        ticker: 'AAPL',
        status: 'ACTIVE',
        cycleCount: 3,
        totalPremiums: 500,
        totalRealizedPL: 1200, // Profitable
      },
      {
        id: '2',
        ticker: 'MSFT',
        status: 'ACTIVE',
        cycleCount: 2,
        totalPremiums: 300,
        totalRealizedPL: -200, // Unprofitable
      },
    ]
    const winRate = calculateOverallWinRate(wheels)
    // 3 profitable cycles out of 5 total = 60%
    expect(winRate).toBe(60)
  })

  it('should ignore wheels with 0 cycles', () => {
    const wheels: WheelData[] = [
      {
        id: '1',
        ticker: 'AAPL',
        status: 'ACTIVE',
        cycleCount: 0,
        totalPremiums: 0,
        totalRealizedPL: 0,
      },
      {
        id: '2',
        ticker: 'MSFT',
        status: 'ACTIVE',
        cycleCount: 2,
        totalPremiums: 500,
        totalRealizedPL: 1200,
      },
    ]
    const winRate = calculateOverallWinRate(wheels)
    // Only MSFT counts, and it's profitable: 100%
    expect(winRate).toBe(100)
  })
})

describe('calculateTickerPerformances', () => {
  it('should return empty array for no wheels', () => {
    const wheels: WheelData[] = []
    const performances = calculateTickerPerformances(wheels)
    expect(performances).toEqual([])
  })

  it('should calculate performance for each ticker', () => {
    const wheels: WheelData[] = [
      {
        id: '1',
        ticker: 'AAPL',
        status: 'ACTIVE',
        cycleCount: 2,
        totalPremiums: 500,
        totalRealizedPL: 1200,
      },
      {
        id: '2',
        ticker: 'MSFT',
        status: 'IDLE',
        cycleCount: 3,
        totalPremiums: 900,
        totalRealizedPL: -300,
      },
    ]
    const performances = calculateTickerPerformances(wheels)

    expect(performances).toHaveLength(2)
    expect(performances[0]).toEqual({
      ticker: 'AAPL',
      wheelId: '1',
      cycleCount: 2,
      totalPremiums: 500,
      totalRealizedPL: 1200,
      winRate: 100,
      status: 'ACTIVE',
    })
    expect(performances[1]).toEqual({
      ticker: 'MSFT',
      wheelId: '2',
      cycleCount: 3,
      totalPremiums: 900,
      totalRealizedPL: -300,
      winRate: 0, // Unprofitable
      status: 'IDLE',
    })
  })

  it('should set win rate to 0 for wheels with no cycles', () => {
    const wheels: WheelData[] = [
      {
        id: '1',
        ticker: 'AAPL',
        status: 'ACTIVE',
        cycleCount: 0,
        totalPremiums: 0,
        totalRealizedPL: 0,
      },
    ]
    const performances = calculateTickerPerformances(wheels)

    expect(performances[0].winRate).toBe(0)
  })
})

describe('formatCurrency', () => {
  it('should format positive amounts', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56')
  })

  it('should format negative amounts', () => {
    expect(formatCurrency(-1234.56)).toBe('-$1,234.56')
  })

  it('should format zero', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('should format large amounts with commas', () => {
    expect(formatCurrency(1234567.89)).toBe('$1,234,567.89')
  })

  it('should round to 2 decimal places', () => {
    expect(formatCurrency(123.456)).toBe('$123.46')
  })
})

describe('formatPercentage', () => {
  it('should format whole percentages', () => {
    expect(formatPercentage(50)).toBe('50.0%')
  })

  it('should format decimal percentages with 1 decimal place', () => {
    expect(formatPercentage(66.67)).toBe('66.7%')
  })

  it('should format zero', () => {
    expect(formatPercentage(0)).toBe('0.0%')
  })

  it('should format negative percentages', () => {
    expect(formatPercentage(-10.5)).toBe('-10.5%')
  })

  it('should format large percentages', () => {
    expect(formatPercentage(150.25)).toBe('150.3%') // 150.25 rounds to 150.3
  })
})
