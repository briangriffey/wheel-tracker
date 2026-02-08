import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges class names intelligently with Tailwind CSS conflict resolution.
 *
 * This utility combines `clsx` for conditional class name composition
 * and `tailwind-merge` for resolving Tailwind CSS class conflicts.
 *
 * @param inputs - Class names, objects, arrays, or other ClassValue types
 * @returns A single string with merged and deduplicated class names
 *
 * @example
 * ```tsx
 * // Basic usage
 * cn('px-2 py-1', 'bg-blue-500')
 * // => 'px-2 py-1 bg-blue-500'
 *
 * // Conditional classes
 * cn('text-base', isLarge && 'text-lg')
 * // => 'text-base text-lg' (if isLarge is true)
 *
 * // Conflict resolution (last class wins)
 * cn('px-2 py-1', 'px-4')
 * // => 'py-1 px-4'
 *
 * // With objects and arrays
 * cn('base-class', { 'active': isActive }, ['hover:opacity-80'])
 * // => 'base-class active hover:opacity-80' (if isActive is true)
 *
 * // With variant props
 * cn(baseStyles, variants[variant], className)
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Type helper for component variant props
 *
 * @example
 * ```tsx
 * interface ButtonProps extends VariantProps {
 *   onClick?: () => void
 * }
 * ```
 */
export interface VariantProps {
  className?: string
}

/**
 * Composes variant classes with base classes, ensuring proper Tailwind merging.
 *
 * Useful when building component libraries with class-variance-authority (CVA)
 * or similar variant systems.
 *
 * @param baseClasses - Base classes applied to all variants
 * @param variantClasses - Variant-specific classes
 * @param overrideClasses - Optional override classes (e.g., from props)
 * @returns Merged class string with conflicts resolved
 *
 * @example
 * ```tsx
 * const buttonVariants = {
 *   primary: 'bg-blue-500 text-white',
 *   secondary: 'bg-gray-200 text-gray-900',
 * }
 *
 * composeVariants(
 *   'px-4 py-2 rounded font-medium',
 *   buttonVariants['primary'],
 *   'hover:bg-blue-600'
 * )
 * // => 'px-4 py-2 rounded font-medium bg-blue-500 text-white hover:bg-blue-600'
 * ```
 */
export function composeVariants(
  baseClasses: ClassValue,
  variantClasses: ClassValue,
  overrideClasses?: ClassValue
): string {
  return cn(baseClasses, variantClasses, overrideClasses)
}
