/**
 * Component Variant System
 *
 * This module provides type-safe component variants using class-variance-authority (CVA).
 * Variants define visual styles (size, color, appearance) that can be composed together.
 *
 * Each variant function returns a className string based on the provided props,
 * with full TypeScript inference for available options.
 *
 * @example
 * ```tsx
 * import { buttonVariants } from '@/lib/design/variants'
 *
 * <button className={buttonVariants({ variant: 'solid', size: 'md', color: 'primary' })}>
 *   Click me
 * </button>
 * ```
 */

import { cva, type VariantProps } from 'class-variance-authority'
import { clsx, type ClassValue } from 'clsx'

/**
 * Utility function to merge class names with support for conditional classes
 * Combines clsx for conditional logic with CVA for variant handling
 *
 * @example
 * ```ts
 * cn('base-class', { 'conditional-class': true }, variantClasses)
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

// ============================================================================
// Button Variants
// ============================================================================

/**
 * Button component variants
 *
 * Provides consistent button styling with multiple visual variants, sizes, and color options.
 *
 * @variant solid - Filled background with white text (default)
 * @variant outline - Transparent background with colored border
 * @variant ghost - Transparent background with colored text, hover background
 * @variant link - Text-only appearance without background or border
 *
 * @size sm - Small button (32px height)
 * @size md - Medium button (40px height, default)
 * @size lg - Large button (48px height)
 *
 * @color primary - Green primary color
 * @color accent - Brown accent color
 * @color neutral - Gray neutral color
 * @color success - Green success color
 * @color error - Red error color
 *
 * @example
 * ```tsx
 * import { buttonVariants } from '@/lib/design/variants'
 *
 * // Solid primary button (default)
 * <button className={buttonVariants()}>Click me</button>
 *
 * // Large outline accent button
 * <button className={buttonVariants({ variant: 'outline', size: 'lg', color: 'accent' })}>
 *   Save Changes
 * </button>
 *
 * // Ghost error button
 * <button className={buttonVariants({ variant: 'ghost', color: 'error' })}>
 *   Delete
 * </button>
 * ```
 */
export const buttonVariants = cva(
  // Base styles applied to all buttons
  [
    'inline-flex items-center justify-center',
    'font-medium',
    'rounded-md',
    'transition-colors duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
  ],
  {
    variants: {
      variant: {
        solid: '',
        outline: 'border-2 bg-transparent',
        ghost: 'bg-transparent',
        link: 'bg-transparent underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
      },
      color: {
        primary: '',
        accent: '',
        neutral: '',
        success: '',
        error: '',
      },
    },
    compoundVariants: [
      // Solid variant color combinations
      {
        variant: 'solid',
        color: 'primary',
        className: 'bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500',
      },
      {
        variant: 'solid',
        color: 'accent',
        className: 'bg-amber-700 text-white hover:bg-amber-800 focus-visible:ring-amber-600',
      },
      {
        variant: 'solid',
        color: 'neutral',
        className: 'bg-neutral-600 text-white hover:bg-neutral-700 focus-visible:ring-neutral-500',
      },
      {
        variant: 'solid',
        color: 'success',
        className: 'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500',
      },
      {
        variant: 'solid',
        color: 'error',
        className: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
      },
      // Outline variant color combinations
      {
        variant: 'outline',
        color: 'primary',
        className: 'border-green-600 text-green-600 hover:bg-green-50 focus-visible:ring-green-500',
      },
      {
        variant: 'outline',
        color: 'accent',
        className: 'border-amber-700 text-amber-700 hover:bg-amber-50 focus-visible:ring-amber-600',
      },
      {
        variant: 'outline',
        color: 'neutral',
        className:
          'border-neutral-600 text-neutral-600 hover:bg-neutral-50 focus-visible:ring-neutral-500',
      },
      {
        variant: 'outline',
        color: 'success',
        className:
          'border-emerald-600 text-emerald-600 hover:bg-emerald-50 focus-visible:ring-emerald-500',
      },
      {
        variant: 'outline',
        color: 'error',
        className: 'border-red-600 text-red-600 hover:bg-red-50 focus-visible:ring-red-500',
      },
      // Ghost variant color combinations
      {
        variant: 'ghost',
        color: 'primary',
        className: 'text-green-600 hover:bg-green-50 focus-visible:ring-green-500',
      },
      {
        variant: 'ghost',
        color: 'accent',
        className: 'text-amber-700 hover:bg-amber-50 focus-visible:ring-amber-600',
      },
      {
        variant: 'ghost',
        color: 'neutral',
        className: 'text-neutral-600 hover:bg-neutral-50 focus-visible:ring-neutral-500',
      },
      {
        variant: 'ghost',
        color: 'success',
        className: 'text-emerald-600 hover:bg-emerald-50 focus-visible:ring-emerald-500',
      },
      {
        variant: 'ghost',
        color: 'error',
        className: 'text-red-600 hover:bg-red-50 focus-visible:ring-red-500',
      },
      // Link variant color combinations
      {
        variant: 'link',
        color: 'primary',
        className: 'text-green-600 hover:text-green-700',
      },
      {
        variant: 'link',
        color: 'accent',
        className: 'text-amber-700 hover:text-amber-800',
      },
      {
        variant: 'link',
        color: 'neutral',
        className: 'text-neutral-600 hover:text-neutral-700',
      },
      {
        variant: 'link',
        color: 'success',
        className: 'text-emerald-600 hover:text-emerald-700',
      },
      {
        variant: 'link',
        color: 'error',
        className: 'text-red-600 hover:text-red-700',
      },
    ],
    defaultVariants: {
      variant: 'solid',
      size: 'md',
      color: 'primary',
    },
  }
)

