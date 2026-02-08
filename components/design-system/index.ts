/**
 * Design System - Central Exports
 *
 * This file provides centralized exports for all design system components.
 * Tree-shaking will automatically eliminate unused components from the bundle.
 *
 * Usage:
 * import { Button, Badge, Alert } from '@/components/design-system'
 */

// Button Component
export { Button } from './button'
export type { ButtonProps, ButtonVariant, ButtonSize } from './button'

// Badge Component
export { Badge } from './badge'
export type { BadgeProps, BadgeVariant, BadgeSize } from './badge'

// Alert Components
export { Alert, AlertTitle, AlertDescription } from './alert'
export type {
  AlertProps,
  AlertVariant,
  AlertTitleProps,
  AlertDescriptionProps,
} from './alert'

// Input Components
export {
  Input,
  InputLabel,
  InputError,
  InputGroup,
} from './input'
export type {
  InputProps,
  InputSize,
  InputState,
  InputLabelProps,
  InputErrorProps,
  InputGroupProps,
} from './input'

// Select Component
export { Select } from './select'
export type { SelectProps, SelectSize, SelectState } from './select'
