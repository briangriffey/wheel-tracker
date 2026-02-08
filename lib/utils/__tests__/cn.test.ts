import { describe, it, expect } from 'vitest'
import { cn, composeVariants } from '../cn'

describe('cn()', () => {
  it('should merge class names', () => {
    expect(cn('px-2 py-1', 'bg-blue-500')).toBe('px-2 py-1 bg-blue-500')
  })

  it('should handle undefined and null values', () => {
    expect(cn('px-2', undefined, 'py-1', null, 'bg-blue-500')).toBe(
      'px-2 py-1 bg-blue-500'
    )
  })

  it('should handle conditional classes', () => {
    expect(cn('px-2', true && 'py-1', false && 'bg-red-500')).toBe('px-2 py-1')
  })

  it('should handle Tailwind class conflicts (last class wins)', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
    expect(cn('text-sm', 'text-lg')).toBe('text-lg')
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500')
  })

  it('should handle objects', () => {
    expect(
      cn('base-class', {
        active: true,
        disabled: false,
      })
    ).toBe('base-class active')
  })

  it('should handle arrays', () => {
    expect(cn('base-class', ['hover:opacity-80', 'focus:outline-none'])).toBe(
      'base-class hover:opacity-80 focus:outline-none'
    )
  })

  it('should handle complex combinations', () => {
    const isActive = true
    const isLarge = false

    expect(
      cn(
        'px-2 py-1 rounded',
        {
          'bg-blue-500': isActive,
          'text-white': isActive,
        },
        isLarge && 'text-lg',
        'hover:opacity-80'
      )
    ).toBe('px-2 py-1 rounded bg-blue-500 text-white hover:opacity-80')
  })

  it('should maintain backward compatibility with existing usage', () => {
    // Test patterns used in existing components
    const sizeClasses = {
      sm: 'h-4 w-4 border-2',
      md: 'h-8 w-8 border-3',
      lg: 'h-12 w-12 border-4',
    }

    // Spinner pattern
    expect(
      cn(
        'inline-block animate-spin rounded-full border-gray-300 border-t-gray-900',
        sizeClasses['md'],
        undefined
      )
    ).toBe(
      'inline-block animate-spin rounded-full border-gray-300 border-t-gray-900 h-8 w-8 border-3'
    )

    // Skeleton pattern
    expect(cn('animate-pulse rounded-md bg-gray-200', 'h-4 w-1/4')).toBe(
      'animate-pulse rounded-md bg-gray-200 h-4 w-1/4'
    )
  })
})

describe('composeVariants()', () => {
  it('should compose base, variant, and override classes', () => {
    const baseClasses = 'px-4 py-2 rounded font-medium'
    const variantClasses = 'bg-blue-500 text-white'
    const overrideClasses = 'hover:bg-blue-600'

    expect(
      composeVariants(baseClasses, variantClasses, overrideClasses)
    ).toBe('px-4 py-2 rounded font-medium bg-blue-500 text-white hover:bg-blue-600')
  })

  it('should handle conflicts between base and variant', () => {
    const baseClasses = 'bg-gray-200 text-gray-900'
    const variantClasses = 'bg-blue-500 text-white'

    // Variant classes override base classes (last class wins)
    expect(composeVariants(baseClasses, variantClasses)).toBe(
      'bg-blue-500 text-white'
    )
  })

  it('should handle conflicts with override classes', () => {
    const baseClasses = 'px-4 py-2'
    const variantClasses = 'bg-blue-500'
    const overrideClasses = 'bg-red-500 px-6'

    expect(
      composeVariants(baseClasses, variantClasses, overrideClasses)
    ).toBe('py-2 bg-red-500 px-6')
  })

  it('should work with undefined overrides', () => {
    const baseClasses = 'px-4 py-2'
    const variantClasses = 'bg-blue-500'

    expect(composeVariants(baseClasses, variantClasses, undefined)).toBe(
      'px-4 py-2 bg-blue-500'
    )
  })
})
