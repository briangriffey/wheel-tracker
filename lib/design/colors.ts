/**
 * Semantic Color Functions
 *
 * Centralized color utility functions for consistent styling across the application.
 * All functions return Tailwind CSS class names based on semantic meaning.
 */

/**
 * Color variant types for different UI states
 */
export type ColorVariant = {
  text: string
  bg: string
  border: string
}

/**
 * Position types (from option assignment)
 */
export type PositionType = 'STOCK'

/**
 * Trade status enum values
 */
export type TradeStatus = 'OPEN' | 'CLOSED' | 'EXPIRED' | 'ASSIGNED'

/**
 * Position status enum values
 */
export type PositionStatus = 'OPEN' | 'COVERED' | 'PENDING_CLOSE' | 'CLOSED'

/**
 * Get color classes for P&L (profit and loss) values
 *
 * @param value - The P&L value (positive = profit, negative = loss)
 * @returns Object with text, background, and border color classes
 *
 * @example
 * ```typescript
 * const pnl = 125.50
 * const colors = getPnlColor(pnl)
 * // Returns: { text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' }
 * ```
 */
export function getPnlColor(value: number): ColorVariant {
  if (value > 0) {
    return {
      text: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
    }
  }

  if (value < 0) {
    return {
      text: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
    }
  }

  // Zero or neutral
  return {
    text: 'text-gray-600',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
  }
}

/**
 * Get color class for P&L text only (backward compatibility)
 *
 * @param pnl - The P&L value
 * @returns Tailwind text color class
 *
 * @example
 * ```typescript
 * const textColor = getPnLColorClass(125.50)
 * // Returns: 'text-green-600'
 * ```
 */
export function getPnLColorClass(pnl: number): string {
  return getPnlColor(pnl).text
}

/**
 * Get color class for P&L background only (backward compatibility)
 *
 * @param pnl - The P&L value
 * @returns Tailwind background color class
 *
 * @example
 * ```typescript
 * const bgColor = getPnLBackgroundClass(125.50)
 * // Returns: 'bg-green-50'
 * ```
 */
export function getPnLBackgroundClass(pnl: number): string {
  return getPnlColor(pnl).bg
}

/**
 * Get color classes for trade status or position status
 *
 * @param status - The trade or position status
 * @returns Object with text, background, and border color classes
 *
 * @example
 * ```typescript
 * const colors = getStatusColor('OPEN')
 * // Returns: { text: 'text-blue-800', bg: 'bg-blue-100', border: 'border-blue-200' }
 * ```
 */
export function getStatusColor(status: TradeStatus | PositionStatus): ColorVariant {
  switch (status) {
    case 'OPEN':
      // For positions: OPEN means no active call (blue)
      // For trades: OPEN means active (green)
      return {
        text: 'text-blue-800',
        bg: 'bg-blue-100',
        border: 'border-blue-200',
      }

    case 'COVERED':
      // Position has an active covered call (green)
      return {
        text: 'text-green-800',
        bg: 'bg-green-100',
        border: 'border-green-200',
      }

    case 'PENDING_CLOSE':
      // Call is ITM and near expiration (yellow)
      return {
        text: 'text-yellow-800',
        bg: 'bg-yellow-100',
        border: 'border-yellow-200',
      }

    case 'ASSIGNED':
      return {
        text: 'text-purple-800',
        bg: 'bg-purple-100',
        border: 'border-purple-200',
      }

    case 'EXPIRED':
      return {
        text: 'text-yellow-800',
        bg: 'bg-yellow-100',
        border: 'border-yellow-200',
      }

    case 'CLOSED':
    default:
      return {
        text: 'text-gray-800',
        bg: 'bg-gray-100',
        border: 'border-gray-200',
      }
  }
}

/**
 * Get color classes for position based on type and P&L
 *
 * @param type - The position type (currently only 'STOCK' is supported)
 * @param pnl - Optional P&L value to influence color selection
 * @returns Object with text, background, and border color classes
 *
 * @example
 * ```typescript
 * const colors = getPositionColor('STOCK', 150.25)
 * // Returns P&L-based colors for positive value
 * ```
 */
export function getPositionColor(type: PositionType, pnl?: number | null): ColorVariant {
  // For stock positions, color is primarily driven by P&L
  if (pnl !== undefined && pnl !== null) {
    return getPnlColor(pnl)
  }

  // Default neutral colors when no P&L available
  return {
    text: 'text-gray-700',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
  }
}

