'use client'

import React, { forwardRef, HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

/**
 * Card variant types
 * - default: Basic card with subtle border
 * - bordered: Card with prominent border
 * - elevated: Card with shadow for depth (no border)
 */
export type CardVariant = 'default' | 'bordered' | 'elevated'

/**
 * Card component props
 */
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Visual style variant of the card
   * @default 'default'
   */
  variant?: CardVariant

  /**
   * Whether the card is clickable/interactive
   * Adds hover effects and cursor pointer
   * @default false
   */
  clickable?: boolean

  /**
   * Click handler for clickable cards
   */
  onClick?: () => void

  /**
   * Card content
   */
  children?: ReactNode

  /**
   * Additional CSS classes to apply
   */
  className?: string
}

/**
 * CardHeader component props
 */
export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Header content
   */
  children?: ReactNode

  /**
   * Additional CSS classes to apply
   */
  className?: string
}

/**
 * CardTitle component props
 */
export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  /**
   * Title content
   */
  children?: ReactNode

  /**
   * Additional CSS classes to apply
   */
  className?: string
}

/**
 * CardDescription component props
 */
export interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  /**
   * Description content
   */
  children?: ReactNode

  /**
   * Additional CSS classes to apply
   */
  className?: string
}

/**
 * CardContent component props
 */
export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Content
   */
  children?: ReactNode

  /**
   * Additional CSS classes to apply
   */
  className?: string
}

/**
 * CardFooter component props
 */
export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Footer content
   */
  children?: ReactNode

  /**
   * Additional CSS classes to apply
   */
  className?: string
}

/**
 * Base styles applied to all cards
 */
const baseStyles = [
  'rounded-lg',
  'bg-white',
  'transition-all',
  'duration-200',
].join(' ')

/**
 * Variant styles mapping
 */
const variantStyles: Record<CardVariant, string> = {
  default: [
    'border',
    'border-neutral-200',
  ].join(' '),

  bordered: [
    'border-2',
    'border-neutral-300',
  ].join(' '),

  elevated: [
    'shadow-md',
    'hover:shadow-lg',
  ].join(' '),
}

/**
 * Clickable card styles
 */
const clickableStyles = [
  'cursor-pointer',
  'hover:shadow-lg',
  'active:scale-[0.98]',
].join(' ')

/**
 * Card Component
 *
 * A flexible container component for grouping related content.
 * Supports multiple variants (default, bordered, elevated) and can be
 * made interactive with click handlers and hover effects.
 *
 * @example
 * ```tsx
 * // Basic card with default variant
 * <Card>
 *   <CardHeader>
 *     <CardTitle>Card Title</CardTitle>
 *     <CardDescription>Card description goes here</CardDescription>
 *   </CardHeader>
 *   <CardContent>
 *     <p>Main content of the card</p>
 *   </CardContent>
 *   <CardFooter>
 *     <Button>Action</Button>
 *   </CardFooter>
 * </Card>
 * ```
 *
 * @example
 * ```tsx
 * // Elevated clickable card
 * <Card variant="elevated" clickable onClick={() => console.log('clicked')}>
 *   <CardContent>
 *     <p>Click me!</p>
 *   </CardContent>
 * </Card>
 * ```
 *
 * @example
 * ```tsx
 * // Bordered card with just title and content
 * <Card variant="bordered">
 *   <CardHeader>
 *     <CardTitle>Simple Card</CardTitle>
 *   </CardHeader>
 *   <CardContent>
 *     <p>Content without description or footer</p>
 *   </CardContent>
 * </Card>
 * ```
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      clickable = false,
      onClick,
      children,
      className,
      ...props
    },
    ref
  ) => {
    // Determine if card should have clickable styles
    const isClickable = clickable || !!onClick

    return (
      <div
        ref={ref}
        onClick={onClick}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onKeyDown={
          isClickable
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onClick?.()
                }
              }
            : undefined
        }
        className={cn(
          baseStyles,
          variantStyles[variant],
          isClickable && clickableStyles,
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

/**
 * CardHeader Component
 *
 * Container for card header content, typically used with CardTitle
 * and CardDescription. Provides consistent spacing and layout.
 *
 * @example
 * ```tsx
 * <Card>
 *   <CardHeader>
 *     <CardTitle>Title Here</CardTitle>
 *     <CardDescription>Description text</CardDescription>
 *   </CardHeader>
 * </Card>
 * ```
 */
export function CardHeader({
  children,
  className,
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      {...props}
    >
      {children}
    </div>
  )
}

CardHeader.displayName = 'CardHeader'

/**
 * CardTitle Component
 *
 * Renders the title/heading of a card. Should typically be used
 * within CardHeader for proper spacing and hierarchy.
 *
 * @example
 * ```tsx
 * <CardHeader>
 *   <CardTitle>My Card Title</CardTitle>
 * </CardHeader>
 * ```
 */
export function CardTitle({
  children,
  className,
  ...props
}: CardTitleProps) {
  return (
    <h3
      className={cn(
        'text-2xl font-semibold leading-none tracking-tight',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  )
}

CardTitle.displayName = 'CardTitle'

/**
 * CardDescription Component
 *
 * Renders descriptive text for a card, typically placed below the
 * CardTitle within a CardHeader. Uses muted styling for hierarchy.
 *
 * @example
 * ```tsx
 * <CardHeader>
 *   <CardTitle>Title</CardTitle>
 *   <CardDescription>
 *     This card contains important information.
 *   </CardDescription>
 * </CardHeader>
 * ```
 */
export function CardDescription({
  children,
  className,
  ...props
}: CardDescriptionProps) {
  return (
    <p
      className={cn('text-sm text-neutral-500', className)}
      {...props}
    >
      {children}
    </p>
  )
}

CardDescription.displayName = 'CardDescription'

/**
 * CardContent Component
 *
 * Container for the main content of a card. Provides consistent
 * padding and can contain any content.
 *
 * @example
 * ```tsx
 * <Card>
 *   <CardContent>
 *     <p>Main card content goes here</p>
 *   </CardContent>
 * </Card>
 * ```
 */
export function CardContent({
  children,
  className,
  ...props
}: CardContentProps) {
  return (
    <div className={cn('p-6 pt-0', className)} {...props}>
      {children}
    </div>
  )
}

CardContent.displayName = 'CardContent'

/**
 * CardFooter Component
 *
 * Container for card footer content, typically used for actions
 * or additional information. Provides consistent spacing.
 *
 * @example
 * ```tsx
 * <Card>
 *   <CardContent>Content here</CardContent>
 *   <CardFooter>
 *     <Button>Action</Button>
 *   </CardFooter>
 * </Card>
 * ```
 */
export function CardFooter({
  children,
  className,
  ...props
}: CardFooterProps) {
  return (
    <div
      className={cn('flex items-center p-6 pt-0', className)}
      {...props}
    >
      {children}
    </div>
  )
}

CardFooter.displayName = 'CardFooter'
