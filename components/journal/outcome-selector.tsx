'use client'

import type { TradeOutcome } from '@/lib/generated/prisma'

interface OutcomeSelectorProps {
  outcome: TradeOutcome | null
  onUpdate: (outcome: TradeOutcome | null) => void
  disabled?: boolean
}

export function OutcomeSelector({ outcome, onUpdate, disabled }: OutcomeSelectorProps) {
  const getOutcomeColor = (outcome: TradeOutcome | null) => {
    switch (outcome) {
      case 'GREAT':
        return 'bg-green-100 text-green-800'
      case 'OKAY':
        return 'bg-blue-100 text-blue-800'
      case 'MISTAKE':
        return 'bg-red-100 text-red-800'
      case 'LEARNING':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-400'
    }
  }

  return (
    <select
      value={outcome || ''}
      onChange={(e) => onUpdate(e.target.value ? (e.target.value as TradeOutcome) : null)}
      disabled={disabled}
      className={`px-2 py-1 text-xs font-semibold rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${getOutcomeColor(
        outcome
      )}`}
    >
      <option value="">Not set</option>
      <option value="GREAT">Great</option>
      <option value="OKAY">Okay</option>
      <option value="MISTAKE">Mistake</option>
      <option value="LEARNING">Learning</option>
    </select>
  )
}
