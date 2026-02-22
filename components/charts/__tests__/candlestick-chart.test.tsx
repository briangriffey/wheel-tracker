import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { createChart } from 'lightweight-charts'

// jsdom doesn't have ResizeObserver - use a real class, not vi.fn()
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver

const mockCreatePriceLine = vi.fn()
const mockSetData = vi.fn()
const mockFitContent = vi.fn()
const mockApplyOptions = vi.fn()
const mockRemove = vi.fn()

const mockSeries = {
  setData: mockSetData,
  createPriceLine: mockCreatePriceLine,
}

const mockChart = {
  addSeries: vi.fn(() => mockSeries),
  timeScale: vi.fn(() => ({ fitContent: mockFitContent })),
  applyOptions: mockApplyOptions,
  remove: mockRemove,
}

vi.mock('lightweight-charts', () => ({
  createChart: vi.fn(() => mockChart),
  CandlestickSeries: 'CandlestickSeries',
  ColorType: { Solid: 'Solid' },
  LineStyle: { Dashed: 2 },
}))

const mockCreateChart = vi.mocked(createChart)

import { CandlestickChart } from '../candlestick-chart'

const mockData = [
  { date: new Date('2024-01-02'), open: 170, high: 175, low: 168, close: 173 },
  { date: new Date('2024-01-03'), open: 173, high: 178, low: 172, close: 176 },
  { date: new Date('2024-01-04'), open: 176, high: 177, low: 170, close: 171 },
]

describe('CandlestickChart', () => {
  beforeEach(() => {
    mockCreatePriceLine.mockClear()
    mockSetData.mockClear()
    mockFitContent.mockClear()
    mockApplyOptions.mockClear()
    mockRemove.mockClear()
    mockChart.addSeries.mockClear()
    mockChart.timeScale.mockClear()
    mockCreateChart.mockClear()
  })

  it('renders nothing when data is empty', () => {
    const { container } = render(
      <CandlestickChart data={[]} strikePrice={170} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders a container div when data is provided', () => {
    const { container } = render(
      <CandlestickChart data={mockData} strikePrice={170} />
    )
    const div = container.querySelector('div')
    expect(div).toBeInTheDocument()
    expect(div?.className).toContain('w-full')
  })

  it('creates chart with correct options', () => {
    render(<CandlestickChart data={mockData} strikePrice={170} />)

    expect(mockCreateChart).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({
        height: 300,
        layout: expect.objectContaining({
          background: { type: 'Solid', color: 'transparent' },
        }),
      })
    )
  })

  it('adds candlestick series with green/red colors', () => {
    render(<CandlestickChart data={mockData} strikePrice={170} />)

    expect(mockChart.addSeries).toHaveBeenCalledWith(
      'CandlestickSeries',
      expect.objectContaining({
        upColor: '#22c55e',
        downColor: '#ef4444',
      })
    )
  })

  it('sets chart data with formatted dates', () => {
    render(<CandlestickChart data={mockData} strikePrice={170} />)

    expect(mockSetData).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          time: '2024-01-02',
          open: 170,
          high: 175,
          low: 168,
          close: 173,
        }),
      ])
    )
  })

  it('creates strike price line when strikePrice is provided', () => {
    render(<CandlestickChart data={mockData} strikePrice={170} />)

    expect(mockCreatePriceLine).toHaveBeenCalledWith(
      expect.objectContaining({
        price: 170,
        color: '#f59e0b',
        lineStyle: 2,
        title: 'Strike $170',
      })
    )
  })

  it('does not create price line when strikePrice is null', () => {
    render(<CandlestickChart data={mockData} strikePrice={null} />)

    expect(mockCreatePriceLine).not.toHaveBeenCalled()
  })

  it('calls fitContent on the time scale', () => {
    render(<CandlestickChart data={mockData} strikePrice={170} />)

    expect(mockFitContent).toHaveBeenCalled()
  })

  it('uses custom height when provided', () => {
    render(<CandlestickChart data={mockData} strikePrice={170} height={400} />)

    expect(mockCreateChart).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ height: 400 })
    )
  })
})
