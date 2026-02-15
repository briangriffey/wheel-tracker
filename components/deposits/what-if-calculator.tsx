'use client'

import React, { useState } from 'react'
import { getWhatIfComparison } from '@/lib/actions/deposits'
import type { LumpSumComparison } from '@/lib/calculations/lump-sum-comparison'
import { LumpSumComparisonCard } from './lump-sum-comparison-card'
import { LumpSumComparisonChart } from './lump-sum-comparison-chart'

export function WhatIfCalculator() {
  const [isCalculating, setIsCalculating] = useState(false)
  const [whatIfDate, setWhatIfDate] = useState('')
  const [whatIfPrice, setWhatIfPrice] = useState('')
  const [comparison, setComparison] = useState<LumpSumComparison | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCalculate = async () => {
    if (!whatIfDate || !whatIfPrice) {
      setError('Please enter both date and SPY price')
      return
    }

    const price = parseFloat(whatIfPrice)
    if (isNaN(price) || price <= 0) {
      setError('Please enter a valid SPY price')
      return
    }

    setIsCalculating(true)
    setError(null)

    try {
      const result = await getWhatIfComparison(new Date(whatIfDate), price)

      if (result.success) {
        setComparison(result.data)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate what-if scenario')
    } finally {
      setIsCalculating(false)
    }
  }

  const handleReset = () => {
    setWhatIfDate('')
    setWhatIfPrice('')
    setComparison(null)
    setError(null)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">What-If Calculator</h2>
      <p className="text-sm text-gray-600 mb-6">
        Explore alternative scenarios: What if you had invested everything as a lump sum on a
        different date?
      </p>

      {/* Input Form */}
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="what-if-date" className="block text-sm font-medium text-gray-700 mb-1">
              Hypothetical Investment Date
            </label>
            <input
              type="date"
              id="what-if-date"
              value={whatIfDate}
              onChange={(e) => setWhatIfDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="what-if-price" className="block text-sm font-medium text-gray-700 mb-1">
              SPY Price on That Date
            </label>
            <input
              type="number"
              id="what-if-price"
              value={whatIfPrice}
              onChange={(e) => setWhatIfPrice(e.target.value)}
              placeholder="e.g., 450.00"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleCalculate}
            disabled={isCalculating}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isCalculating ? 'Calculating...' : 'Calculate Scenario'}
          </button>

          {comparison && (
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {comparison && (
        <div className="space-y-6 pt-6 border-t">
          <LumpSumComparisonCard comparison={comparison} />
          <LumpSumComparisonChart comparison={comparison} />
        </div>
      )}
    </div>
  )
}
