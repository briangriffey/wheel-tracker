'use client'

import React from 'react'
import { Select } from '@/components/design-system'

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
      <Select
        id="benchmark-select"
        value={selected}
        onChange={(e) => onChange(e.target.value as BenchmarkTicker)}
        size="sm"
        wrapperClassName="w-full sm:w-auto"
        aria-label="Select benchmark to compare against"
      >
        {BENCHMARKS.map((benchmark) => (
          <option key={benchmark.value} value={benchmark.value}>
            {benchmark.label} - {benchmark.description}
          </option>
        ))}
      </Select>
    </div>
  )
}
