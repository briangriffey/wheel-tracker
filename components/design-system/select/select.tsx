'use client'

import React, { forwardRef, SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

/**
 * Select size types
 * - sm: Small select (32px height)
 * - md: Medium select (40px height) - default
 * - lg: Large select (48px height)
 */
export type SelectSize = 'sm' | 'md' | 'lg'

/**
 * Select state types
 * - default: Normal state
 * - error: Error state (validation failed)
 * - success: Success state (validation passed)
 */
export type SelectState = 'default' | 'error' | 'success'

/**
 * Select component props
 */
export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /**
   * Size of the select
   * @default 'md'
   */
  size?: SelectSize

  /**
   * Visual state of the select
   * @default 'default'
   */
  state?: SelectState

  /**
   * Additional CSS classes to apply to the select wrapper
   */
  wrapperClassName?: string

  /**
   * Additional CSS classes to apply to the select element
   */
  className?: string

  /**
   * Error message to display below the select
   */
  error?: string

  /**
   * Help text to display below the select
   */
  helpText?: string
}

/**
 * Base styles applied to all selects
 */
const baseStyles = [
  'block',
  'w-full',
  'rounded-md',
  'transition-colors',
  'focus:outline-none',
  'focus:ring-2',
  'focus:ring-offset-2',
  'disabled:opacity-50',
  'disabled:cursor-not-allowed',
  'disabled:bg-neutral-50',
  'appearance-none',
  'bg-white',
  'bg-no-repeat',
  'bg-[right_0.5rem_center]',
  '[background-size:1.25rem_1.25rem]',
].join(' ')

/**
 * Dropdown arrow SVG as data URI
 */
const dropdownArrow = `data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e`

/**
 * Size styles mapping
 */
const sizeStyles: Record<SelectSize, string> = {
  sm: 'h-8 pl-3 pr-10 text-sm',
  md: 'h-10 pl-3 pr-10 text-base',
  lg: 'h-12 pl-4 pr-12 text-lg',
}

/**
 * State styles mapping
 */
const stateStyles: Record<SelectState, string> = {
  default: [
    'border',
    'border-neutral-300',
    'text-neutral-900',
    'hover:border-neutral-400',
    'focus:border-primary-500',
    'focus:ring-primary-500',
  ].join(' '),

  error: [
    'border-2',
    'border-error',
    'text-neutral-900',
    'focus:border-error',
    'focus:ring-error',
  ].join(' '),

  success: [
    'border-2',
    'border-success',
    'text-neutral-900',
    'focus:border-success',
    'focus:ring-success',
  ].join(' '),
}

/**
 * Select Component
 *
 * A flexible select/dropdown component with multiple sizes and states.
 * Supports error/success states and help text.
 *
 * @example
 * ```tsx
 * // Basic select
 * <Select>
 *   <option value="">Choose an option</option>
 *   <option value="1">Option 1</option>
 *   <option value="2">Option 2</option>
 * </Select>
 *
 * // Select with error state
 * <Select state="error" error="Please select an option">
 *   <option value="">Choose an option</option>
 *   <option value="1">Option 1</option>
 * </Select>
 *
 * // Select with help text
 * <Select helpText="Choose your preferred option">
 *   <option value="1">Option 1</option>
 * </Select>
 *
 * // Large select with success state
 * <Select size="lg" state="success">
 *   <option value="1">Option 1</option>
 * </Select>
 * ```
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      size = 'md',
      state = 'default',
      wrapperClassName,
      className,
      error,
      helpText,
      disabled = false,
      id,
      children,
      ...props
    },
    ref
  ) => {
    // Determine actual state based on error prop
    const actualState = error ? 'error' : state

    // Generate unique IDs for accessibility
    const errorId = error && id ? `${id}-error` : undefined
    const helpTextId = helpText && id ? `${id}-help` : undefined
    const describedBy = [errorId, helpTextId].filter(Boolean).join(' ') || undefined

    return (
      <div className={wrapperClassName}>
        <div className="relative">
          {/* Select element */}
          <select
            ref={ref}
            id={id}
            disabled={disabled}
            className={cn(
              baseStyles,
              stateStyles[actualState],
              sizeStyles[size],
              className
            )}
            style={{
              backgroundImage: `url("${dropdownArrow}")`,
            }}
            aria-invalid={actualState === 'error' ? 'true' : 'false'}
            aria-describedby={describedBy}
            {...props}
          >
            {children}
          </select>
        </div>

        {/* Error message */}
        {error && (
          <p id={errorId} className="mt-1 text-sm text-error">
            {error}
          </p>
        )}

        {/* Help text */}
        {!error && helpText && (
          <p id={helpTextId} className="mt-1 text-xs text-neutral-500">
            {helpText}
          </p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
