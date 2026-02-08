import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { Select, SelectOption } from '../select'

expect.extend(toHaveNoViolations)

const mockOptions: SelectOption[] = [
  { value: '1', label: 'Option 1' },
  { value: '2', label: 'Option 2' },
  { value: '3', label: 'Option 3' },
  { value: '4', label: 'Option 4', disabled: true },
]

describe('Select', () => {
  describe('Basic Rendering', () => {
    it('renders with default placeholder', () => {
      render(<Select options={mockOptions} />)
      expect(screen.getByRole('button')).toHaveTextContent('Select an option')
    })

    it('renders with custom placeholder', () => {
      render(<Select options={mockOptions} placeholder="Choose one" />)
      expect(screen.getByRole('button')).toHaveTextContent('Choose one')
    })

    it('renders with selected value', () => {
      render(<Select options={mockOptions} value="1" />)
      expect(screen.getByRole('button')).toHaveTextContent('Option 1')
    })

    it('renders dropdown when clicked', async () => {
      render(<Select options={mockOptions} />)
      const trigger = screen.getByRole('button')

      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
        expect(screen.getByRole('option', { name: /Option 1/i })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: /Option 2/i })).toBeInTheDocument()
      })
    })

    it('renders with error message', () => {
      render(
        <Select
          options={mockOptions}
          error="This field is required"
          id="test-select"
        />
      )
      expect(screen.getByText('This field is required')).toBeInTheDocument()
      const trigger = screen.getByRole('button')
      expect(trigger).toHaveAttribute('aria-describedby', 'test-select-error')
      expect(trigger).toHaveClass('border-error')
    })

    it('renders with help text', () => {
      render(
        <Select
          options={mockOptions}
          helpText="Choose your preferred option"
          id="test-select"
        />
      )
      expect(screen.getByText('Choose your preferred option')).toBeInTheDocument()
    })

    it('renders disabled state', () => {
      render(<Select options={mockOptions} disabled />)
      const trigger = screen.getByRole('button')
      expect(trigger).toBeDisabled()
    })
  })

  describe('Size Variants', () => {
    it('applies small size styles', () => {
      render(<Select options={mockOptions} size="sm" data-testid="select" />)
      const trigger = screen.getByRole('button')
      expect(trigger).toHaveClass('h-8', 'text-sm')
    })

    it('applies medium size styles (default)', () => {
      render(<Select options={mockOptions} size="md" data-testid="select" />)
      const trigger = screen.getByRole('button')
      expect(trigger).toHaveClass('h-10', 'text-base')
    })

    it('applies large size styles', () => {
      render(<Select options={mockOptions} size="lg" data-testid="select" />)
      const trigger = screen.getByRole('button')
      expect(trigger).toHaveClass('h-12', 'text-lg')
    })
  })

  describe('State Variants', () => {
    it('applies default state styles', () => {
      render(<Select options={mockOptions} state="default" />)
      const trigger = screen.getByRole('button')
      expect(trigger).toHaveClass('border-neutral-300')
    })

    it('applies error state styles', () => {
      render(<Select options={mockOptions} state="error" />)
      const trigger = screen.getByRole('button')
      expect(trigger).toHaveClass('border-error')
    })

    it('applies success state styles', () => {
      render(<Select options={mockOptions} state="success" />)
      const trigger = screen.getByRole('button')
      expect(trigger).toHaveClass('border-success')
    })

    it('overrides state when error prop is provided', () => {
      render(<Select options={mockOptions} state="success" error="Error message" id="test-select" />)
      const trigger = screen.getByRole('button')
      expect(trigger).toHaveClass('border-error')
      expect(trigger).toHaveAttribute('aria-describedby', 'test-select-error')
    })
  })

  describe('Single Select Functionality', () => {
    it('selects an option when clicked', async () => {
      const handleChange = vi.fn()
      render(<Select options={mockOptions} onChange={handleChange} />)

      // Open dropdown
      fireEvent.click(screen.getByRole('button'))

      // Wait for dropdown to appear
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      // Click option
      const option1 = screen.getByRole('option', { name: /Option 1/i })
      fireEvent.click(option1)

      expect(handleChange).toHaveBeenCalledWith('1')
    })

    it('closes dropdown after selection in single select mode', async () => {
      render(<Select options={mockOptions} />)

      // Open dropdown
      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      // Click option
      fireEvent.click(screen.getByRole('option', { name: /Option 1/i }))

      // Dropdown should close
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      })
    })

    it('updates trigger text after selection', async () => {
      render(<Select options={mockOptions} defaultValue="1" />)
      expect(screen.getByRole('button')).toHaveTextContent('Option 1')
    })

    it('does not select disabled options', async () => {
      const handleChange = vi.fn()
      render(<Select options={mockOptions} onChange={handleChange} />)

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      const disabledOption = screen.getByRole('option', { name: /Option 4/i })
      fireEvent.click(disabledOption)

      expect(handleChange).not.toHaveBeenCalled()
    })
  })

  describe('Multi-Select Functionality', () => {
    it('renders visual checkboxes in multi-select mode', async () => {
      render(<Select options={mockOptions} multiple />)

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        const options = screen.getAllByRole('option')
        expect(options).toHaveLength(4)
        // Check that visual indicators are present
        expect(options[0].querySelector('span[aria-hidden="true"]')).toBeInTheDocument()
      })
    })

    it('selects multiple options', async () => {
      const handleChange = vi.fn()
      render(<Select options={mockOptions} multiple onChange={handleChange} />)

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      // Select first option
      fireEvent.click(screen.getByRole('option', { name: /Option 1/i }))
      expect(handleChange).toHaveBeenNthCalledWith(1, ['1'])

      // Select second option (both should be selected now)
      fireEvent.click(screen.getByRole('option', { name: /Option 2/i }))
      expect(handleChange).toHaveBeenNthCalledWith(2, ['1', '2'])
    })

    it('deselects options when clicked again', async () => {
      const handleChange = vi.fn()
      render(
        <Select
          options={mockOptions}
          multiple
          value={['1', '2']}
          onChange={handleChange}
        />
      )

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      // Deselect first option
      fireEvent.click(screen.getByRole('option', { name: /Option 1/i }))
      expect(handleChange).toHaveBeenCalledWith(['2'])
    })

    it('displays count when multiple options selected', () => {
      render(<Select options={mockOptions} multiple value={['1', '2', '3']} />)
      expect(screen.getByRole('button')).toHaveTextContent('3 selected')
    })

    it('displays single label when one option selected in multi-select', () => {
      render(<Select options={mockOptions} multiple value={['1']} />)
      expect(screen.getByRole('button')).toHaveTextContent('Option 1')
    })

    it('keeps dropdown open after selection in multi-select mode', async () => {
      render(<Select options={mockOptions} multiple />)

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('option', { name: /Option 1/i }))

      // Dropdown should remain open
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })
  })

  describe('Search/Filter Functionality', () => {
    it('renders search input when searchable is true', async () => {
      render(<Select options={mockOptions} searchable />)

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
      })
    })

    it('filters options based on search query', async () => {
      const user = userEvent.setup()
      render(<Select options={mockOptions} searchable />)

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search...')
      await user.type(searchInput, 'Option 1')

      await waitFor(() => {
        expect(screen.getByRole('option', { name: /Option 1/i })).toBeInTheDocument()
        expect(screen.queryByRole('option', { name: /Option 2/i })).not.toBeInTheDocument()
      })
    })

    it('shows no options message when search has no results', async () => {
      const user = userEvent.setup()
      render(<Select options={mockOptions} searchable />)

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search...')
      await user.type(searchInput, 'nonexistent')

      await waitFor(() => {
        expect(screen.getByText('No options found')).toBeInTheDocument()
      })
    })

    it('uses custom search placeholder', async () => {
      render(
        <Select options={mockOptions} searchable searchPlaceholder="Type to search..." />
      )

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Type to search...')).toBeInTheDocument()
      })
    })

    it('uses custom no options text', async () => {
      const user = userEvent.setup()
      render(
        <Select options={mockOptions} searchable noOptionsText="Nothing found" />
      )

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
      })

      await user.type(screen.getByPlaceholderText('Search...'), 'xyz')

      await waitFor(() => {
        expect(screen.getByText('Nothing found')).toBeInTheDocument()
      })
    })

    it('focuses search input when dropdown opens', async () => {
      render(<Select options={mockOptions} searchable />)

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search...')
        expect(searchInput).toHaveFocus()
      })
    })
  })

  describe('Keyboard Navigation', () => {
    it('opens dropdown with Enter key', async () => {
      render(<Select options={mockOptions} />)
      const trigger = screen.getByRole('button')

      trigger.focus()
      fireEvent.keyDown(trigger, { key: 'Enter' })

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })
    })

    it('opens dropdown with Space key', async () => {
      render(<Select options={mockOptions} />)
      const trigger = screen.getByRole('button')

      trigger.focus()
      fireEvent.keyDown(trigger, { key: ' ' })

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })
    })

    it('closes dropdown with Escape key', async () => {
      render(<Select options={mockOptions} />)
      const trigger = screen.getByRole('button')

      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      fireEvent.keyDown(trigger, { key: 'Escape' })

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      })
    })

    it('navigates options with ArrowDown key', async () => {
      render(<Select options={mockOptions} />)
      const trigger = screen.getByRole('button')

      trigger.focus()
      // First ArrowDown opens the dropdown
      fireEvent.keyDown(trigger, { key: 'ArrowDown' })

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      // Second ArrowDown highlights first option
      fireEvent.keyDown(trigger, { key: 'ArrowDown' })

      const options = screen.getAllByRole('option')
      expect(options[0]).toHaveClass('bg-neutral-100')
    })

    it('navigates options with ArrowUp key', async () => {
      render(<Select options={mockOptions} />)
      const trigger = screen.getByRole('button')

      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      fireEvent.keyDown(trigger, { key: 'ArrowUp' })

      // Should wrap to last option
      const options = screen.getAllByRole('option')
      // Last option (index 3, which is disabled) should be highlighted
      expect(options[3]).toHaveClass('bg-neutral-100')
    })

    it('selects highlighted option with Enter key', async () => {
      const handleChange = vi.fn()
      render(<Select options={mockOptions} onChange={handleChange} />)
      const trigger = screen.getByRole('button')

      trigger.focus()
      fireEvent.keyDown(trigger, { key: 'ArrowDown' }) // Open dropdown

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      fireEvent.keyDown(trigger, { key: 'ArrowDown' }) // Highlight first option

      // Wait for highlighting to take effect
      await waitFor(() => {
        const options = screen.getAllByRole('option')
        expect(options[0]).toHaveClass('bg-neutral-100')
      })

      fireEvent.keyDown(trigger, { key: 'Enter' }) // Select highlighted

      expect(handleChange).toHaveBeenCalledWith('1')
    })

    it('does not select disabled options with keyboard', async () => {
      const handleChange = vi.fn()
      render(<Select options={mockOptions} onChange={handleChange} />)
      const trigger = screen.getByRole('button')

      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      // Navigate to disabled option (index 3)
      // highlightedIndex starts at -1, so we need 4 ArrowDowns to get to index 3
      fireEvent.keyDown(trigger, { key: 'ArrowDown' }) // index 0
      fireEvent.keyDown(trigger, { key: 'ArrowDown' }) // index 1
      fireEvent.keyDown(trigger, { key: 'ArrowDown' }) // index 2
      fireEvent.keyDown(trigger, { key: 'ArrowDown' }) // index 3 (disabled)

      // Verify we're at the disabled option
      const options = screen.getAllByRole('option')
      expect(options[3]).toHaveClass('bg-neutral-100')

      fireEvent.keyDown(trigger, { key: 'Enter' })

      // Should not have been called at all since option is disabled
      expect(handleChange).not.toHaveBeenCalled()
    })

    it('closes dropdown with Tab key', async () => {
      render(<Select options={mockOptions} />)
      const trigger = screen.getByRole('button')

      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      fireEvent.keyDown(trigger, { key: 'Tab' })

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      })
    })

    it('can be focused programmatically', () => {
      const ref = React.createRef<HTMLButtonElement>()
      render(<Select ref={ref} options={mockOptions} />)

      ref.current?.focus()
      expect(ref.current).toHaveFocus()
    })
  })

  describe('Click Outside Behavior', () => {
    it('closes dropdown when clicking outside', async () => {
      render(
        <div>
          <Select options={mockOptions} />
          <button data-testid="outside">Outside</button>
        </div>
      )

      fireEvent.click(screen.getByRole('button', { name: /Select an option/i }))

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      fireEvent.mouseDown(screen.getByTestId('outside'))

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      })
    })
  })

  describe('Form Integration', () => {
    it('renders hidden input with name for single select', () => {
      const { container } = render(
        <Select options={mockOptions} name="mySelect" value="1" />
      )

      const hiddenInput = container.querySelector('input[type="hidden"][name="mySelect"]')
      expect(hiddenInput).toBeInTheDocument()
      expect(hiddenInput).toHaveValue('1')
    })

    it('renders multiple hidden inputs for multi-select', () => {
      const { container } = render(
        <Select options={mockOptions} name="mySelect" multiple value={['1', '2']} />
      )

      const hiddenInputs = container.querySelectorAll(
        'input[type="hidden"][name="mySelect"]'
      )
      expect(hiddenInputs).toHaveLength(2)
      expect(hiddenInputs[0]).toHaveValue('1')
      expect(hiddenInputs[1]).toHaveValue('2')
    })
  })

  describe('Controlled vs Uncontrolled', () => {
    it('works in controlled mode', async () => {
      const handleChange = vi.fn()
      const { rerender } = render(
        <Select options={mockOptions} value="1" onChange={handleChange} />
      )

      expect(screen.getByRole('button')).toHaveTextContent('Option 1')

      rerender(<Select options={mockOptions} value="2" onChange={handleChange} />)

      expect(screen.getByRole('button')).toHaveTextContent('Option 2')
    })

    it('works in uncontrolled mode with defaultValue', () => {
      render(<Select options={mockOptions} defaultValue="1" />)
      expect(screen.getByRole('button')).toHaveTextContent('Option 1')
    })

    it('updates internal state in uncontrolled mode', async () => {
      render(<Select options={mockOptions} defaultValue="1" />)

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('option', { name: /Option 2/i }))

      await waitFor(() => {
        expect(screen.getByRole('button')).toHaveTextContent('Option 2')
      })
    })
  })

  describe('Accessibility', () => {
    it('has correct ARIA attributes', async () => {
      render(<Select options={mockOptions} id="test-select" />)
      const trigger = screen.getByRole('button')

      expect(trigger).toHaveAttribute('aria-haspopup', 'listbox')
      expect(trigger).toHaveAttribute('aria-expanded', 'false')

      fireEvent.click(trigger)

      await waitFor(() => {
        expect(trigger).toHaveAttribute('aria-expanded', 'true')
      })
    })

    it('associates error message with aria-describedby', () => {
      render(
        <Select options={mockOptions} id="test-select" error="Error message" />
      )
      const trigger = screen.getByRole('button')
      expect(trigger).toHaveAttribute('aria-describedby', 'test-select-error')
    })

    it('associates help text with aria-describedby', () => {
      render(<Select options={mockOptions} id="test-select" helpText="Help text" />)
      const trigger = screen.getByRole('button')
      expect(trigger).toHaveAttribute('aria-describedby', 'test-select-help')
    })

    it('applies error styles when in error state', () => {
      render(<Select options={mockOptions} error="Error" id="test-select" />)
      const trigger = screen.getByRole('button')
      expect(trigger).toHaveClass('border-error')
      expect(trigger).toHaveAttribute('aria-describedby', 'test-select-error')
    })

    it('sets aria-multiselectable on listbox in multi-select mode', async () => {
      render(<Select options={mockOptions} multiple id="test-select" />)

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        const listbox = screen.getByRole('listbox')
        expect(listbox).toHaveAttribute('aria-multiselectable', 'true')
      })
    })

    it('sets aria-selected on selected options', async () => {
      render(<Select options={mockOptions} value="1" />)

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        const option = screen.getByRole('option', { name: /Option 1/i })
        expect(option).toHaveAttribute('aria-selected', 'true')
      })
    })

    it('sets aria-disabled on disabled options', async () => {
      render(<Select options={mockOptions} />)

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        const disabledOption = screen.getByRole('option', { name: /Option 4/i })
        expect(disabledOption).toHaveAttribute('aria-disabled', 'true')
      })
    })
  })

  describe('Accessibility with axe-core', () => {
    it('has no accessibility violations in default state', async () => {
      const { container } = render(<Select options={mockOptions} id="test-select" />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('has no accessibility violations when open', async () => {
      const { container } = render(<Select options={mockOptions} id="test-select" />)

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('has no accessibility violations with error', async () => {
      const { container } = render(
        <Select options={mockOptions} id="test-select" error="Error message" />
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('has no accessibility violations in multi-select mode', async () => {
      const { container } = render(
        <Select options={mockOptions} id="test-select" multiple />
      )

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('has no accessibility violations with search', async () => {
      const { container } = render(
        <Select options={mockOptions} id="test-select" searchable />
      )

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
      })

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Ref Forwarding', () => {
    it('forwards ref to trigger button', () => {
      const ref = React.createRef<HTMLButtonElement>()
      render(<Select ref={ref} options={mockOptions} />)
      expect(ref.current).toBeInstanceOf(HTMLButtonElement)
      expect(ref.current?.tagName).toBe('BUTTON')
    })

    it('can focus trigger via ref', () => {
      const ref = React.createRef<HTMLButtonElement>()
      render(<Select ref={ref} options={mockOptions} />)
      ref.current?.focus()
      expect(ref.current).toHaveFocus()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty options array', () => {
      render(<Select options={[]} />)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('shows no options message when options array is empty', async () => {
      render(<Select options={[]} />)

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText('No options found')).toBeInTheDocument()
      })
    })

    it('handles value that does not exist in options', () => {
      render(<Select options={mockOptions} value="999" />)
      expect(screen.getByRole('button')).toHaveTextContent('Select an option')
    })

    it('handles multi-select with empty array', () => {
      render(<Select options={mockOptions} multiple value={[]} />)
      expect(screen.getByRole('button')).toHaveTextContent('Select an option')
    })
  })

  describe('Custom Styling', () => {
    it('applies custom className to trigger', () => {
      render(<Select options={mockOptions} className="custom-class" />)
      const trigger = screen.getByRole('button')
      expect(trigger).toHaveClass('custom-class')
    })

    it('applies custom wrapperClassName', () => {
      const { container } = render(
        <Select options={mockOptions} wrapperClassName="custom-wrapper" />
      )
      const wrapper = container.firstChild
      expect(wrapper).toHaveClass('custom-wrapper')
    })
  })
})
