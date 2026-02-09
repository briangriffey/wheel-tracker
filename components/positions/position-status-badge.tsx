'use client'

import React from 'react'
import { cn } from '@/lib/utils/cn'

export type PositionStatus = 'OPEN' | 'COVERED' | 'PENDING_CLOSE' | 'CLOSED'

interface PositionStatusBadgeProps {
  status: PositionStatus
  className?: string
}

/**
 * Status badge component for positions
 *
 * Color scheme:
 * - OPEN: Blue - Position acquired, no active CALL
 * - COVERED: Green - Position has an active (OPEN) CALL
 * - PENDING_CLOSE: Yellow - CALL is ITM within 3 days of expiration
 * - CLOSED: Gray - Position sold via CALL assignment
 */
export function PositionStatusBadge({ status, className }: PositionStatusBadgeProps) {
  const getStatusConfig = (status: PositionStatus) => {
    switch (status) {
      case 'OPEN':
        return {
          label: 'Open',
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
          textColor: 'text-blue-800 dark:text-blue-300',
          borderColor: 'border-blue-200 dark:border-blue-800',
        }
      case 'COVERED':
        return {
          label: 'Covered',
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          textColor: 'text-green-800 dark:text-green-300',
          borderColor: 'border-green-200 dark:border-green-800',
        }
      case 'PENDING_CLOSE':
        return {
          label: 'Pending Close',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
          textColor: 'text-yellow-800 dark:text-yellow-300',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
        }
      case 'CLOSED':
        return {
          label: 'Closed',
          bgColor: 'bg-gray-100 dark:bg-gray-900/30',
          textColor: 'text-gray-800 dark:text-gray-300',
          borderColor: 'border-gray-200 dark:border-gray-800',
        }
    }
  }

  const config = getStatusConfig(status)

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        config.bgColor,
        config.textColor,
        config.borderColor,
        className
      )}
    >
      {config.label}
    </span>
  )
}

/**
 * Get status description for tooltips or help text
 */
export function getPositionStatusDescription(status: PositionStatus): string {
  switch (status) {
    case 'OPEN':
      return 'Position acquired, no active covered call'
    case 'COVERED':
      return 'Position has an active covered call'
    case 'PENDING_CLOSE':
      return 'Covered call is in-the-money and near expiration'
    case 'CLOSED':
      return 'Position closed via call assignment'
  }
}

/**
 * Determine available actions based on position status
 */
export function getAvailableActions(status: PositionStatus): {
  canSellCall: boolean
  canClosePosition: boolean
} {
  switch (status) {
    case 'OPEN':
      return {
        canSellCall: true,
        canClosePosition: true,
      }
    case 'COVERED':
      return {
        canSellCall: false, // Already has an active call
        canClosePosition: false, // Must close the call first
      }
    case 'PENDING_CLOSE':
      return {
        canSellCall: false, // Call is active and near expiration
        canClosePosition: false, // Likely to be assigned soon
      }
    case 'CLOSED':
      return {
        canSellCall: false,
        canClosePosition: false,
      }
  }
}
