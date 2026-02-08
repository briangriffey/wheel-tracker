import React, { memo } from 'react'
import { cn } from '@/lib/utils/cn'

/**
 * Card variant types
 */
export type CardVariant = 'default' | 'bordered' | 'elevated' | 'flat'

/**
 * Card padding size types
 */
export type CardPadding = 'none' | 'sm' | 'md' | 'lg'

/**
 * Card component props
 */
export interface CardProps {
  /**
   * The content to display inside the card
   */
  children: React.ReactNode

  /**
   * Visual style variant of the card
   * @default 'default'
   */
  variant?: CardVariant

  /**
   * Padding size of the card
   * @default 'md'
   */
  padding?: CardPadding

  /**
   * Whether the card should be interactive (shows hover state)
   * @default false
   */
  interactive?: boolean

  /**
   * Callback fired when the card is clicked (only when interactive is true)
   */
  onClick?: () => void

  /**
   * Additional CSS classes to apply
   */
  className?: string

  /**
   * Optional test ID for testing
   */
  testId?: string
}

/**
 * Card Header component props
 */
export interface CardHeaderProps {
  /**
   * The content to display in the header
   */
  children: React.ReactNode

  /**
   * Additional CSS classes to apply
   */
  className?: string
}

/**
 * Card Body component props
 */
export interface CardBodyProps {
  /**
   * The content to display in the body
   */
  children: React.ReactNode

  /**
   * Additional CSS classes to apply
   */
  className?: string
}

/**
 * Card Footer component props
 */
export interface CardFooterProps {
  /**
   * The content to display in the footer
   */
  children: React.ReactNode

  /**
   * Additional CSS classes to apply
   */
  className?: string
}

/**
 * Variant-specific styling classes
 */
const variantClasses: Record<CardVariant, string> = {
  default: 'bg-white border border-gray-200 shadow-sm',
  bordered: 'bg-white border-2 border-gray-300',
  elevated: 'bg-white border border-gray-100 shadow-lg',
  flat: 'bg-gray-50 border border-transparent',
}

/**
 * Padding size classes
 */
const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

/**
 * Card Component
 *
 * A flexible container component for grouping related content and actions.
 * Supports multiple visual variants, padding sizes, and interactive states.
 *
 * Optimized with React.memo to prevent unnecessary re-renders.
 *
 * @example
 * Basic usage:
 * ```tsx
 * <Card>
 *   <p>Card content goes here</p>
 * </Card>
 * ```
 *
 * @example
 * With variants and padding:
 * ```tsx
 * <Card variant="elevated" padding="lg">
 *   <h2>Title</h2>
 *   <p>Content</p>
 * </Card>
 * ```
 *
 * @example
 * Interactive card:
 * ```tsx
 * <Card
 *   interactive
 *   onClick={() => console.log('Card clicked')}
 * >
 *   Click me
 * </Card>
 * ```
 *
 * @example
 * With structured content:
 * ```tsx
 * <Card>
 *   <CardHeader>
 *     <h3>Card Title</h3>
 *   </CardHeader>
 *   <CardBody>
 *     <p>Main content here</p>
 *   </CardBody>
 *   <CardFooter>
 *     <button>Action</button>
 *   </CardFooter>
 * </Card>
 * ```
 */
const CardComponent = function Card({
  children,
  variant = 'default',
  padding = 'md',
  interactive = false,
  onClick,
  className,
  testId,
}: CardProps) {
  const Component = interactive && onClick ? 'button' : 'div'

  return (
    <Component
      className={cn(
        'rounded-lg transition-all',
        variantClasses[variant],
        paddingClasses[padding],
        interactive && 'hover:shadow-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        className
      )}
      onClick={interactive ? onClick : undefined}
      type={Component === 'button' ? 'button' : undefined}
      data-testid={testId}
    >
      {children}
    </Component>
  )
}

/**
 * Card Header Component
 *
 * Optional header section for the card, typically used for titles or actions.
 *
 * @example
 * ```tsx
 * <CardHeader>
 *   <h3 className="text-lg font-semibold">Title</h3>
 * </CardHeader>
 * ```
 */
export const CardHeader = function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn('border-b border-gray-200 pb-3 mb-3', className)}>
      {children}
    </div>
  )
}

/**
 * Card Body Component
 *
 * Main content area of the card.
 *
 * @example
 * ```tsx
 * <CardBody>
 *   <p>Main content goes here</p>
 * </CardBody>
 * ```
 */
export const CardBody = function CardBody({ children, className }: CardBodyProps) {
  return <div className={cn('', className)}>{children}</div>
}

/**
 * Card Footer Component
 *
 * Optional footer section for the card, typically used for actions or metadata.
 *
 * @example
 * ```tsx
 * <CardFooter>
 *   <button>Save</button>
 *   <button>Cancel</button>
 * </CardFooter>
 * ```
 */
export const CardFooter = function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={cn('border-t border-gray-200 pt-3 mt-3', className)}>
      {children}
    </div>
  )
}

/**
 * Memoized Card component to prevent unnecessary re-renders
 */
export const Card = memo(CardComponent)