/**
 * TypeScript type for button variant props
 * Automatically inferred from buttonVariants configuration
 */
export type ButtonVariantProps = VariantProps<typeof buttonVariants>

// ============================================================================
// Card Variants
// ============================================================================

/**
 * Card component variants
 *
 * Provides consistent card container styling with different padding, shadows, and borders.
 *
 * @variant default - Standard card with border and subtle shadow
 * @variant elevated - Card with prominent shadow, no border
 * @variant outlined - Card with border only, no shadow
 * @variant ghost - Minimal card with no border or shadow
 *
 * @padding sm - Small padding (12px)
 * @padding md - Medium padding (16px, default)
 * @padding lg - Large padding (24px)
 * @padding xl - Extra large padding (32px)
 *
 * @example
 * ```tsx
 * import { cardVariants } from '@/lib/design/variants'
 *
 * // Default card
 * <div className={cardVariants()}>Card content</div>
 *
 * // Elevated card with large padding
 * <div className={cardVariants({ variant: 'elevated', padding: 'lg' })}>
 *   Card content
 * </div>
 * ```
 */
export const cardVariants = cva(
  // Base styles
  ['rounded-lg', 'bg-white'],
  {
    variants: {
      variant: {
        default: 'border border-neutral-200 shadow-sm',
        elevated: 'shadow-lg',
        outlined: 'border border-neutral-200',
        ghost: '',
      },
      padding: {
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
        xl: 'p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
    },
  }
)

/**
 * TypeScript type for card variant props
 */
export type CardVariantProps = VariantProps<typeof cardVariants>

// ============================================================================
// Badge Variants
// ============================================================================

/**
 * Badge component variants
 *
 * Small labeled UI elements for status, categories, or counts.
 *
 * @variant solid - Filled background with white text
 * @variant subtle - Light background with colored text
 * @variant outline - Border with colored text
 *
 * @size sm - Small badge (20px height)
 * @size md - Medium badge (24px height, default)
 * @size lg - Large badge (28px height)
 *
 * @color primary - Green primary color
 * @color accent - Brown accent color
 * @color neutral - Gray neutral color
 * @color success - Green success color
 * @color error - Red error color
 * @color warning - Orange warning color
 * @color info - Blue info color
 *
 * @example
 * ```tsx
 * import { badgeVariants } from '@/lib/design/variants'
 *
 * // Solid success badge
 * <span className={badgeVariants({ variant: 'solid', color: 'success' })}>
 *   Active
 * </span>
 *
 * // Subtle warning badge
 * <span className={badgeVariants({ variant: 'subtle', color: 'warning' })}>
 *   Pending
 * </span>
 * ```
 */
export const badgeVariants = cva(
  // Base styles
  ['inline-flex items-center justify-center', 'font-medium', 'rounded-full', 'whitespace-nowrap'],
  {
    variants: {
      variant: {
        solid: '',
        subtle: '',
        outline: 'border bg-transparent',
      },
      size: {
        sm: 'h-5 px-2 text-xs',
        md: 'h-6 px-2.5 text-sm',
        lg: 'h-7 px-3 text-base',
      },
      color: {
        primary: '',
        accent: '',
        neutral: '',
        success: '',
        error: '',
        warning: '',
        info: '',
      },
    },
    compoundVariants: [
      // Solid variants
      { variant: 'solid', color: 'primary', className: 'bg-green-600 text-white' },
      { variant: 'solid', color: 'accent', className: 'bg-amber-700 text-white' },
      { variant: 'solid', color: 'neutral', className: 'bg-neutral-600 text-white' },
      { variant: 'solid', color: 'success', className: 'bg-emerald-600 text-white' },
      { variant: 'solid', color: 'error', className: 'bg-red-600 text-white' },
      { variant: 'solid', color: 'warning', className: 'bg-orange-600 text-white' },
      { variant: 'solid', color: 'info', className: 'bg-blue-600 text-white' },
      // Subtle variants
      { variant: 'subtle', color: 'primary', className: 'bg-green-50 text-green-700' },
      { variant: 'subtle', color: 'accent', className: 'bg-amber-50 text-amber-800' },
      { variant: 'subtle', color: 'neutral', className: 'bg-neutral-100 text-neutral-700' },
      { variant: 'subtle', color: 'success', className: 'bg-emerald-50 text-emerald-700' },
      { variant: 'subtle', color: 'error', className: 'bg-red-50 text-red-700' },
      { variant: 'subtle', color: 'warning', className: 'bg-orange-50 text-orange-700' },
      { variant: 'subtle', color: 'info', className: 'bg-blue-50 text-blue-700' },
      // Outline variants
      { variant: 'outline', color: 'primary', className: 'border-green-600 text-green-600' },
      { variant: 'outline', color: 'accent', className: 'border-amber-700 text-amber-700' },
      { variant: 'outline', color: 'neutral', className: 'border-neutral-600 text-neutral-600' },
      { variant: 'outline', color: 'success', className: 'border-emerald-600 text-emerald-600' },
      { variant: 'outline', color: 'error', className: 'border-red-600 text-red-600' },
      { variant: 'outline', color: 'warning', className: 'border-orange-600 text-orange-600' },
      { variant: 'outline', color: 'info', className: 'border-blue-600 text-blue-600' },
    ],
    defaultVariants: {
      variant: 'solid',
      size: 'md',
      color: 'neutral',
    },
  }
)

/**
 * TypeScript type for badge variant props
 */
export type BadgeVariantProps = VariantProps<typeof badgeVariants>

// ============================================================================
// Input Variants
// ============================================================================

/**
 * Input component variants
 *
 * Form input styling with different sizes and states.
 *
 * @size sm - Small input (32px height)
 * @size md - Medium input (40px height, default)
 * @size lg - Large input (48px height)
 *
 * @state default - Normal input state
 * @state error - Error state with red border
 * @state success - Success state with green border
 *
 * @example
 * ```tsx
 * import { inputVariants } from '@/lib/design/variants'
 *
 * // Default input
 * <input className={inputVariants()} />
 *
 * // Large input with error state
 * <input className={inputVariants({ size: 'lg', state: 'error' })} />
 * ```
 */
export const inputVariants = cva(
  // Base styles
  [
    'w-full',
    'rounded-md',
    'border',
    'bg-white',
    'px-3',
    'transition-colors duration-200',
    'placeholder:text-neutral-400',
    'focus:outline-none focus:ring-2 focus:ring-offset-1',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ],
  {
    variants: {
      size: {
        sm: 'h-8 text-sm',
        md: 'h-10 text-base',
        lg: 'h-12 text-lg',
      },
      state: {
        default: 'border-neutral-300 focus:border-green-500 focus:ring-green-500',
        error: 'border-red-500 focus:border-red-500 focus:ring-red-500',
        success: 'border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500',
      },
    },
    defaultVariants: {
      size: 'md',
      state: 'default',
    },
  }
)

/**
 * TypeScript type for input variant props
 */
export type InputVariantProps = VariantProps<typeof inputVariants>

// ============================================================================
// Text/Typography Variants
// ============================================================================

/**
 * Text component variants
 *
 * Typography styling for body text, headings, and labels.
 *
 * @variant body - Regular body text
 * @variant label - Form label text
 * @variant caption - Small caption text
 * @variant h1 - Main heading (2xl)
 * @variant h2 - Section heading (xl)
 * @variant h3 - Subsection heading (lg)
 * @variant h4 - Minor heading (base)
 *
 * @weight normal - Normal weight (400)
 * @weight medium - Medium weight (500)
 * @weight semibold - Semibold weight (600)
 * @weight bold - Bold weight (700)
 *
 * @color default - Default text color (neutral-900)
 * @color muted - Muted text color (neutral-600)
 * @color primary - Primary color (green-600)
 * @color error - Error color (red-600)
 *
 * @example
 * ```tsx
 * import { textVariants } from '@/lib/design/variants'
 *
 * // Main heading
 * <h1 className={textVariants({ variant: 'h1', weight: 'bold' })}>
 *   Welcome to GreekWheel
 * </h1>
 *
 * // Body text with muted color
 * <p className={textVariants({ variant: 'body', color: 'muted' })}>
 *   Track your options trading with ease.
 * </p>
 *
 * // Form label
 * <label className={textVariants({ variant: 'label', weight: 'medium' })}>
 *   Email Address
 * </label>
 * ```
 */
export const textVariants = cva('', {
  variants: {
    variant: {
      body: 'text-base',
      label: 'text-sm',
      caption: 'text-xs',
      h1: 'text-2xl',
      h2: 'text-xl',
      h3: 'text-lg',
      h4: 'text-base',
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
    color: {
      default: 'text-neutral-900',
      muted: 'text-neutral-600',
      primary: 'text-green-600',
      accent: 'text-amber-700',
      error: 'text-red-600',
      success: 'text-emerald-600',
    },
  },
  defaultVariants: {
    variant: 'body',
    weight: 'normal',
    color: 'default',
  },
})

/**
 * TypeScript type for text variant props
 */
export type TextVariantProps = VariantProps<typeof textVariants>

// ============================================================================
// Alert Variants
// ============================================================================

/**
 * Alert component variants
 *
 * Alert boxes for displaying important messages to users.
 *
 * @variant info - Informational message (blue)
 * @variant success - Success message (green)
 * @variant warning - Warning message (orange)
 * @variant error - Error message (red)
 *
 * @example
 * ```tsx
 * import { alertVariants } from '@/lib/design/variants'
 *
 * // Success alert
 * <div className={alertVariants({ variant: 'success' })}>
 *   Your trade was created successfully!
 * </div>
 *
 * // Error alert
 * <div className={alertVariants({ variant: 'error' })}>
 *   Failed to save trade. Please try again.
 * </div>
 * ```
 */
export const alertVariants = cva(
  // Base styles
  ['rounded-md', 'border', 'p-4', 'text-sm'],
  {
    variants: {
      variant: {
        info: 'bg-blue-50 border-blue-200 text-blue-800',
        success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        warning: 'bg-orange-50 border-orange-200 text-orange-800',
        error: 'bg-red-50 border-red-200 text-red-800',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  }
)

/**
 * TypeScript type for alert variant props
 */
export type AlertVariantProps = VariantProps<typeof alertVariants>
