/**
 * Design Tokens for Wheel Tracker
 *
 * This file contains all design tokens used throughout the application.
 * Tokens provide a centralized, type-safe way to manage colors, spacing,
 * border radius, and shadows.
 */

/**
 * Color tokens for the application's color palette
 *
 * Includes primary green scale, brown accent, neutral grays, and semantic colors.
 * All colors follow the new green-based design system.
 */
export const colorTokens = {
  /** Primary green color palette (main brand color) */
  primary: {
    /** Default primary green - use for primary actions and highlights */
    default: '#43D984',
    /** Dark green variant - use for hover states and emphasis */
    dark: '#3A8C5D',
    /** Light green variant - use for backgrounds and subtle highlights */
    light: '#62D995',
    /** Full primary scale for Tailwind integration */
    50: '#F0FDF7',
    100: '#DCFCE9',
    200: '#BBF7D6',
    300: '#86EFBB',
    400: '#62D995',
    500: '#43D984',
    600: '#3A8C5D',
    700: '#2F7148',
    800: '#27593A',
    900: '#1F4730',
  },
  /** Accent color palette (brown tones) */
  accent: {
    /** Default brown accent */
    brown: '#59332A',
    /** Light brown accent */
    'brown-light': '#8B5A4D',
    /** Dark brown accent */
    'brown-dark': '#3D2219',
  },
  /** Neutral gray color palette for backgrounds, borders, and text */
  neutral: {
    50: '#F2F2F2',
    100: '#E5E5E5',
    200: '#CCCCCC',
    300: '#B3B3B3',
    400: '#999999',
    500: '#808080',
    600: '#666666',
    700: '#4D4D4D',
    800: '#333333',
    900: '#1A1A1A',
  },
  /** Semantic colors for status and feedback */
  semantic: {
    /** Success state color (maps to primary green) */
    success: '#43D984',
    /** Error state color */
    error: '#EF4444',
    /** Warning state color */
    warning: '#F59E0B',
    /** Info state color */
    info: '#3B82F6',
  },
} as const

/**
 * Spacing tokens for consistent spacing throughout the application
 *
 * Use these tokens for padding, margin, and gap values.
 */
export const spacingTokens = {
  /** Extra small spacing - 4px */
  xs: '0.25rem',
  /** Small spacing - 8px */
  sm: '0.5rem',
  /** Medium spacing - 16px */
  md: '1rem',
  /** Large spacing - 24px */
  lg: '1.5rem',
  /** Extra large spacing - 32px */
  xl: '2rem',
  /** 2X large spacing - 48px */
  '2xl': '3rem',
} as const

/**
 * Border radius tokens for consistent rounded corners
 *
 * Use these tokens for border-radius values on cards, buttons, and inputs.
 */
export const radiusTokens = {
  /** No border radius - sharp corners */
  none: '0',
  /** Small radius - subtle rounding */
  sm: '0.125rem',
  /** Medium radius - default rounding for most components */
  md: '0.375rem',
  /** Large radius - prominent rounding */
  lg: '0.5rem',
  /** Full radius - pill shape */
  full: '9999px',
} as const

/**
 * Shadow tokens for consistent elevation and depth
 *
 * Use these tokens for box-shadow values to create visual hierarchy.
 */
export const shadowTokens = {
  /** Small shadow - subtle elevation */
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  /** Medium shadow - moderate elevation */
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  /** Large shadow - prominent elevation */
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  /** Extra large shadow - maximum elevation */
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
} as const

/**
 * TypeScript type definitions for design tokens
 */

export type ColorTokens = typeof colorTokens
export type PrimaryColor = keyof typeof colorTokens.primary
export type AccentColor = keyof typeof colorTokens.accent
export type NeutralColor = keyof typeof colorTokens.neutral
export type SemanticColor = keyof typeof colorTokens.semantic

export type SpacingTokens = typeof spacingTokens
export type Spacing = keyof typeof spacingTokens

export type RadiusTokens = typeof radiusTokens
export type Radius = keyof typeof radiusTokens

export type ShadowTokens = typeof shadowTokens
export type Shadow = keyof typeof shadowTokens

/**
 * Design tokens bundle - all tokens in a single export
 */
export const designTokens = {
  colors: colorTokens,
  spacing: spacingTokens,
  radius: radiusTokens,
  shadows: shadowTokens,
} as const

export type DesignTokens = typeof designTokens
