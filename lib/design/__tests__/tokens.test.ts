import { describe, it, expect } from 'vitest'
import {
  colorTokens,
  spacingTokens,
  radiusTokens,
  shadowTokens,
  designTokens,
} from '../tokens'

describe('Design Tokens', () => {
  describe('colorTokens', () => {
    it('should export primary colors', () => {
      expect(colorTokens.primary.default).toBe('#43D984')
      expect(colorTokens.primary.dark).toBe('#3A8C5D')
      expect(colorTokens.primary.light).toBe('#62D995')
    })

    it('should export full primary scale', () => {
      expect(colorTokens.primary[50]).toBe('#F0FDF7')
      expect(colorTokens.primary[100]).toBe('#DCFCE9')
      expect(colorTokens.primary[500]).toBe('#43D984')
      expect(colorTokens.primary[900]).toBe('#1F4730')
    })

    it('should export accent colors', () => {
      expect(colorTokens.accent.brown).toBe('#59332A')
      expect(colorTokens.accent['brown-light']).toBe('#8B5A4D')
      expect(colorTokens.accent['brown-dark']).toBe('#3D2219')
    })

    it('should export neutral colors', () => {
      expect(colorTokens.neutral[50]).toBe('#F2F2F2')
      expect(colorTokens.neutral[500]).toBe('#808080')
      expect(colorTokens.neutral[900]).toBe('#1A1A1A')
    })

    it('should export semantic colors', () => {
      expect(colorTokens.semantic.success).toBe('#43D984')
      expect(colorTokens.semantic.error).toBe('#EF4444')
      expect(colorTokens.semantic.warning).toBe('#F59E0B')
      expect(colorTokens.semantic.info).toBe('#3B82F6')
    })
  })

  describe('spacingTokens', () => {
    it('should export all spacing values', () => {
      expect(spacingTokens.xs).toBe('0.25rem')
      expect(spacingTokens.sm).toBe('0.5rem')
      expect(spacingTokens.md).toBe('1rem')
      expect(spacingTokens.lg).toBe('1.5rem')
      expect(spacingTokens.xl).toBe('2rem')
      expect(spacingTokens['2xl']).toBe('3rem')
    })
  })

  describe('radiusTokens', () => {
    it('should export all radius values', () => {
      expect(radiusTokens.none).toBe('0')
      expect(radiusTokens.sm).toBe('0.125rem')
      expect(radiusTokens.md).toBe('0.375rem')
      expect(radiusTokens.lg).toBe('0.5rem')
      expect(radiusTokens.full).toBe('9999px')
    })
  })

  describe('shadowTokens', () => {
    it('should export all shadow values', () => {
      expect(shadowTokens.sm).toBe('0 1px 2px 0 rgb(0 0 0 / 0.05)')
      expect(shadowTokens.md).toBe('0 4px 6px -1px rgb(0 0 0 / 0.1)')
      expect(shadowTokens.lg).toBe('0 10px 15px -3px rgb(0 0 0 / 0.1)')
      expect(shadowTokens.xl).toBe('0 20px 25px -5px rgb(0 0 0 / 0.1)')
    })
  })

  describe('designTokens', () => {
    it('should export all token categories', () => {
      expect(designTokens.colors).toBe(colorTokens)
      expect(designTokens.spacing).toBe(spacingTokens)
      expect(designTokens.radius).toBe(radiusTokens)
      expect(designTokens.shadows).toBe(shadowTokens)
    })
  })
})
