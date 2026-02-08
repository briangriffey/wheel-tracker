'use client'

import React, { useState } from 'react'
import Link from 'next/link'

interface HelpIconProps {
  tooltip?: string
  helpLink?: string
  className?: string
}

/**
 * HelpIcon component - displays a (?) icon with optional tooltip and link
 *
 * @param tooltip - Text to show on hover
 * @param helpLink - URL to navigate to when clicked
 * @param className - Additional CSS classes
 */
export function HelpIcon({ tooltip, helpLink, className = '' }: HelpIconProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const iconButton = (
    <button
      className={`inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors text-xs font-bold ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      aria-label={tooltip || 'Help'}
    >
      ?
    </button>
  )

  const content = (
    <span className="relative inline-block">
      {helpLink ? (
        <Link href={helpLink} className="no-underline">
          {iconButton}
        </Link>
      ) : (
        iconButton
      )}
      {tooltip && showTooltip && (
        <span
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg whitespace-nowrap z-50 shadow-lg"
          role="tooltip"
        >
          {tooltip}
          <span className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  )

  return content
}

interface HelpTooltipProps {
  children: React.ReactNode
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

/**
 * HelpTooltip component - wraps any element with a hover tooltip
 *
 * @param children - The element to wrap
 * @param content - Tooltip text
 * @param position - Tooltip position relative to element
 */
export function HelpTooltip({
  children,
  content,
  position = 'top',
}: HelpTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
  }

  const arrowClasses = {
    top: 'top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900',
    bottom:
      'bottom-full left-1/2 transform -translate-x-1/2 -mb-1 border-4 border-transparent border-b-gray-900',
    left: 'left-full top-1/2 transform -translate-y-1/2 -ml-1 border-4 border-transparent border-l-gray-900',
    right:
      'right-full top-1/2 transform -translate-y-1/2 -mr-1 border-4 border-transparent border-r-gray-900',
  }

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}
      {showTooltip && (
        <span
          className={`absolute ${positionClasses[position]} px-3 py-2 text-xs text-white bg-gray-900 rounded-lg whitespace-nowrap z-50 shadow-lg max-w-xs`}
          role="tooltip"
        >
          {content}
          <span className={`absolute ${arrowClasses[position]}`} />
        </span>
      )}
    </span>
  )
}
