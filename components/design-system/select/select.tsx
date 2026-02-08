'use client'

import React, { forwardRef, useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils/cn'

/**
 * Select size types
 * - sm: Small select (32px height)
 * - md: Medium select (40px height) - default
 * - lg: Large select (48px height)
 */
export type SelectSize = 'sm' | 'md' | 'lg'

/**
 * Select state types
 * - default: Normal state
 * - error: Error state (validation failed)
 * - success: Success state (validation passed)
 */
export type SelectState = 'default' | 'error' | 'success'

/**
 * Option type for Select component
 */
export interface SelectOption {
  /**
   * Unique value for the option
   */
  value: string
  /**
   * Display label for the option
   */
  label: string
  /**
   * Whether the option is disabled
   */
  disabled?: boolean
}

/**
 * Select component props
 */
export interface SelectProps {
  /**
   * Available options for selection
   */
  options: SelectOption[]

  /**
   * Currently selected value(s)
   * - For single select: string
   * - For multi-select: string[]
   */
  value?: string | string[]

  /**
   * Callback when selection changes
   */
  onChange?: (value: string | string[]) => void

  /**
   * Default selected value(s) for uncontrolled mode
   */
  defaultValue?: string | string[]

  /**
   * Enable multi-select mode
   * @default false
   */
  multiple?: boolean

  /**
   * Enable search/filter functionality
   * @default false
   */
  searchable?: boolean

  /**
   * Placeholder text when no value is selected
   * @default 'Select an option'
   */
  placeholder?: string

  /**
   * Size of the select
   * @default 'md'
   */
  size?: SelectSize

  /**
   * Visual state of the select
   * @default 'default'
   */
  state?: SelectState

  /**
   * Whether the select is disabled
   * @default false
   */
  disabled?: boolean

  /**
   * Unique identifier for the select
   */
  id?: string

  /**
   * Name attribute for form integration
   */
  name?: string

  /**
   * Additional CSS classes to apply to the select wrapper
   */
  wrapperClassName?: string

  /**
   * Additional CSS classes to apply to the trigger button
   */
  className?: string

  /**
   * Error message to display below the select
   */
  error?: string

  /**
   * Help text to display below the select
   */
  helpText?: string

  /**
   * Search placeholder text
   * @default 'Search...'
   */
  searchPlaceholder?: string

  /**
   * Text to display when no options match search
   * @default 'No options found'
   */
  noOptionsText?: string

  /**
   * Maximum height of the dropdown panel
   * @default '300px'
   */
  maxDropdownHeight?: string
}

/**
 * Base styles for the trigger button
 */
const baseTriggerStyles = [
  'flex',
  'items-center',
  'justify-between',
  'w-full',
  'rounded-md',
  'transition-colors',
  'focus:outline-none',
  'focus:ring-2',
  'focus:ring-offset-2',
  'disabled:opacity-50',
  'disabled:cursor-not-allowed',
  'disabled:bg-neutral-50',
  'bg-white',
  'text-left',
  'cursor-pointer',
].join(' ')

/**
 * Size styles mapping for trigger
 */
const triggerSizeStyles: Record<SelectSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-3 text-base',
  lg: 'h-12 px-4 text-lg',
}

/**
 * State styles mapping for trigger
 */
const triggerStateStyles: Record<SelectState, string> = {
  default: [
    'border',
    'border-neutral-300',
    'text-neutral-900',
    'hover:border-neutral-400',
    'focus:border-primary-500',
    'focus:ring-primary-500',
  ].join(' '),

  error: [
    'border-2',
    'border-error',
    'text-neutral-900',
    'focus:border-error',
    'focus:ring-error',
  ].join(' '),

  success: [
    'border-2',
    'border-success',
    'text-neutral-900',
    'focus:border-success',
    'focus:ring-success',
  ].join(' '),
}

/**
 * Dropdown panel styles
 */
const dropdownPanelStyles = [
  'absolute',
  'z-50',
  'w-full',
  'mt-1',
  'bg-white',
  'border',
  'border-neutral-200',
  'rounded-md',
  'shadow-lg',
  'overflow-hidden',
].join(' ')

/**
 * Option item styles
 */
const optionBaseStyles = [
  'px-3',
  'py-2',
  'cursor-pointer',
  'transition-colors',
  'hover:bg-neutral-100',
  'focus:bg-neutral-100',
  'focus:outline-none',
].join(' ')

/**
 * Custom Select Component
 *
 * A flexible custom dropdown select component with advanced features:
 * - Multi-select mode
 * - Search/filter functionality
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Custom styling with multiple sizes and states
 * - Full accessibility support
 *
 * @example
 * ```tsx
 * // Basic select
 * <Select
 *   options={[
 *     { value: '1', label: 'Option 1' },
 *     { value: '2', label: 'Option 2' },
 *   ]}
 *   value={selectedValue}
 *   onChange={setSelectedValue}
 * />
 *
 * // Multi-select with search
 * <Select
 *   options={options}
 *   multiple
 *   searchable
 *   value={selectedValues}
 *   onChange={setSelectedValues}
 * />
 *
 * // With error state
 * <Select
 *   options={options}
 *   state="error"
 *   error="Please select an option"
 * />
 * ```
 */
