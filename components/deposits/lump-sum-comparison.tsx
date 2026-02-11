'use client'

import React, { useEffect, useState } from 'react'
import { getLumpSumComparison } from '@/lib/actions/deposits'
import type { LumpSumComparison as LumpSumComparisonType } from '@/lib/calculations/lump-sum-comparison'
import { LumpSumComparisonCard } from './lump-sum-comparison-card'
import { LumpSumComparisonChart } from './lump-sum-comparison-chart'
import { WhatIfCalculator } from './what-if-calculator'

export function LumpSumComparison() {
  const [comparison, setComparison] = useState<LumpSumComparisonType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadComparison() {
      try {
        const result = await getLumpSumComparison()

        if (result.success) {
          setComparison(result.data)
        } else {
          setError(result.error)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load comparison')
      } finally {
        setIsLoading(false)
      }
    }

    loadComparison()
  }, [])

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4 mx-auto"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
          <p className="font-medium">Unable to Load Comparison</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (!comparison) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Default Comparison (First Deposit Date) */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Lump Sum vs Dollar-Cost Averaging
        </h2>
        <p className="text-gray-600 mb-6">
          Compare your actual deposit strategy (DCA) against a hypothetical lump sum investment made
          on your first deposit date.
        </p>

        <LumpSumComparisonCard comparison={comparison} />
        <LumpSumComparisonChart comparison={comparison} />
      </div>

      {/* What-If Calculator */}
      <div className="pt-6 border-t">
        <WhatIfCalculator />
      </div>
    </div>
  )
}
