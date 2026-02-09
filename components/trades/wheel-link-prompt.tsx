'use client'

import React, { useState, useEffect } from 'react'
import { createWheel, findActiveWheel } from '@/lib/actions/wheels'
import { linkTradeToWheel } from '@/lib/actions/trades'
import toast from 'react-hot-toast'

export interface WheelLinkPromptProps {
  trade: {
    id: string
    ticker: string
    type: string
  }
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

/**
 * Wheel Link Prompt Component
 *
 * Prompts the user to link a newly created trade to a wheel strategy.
 * Options:
 * - Link to existing active/idle wheel
 * - Create a new wheel
 * - Skip (no wheel tracking)
 */
export function WheelLinkPrompt({ trade, isOpen, onClose, onSuccess }: WheelLinkPromptProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [existingWheel, setExistingWheel] = useState<{ id: string; currentStep: string } | null>(
    null
  )
  const [isCheckingWheel, setIsCheckingWheel] = useState(true)

  // Check for existing wheel when dialog opens
  useEffect(() => {
    if (!isOpen) return

    const checkForWheel = async () => {
      setIsCheckingWheel(true)

      try {
        const result = await findActiveWheel(trade.ticker)
        if (result.success && result.data) {
          setExistingWheel(result.data)
        } else {
          setExistingWheel(null)
        }
      } catch (error) {
        console.error('Error checking for wheel:', error)
        setExistingWheel(null)
      } finally {
        setIsCheckingWheel(false)
      }
    }

    checkForWheel()
  }, [isOpen, trade.ticker])

  const handleLinkToExisting = async () => {
    if (!existingWheel) return

    setIsSubmitting(true)

    try {
      const result = await linkTradeToWheel(trade.id, existingWheel.id)

      if (result.success) {
        toast.success(`Trade linked to existing wheel for ${trade.ticker}`)
        onSuccess()
        onClose()
      } else {
        toast.error(result.error || 'Failed to link trade to wheel')
      }
    } catch (error) {
      console.error('Error linking to wheel:', error)
      toast.error('Failed to link trade to wheel')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateNew = async () => {
    setIsSubmitting(true)

    try {
      // Create new wheel
      const wheelResult = await createWheel({
        ticker: trade.ticker,
        notes: `Started from trade ${trade.id}`,
      })

      if (!wheelResult.success) {
        toast.error(wheelResult.error || 'Failed to create wheel')
        setIsSubmitting(false)
        return
      }

      // Link trade to the new wheel
      const linkResult = await linkTradeToWheel(trade.id, wheelResult.data.id)

      if (linkResult.success) {
        toast.success(`Created new wheel and linked trade for ${trade.ticker}`)
        onSuccess()
        onClose()
      } else {
        toast.error(linkResult.error || 'Failed to link trade to new wheel')
      }
    } catch (error) {
      console.error('Error creating wheel:', error)
      toast.error('Failed to create wheel')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkip = () => {
    toast.success('Trade created without wheel tracking')
    onClose()
    onSuccess()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold mb-4">Link to Wheel Strategy?</h2>

        <p className="text-gray-600 mb-6">
          Track this {trade.type} trade for <span className="font-semibold">{trade.ticker}</span> as
          part of a wheel strategy cycle.
        </p>

        {isCheckingWheel ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {existingWheel && (
              <button
                onClick={handleLinkToExisting}
                disabled={isSubmitting}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
              >
                <div className="font-semibold">Link to Existing Wheel</div>
                <div className="text-sm text-blue-100">
                  Current step: {existingWheel.currentStep}
                </div>
              </button>
            )}

            <button
              onClick={handleCreateNew}
              disabled={isSubmitting}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
            >
              <div className="font-semibold">Start New Wheel</div>
              <div className="text-sm text-green-100">Begin tracking a new wheel cycle</div>
            </button>

            <button
              onClick={handleSkip}
              disabled={isSubmitting}
              className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
            >
              <div className="font-semibold">Skip (No Wheel)</div>
              <div className="text-sm text-gray-600">Track trade independently</div>
            </button>
          </div>
        )}

        {isSubmitting && (
          <div className="mt-4 flex items-center justify-center text-sm text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            Processing...
          </div>
        )}
      </div>
    </div>
  )
}
