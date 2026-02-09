'use client'

/**
 * SkipLink Component
 *
 * Provides a keyboard-accessible link to skip navigation and jump to main content.
 * The link is visually hidden until focused, meeting WCAG 2.1 AA standards.
 *
 * This helps keyboard and screen reader users bypass repetitive navigation.
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-500 focus:text-white focus:rounded-md focus:shadow-lg focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
    >
      Skip to main content
    </a>
  )
}
