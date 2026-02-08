import { describe, it, expect } from 'vitest'
import {
  colorTokens,
  spacingTokens,
  radiusTokens,
  shadowTokens,
  designTokens,
  type ColorTokens,
  type SpacingTokens,
  type RadiusTokens,
  type ShadowTokens,
  type DesignTokens,
} from '../tokens'

describe('Design Tokens', () => {
  describe('colorTokens', () => {
    it('should export color tokens object', () => {
      expect(colorTokens).toBeDefined()
      expect(colorTokens.primary).toBeDefined()
      expect(colorTokens.accent).toBeDefined()
      expect(colorTokens.neutral).toBeDefined()
      expect(colorTokens.semantic).toBeDefined()
    })

    it('should have complete primary color scale', () => {
      expect(colorTokens.primary).toHaveProperty('50')
      expect(colorTokens.primary).toHaveProperty('100')
      expect(colorTokens.primary).toHaveProperty('200')
      expect(colorTokens.primary).toHaveProperty('300')
      expect(colorTokens.primary).toHaveProperty('400')
      expect(colorTokens.primary).toHaveProperty('500')
      expect(colorTokens.primary).toHaveProperty('600')
      expect(colorTokens.primary).toHaveProperty('700')
      expect(colorTokens.primary).toHaveProperty('800')
      expect(colorTokens.primary).toHaveProperty('900')
    })

    it('should have complete accent color scale', () => {
      expect(colorTokens.accent).toHaveProperty('50')
      expect(colorTokens.accent).toHaveProperty('500')
      expect(colorTokens.accent).toHaveProperty('900')
    })

    it('should have complete neutral color scale', () => {
      expect(colorTokens.neutral).toHaveProperty('50')
      expect(colorTokens.neutral).toHaveProperty('500')
      expect(colorTokens.neutral).toHaveProperty('900')
    })

    it('should have semantic colors', () => {
      expect(colorTokens.semantic).toHaveProperty('success')
      expect(colorTokens.semantic).toHaveProperty('error')
      expect(colorTokens.semantic).toHaveProperty('warning')
      expect(colorTokens.semantic).toHaveProperty('info')
    })

    it('should match Tailwind config colors', () => {
      expect(colorTokens.primary[500]).toBe('#43D984')
      expect(colorTokens.accent[500]).toBe('#59332A')
      expect(colorTokens.semantic.success).toBe('#10B981')
      expect(colorTokens.semantic.error).toBe('#EF4444')
    })
  })

  describe('spacingTokens', () => {
    it('should export spacing tokens object', () => {
      expect(spacingTokens).toBeDefined()
    })

    it('should have all spacing values', () => {
      expect(spacingTokens).toHaveProperty('xs')
      expect(spacingTokens).toHaveProperty('sm')
      expect(spacingTokens).toHaveProperty('md')
      expect(spacingTokens).toHaveProperty('lg')
      expect(spacingTokens).toHaveProperty('xl')
      expect(spacingTokens).toHaveProperty('2xl')
    })

    it('should have correct rem values', () => {
      expect(spacingTokens.xs).toBe('0.5rem')
      expect(spacingTokens.sm).toBe('0.75rem')
      expect(spacingTokens.md).toBe('1rem')
      expect(spacingTokens.lg).toBe('1.5rem')
      expect(spacingTokens.xl).toBe('2rem')
      expect(spacingTokens['2xl']).toBe('3rem')
    })
  })

  describe('radiusTokens', () => {
    it('should export radius tokens object', () => {
      expect(radiusTokens).toBeDefined()
    })

    it('should have all radius values', () => {
      expect(radiusTokens).toHaveProperty('none')
      expect(radiusTokens).toHaveProperty('sm')
      expect(radiusTokens).toHaveProperty('md')
      expect(radiusTokens).toHaveProperty('lg')
      expect(radiusTokens).toHaveProperty('full')
    })

    it('should have correct radius values', () => {
      expect(radiusTokens.none).toBe('0')
      expect(radiusTokens.sm).toBe('0.25rem')
      expect(radiusTokens.md).toBe('0.5rem')
      expect(radiusTokens.lg).toBe('1rem')
      expect(radiusTokens.full).toBe('9999px')
    })
  })

  describe('shadowTokens', () => {
    it('should export shadow tokens object', () => {
      expect(shadowTokens).toBeDefined()
    })

    it('should have all shadow values', () => {
      expect(shadowTokens).toHaveProperty('sm')
      expect(shadowTokens).toHaveProperty('md')
      expect(shadowTokens).toHaveProperty('lg')
      expect(shadowTokens).toHaveProperty('xl')
    })

    it('should have valid CSS shadow values', () => {
      expect(shadowTokens.sm).toContain('rgb(0 0 0')
      expect(shadowTokens.md).toContain('rgb(0 0 0')
      expect(shadowTokens.lg).toContain('rgb(0 0 0')
      expect(shadowTokens.xl).toContain('rgb(0 0 0')
    })
  })

  describe('designTokens', () => {
    it('should export complete design tokens object', () => {
      expect(designTokens).toBeDefined()
      expect(designTokens.colors).toBe(colorTokens)
      expect(designTokens.spacing).toBe(spacingTokens)
      expect(designTokens.radius).toBe(radiusTokens)
      expect(designTokens.shadows).toBe(shadowTokens)
    })
  })

  describe('TypeScript types', () => {
    it('should export ColorTokens type', () => {
      const colors: ColorTokens = colorTokens
      expect(colors).toBeDefined()
    })

    it('should export SpacingTokens type', () => {
      const spacing: SpacingTokens = spacingTokens
      expect(spacing).toBeDefined()
    })

    it('should export RadiusTokens type', () => {
      const radius: RadiusTokens = radiusTokens
      expect(radius).toBeDefined()
    })

    it('should export ShadowTokens type', () => {
      const shadows: ShadowTokens = shadowTokens
      expect(shadows).toBeDefined()
    })

    it('should export DesignTokens type', () => {
      const tokens: DesignTokens = designTokens
      expect(tokens).toBeDefined()
    })
  })
})