export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      options = [],
      value: controlledValue,
      onChange,
      defaultValue,
      multiple = false,
      searchable = false,
      placeholder = 'Select an option',
      size = 'md',
      state = 'default',
      disabled = false,
      id,
      name,
      wrapperClassName,
      className,
      error,
      helpText,
      searchPlaceholder = 'Search...',
      noOptionsText = 'No options found',
      maxDropdownHeight = '300px',
    },
    ref
  ) => {
    // State management
    const [isOpen, setIsOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [highlightedIndex, setHighlightedIndex] = useState<number>(-1)
    const [internalValue, setInternalValue] = useState<string | string[]>(
      defaultValue ?? (multiple ? [] : '')
    )

    // Determine if component is controlled
    const isControlled = controlledValue !== undefined
    const currentValue = isControlled ? controlledValue : internalValue

    // Refs
    const containerRef = useRef<HTMLDivElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Determine actual state based on error prop
    const actualState = error ? 'error' : state

    // Generate unique IDs for accessibility
    const errorId = error && id ? `${id}-error` : undefined
    const helpTextId = helpText && id ? `${id}-help` : undefined
    const listboxId = id ? `${id}-listbox` : undefined
    const describedBy = [errorId, helpTextId].filter(Boolean).join(' ') || undefined

    // Filter options based on search query
    const filteredOptions = useMemo(() => {
      if (!searchable || !searchQuery.trim()) {
        return options
      }
      const query = searchQuery.toLowerCase()
      return options.filter((option) =>
        option.label.toLowerCase().includes(query)
      )
    }, [options, searchQuery, searchable])

    // Get selected option labels for display
    const selectedLabels = useMemo(() => {
      if (multiple && Array.isArray(currentValue)) {
        return currentValue
          .map((val) => options.find((opt) => opt.value === val)?.label)
          .filter(Boolean)
      }
      if (!multiple && typeof currentValue === 'string') {
        return options.find((opt) => opt.value === currentValue)?.label
      }
      return null
    }, [currentValue, options, multiple])

    // Display text for trigger button
    const displayText = useMemo(() => {
      if (multiple && Array.isArray(selectedLabels)) {
        if (selectedLabels.length === 0) return placeholder
        if (selectedLabels.length === 1) return selectedLabels[0]
        return `${selectedLabels.length} selected`
      }
      return selectedLabels || placeholder
    }, [selectedLabels, placeholder, multiple])

    // Handle option selection
    const handleSelect = useCallback(
      (optionValue: string) => {
        let newValue: string | string[]

        if (multiple) {
          const currentArray = Array.isArray(currentValue) ? currentValue : []
          if (currentArray.includes(optionValue)) {
            // Remove from selection
            newValue = currentArray.filter((v) => v !== optionValue)
          } else {
            // Add to selection
            newValue = [...currentArray, optionValue]
          }
        } else {
          // Single select
          newValue = optionValue
          setIsOpen(false) // Close dropdown after selection
        }

        // Update state
        if (!isControlled) {
          setInternalValue(newValue)
        }

        // Call onChange callback
        onChange?.(newValue)
      },
      [currentValue, multiple, isControlled, onChange]
    )

    // Check if option is selected
    const isOptionSelected = useCallback(
      (optionValue: string) => {
        if (multiple && Array.isArray(currentValue)) {
          return currentValue.includes(optionValue)
        }
        return currentValue === optionValue
      },
      [currentValue, multiple]
    )

    // Toggle dropdown
    const toggleDropdown = useCallback(() => {
      if (disabled) return
      setIsOpen((prev) => !prev)
    }, [disabled])

    // Close dropdown
    const closeDropdown = useCallback(() => {
      setIsOpen(false)
      setSearchQuery('')
      setHighlightedIndex(-1)
    }, [])

    // Handle click outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target as Node)
        ) {
          closeDropdown()
        }
      }

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside)
        return () => {
          document.removeEventListener('mousedown', handleClickOutside)
        }
      }
    }, [isOpen, closeDropdown])

    // Focus search input when dropdown opens
    useEffect(() => {
      if (isOpen && searchable && searchInputRef.current) {
        searchInputRef.current.focus()
      }
    }, [isOpen, searchable])

    // Keyboard navigation
    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent) => {
        if (disabled) return

        switch (event.key) {
          case 'Enter':
          case ' ':
            if (!isOpen) {
              event.preventDefault()
              setIsOpen(true)
            } else if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
              event.preventDefault()
              const option = filteredOptions[highlightedIndex]
              if (!option.disabled) {
                handleSelect(option.value)
              }
            }
            break

          case 'Escape':
            if (isOpen) {
              event.preventDefault()
              closeDropdown()
            }
            break

          case 'ArrowDown':
            event.preventDefault()
            if (!isOpen) {
              setIsOpen(true)
            } else {
              setHighlightedIndex((prev) => {
                const nextIndex = prev + 1
                return nextIndex >= filteredOptions.length ? 0 : nextIndex
              })
            }
            break

          case 'ArrowUp':
            event.preventDefault()
            if (isOpen) {
              setHighlightedIndex((prev) => {
                const nextIndex = prev - 1
                return nextIndex < 0 ? filteredOptions.length - 1 : nextIndex
              })
            }
            break

          case 'Tab':
            if (isOpen) {
              closeDropdown()
            }
            break

          default:
            break
        }
      },
      [
        disabled,
        isOpen,
        highlightedIndex,
        filteredOptions,
        handleSelect,
        closeDropdown,
      ]
    )

    // Scroll highlighted option into view
    useEffect(() => {
      if (highlightedIndex >= 0 && dropdownRef.current) {
        const highlightedElement = dropdownRef.current.querySelector(
          `[data-index="${highlightedIndex}"]`
        )
        if (highlightedElement && typeof highlightedElement.scrollIntoView === 'function') {
          highlightedElement.scrollIntoView({
            block: 'nearest',
            behavior: 'smooth',
          })
        }
      }
    }, [highlightedIndex])

    return (
      <div className={wrapperClassName}>
        <div className="relative" ref={containerRef}>
          {/* Trigger button */}
          <button
            ref={ref}
            type="button"
            id={id}
            disabled={disabled}
            onClick={toggleDropdown}
            onKeyDown={handleKeyDown}
            className={cn(
              baseTriggerStyles,
              triggerStateStyles[actualState],
              triggerSizeStyles[size],
              className
            )}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-labelledby={id ? `${id}-label` : undefined}
            aria-describedby={describedBy}
          >
            <span
              className={cn(
                'truncate',
                !selectedLabels && 'text-neutral-400'
              )}
            >
              {displayText}
            </span>

            {/* Dropdown arrow icon */}
            <svg
              className={cn(
                'ml-2 h-5 w-5 text-neutral-400 transition-transform',
                isOpen && 'rotate-180'
              )}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Dropdown panel */}
          {isOpen && (
            <div className={dropdownPanelStyles} role="presentation">
              {/* Search input */}
              {searchable && (
                <div className="p-2 border-b border-neutral-200">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setHighlightedIndex(0)
                    }}
                    placeholder={searchPlaceholder}
                    className="w-full px-3 py-1.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Search options"
                  />
                </div>
              )}

              {/* Options list */}
              <div
                ref={dropdownRef}
                role="listbox"
                id={listboxId}
                aria-labelledby={id}
                aria-multiselectable={multiple}
                style={{ maxHeight: maxDropdownHeight, overflowY: 'auto' }}
                className="py-1"
              >
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-neutral-500">
                    {noOptionsText}
                  </div>
                ) : (
                  filteredOptions.map((option, index) => {
                    const selected = isOptionSelected(option.value)
                    const highlighted = index === highlightedIndex

                    return (
                      <div
                        key={option.value}
                        role="option"
                        aria-selected={selected}
                        aria-disabled={option.disabled}
                        data-index={index}
                        className={cn(
                          optionBaseStyles,
                          'flex items-center justify-between',
                          selected && 'bg-primary-50 text-primary-700',
                          highlighted && !selected && 'bg-neutral-100',
                          option.disabled &&
                            'opacity-50 cursor-not-allowed hover:bg-white'
                        )}
                        onClick={() => {
                          if (!option.disabled) {
                            handleSelect(option.value)
                          }
                        }}
                        onMouseEnter={() => setHighlightedIndex(index)}
                      >
                        <span className="flex items-center gap-2">
                          {/* Visual indicator for multi-select */}
                          {multiple && (
                            <span
                              className={cn(
                                'h-4 w-4 rounded border-2 flex items-center justify-center',
                                selected
                                  ? 'bg-primary-600 border-primary-600'
                                  : 'border-neutral-300'
                              )}
                              aria-hidden="true"
                            >
                              {selected && (
                                <svg
                                  className="h-3 w-3 text-white"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={3}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </span>
                          )}
                          {option.label}
                        </span>

                        {/* Checkmark for single select */}
                        {!multiple && selected && (
                          <svg
                            className="h-5 w-5 text-primary-600"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* Hidden input for form integration */}
          {name && (
            <>
              {multiple && Array.isArray(currentValue) ? (
                currentValue.map((val) => (
                  <input
                    key={val}
                    type="hidden"
                    name={name}
                    value={val}
                  />
                ))
              ) : (
                <input
                  type="hidden"
                  name={name}
                  value={typeof currentValue === 'string' ? currentValue : ''}
                />
              )}
            </>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p id={errorId} className="mt-1 text-sm text-error">
            {error}
          </p>
        )}

        {/* Help text */}
        {!error && helpText && (
          <p id={helpTextId} className="mt-1 text-xs text-neutral-500">
            {helpText}
          </p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
