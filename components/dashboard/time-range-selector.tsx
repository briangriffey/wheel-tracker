'use client'

import React from 'react'
import type { TimeRange } from '@/lib/queries/dashboard'
import { Button } from '@/components/design-system'

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
        <Button
          key={range.value}
          onClick={() => onChange(range.value)}
          variant={selected === range.value ? 'primary' : 'outline'}
          size="sm"
        >
          {range.label}
        </Button>
      ))}
    </div>
  )
}
