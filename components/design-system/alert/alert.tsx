'use client'

import React, { useState, memo } from 'react'
import { getSemanticColor } from '@/lib/design/colors'

/**
 * Alert variant types
 */
export type AlertVariant = 'info' | 'success' | 'warning' | 'error'

/**
 * Alert component props
 */
export interface AlertProps {
  /** Alert variant determining color scheme and icon */
  variant?: AlertVariant
  /** Whether the alert can be dismissed */
  dismissible?: boolean
  /** Callback when alert is dismissed */
  onDismiss?: () => void
  /** Additional CSS classes */
  className?: string
  /** Alert content */
  children: React.ReactNode
}

/**
 * AlertTitle component props
 */
export interface AlertTitleProps {
  /** Additional CSS classes */
  className?: string
  /** Title content */
  children: React.ReactNode
}

/**
 * AlertDescription component props
 */
export interface AlertDescriptionProps {
  /** Additional CSS classes */
  className?: string
  /** Description content */
  children: React.ReactNode
}

/**
 * Get icon SVG for alert variant
 *
 * @param variant - The alert variant
 * @returns JSX element containing the appropriate icon
 */
function getAlertIcon(variant: AlertVariant): React.JSX.Element {
  const iconClasses = 'h-5 w-5'

  switch (variant) {
    case 'info':
      return (
        <svg
          className={iconClasses}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
            clipRule="evenodd"
          />
        </svg>
      )

    case 'success':
      return (
        <svg
          className={iconClasses}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
            clipRule="evenodd"
          />
        </svg>
      )

    case 'warning':
      return (
        <svg
          className={iconClasses}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
      )

    case 'error':
      return (
        <svg
          className={iconClasses}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
            clipRule="evenodd"
          />
        </svg>
      )
  }
}

/**
 * Alert Component
 *
 * Displays contextual feedback messages with different severity levels.
 * Supports info, success, warning, and error variants with appropriate
 * icons and colors. Can be made dismissible with a close button.
 *
 * Optimized with React.memo to prevent unnecessary re-renders.
 *
 * @example
 * ```tsx
 * <Alert variant="success" dismissible>
 *   <AlertTitle>Success!</AlertTitle>
 *   <AlertDescription>Your changes have been saved.</AlertDescription>
 * </Alert>
 * ```
 *
 * @example
 * ```tsx
 * <Alert variant="error">
 *   <AlertTitle>Error</AlertTitle>
 *   <AlertDescription>Failed to save changes. Please try again.</AlertDescription>
 * </Alert>
 * ```
 */
const AlertComponent = function Alert({
  variant = 'info',
  dismissible = false,
  onDismiss,
  className = '',
  children,
}: AlertProps) {
  const [isVisible, setIsVisible] = useState(true)

  const handleDismiss = () => {
    setIsVisible(false)
    onDismiss?.()
  }

  if (!isVisible) {
    return null
  }

  const colors = getSemanticColor(variant)

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`rounded-lg border p-4 ${colors.bg} ${colors.border} ${className}`}
    >
      <div className="flex">
        <div className={`flex-shrink-0 ${colors.text}`}>
          {getAlertIcon(variant)}
        </div>
        <div className="ml-3 flex-1">
          {children}
        </div>
        {dismissible && (
          <div className="ml-auto pl-3">
            <button
              type="button"
              onClick={handleDismiss}
              className={`inline-flex rounded-md p-1.5 ${colors.text} hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors`}
              aria-label="Dismiss alert"
            >
              <span className="sr-only">Dismiss</span>
              <svg
                className="h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Memoized Alert component to prevent unnecessary re-renders
 */
export const Alert = memo(AlertComponent)

/**
 * AlertTitle Component
 *
 * Renders the title/heading of an alert. Should be used as a child of Alert.
 *
 * Optimized with React.memo to prevent unnecessary re-renders.
 *
 * @example
 * ```tsx
 * <Alert variant="info">
 *   <AlertTitle>Information</AlertTitle>
 *   <AlertDescription>This is an informational message.</AlertDescription>
 * </Alert>
 * ```
 */
const AlertTitleComponent = function AlertTitle({ className = '', children }: AlertTitleProps) {
  return (
    <h3 className={`text-sm font-medium ${className}`}>
      {children}
    </h3>
  )
}

/**
 * Memoized AlertTitle component to prevent unnecessary re-renders
 */
export const AlertTitle = memo(AlertTitleComponent)

/**
 * AlertDescription Component
 *
 * Renders the description/body text of an alert. Should be used as a child of Alert.
 *
 * Optimized with React.memo to prevent unnecessary re-renders.
 *
 * @example
 * ```tsx
 * <Alert variant="warning">
 *   <AlertTitle>Warning</AlertTitle>
 *   <AlertDescription>
 *     Please review your settings before continuing.
 *   </AlertDescription>
 * </Alert>
 * ```
 */
const AlertDescriptionComponent = function AlertDescription({ className = '', children }: AlertDescriptionProps) {
  return (
    <div className={`mt-2 text-sm ${className}`}>
      {children}
    </div>
  )
}

/**
 * Memoized AlertDescription component to prevent unnecessary re-renders
 */
export const AlertDescription = memo(AlertDescriptionComponent)
