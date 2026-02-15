/**
 * Design Token Definitions
 *
 * This module exports typed design tokens for consistent styling across the application.
 * These tokens align with the Tailwind CSS configuration and provide TypeScript support
 * for type-safe design system usage.
 */

/**
 * Color scale type for primary, accent, and neutral color palettes
 * Follows the standard 50-900 scale where 50 is lightest and 900 is darkest
 */
export type ColorScale = {
  50: string
  100: string
  200: string
  300: string
  400: string
  500: string
  600: string
  700: string
  800: string
  900: string
}

/**
 * Semantic color type for success, error, warning, and info states
 */
export type SemanticColors = {
  success: string
  error: string
  warning: string
  info: string
}

/**
 * Complete color token structure
 */
export type ColorTokens = {
  primary: ColorScale
  accent: ColorScale
  neutral: ColorScale
  semantic: SemanticColors
}

/**
 * Color Tokens
 *
 * Defines the application color palette including:
 * - Primary: Green palette for main brand color and primary actions
 * - Accent: Brown palette for complementary accents and secondary elements
 * - Neutral: Gray scale for text, borders, and backgrounds
 * - Semantic: Context-specific colors for success, error, warning, and info states
 */
export const colorTokens: ColorTokens = {
  /** Primary green palette - Base color: #43D984 */
  primary: {
    50: '#E8FBF0',
    100: '#C7F5DC',
    200: '#9FEDC1',
    300: '#76E5A6',
    400: '#5ADE91',
    500: '#43D984',
    600: '#31C572',
    700: '#28A65F',
    800: '#1F8249',
    900: '#176638',
  },
  /** Accent brown palette - Base color: #59332A */
  accent: {
    50: '#F9F3F2',
    100: '#EDD9D5',
    200: '#D9ADA3',
    300: '#C58171',
    400: '#8F5A4E',
    500: '#59332A',
    600: '#4A2A23',
    700: '#3B221C',
    800: '#2C1915',
    900: '#1D110E',
  },
  /** Neutral gray scale for text, borders, and backgrounds */
  neutral: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  /** Semantic colors for contextual UI states */
  semantic: {
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
  },
}

/**
 * Spacing scale type
 */
export type SpacingTokens = {
  xs: string
  sm: string
  md: string
  lg: string
  xl: string
  '2xl': string
}

/**
 * Spacing Tokens
 *
 * Defines the spacing scale for margins, padding, and gaps.
 * Uses rem units for accessibility (scales with user's font size preference).
 *
 * Scale reference:
 * - xs: 0.5rem (8px at base 16px)
 * - sm: 0.75rem (12px)
 * - md: 1rem (16px)
 * - lg: 1.5rem (24px)
 * - xl: 2rem (32px)
 * - 2xl: 3rem (48px)
 */
export const spacingTokens: SpacingTokens = {
  xs: '0.5rem', // 8px
  sm: '0.75rem', // 12px
  md: '1rem', // 16px
  lg: '1.5rem', // 24px
  xl: '2rem', // 32px
  '2xl': '3rem', // 48px
}

/**
 * Border radius scale type
 */
export type RadiusTokens = {
  none: string
  sm: string
  md: string
  lg: string
  full: string
}

/**
 * Border Radius Tokens
 *
 * Defines border radius values for consistent roundedness across components.
 *
 * Scale reference:
 * - none: 0 (sharp corners)
 * - sm: 0.25rem (4px - subtle rounding)
 * - md: 0.5rem (8px - standard rounding)
 * - lg: 1rem (16px - prominent rounding)
 * - full: 9999px (pill shape / circular)
 */
export const radiusTokens: RadiusTokens = {
  none: '0',
  sm: '0.25rem', // 4px
  md: '0.5rem', // 8px
  lg: '1rem', // 16px
  full: '9999px', // Pill shape
}

/**
 * Box shadow scale type
 */
export type ShadowTokens = {
  sm: string
  md: string
  lg: string
  xl: string
}

/**
 * Shadow Tokens
 *
 * Defines box shadow presets for elevation and depth.
 * Shadows create visual hierarchy and indicate interactive elements.
 *
 * Scale reference:
 * - sm: Subtle shadow for slight elevation (cards, buttons)
 * - md: Medium shadow for moderate elevation (dropdowns, tooltips)
 * - lg: Large shadow for significant elevation (modals, popovers)
 * - xl: Extra large shadow for maximum elevation (sticky elements, overlays)
 */
export const shadowTokens: ShadowTokens = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
}

/**
 * Complete design token collection
 */
export type DesignTokens = {
  colors: ColorTokens
  spacing: SpacingTokens
  radius: RadiusTokens
  shadows: ShadowTokens
}

/**
 * All Design Tokens
 *
 * Centralized export of all design token categories.
 * Import this for complete design system access in a single import.
 *
 * @example
 * ```typescript
 * import { designTokens } from '@/lib/design/tokens'
 *
 * const primaryColor = designTokens.colors.primary[500]
 * const cardPadding = designTokens.spacing.md
 * const buttonRadius = designTokens.radius.md
 * const cardShadow = designTokens.shadows.sm
 * ```
 */
export const designTokens: DesignTokens = {
  colors: colorTokens,
  spacing: spacingTokens,
  radius: radiusTokens,
  shadows: shadowTokens,
}
