/**
 * Design System Tokens
 *
 * Central definition of design tokens for the Wheel Tracker application.
 * These tokens provide a typed, centralized source of truth for colors,
 * spacing, typography, shadows, and border radii.
 *
 * @module design/tokens
 */

/**
 * Color Tokens
 *
 * Defines the color palette for the application, organized by purpose:
 * - Primary: Main brand colors for key actions and emphasis
 * - Accent: Secondary colors for highlights and variety
 * - Neutral: Grayscale colors for text, backgrounds, and borders
 * - Semantic: Colors conveying meaning (success, warning, error, info)
 */
export const colorTokens = {
  /**
   * Primary brand colors
   * Used for main actions, links, and brand emphasis
   */
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },

  /**
   * Accent colors
   * Used for secondary actions, highlights, and visual interest
   */
  accent: {
    50: '#fdf4ff',
    100: '#fae8ff',
    200: '#f5d0fe',
    300: '#f0abfc',
    400: '#e879f9',
    500: '#d946ef',
    600: '#c026d3',
    700: '#a21caf',
    800: '#86198f',
    900: '#701a75',
    950: '#4a044e',
  },

  /**
   * Neutral grayscale colors
   * Used for text, backgrounds, borders, and subtle UI elements
   */
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
  },

  /**
   * Semantic colors
   * Used to convey meaning and status
   */
  semantic: {
    /**
     * Success states (completed actions, positive outcomes)
     */
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
      950: '#052e16',
    },

    /**
     * Warning states (caution, attention needed)
     */
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
      950: '#451a03',
    },

    /**
     * Error states (failed actions, destructive operations)
     */
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
      950: '#450a0a',
    },

    /**
     * Info states (informational messages, neutral updates)
     */
    info: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
      950: '#082f49',
    },
  },
} as const

/**
 * Spacing Tokens
 *
 * Defines consistent spacing values for margins, padding, gaps, and layout.
 * Based on a 4px base unit for mathematical consistency.
 *
 * - xs: 4px   (0.25rem)
 * - sm: 8px   (0.5rem)
 * - md: 16px  (1rem)
 * - lg: 24px  (1.5rem)
 * - xl: 32px  (2rem)
 * - 2xl: 48px (3rem)
 */
export const spacingTokens = {
  /** Extra small spacing: 4px (0.25rem) */
  xs: '0.25rem',
  /** Small spacing: 8px (0.5rem) */
  sm: '0.5rem',
  /** Medium spacing: 16px (1rem) */
  md: '1rem',
  /** Large spacing: 24px (1.5rem) */
  lg: '1.5rem',
  /** Extra large spacing: 32px (2rem) */
  xl: '2rem',
  /** 2X large spacing: 48px (3rem) */
  '2xl': '3rem',
} as const

/**
 * Typography Tokens
 *
 * Defines font families, sizes, weights, and line heights for text.
 * Organized by semantic purpose for consistent text hierarchy.
 */
export const typographyTokens = {
  /**
   * Font families
   */
  fontFamily: {
    /** Sans-serif font stack for body text and UI */
    sans: 'var(--font-geist-sans), system-ui, -apple-system, sans-serif',
    /** Monospace font stack for code and technical content */
    mono: 'var(--font-geist-mono), ui-monospace, monospace',
  },

  /**
   * Font sizes
   * Using rem units for accessibility (respects user font size preferences)
   */
  fontSize: {
    /** Extra small: 0.75rem (12px) */
    xs: '0.75rem',
    /** Small: 0.875rem (14px) */
    sm: '0.875rem',
    /** Base/medium: 1rem (16px) */
    base: '1rem',
    /** Large: 1.125rem (18px) */
    lg: '1.125rem',
    /** Extra large: 1.25rem (20px) */
    xl: '1.25rem',
    /** 2X large: 1.5rem (24px) */
    '2xl': '1.5rem',
    /** 3X large: 1.875rem (30px) */
    '3xl': '1.875rem',
    /** 4X large: 2.25rem (36px) */
    '4xl': '2.25rem',
  },

  /**
   * Font weights
   */
  fontWeight: {
    /** Normal weight: 400 */
    normal: 400,
    /** Medium weight: 500 */
    medium: 500,
    /** Semibold weight: 600 */
    semibold: 600,
    /** Bold weight: 700 */
    bold: 700,
  },

  /**
   * Line heights
   * Relative to font size for consistent vertical rhythm
   */
  lineHeight: {
    /** Tight: 1.25 (useful for headings) */
    tight: 1.25,
    /** Normal: 1.5 (body text) */
    normal: 1.5,
    /** Relaxed: 1.75 (loose paragraphs) */
    relaxed: 1.75,
  },
} as const

/**
 * Border Radius Tokens
 *
 * Defines consistent corner rounding for UI elements.
 * From sharp edges to fully rounded (pill shapes).
 */
export const radiusTokens = {
  /** No rounding: 0 */
  none: '0',
  /** Small rounding: 0.25rem (4px) */
  sm: '0.25rem',
  /** Medium rounding: 0.375rem (6px) */
  md: '0.375rem',
  /** Large rounding: 0.5rem (8px) */
  lg: '0.5rem',
  /** Full rounding: 9999px (pill shape) */
  full: '9999px',
} as const

/**
 * Shadow Tokens
 *
 * Defines elevation levels through box shadows.
 * Creates depth and layering in the UI.
 */
export const shadowTokens = {
  /** Small shadow: subtle elevation */
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  /** Medium shadow: moderate elevation (cards, dropdowns) */
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  /** Large shadow: significant elevation (modals, popovers) */
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  /** Extra large shadow: maximum elevation (floating elements) */
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
} as const

/**
 * Type definitions for design tokens
 * Enables type-safe usage throughout the application
 */
export type ColorTokens = typeof colorTokens
export type SpacingTokens = typeof spacingTokens
export type TypographyTokens = typeof typographyTokens
export type RadiusTokens = typeof radiusTokens
export type ShadowTokens = typeof shadowTokens

/**
 * All design tokens combined
 */
export const designTokens = {
  colors: colorTokens,
  spacing: spacingTokens,
  typography: typographyTokens,
  radius: radiusTokens,
  shadows: shadowTokens,
} as const

export type DesignTokens = typeof designTokens
