# Button Component

A flexible, accessible button component with multiple variants, sizes, and states.

## Features

- ✅ **5 Variants**: primary, secondary, outline, ghost, destructive
- ✅ **3 Sizes**: sm (small), md (medium), lg (large)
- ✅ **Loading State**: Shows spinner and disables interaction
- ✅ **Disabled State**: Proper disabled styling and behavior
- ✅ **Icon Support**: Left and right icon placement
- ✅ **Accessibility**: ARIA attributes, keyboard navigation, focus states
- ✅ **TypeScript**: Full type safety with comprehensive JSDoc
- ✅ **Ref Forwarding**: Access to underlying button element

## Usage

### Basic Button

```tsx
import { Button } from '@/components/design-system/button'

export function MyComponent() {
  return <Button>Click me</Button>
}
```

### Variants

```tsx
// Primary (default)
<Button variant="primary">Primary</Button>

// Secondary
<Button variant="secondary">Secondary</Button>

// Outline
<Button variant="outline">Outline</Button>

// Ghost (minimal)
<Button variant="ghost">Ghost</Button>

// Destructive (for delete actions)
<Button variant="destructive">Delete</Button>
```

### Sizes

```tsx
// Small
<Button size="sm">Small Button</Button>

// Medium (default)
<Button size="md">Medium Button</Button>

// Large
<Button size="lg">Large Button</Button>
```

### Loading State

```tsx
const [isLoading, setIsLoading] = useState(false)

return (
  <Button loading={isLoading} onClick={handleSubmit}>
    Save Changes
  </Button>
)
```

### With Icons

```tsx
import { PlusIcon, ArrowRightIcon } from '@heroicons/react/24/outline'

// Left icon
<Button leftIcon={<PlusIcon />}>
  Add Item
</Button>

// Right icon
<Button rightIcon={<ArrowRightIcon />}>
  Next
</Button>

// Both icons
<Button
  leftIcon={<PlusIcon />}
  rightIcon={<ArrowRightIcon />}
>
  Add and Continue
</Button>

// Icon only (don't forget aria-label!)
<Button
  leftIcon={<PlusIcon />}
  aria-label="Add new item"
/>
```

### Disabled

```tsx
<Button disabled>
  Disabled Button
</Button>
```

### Form Buttons

```tsx
// Submit button
<Button type="submit">
  Submit Form
</Button>

// Reset button
<Button type="reset" variant="outline">
  Reset
</Button>
```

### With Ref

```tsx
const buttonRef = useRef<HTMLButtonElement>(null)

useEffect(() => {
  // Focus the button on mount
  buttonRef.current?.focus()
}, [])

return (
  <Button ref={buttonRef}>
    Focus Me
  </Button>
)
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'outline' \| 'ghost' \| 'destructive'` | `'primary'` | Visual style variant |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Button size |
| `loading` | `boolean` | `false` | Shows spinner and disables button |
| `disabled` | `boolean` | `false` | Disables the button |
| `leftIcon` | `ReactNode` | - | Icon to show on the left |
| `rightIcon` | `ReactNode` | - | Icon to show on the right |
| `children` | `ReactNode` | - | Button content |
| `className` | `string` | - | Additional CSS classes |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | Button type attribute |

Plus all standard HTML button attributes (`onClick`, `onBlur`, `aria-label`, etc.)

## Accessibility

The Button component follows WCAG 2.1 AA accessibility standards:

- ✅ Proper button semantics with `role="button"`
- ✅ Keyboard navigation support (Enter/Space)
- ✅ Focus indicators with visible focus ring
- ✅ Loading state indicated with `aria-busy`
- ✅ Disabled state indicated with `aria-disabled`
- ✅ Screen reader support with proper text and ARIA labels
- ✅ Color contrast ratios meet WCAG AA standards

### Accessibility Best Practices

1. **Always provide text or aria-label**: Don't create buttons with only icons and no accessible text
   ```tsx
   // ❌ Bad
   <Button leftIcon={<PlusIcon />} />

   // ✅ Good
   <Button leftIcon={<PlusIcon />} aria-label="Add item" />
   ```

2. **Use semantic variants**: Choose the right variant for the action
   - `destructive` for delete/remove actions
   - `primary` for main call-to-action
   - `secondary` for secondary actions
   - `outline` or `ghost` for tertiary actions

3. **Provide loading feedback**: Use the `loading` prop for async operations
   ```tsx
   <Button loading={isSubmitting}>
     {isSubmitting ? 'Saving...' : 'Save'}
   </Button>
   ```

## Testing

The Button component has comprehensive test coverage including:

- ✅ All variants render correctly
- ✅ All sizes render correctly
- ✅ Loading state shows spinner and disables button
- ✅ Disabled state prevents interaction
- ✅ Icons render in correct positions
- ✅ Event handlers work properly
- ✅ Accessibility attributes are present
- ✅ Ref forwarding works
- ✅ Custom className support

Run tests with:
```bash
pnpm test components/design-system/button
```

## Design Tokens

The Button uses design tokens from `@/lib/design/tokens`:

- **Colors**: `primary`, `accent`, `neutral`, `semantic.error`
- **Spacing**: Padding based on size tokens
- **Border Radius**: `md` for rounded corners
- **Shadows**: `sm` for subtle elevation

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Android)
