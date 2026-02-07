'use client'

import React from 'react'
import type { TimeRange } from '@/lib/queries/dashboard'

interface TimeRangeSelectorProps {
  selected: TimeRange
  onChange: (range: TimeRange) => void
}

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: '1M', label: '1M' },
  { value: '3M', label: '3M' },
  { value: '6M', label: '6M' },
  { value: '1Y', label: '1Y' },
  { value: 'All', label: 'All' },
]

export function TimeRangeSelector({ selected, onChange }: TimeRangeSelectorProps) {
  return (
    <div className="flex gap-2">
      {TIME_RANGES.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selected === range.value
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  )
}
