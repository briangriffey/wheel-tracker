import React from 'react'
import { cn } from '@/lib/utils/cn'

/**
 * X icon component for close button
 */
function XIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

/**
 * Badge variant types
 */
export type BadgeVariant = 'default' | 'success' | 'error' | 'warning' | 'info' | 'outline'

/**
 * Badge size types
 */
export type BadgeSize = 'sm' | 'md' | 'lg'

/**
 * Badge component props
 */
export interface BadgeProps {
  /**
   * The content to display inside the badge
   */
  children: React.ReactNode

  /**
   * Visual style variant of the badge
   * @default 'default'
   */
  variant?: BadgeVariant

  /**
   * Size of the badge
   * @default 'md'
   */
  size?: BadgeSize

  /**
   * Whether the badge can be removed/dismissed
   * @default false
   */
  removable?: boolean

  /**
   * Callback fired when the close button is clicked
   */
  onRemove?: () => void

  /**
   * Additional CSS classes to apply
   */
  className?: string
}

/**
 * Variant-specific color classes
 */
const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-800 border-gray-200',
  success: 'bg-green-50 text-green-800 border-green-200',
  error: 'bg-red-50 text-red-800 border-red-200',
  warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  info: 'bg-blue-50 text-blue-800 border-blue-200',
  outline: 'bg-transparent text-gray-700 border-gray-300',
}

/**
 * Size-specific classes for padding, font size, and border radius
 */
const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs rounded',
  md: 'px-2.5 py-1 text-sm rounded-md',
  lg: 'px-3 py-1.5 text-base rounded-lg',
}

/**
 * Size-specific classes for the close button icon
 */
const iconSizeClasses: Record<BadgeSize, string> = {
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
  lg: 'h-4 w-4',
}

/**
 * Badge Component
 *
 * A compact UI element used to display status, labels, counts, or tags.
 * Supports multiple visual variants, sizes, and optional dismiss functionality.
 *
 * @example
 * Basic usage:
 * ```tsx
 * <Badge variant="success">Active</Badge>
 * <Badge variant="error" size="sm">Failed</Badge>
 * ```
 *
 * @example
 * Removable badge:
 * ```tsx
 * <Badge
 *   variant="info"
 *   removable
 *   onRemove={() => console.log('Badge removed')}
 * >
 *   Tag name
 * </Badge>
 * ```
 *
 * @example
 * Custom styling:
 * ```tsx
 * <Badge variant="warning" className="font-bold">
 *   Important
 * </Badge>
 * ```
 */
export function Badge({
  children,
  variant = 'default',
  size = 'md',
  removable = false,
  onRemove,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium border',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label={`Badge: ${children}`}
    >
      <span>{children}</span>
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className={cn(
            'inline-flex items-center justify-center rounded-full hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400 transition-colors',
            size === 'sm' ? 'p-0.5' : size === 'md' ? 'p-1' : 'p-1.5'
          )}
          aria-label="Remove badge"
        >
          <XIcon className={iconSizeClasses[size]} />
        </button>
      )}
    </span>
  )
}
