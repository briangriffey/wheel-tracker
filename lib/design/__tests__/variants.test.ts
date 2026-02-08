import { describe, it, expect } from 'vitest'
import {
  cn,
  buttonVariants,
  cardVariants,
  badgeVariants,
  inputVariants,
  textVariants,
  alertVariants,
  type ButtonVariantProps,
  type CardVariantProps,
  type BadgeVariantProps,
  type InputVariantProps,
  type TextVariantProps,
  type AlertVariantProps,
} from '../variants'

describe('Variant System', () => {
  describe('cn utility', () => {
    it('should merge class names', () => {
      const result = cn('base-class', 'additional-class')
      expect(result).toContain('base-class')
      expect(result).toContain('additional-class')
    })

    it('should handle conditional classes', () => {
      const result = cn('base', { 'conditional': true, 'skip': false })
      expect(result).toContain('base')
      expect(result).toContain('conditional')
      expect(result).not.toContain('skip')
    })

    it('should handle undefined and null values', () => {
      const result = cn('base', undefined, null, 'valid')
      expect(result).toContain('base')
      expect(result).toContain('valid')
    })
  })

  describe('buttonVariants', () => {
    it('should return default button classes', () => {
      const result = buttonVariants()
      expect(result).toContain('inline-flex')
      expect(result).toContain('items-center')
      expect(result).toContain('justify-center')
      expect(result).toContain('rounded-md')
      expect(result).toContain('font-medium')
    })

    it('should apply solid variant styles', () => {
      const result = buttonVariants({ variant: 'solid', color: 'primary' })
      expect(result).toContain('bg-green-600')
      expect(result).toContain('text-white')
    })

    it('should apply outline variant styles', () => {
      const result = buttonVariants({ variant: 'outline', color: 'primary' })
      expect(result).toContain('border-2')
      expect(result).toContain('bg-transparent')
      expect(result).toContain('border-green-600')
      expect(result).toContain('text-green-600')
    })

    it('should apply ghost variant styles', () => {
      const result = buttonVariants({ variant: 'ghost', color: 'accent' })
      expect(result).toContain('bg-transparent')
      expect(result).toContain('text-amber-700')
    })

    it('should apply link variant styles', () => {
      const result = buttonVariants({ variant: 'link', color: 'neutral' })
      expect(result).toContain('bg-transparent')
      expect(result).toContain('underline-offset-4')
    })

    it('should apply small size', () => {
      const result = buttonVariants({ size: 'sm' })
      expect(result).toContain('h-8')
      expect(result).toContain('px-3')
      expect(result).toContain('text-sm')
    })

    it('should apply medium size (default)', () => {
      const result = buttonVariants({ size: 'md' })
      expect(result).toContain('h-10')
      expect(result).toContain('px-4')
      expect(result).toContain('text-base')
    })

    it('should apply large size', () => {
      const result = buttonVariants({ size: 'lg' })
      expect(result).toContain('h-12')
      expect(result).toContain('px-6')
      expect(result).toContain('text-lg')
    })

    it('should apply error color', () => {
      const result = buttonVariants({ variant: 'solid', color: 'error' })
      expect(result).toContain('bg-red-600')
      expect(result).toContain('text-white')
    })

    it('should apply success color', () => {
      const result = buttonVariants({ variant: 'solid', color: 'success' })
      expect(result).toContain('bg-emerald-600')
    })

    it('should include focus styles', () => {
      const result = buttonVariants()
      expect(result).toContain('focus-visible:outline-none')
      expect(result).toContain('focus-visible:ring-2')
    })

    it('should include disabled styles', () => {
      const result = buttonVariants()
      expect(result).toContain('disabled:pointer-events-none')
      expect(result).toContain('disabled:opacity-50')
    })
  })

  describe('cardVariants', () => {
    it('should return default card classes', () => {
      const result = cardVariants()
      expect(result).toContain('rounded-lg')
      expect(result).toContain('bg-white')
    })

    it('should apply default variant', () => {
      const result = cardVariants({ variant: 'default' })
      expect(result).toContain('border')
      expect(result).toContain('border-neutral-200')
      expect(result).toContain('shadow-sm')
    })

    it('should apply elevated variant', () => {
      const result = cardVariants({ variant: 'elevated' })
      expect(result).toContain('shadow-lg')
      expect(result).not.toContain('border')
    })

    it('should apply outlined variant', () => {
      const result = cardVariants({ variant: 'outlined' })
      expect(result).toContain('border')
      expect(result).toContain('border-neutral-200')
      expect(result).not.toContain('shadow')
    })

    it('should apply ghost variant', () => {
      const result = cardVariants({ variant: 'ghost' })
      expect(result).not.toContain('border')
      expect(result).not.toContain('shadow')
    })

    it('should apply small padding', () => {
      const result = cardVariants({ padding: 'sm' })
      expect(result).toContain('p-3')
    })

    it('should apply medium padding (default)', () => {
      const result = cardVariants({ padding: 'md' })
      expect(result).toContain('p-4')
    })

    it('should apply large padding', () => {
      const result = cardVariants({ padding: 'lg' })
      expect(result).toContain('p-6')
    })

    it('should apply extra large padding', () => {
      const result = cardVariants({ padding: 'xl' })
      expect(result).toContain('p-8')
    })
  })

  describe('badgeVariants', () => {
    it('should return default badge classes', () => {
      const result = badgeVariants()
      expect(result).toContain('inline-flex')
      expect(result).toContain('items-center')
      expect(result).toContain('justify-center')
      expect(result).toContain('rounded-full')
      expect(result).toContain('font-medium')
      expect(result).toContain('whitespace-nowrap')
    })

    it('should apply solid variant with primary color', () => {
      const result = badgeVariants({ variant: 'solid', color: 'primary' })
      expect(result).toContain('bg-green-600')
      expect(result).toContain('text-white')
    })

    it('should apply subtle variant with success color', () => {
      const result = badgeVariants({ variant: 'subtle', color: 'success' })
      expect(result).toContain('bg-emerald-50')
      expect(result).toContain('text-emerald-700')
    })

    it('should apply outline variant with warning color', () => {
      const result = badgeVariants({ variant: 'outline', color: 'warning' })
      expect(result).toContain('border')
      expect(result).toContain('bg-transparent')
      expect(result).toContain('border-orange-600')
      expect(result).toContain('text-orange-600')
    })

    it('should apply info color', () => {
      const result = badgeVariants({ variant: 'solid', color: 'info' })
      expect(result).toContain('bg-blue-600')
      expect(result).toContain('text-white')
    })

    it('should apply small size', () => {
      const result = badgeVariants({ size: 'sm' })
      expect(result).toContain('h-5')
      expect(result).toContain('px-2')
      expect(result).toContain('text-xs')
    })

    it('should apply medium size (default)', () => {
      const result = badgeVariants({ size: 'md' })
      expect(result).toContain('h-6')
      expect(result).toContain('px-2.5')
      expect(result).toContain('text-sm')
    })

    it('should apply large size', () => {
      const result = badgeVariants({ size: 'lg' })
      expect(result).toContain('h-7')
      expect(result).toContain('px-3')
      expect(result).toContain('text-base')
    })
  })

  describe('inputVariants', () => {
    it('should return default input classes', () => {
      const result = inputVariants()
      expect(result).toContain('w-full')
      expect(result).toContain('rounded-md')
      expect(result).toContain('border')
      expect(result).toContain('bg-white')
      expect(result).toContain('px-3')
    })

    it('should apply default state', () => {
      const result = inputVariants({ state: 'default' })
      expect(result).toContain('border-neutral-300')
      expect(result).toContain('focus:border-green-500')
      expect(result).toContain('focus:ring-green-500')
    })

    it('should apply error state', () => {
      const result = inputVariants({ state: 'error' })
      expect(result).toContain('border-red-500')
      expect(result).toContain('focus:border-red-500')
      expect(result).toContain('focus:ring-red-500')
    })

    it('should apply success state', () => {
      const result = inputVariants({ state: 'success' })
      expect(result).toContain('border-emerald-500')
      expect(result).toContain('focus:border-emerald-500')
      expect(result).toContain('focus:ring-emerald-500')
    })

    it('should apply small size', () => {
      const result = inputVariants({ size: 'sm' })
      expect(result).toContain('h-8')
      expect(result).toContain('text-sm')
    })

    it('should apply medium size (default)', () => {
      const result = inputVariants({ size: 'md' })
      expect(result).toContain('h-10')
      expect(result).toContain('text-base')
    })

    it('should apply large size', () => {
      const result = inputVariants({ size: 'lg' })
      expect(result).toContain('h-12')
      expect(result).toContain('text-lg')
    })

    it('should include focus styles', () => {
      const result = inputVariants()
      expect(result).toContain('focus:outline-none')
      expect(result).toContain('focus:ring-2')
    })

    it('should include disabled styles', () => {
      const result = inputVariants()
      expect(result).toContain('disabled:cursor-not-allowed')
      expect(result).toContain('disabled:opacity-50')
    })

    it('should include placeholder styles', () => {
      const result = inputVariants()
      expect(result).toContain('placeholder:text-neutral-400')
    })
  })

  describe('textVariants', () => {
    it('should apply body variant (default)', () => {
      const result = textVariants({ variant: 'body' })
      expect(result).toContain('text-base')
    })

    it('should apply label variant', () => {
      const result = textVariants({ variant: 'label' })
      expect(result).toContain('text-sm')
    })

    it('should apply caption variant', () => {
      const result = textVariants({ variant: 'caption' })
      expect(result).toContain('text-xs')
    })

    it('should apply h1 variant', () => {
      const result = textVariants({ variant: 'h1' })
      expect(result).toContain('text-2xl')
    })

    it('should apply h2 variant', () => {
      const result = textVariants({ variant: 'h2' })
      expect(result).toContain('text-xl')
    })

    it('should apply h3 variant', () => {
      const result = textVariants({ variant: 'h3' })
      expect(result).toContain('text-lg')
    })

    it('should apply h4 variant', () => {
      const result = textVariants({ variant: 'h4' })
      expect(result).toContain('text-base')
    })

    it('should apply normal weight (default)', () => {
      const result = textVariants({ weight: 'normal' })
      expect(result).toContain('font-normal')
    })

    it('should apply medium weight', () => {
      const result = textVariants({ weight: 'medium' })
      expect(result).toContain('font-medium')
    })

    it('should apply semibold weight', () => {
      const result = textVariants({ weight: 'semibold' })
      expect(result).toContain('font-semibold')
    })

    it('should apply bold weight', () => {
      const result = textVariants({ weight: 'bold' })
      expect(result).toContain('font-bold')
    })

    it('should apply default color', () => {
      const result = textVariants({ color: 'default' })
      expect(result).toContain('text-neutral-900')
    })

    it('should apply muted color', () => {
      const result = textVariants({ color: 'muted' })
      expect(result).toContain('text-neutral-600')
    })

    it('should apply primary color', () => {
      const result = textVariants({ color: 'primary' })
      expect(result).toContain('text-green-600')
    })

    it('should apply accent color', () => {
      const result = textVariants({ color: 'accent' })
      expect(result).toContain('text-amber-700')
    })

    it('should apply error color', () => {
      const result = textVariants({ color: 'error' })
      expect(result).toContain('text-red-600')
    })

    it('should apply success color', () => {
      const result = textVariants({ color: 'success' })
      expect(result).toContain('text-emerald-600')
    })
  })

  describe('alertVariants', () => {
    it('should return default alert classes', () => {
      const result = alertVariants()
      expect(result).toContain('rounded-md')
      expect(result).toContain('border')
      expect(result).toContain('p-4')
      expect(result).toContain('text-sm')
    })

    it('should apply info variant (default)', () => {
      const result = alertVariants({ variant: 'info' })
      expect(result).toContain('bg-blue-50')
      expect(result).toContain('border-blue-200')
      expect(result).toContain('text-blue-800')
    })

    it('should apply success variant', () => {
      const result = alertVariants({ variant: 'success' })
      expect(result).toContain('bg-emerald-50')
      expect(result).toContain('border-emerald-200')
      expect(result).toContain('text-emerald-800')
    })

    it('should apply warning variant', () => {
      const result = alertVariants({ variant: 'warning' })
      expect(result).toContain('bg-orange-50')
      expect(result).toContain('border-orange-200')
      expect(result).toContain('text-orange-800')
    })

    it('should apply error variant', () => {
      const result = alertVariants({ variant: 'error' })
      expect(result).toContain('bg-red-50')
      expect(result).toContain('border-red-200')
      expect(result).toContain('text-red-800')
    })
  })

  describe('TypeScript types', () => {
    it('should export ButtonVariantProps type', () => {
      const props: ButtonVariantProps = {
        variant: 'solid',
        size: 'md',
        color: 'primary',
      }
      expect(props).toBeDefined()
    })

    it('should export CardVariantProps type', () => {
      const props: CardVariantProps = {
        variant: 'default',
        padding: 'md',
      }
      expect(props).toBeDefined()
    })

    it('should export BadgeVariantProps type', () => {
      const props: BadgeVariantProps = {
        variant: 'solid',
        size: 'md',
        color: 'neutral',
      }
      expect(props).toBeDefined()
    })

    it('should export InputVariantProps type', () => {
      const props: InputVariantProps = {
        size: 'md',
        state: 'default',
      }
      expect(props).toBeDefined()
    })

    it('should export TextVariantProps type', () => {
      const props: TextVariantProps = {
        variant: 'body',
        weight: 'normal',
        color: 'default',
      }
      expect(props).toBeDefined()
    })

    it('should export AlertVariantProps type', () => {
      const props: AlertVariantProps = {
        variant: 'info',
      }
      expect(props).toBeDefined()
    })

    it('should allow partial props with defaults', () => {
      const buttonProps: ButtonVariantProps = {}
      const cardProps: CardVariantProps = { padding: 'lg' }
      const badgeProps: BadgeVariantProps = { color: 'success' }

      expect(buttonProps).toBeDefined()
      expect(cardProps).toBeDefined()
      expect(badgeProps).toBeDefined()
    })
  })

  describe('Variant composition', () => {
    it('should combine multiple button variants correctly', () => {
      const result = buttonVariants({
        variant: 'outline',
        size: 'lg',
        color: 'error',
      })

      expect(result).toContain('border-2')
      expect(result).toContain('h-12')
      expect(result).toContain('border-red-600')
      expect(result).toContain('text-red-600')
    })

    it('should combine card variants and padding', () => {
      const result = cardVariants({
        variant: 'elevated',
        padding: 'xl',
      })

      expect(result).toContain('shadow-lg')
      expect(result).toContain('p-8')
    })

    it('should combine badge size and color', () => {
      const result = badgeVariants({
        variant: 'subtle',
        size: 'sm',
        color: 'warning',
      })

      expect(result).toContain('h-5')
      expect(result).toContain('bg-orange-50')
      expect(result).toContain('text-orange-700')
    })
  })
})
