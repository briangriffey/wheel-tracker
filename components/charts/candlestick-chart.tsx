'use client'

import React, { useEffect, useRef } from 'react'
import {
  createChart,
  CandlestickSeries,
  type IChartApi,
  type CandlestickData,
  type Time,
  ColorType,
  LineStyle,
} from 'lightweight-charts'

interface CandlestickChartProps {
  data: { date: Date; open: number; high: number; low: number; close: number }[]
  strikePrice: number | null
  height?: number
}

export function CandlestickChart({
  data,
  strikePrice,
  height = 300,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return

    const chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: 'rgba(156, 163, 175, 0.1)' },
        horzLines: { color: 'rgba(156, 163, 175, 0.1)' },
      },
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
      },
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderDownColor: '#ef4444',
      borderUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      wickUpColor: '#22c55e',
    })

    const chartData: CandlestickData<Time>[] = data.map((d) => ({
      time: new Date(d.date).toISOString().split('T')[0] as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }))

    series.setData(chartData)

    if (strikePrice !== null) {
      series.createPriceLine({
        price: strikePrice,
        color: '#f59e0b',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `Strike $${strikePrice}`,
      })
    }

    chart.timeScale().fitContent()
    chartRef.current = chart

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect
        chart.applyOptions({ width })
      }
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
    }
  }, [data, strikePrice, height])

  if (data.length === 0) return null

  return <div ref={containerRef} className="w-full" />
}
