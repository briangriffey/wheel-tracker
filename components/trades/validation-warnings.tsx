'use client'

import React, { memo } from 'react'
import { Alert, AlertTitle, AlertDescription } from '@/components/design-system/alert/alert'
import { Button } from '@/components/design-system/button/button'
import type { ValidationResult } from '@/lib/validations/wheel'

/**
 * ValidationWarnings component props
 */
export interface ValidationWarningsProps {
  /** Validation result containing errors and warnings */
  validation: ValidationResult
  /** Optional title to display above validation messages */
  title?: string
  /** Whether to show a confirmation button for acknowledged warnings */
  showConfirmButton?: boolean
  /** Callback when user confirms they understand the warnings */
  onConfirm?: () => void
  /** Whether the confirm button should be disabled */
  confirmDisabled?: boolean
  /** Text for the confirm button */
  confirmButtonText?: string
  /** Additional CSS classes */
  className?: string
}

/**
 * ValidationWarnings Component
 *
 * Displays validation errors (blocking) and warnings (informational) in a
 * user-friendly format. Errors are shown with error styling and block actions,
 * while warnings are shown with warning styling and allow user to proceed with
 * acknowledgment.
 *
 * This component is designed for use in trade dialogs and forms to provide
 * real-time feedback on validation rules for cash requirements, wheel continuity,
 * strike prices, and other trading constraints.
 *
 * Features:
 * - Automatically determines severity (error vs warning)
 * - Groups multiple messages in a clean list format
 * - Optional confirmation flow for risky actions
 * - Accessible with proper ARIA attributes
 *
 * @example
 * ```tsx
 * const validation = validateCashRequirement({
 *   cashBalance: 10000,
 *   strikePrice: 150,
 *   contracts: 1
 * });
 *
 * <ValidationWarnings
 *   validation={validation}
 *   title="Cash Requirement Check"
 *   showConfirmButton
 *   onConfirm={handleProceed}
 *   confirmButtonText="Proceed Anyway"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Display multiple warnings from different validators
 * const cashCheck = validateCashRequirement(...);
 * const strikeCheck = validateStrikePrice(...);
 *
 * const combined = {
 *   valid: cashCheck.valid && strikeCheck.valid,
 *   errors: [...cashCheck.errors, ...strikeCheck.errors],
 *   warnings: [...cashCheck.warnings, ...strikeCheck.warnings]
 * };
 *
 * <ValidationWarnings validation={combined} />
 * ```
 */
const ValidationWarningsComponent = function ValidationWarnings({
  validation,
  title,
  showConfirmButton = false,
  onConfirm,
  confirmDisabled = false,
  confirmButtonText = 'I Understand, Proceed',
  className = '',
}: ValidationWarningsProps) {
  const hasErrors = validation.errors.length > 0
  const hasWarnings = validation.warnings.length > 0

  // Don't render if there are no messages
  if (!hasErrors && !hasWarnings) {
    return null
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Errors */}
      {hasErrors && (
        <Alert variant="error">
          {title && <AlertTitle>{title} - Errors</AlertTitle>}
          <AlertDescription>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              {validation.errors.map((error, index) => (
                <li key={`error-${index}`}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Warnings */}
      {hasWarnings && (
        <Alert variant="warning">
          {title && <AlertTitle>{title} - {hasErrors ? 'Additional Warnings' : 'Warnings'}</AlertTitle>}
          <AlertDescription>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              {validation.warnings.map((warning, index) => (
                <li key={`warning-${index}`}>{warning}</li>
              ))}
            </ul>
            {showConfirmButton && onConfirm && !hasErrors && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onConfirm}
                  disabled={confirmDisabled}
                  type="button"
                >
                  {confirmButtonText}
                </Button>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

/**
 * Memoized ValidationWarnings component to prevent unnecessary re-renders
 */
export const ValidationWarnings = memo(ValidationWarningsComponent)

/**
 * Utility component for displaying cost/profit breakdown tables
 * Used in assignment dialogs to show detailed financial calculations
 */
export interface BreakdownTableProps {
  /** Array of breakdown items to display */
  items: Array<{
    label: string
    value: string
    highlighted?: boolean
  }>
  /** Optional title for the breakdown section */
  title?: string
  /** Additional CSS classes */
  className?: string
}

/**
 * BreakdownTable Component
 *
 * Displays financial breakdowns in a clean table format. Used for showing
 * cost calculations, profit/loss breakdowns, and other financial details
 * in trade dialogs.
 *
 * @example
 * ```tsx
 * <BreakdownTable
 *   title="Assignment Breakdown"
 *   items={[
 *     { label: 'Strike Price', value: '$150.00' },
 *     { label: 'Premium Collected', value: '$250.00' },
 *     { label: 'Effective Cost Basis', value: '$147.50', highlighted: true }
 *   ]}
 * />
 * ```
 */
const BreakdownTableComponent = function BreakdownTable({
  items,
  title,
  className = '',
}: BreakdownTableProps) {
  return (
    <div className={`rounded-lg border border-neutral-200 bg-neutral-50 p-4 ${className}`}>
      {title && <h4 className="text-sm font-medium text-neutral-900 mb-3">{title}</h4>}
      <dl className="space-y-2">
        {items.map((item, index) => (
          <div
            key={index}
            className={`flex justify-between text-sm ${
              item.highlighted
                ? 'font-semibold text-neutral-900 border-t pt-2 mt-2'
                : 'text-neutral-600'
            }`}
          >
            <dt>{item.label}</dt>
            <dd className={item.highlighted ? 'text-primary' : ''}>{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/**
 * Memoized BreakdownTable component to prevent unnecessary re-renders
 */
export const BreakdownTable = memo(BreakdownTableComponent)

/**
 * Confirmation checkbox component for risky actions
 * Used to require explicit user acknowledgment before proceeding
 */
export interface ConfirmationCheckboxProps {
  /** Checkbox label text */
  label: string
  /** Whether the checkbox is checked */
  checked: boolean
  /** Callback when checkbox state changes */
  onChange: (checked: boolean) => void
  /** Optional additional message to display below checkbox */
  message?: string
  /** Additional CSS classes */
  className?: string
}

/**
 * ConfirmationCheckbox Component
 *
 * A checkbox component specifically designed for confirming risky trading actions.
 * Requires explicit user acknowledgment before allowing them to proceed.
 *
 * @example
 * ```tsx
 * <ConfirmationCheckbox
 *   label="I understand the risks of this assignment"
 *   checked={confirmed}
 *   onChange={setConfirmed}
 *   message="This action cannot be undone"
 * />
 * ```
 */
const ConfirmationCheckboxComponent = function ConfirmationCheckbox({
  label,
  checked,
  onChange,
  message,
  className = '',
}: ConfirmationCheckboxProps) {
  return (
    <div className={`rounded-lg border border-warning bg-warning-light p-4 ${className}`}>
      <div className="flex items-start">
        <div className="flex h-5 items-center">
          <input
            id="confirmation-checkbox"
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary focus:ring-offset-2"
            aria-describedby={message ? 'confirmation-message' : undefined}
          />
        </div>
        <div className="ml-3 text-sm">
          <label htmlFor="confirmation-checkbox" className="font-medium text-neutral-900">
            {label}
          </label>
          {message && (
            <p id="confirmation-message" className="text-neutral-600 mt-1">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Memoized ConfirmationCheckbox component to prevent unnecessary re-renders
 */
export const ConfirmationCheckbox = memo(ConfirmationCheckboxComponent)
