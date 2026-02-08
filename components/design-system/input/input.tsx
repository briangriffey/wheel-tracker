'use client'

import React, { forwardRef, InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

/**
 * Input size types
 * - sm: Small input (32px height)
 * - md: Medium input (40px height) - default
 * - lg: Large input (48px height)
 */
export type InputSize = 'sm' | 'md' | 'lg'

/**
 * Input state types
 * - default: Normal state
 * - error: Error state (validation failed)
 * - success: Success state (validation passed)
 */
export type InputState = 'default' | 'error' | 'success'

/**
 * Input component props
 */
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  /**
   * Size of the input
   * @default 'md'
   */
  size?: InputSize

  /**
   * Visual state of the input
   * @default 'default'
   */
  state?: InputState

  /**
   * Content to display before the input (e.g., $ symbol)
   */
  prefix?: ReactNode

  /**
   * Content to display after the input
   */
  suffix?: ReactNode

  /**
   * Additional CSS classes to apply to the input wrapper
   */
  wrapperClassName?: string

  /**
   * Additional CSS classes to apply to the input element
   */
  className?: string

  /**
   * Error message to display below the input
   */
  error?: string

  /**
   * Help text to display below the input
   */
  helpText?: string
}

/**
 * Base styles applied to all inputs
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
].join(' ')

/**
 * Size styles mapping
 */
const sizeStyles: Record<InputSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-3 text-base',
  lg: 'h-12 px-4 text-lg',
}

/**
 * Size styles with prefix/suffix
 */
const sizeStylesWithPrefix: Record<InputSize, string> = {
  sm: 'h-8 pl-7 pr-3 text-sm',
  md: 'h-10 pl-8 pr-3 text-base',
  lg: 'h-12 pl-10 pr-4 text-lg',
}

const sizeStylesWithSuffix: Record<InputSize, string> = {
  sm: 'h-8 pl-3 pr-7 text-sm',
  md: 'h-10 pl-3 pr-8 text-base',
  lg: 'h-12 pl-4 pr-10 text-lg',
}

const sizeStylesWithBoth: Record<InputSize, string> = {
  sm: 'h-8 pl-7 pr-7 text-sm',
  md: 'h-10 pl-8 pr-8 text-base',
  lg: 'h-12 pl-10 pr-10 text-lg',
}

/**
 * State styles mapping
 */
const stateStyles: Record<InputState, string> = {
  default: [
    'border',
    'border-neutral-300',
    'bg-white',
    'text-neutral-900',
    'placeholder:text-neutral-400',
    'hover:border-neutral-400',
    'focus:border-primary-500',
    'focus:ring-primary-500',
  ].join(' '),

  error: [
    'border-2',
    'border-error',
    'bg-white',
    'text-neutral-900',
    'placeholder:text-neutral-400',
    'focus:border-error',
    'focus:ring-error',
  ].join(' '),

  success: [
    'border-2',
    'border-success',
    'bg-white',
    'text-neutral-900',
    'placeholder:text-neutral-400',
    'focus:border-success',
    'focus:ring-success',
  ].join(' '),
}

/**
 * Prefix/suffix position styles
 */
const prefixStyles: Record<InputSize, string> = {
  sm: 'absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none',
  md: 'absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none',
  lg: 'absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none',
}

const suffixStyles: Record<InputSize, string> = {
  sm: 'absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none',
  md: 'absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none',
  lg: 'absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none',
}

/**
 * Input Component
 *
 * A flexible input component with multiple sizes and states.
 * Supports error/success states, prefix/suffix content, and help text.
 *
 * @example
 * ```tsx
 * // Basic input
 * <Input placeholder="Enter text" />
 *
 * // Input with error state
 * <Input state="error" error="This field is required" />
 *
 * // Input with prefix (e.g., currency)
 * <Input type="number" prefix={<span className="text-neutral-500">$</span>} />
 *
 * // Input with help text
 * <Input helpText="Enter your email address" />
 *
 * // Large input with success state
 * <Input size="lg" state="success" />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = 'md',
      state = 'default',
      prefix,
      suffix,
      wrapperClassName,
      className,
      error,
      helpText,
      disabled = false,
      id,
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

    // Determine size styles based on prefix/suffix
    let inputSizeStyles = sizeStyles[size]
    if (prefix && suffix) {
      inputSizeStyles = sizeStylesWithBoth[size]
    } else if (prefix) {
      inputSizeStyles = sizeStylesWithPrefix[size]
    } else if (suffix) {
      inputSizeStyles = sizeStylesWithSuffix[size]
    }

    return (
      <div className={wrapperClassName}>
        <div className="relative">
          {/* Prefix */}
          {prefix && (
            <div className={prefixStyles[size]}>
              {typeof prefix === 'string' ? (
                <span className="text-neutral-500 text-sm">{prefix}</span>
              ) : (
                prefix
              )}
            </div>
          )}

          {/* Input element */}
          <input
            ref={ref}
            id={id}
            disabled={disabled}
            className={cn(
              baseStyles,
              stateStyles[actualState],
              inputSizeStyles,
              className
            )}
            aria-invalid={actualState === 'error' ? 'true' : 'false'}
            aria-describedby={describedBy}
            {...props}
          />

          {/* Suffix */}
          {suffix && (
            <div className={suffixStyles[size]}>
              {typeof suffix === 'string' ? (
                <span className="text-neutral-500 text-sm">{suffix}</span>
              ) : (
                suffix
              )}
            </div>
          )}
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

Input.displayName = 'Input'
