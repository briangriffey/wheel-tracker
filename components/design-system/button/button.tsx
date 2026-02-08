'use client'

import React, { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'
import { Spinner } from '@/components/ui/spinner'

/**
 * Button variant types
 * - primary: Main action button with solid primary color
 * - secondary: Secondary action with accent color
 * - outline: Button with border and transparent background
 * - ghost: Minimal button with no border or background
 * - destructive: Destructive action button (delete, remove, etc.)
 */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'

/**
 * Button size types
 * - sm: Small button (32px height)
 * - md: Medium button (40px height) - default
 * - lg: Large button (48px height)
 */
export type ButtonSize = 'sm' | 'md' | 'lg'

/**
 * Button component props
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Visual style variant of the button
   * @default 'primary'
   */
  variant?: ButtonVariant

  /**
   * Size of the button
   * @default 'md'
   */
  size?: ButtonSize

  /**
   * Whether the button is in a loading state
   * Shows spinner and disables interaction
   * @default false
   */
  loading?: boolean

  /**
   * Icon to display on the left side of the button text
   */
  leftIcon?: ReactNode

  /**
   * Icon to display on the right side of the button text
   */
  rightIcon?: ReactNode

  /**
   * Button content (text or elements)
   */
  children?: ReactNode

  /**
   * Additional CSS classes to apply
   */
  className?: string

  /**
   * Whether the button is disabled
   * @default false
   */
  disabled?: boolean
}

/**
 * Base styles applied to all buttons
 */
const baseStyles = [
  'inline-flex',
  'items-center',
  'justify-center',
  'gap-2',
  'font-medium',
  'rounded-md',
  'transition-colors',
  'focus:outline-none',
  'focus:ring-2',
  'focus:ring-offset-2',
  'disabled:opacity-50',
  'disabled:cursor-not-allowed',
  'disabled:pointer-events-none',
].join(' ')

/**
 * Variant styles mapping
 */
const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-primary-500',
    'text-white',
    'hover:bg-primary-600',
    'active:bg-primary-700',
    'focus:ring-primary-500',
    'shadow-sm',
  ].join(' '),

  secondary: [
    'bg-accent-500',
    'text-white',
    'hover:bg-accent-600',
    'active:bg-accent-700',
    'focus:ring-accent-500',
    'shadow-sm',
  ].join(' '),

  outline: [
    'border-2',
    'border-neutral-300',
    'text-neutral-700',
    'bg-white',
    'hover:bg-neutral-50',
    'hover:border-neutral-400',
    'active:bg-neutral-100',
    'focus:ring-neutral-500',
  ].join(' '),

  ghost: [
    'text-neutral-700',
    'bg-transparent',
    'hover:bg-neutral-100',
    'active:bg-neutral-200',
    'focus:ring-neutral-500',
  ].join(' '),

  destructive: [
    'bg-red-600',
    'text-white',
    'hover:bg-red-700',
    'active:bg-red-800',
    'focus:ring-red-500',
    'shadow-sm',
  ].join(' '),
}

/**
 * Size styles mapping
 */
const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-base',
  lg: 'h-12 px-6 text-lg',
}

/**
 * Icon size mapping for each button size
 */
const iconSizeStyles: Record<ButtonSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
}

/**
 * Button Component
 *
 * A flexible button component with multiple variants, sizes, and states.
 * Supports loading state, disabled state, and icon placement.
 *
 * @example
 * ```tsx
 * // Primary button
 * <Button>Click me</Button>
 *
 * // Secondary button with loading state
 * <Button variant="secondary" loading>Saving...</Button>
 *
 * // Outline button with left icon
 * <Button variant="outline" leftIcon={<PlusIcon />}>
 *   Add Item
 * </Button>
 *
 * // Destructive button (disabled)
 * <Button variant="destructive" disabled>Delete</Button>
 *
 * // Large ghost button with right icon
 * <Button variant="ghost" size="lg" rightIcon={<ArrowRightIcon />}>
 *   Next
 * </Button>
 * ```
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      children,
      className,
      disabled = false,
      type = 'button',
      ...props
    },
    ref
  ) => {
    // Determine if button should be disabled
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        aria-busy={loading}
        aria-disabled={isDisabled}
        {...props}
      >
        {/* Loading spinner (replaces left icon when loading) */}
        {loading && (
          <Spinner
            size={size === 'sm' ? 'sm' : 'md'}
            className="animate-spin"
          />
        )}

        {/* Left icon (hidden when loading) */}
        {!loading && leftIcon && (
          <span className={cn('inline-flex', iconSizeStyles[size])}>
            {leftIcon}
          </span>
        )}

        {/* Button text/content */}
        {children && <span>{children}</span>}

        {/* Right icon */}
        {rightIcon && (
          <span className={cn('inline-flex', iconSizeStyles[size])}>
            {rightIcon}
          </span>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'