/**
 * Get semantic color classes for contextual states
 *
 * @param state - The semantic state ('success', 'error', 'warning', 'info')
 * @returns Object with text, background, and border color classes
 *
 * @example
 * ```typescript
 * const colors = getSemanticColor('warning')
 * // Returns: { text: 'text-yellow-800', bg: 'bg-yellow-50', border: 'border-yellow-200' }
 * ```
 */
export function getSemanticColor(state: 'success' | 'error' | 'warning' | 'info'): ColorVariant {
  switch (state) {
    case 'success':
      return {
        text: 'text-green-800',
        bg: 'bg-green-50',
        border: 'border-green-200',
      }

    case 'error':
      return {
        text: 'text-red-800',
        bg: 'bg-red-50',
        border: 'border-red-200',
      }

    case 'warning':
      return {
        text: 'text-yellow-800',
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
      }

    case 'info':
      return {
        text: 'text-blue-800',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
      }
  }
}

/**
 * Calculate relative luminance of an RGB color
 * Used for WCAG contrast ratio calculations
 *
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @returns Relative luminance value (0-1)
 *
 * @see https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((val) => {
    const s = val / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/**
 * Convert hex color to RGB
 *
 * @param hex - Hex color string (e.g., '#FF0000' or '#F00')
 * @returns RGB values as [r, g, b] or null if invalid
 */
function hexToRgb(hex: string): [number, number, number] | null {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, '')

  // Handle 3-digit hex
  if (cleanHex.length === 3) {
    const [r, g, b] = cleanHex.split('').map((char) => parseInt(char + char, 16))
    return [r, g, b]
  }

  // Handle 6-digit hex
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.slice(0, 2), 16)
    const g = parseInt(cleanHex.slice(2, 4), 16)
    const b = parseInt(cleanHex.slice(4, 6), 16)
    return [r, g, b]
  }

  return null
}

/**
 * Calculate WCAG contrast ratio between two colors
 *
 * @param color1 - First color (hex format)
 * @param color2 - Second color (hex format)
 * @returns Contrast ratio (1-21) or null if calculation fails
 *
 * @example
 * ```typescript
 * const ratio = getContrastRatio('#000000', '#FFFFFF')
 * // Returns: 21 (maximum contrast)
 * ```
 *
 * @see https://www.w3.org/TR/WCAG20/#contrast-ratiodef
 */
export function getContrastRatio(color1: string, color2: string): number | null {
  const rgb1 = hexToRgb(color1)
  const rgb2 = hexToRgb(color2)

  if (!rgb1 || !rgb2) {
    return null
  }

  const lum1 = getRelativeLuminance(rgb1[0], rgb1[1], rgb1[2])
  const lum2 = getRelativeLuminance(rgb2[0], rgb2[1], rgb2[2])

  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)

  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Check if two colors meet WCAG AA contrast requirements
 *
 * @param foreground - Foreground color (hex format)
 * @param background - Background color (hex format)
 * @param largeText - Whether text is large (18pt+ or 14pt+ bold)
 * @returns True if contrast meets WCAG AA standards
 *
 * @example
 * ```typescript
 * const meetsAA = meetsContrastAA('#000000', '#FFFFFF', false)
 * // Returns: true (21:1 ratio exceeds 4.5:1 requirement)
 * ```
 *
 * @see https://www.w3.org/TR/WCAG20/#visual-audio-contrast-contrast
 */
export function meetsContrastAA(
  foreground: string,
  background: string,
  largeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background)
  if (!ratio) return false

  // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
  const requiredRatio = largeText ? 3 : 4.5
  return ratio >= requiredRatio
}

/**
 * Check if two colors meet WCAG AAA contrast requirements
 *
 * @param foreground - Foreground color (hex format)
 * @param background - Background color (hex format)
 * @param largeText - Whether text is large (18pt+ or 14pt+ bold)
 * @returns True if contrast meets WCAG AAA standards
 *
 * @example
 * ```typescript
 * const meetsAAA = meetsContrastAAA('#000000', '#FFFFFF', false)
 * // Returns: true (21:1 ratio exceeds 7:1 requirement)
 * ```
 *
 * @see https://www.w3.org/TR/WCAG20/#visual-audio-contrast7
 */
export function meetsContrastAAA(
  foreground: string,
  background: string,
  largeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background)
  if (!ratio) return false

  // WCAG AAA requires 7:1 for normal text, 4.5:1 for large text
  const requiredRatio = largeText ? 4.5 : 7
  return ratio >= requiredRatio
}
