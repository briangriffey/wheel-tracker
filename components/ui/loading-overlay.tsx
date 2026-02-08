import React from 'react'
import { cn } from '@/lib/utils/cn'
import { Spinner } from './spinner'

interface LoadingOverlayProps {
  /** Whether the overlay is visible */
  visible?: boolean
  /** Loading message to display */
  message?: string
  /** Whether to blur the background content */
  blur?: boolean
  /** Additional CSS classes */
  className?: string
}

export function LoadingOverlay({
  visible = true,
  message,
  blur = false,
  className,
}: LoadingOverlayProps) {
  if (!visible) return null

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center',
        blur ? 'backdrop-blur-sm' : '',
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {/* Overlay backdrop */}
      <div className="absolute inset-0 bg-neutral-900 bg-opacity-50" />

      {/* Loading content */}
      <div className="relative bg-white p-6 rounded-lg shadow-xl">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          {message && (
            <p className="text-sm font-medium text-neutral-700">{message}</p>
          )}
        </div>
      </div>
    </div>
  )
}

interface LoadingOverlayInlineProps {
  /** Whether the overlay is visible */
  visible?: boolean
  /** Loading message to display */
  message?: string
  /** Minimum height for the container */
  minHeight?: string
  /** Additional CSS classes */
  className?: string
}

/**
 * Inline loading overlay for use within a container
 * Uses relative positioning instead of fixed
 */
export function LoadingOverlayInline({
  visible = true,
  message,
  minHeight = '200px',
  className,
}: LoadingOverlayInlineProps) {
  if (!visible) return null

  return (
    <div
      className={cn(
        'relative flex items-center justify-center bg-neutral-50 bg-opacity-80 rounded-lg',
        className
      )}
      style={{ minHeight }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-4">
        <Spinner size="md" />
        {message && (
          <p className="text-sm font-medium text-neutral-700">{message}</p>
        )}
      </div>
    </div>
  )
}
