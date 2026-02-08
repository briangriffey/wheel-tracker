'use client'

import React from 'react'

export type BenchmarkTicker = 'SPY' | 'QQQ' | 'VTI' | 'DIA' | 'IWM'

interface BenchmarkSelectorProps {
  selected: BenchmarkTicker
  onChange: (ticker: BenchmarkTicker) => void
}

const BENCHMARKS: { value: BenchmarkTicker; label: string; description: string }[] = [
  { value: 'SPY', label: 'SPY', description: 'S&P 500 ETF' },
  { value: 'QQQ', label: 'QQQ', description: 'Nasdaq-100 ETF' },
  { value: 'VTI', label: 'VTI', description: 'Total Stock Market ETF' },
  { value: 'DIA', label: 'DIA', description: 'Dow Jones ETF' },
  { value: 'IWM', label: 'IWM', description: 'Russell 2000 ETF' },
]

export function BenchmarkSelector({ selected, onChange }: BenchmarkSelectorProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <label htmlFor="benchmark-select" className="text-sm font-medium text-gray-700">
        Compare to:
      </label>
      <select
        id="benchmark-select"
        value={selected}
        onChange={(e) => onChange(e.target.value as BenchmarkTicker)}
        className="block w-full sm:w-auto px-4 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        aria-label="Select benchmark to compare against"
      >
        {BENCHMARKS.map((benchmark) => (
          <option key={benchmark.value} value={benchmark.value}>
            {benchmark.label} - {benchmark.description}
          </option>
        ))}
      </select>
    </div>
  )
}
