# GreekWheel Design System

**Version:** 1.0.0
**Last Updated:** February 2026
**Status:** Production Ready

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Color Palette](#color-palette)
4. [Design Tokens](#design-tokens)
5. [Components](#components)
6. [Variant System](#variant-system)
7. [Migration Guide](#migration-guide)
8. [Best Practices](#best-practices)
9. [Accessibility](#accessibility)
10. [Performance](#performance)
11. [Troubleshooting](#troubleshooting)
12. [Contributing](#contributing)

---

## Introduction

The GreekWheel Design System is a comprehensive, production-ready component library and design token system built for consistency, accessibility, and developer experience. It replaces hardcoded styles across 20+ components with a centralized, reusable system.

### Key Benefits

- **Consistency**: Unified visual language across the entire application
- **Accessibility**: WCAG 2.1 AA compliant components with keyboard navigation and screen reader support
- **Type Safety**: Full TypeScript support with strict typing
- **Performance**: Optimized bundle size with tree-shaking support
- **Developer Experience**: Well-documented, easy-to-use API with helpful examples

### What's Included

- **5 Core Components**: Button, Badge, Alert, Input, Select
- **Design Tokens**: Colors, spacing, shadows, border radius
- **Semantic Color System**: Context-aware color utilities for P&L, status, and UI states
- **Component Variants**: Type-safe variant system using class-variance-authority
- **Interactive Gallery**: Live component showcase at `/design-system`

---

## Getting Started

### Installation

The design system is already integrated into the GreekWheel application. To use components in your code:

```typescript
// Import components
import { Button } from '@/components/design-system/button/button'
import { Badge } from '@/components/design-system/badge/badge'
import { Alert, AlertTitle, AlertDescription } from '@/components/design-system/alert/alert'
import { Input } from '@/components/design-system/input/input'
import { Select } from '@/components/design-system/select/select'

// Import design tokens
import { designTokens } from '@/lib/design/tokens'

// Import semantic color functions
import { getPnlColor, getStatusColor, getSemanticColor } from '@/lib/design/colors'
```

### Quick Example

```typescript
import { Button } from '@/components/design-system/button/button'
import { Badge } from '@/components/design-system/badge/badge'

export function MyComponent() {
  return (
    <div>
      <Button variant="primary" onClick={() => console.log('Clicked!')}>
        Click me
      </Button>
      <Badge variant="success">New</Badge>
    </div>
  )
}
```

---

## Color Palette

### Primary Green

The primary color palette is based on a vibrant green (#43D984), representing growth and profitability in options trading.

| Shade | Hex | Usage |
|-------|-----|-------|
| 50 | #F0FDF7 | Lightest background |
| 100 | #DCFCE9 | Hover states |
| 200 | #BBF7D6 | Borders, dividers |
| 300 | #86EFBB | Subtle emphasis |
| 400 | #62D995 | Light accent |
| **500** | **#43D984** | **Primary (default)** |
| 600 | #3A8C5D | Hover states for primary |
| 700 | #2F7148 | Active states |
| 800 | #27593A | Dark emphasis |
| 900 | #1F4730 | Darkest text/backgrounds |

### Accent Brown

A complementary brown accent for secondary actions and warm accents.

| Variant | Hex | Usage |
|---------|-----|-------|
| light | #8B5A4D | Light accent |
| **default** | **#59332A** | **Accent color** |
| dark | #3D2219 | Dark accent |

### Neutral Gray

Grayscale palette for text, borders, and backgrounds.

| Shade | Hex | Usage |
|-------|-----|-------|
| 50 | #F2F2F2 | Background |
| 100-900 | ... | Text, borders, backgrounds |

### Semantic Colors

Purpose-specific colors for consistent messaging:

- **Success**: `#43D984` (Primary Green 500) - Positive P&L, successful actions
- **Error**: `#EF4444` (Red 500) - Negative P&L, error states
- **Warning**: `#F59E0B` (Amber 500) - Warnings, cautions
- **Info**: `#3B82F6` (Blue 500) - Informational messages

---

## Design Tokens

Design tokens provide the foundational design values used throughout the application.

### Colors

```typescript
import { designTokens } from '@/lib/design/tokens'

// Access colors
const primaryColor = designTokens.colors.primary[500]  // #43D984
const successColor = designTokens.colors.semantic.success
const neutralBg = designTokens.colors.neutral[50]
```

### Spacing

```typescript
// Available spacing tokens
const spacing = {
  xs: '0.25rem',  // 4px
  sm: '0.5rem',   // 8px
  md: '1rem',     // 16px
  lg: '1.5rem',   // 24px
  xl: '2rem',     // 32px
  '2xl': '3rem',  // 48px
}

// Usage
<div className="p-4">  {/* Uses md spacing */}
```

### Border Radius

```typescript
const radius = {
  none: '0',
  sm: '0.125rem',   // 2px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  full: '9999px',   // Fully rounded
}
```

### Shadows

```typescript
const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
}
```

---

## Components

### Button

Versatile button component with multiple variants, sizes, and states.

#### Variants

- **primary**: Main action button (green background)
- **secondary**: Secondary action (accent color)
- **outline**: Button with border and transparent background
- **ghost**: Minimal button with no border
- **destructive**: Destructive actions (red)

#### Sizes

- **sm**: 32px height, small padding
- **md**: 40px height (default)
- **lg**: 48px height, large padding

#### Props

```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  children?: ReactNode
  className?: string
  // ... extends ButtonHTMLAttributes
}
```

#### Examples

```typescript
// Primary button
<Button variant="primary" onClick={handleClick}>
  Save Changes
</Button>

// Loading state
<Button variant="primary" loading>
  Saving...
</Button>

// With icons
<Button variant="outline" leftIcon={<PlusIcon />}>
  Add Trade
</Button>

// Destructive action
<Button variant="destructive" size="sm">
  Delete Position
</Button>
```

### Badge

Small status indicators and labels with multiple color variants.

#### Variants

- **default**: Gray neutral badge
- **success**: Green (positive states)
- **error**: Red (negative states)
- **warning**: Yellow (warnings)
- **info**: Blue (informational)
- **outline**: Outlined badge

#### Sizes

- **sm**: Small badge
- **md**: Medium (default)
- **lg**: Large badge

#### Props

```typescript
interface BadgeProps {
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  onRemove?: () => void  // Makes badge removable with X button
  children: ReactNode
  className?: string
}
```

#### Examples

```typescript
// Status badge
<Badge variant="success">OPEN</Badge>
<Badge variant="error">EXPIRED</Badge>

// Removable badge
<Badge variant="info" onRemove={() => console.log('Removed')}>
  Filter Tag
</Badge>

// Size variants
<Badge size="sm">Small</Badge>
<Badge size="lg">Large</Badge>
```

### Alert

Contextual feedback messages with variants for different notification types.

#### Variants

- **info**: Informational messages (blue)
- **success**: Success messages (green)
- **warning**: Warning messages (yellow)
- **error**: Error messages (red)

#### Subcomponents

- **Alert**: Container component
- **AlertTitle**: Bold title text
- **AlertDescription**: Description text

#### Props

```typescript
interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error'
  dismissible?: boolean
  onDismiss?: () => void
  children: ReactNode
  className?: string
}
```

#### Examples

```typescript
// Success alert
<Alert variant="success">
  <AlertTitle>Success</AlertTitle>
  <AlertDescription>
    Your trade has been created successfully.
  </AlertDescription>
</Alert>

// Dismissible error alert
<Alert variant="error" dismissible onDismiss={handleDismiss}>
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    Failed to save changes. Please try again.
  </AlertDescription>
</Alert>

// Simple info alert
<Alert variant="info">
  <AlertDescription>
    Market data is updated every 15 minutes.
  </AlertDescription>
</Alert>
```

### Input

Flexible form input component with validation states, prefix/suffix support, and help text.

#### Sizes

- **sm**: Small input (32px height)
- **md**: Medium input (40px height) - default
- **lg**: Large input (48px height)

#### States

- **default**: Normal state
- **error**: Error state (validation failed)
- **success**: Success state (validation passed)

#### Props

```typescript
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  size?: 'sm' | 'md' | 'lg'
  state?: 'default' | 'error' | 'success'
  prefix?: ReactNode  // Content before input (e.g., $ symbol)
  suffix?: ReactNode  // Content after input
  error?: string  // Error message displayed below input
  helpText?: string  // Help text displayed below input
  wrapperClassName?: string
  className?: string
}
```

#### Examples

```typescript
// Basic input
<Input placeholder="Enter your name" />

// Input with error state
<Input
  state="error"
  error="This field is required"
  placeholder="Email address"
/>

// Input with prefix (currency)
<Input
  type="number"
  prefix={<span className="text-neutral-500">$</span>}
  placeholder="0.00"
/>

// Input with suffix
<Input
  type="number"
  suffix={<span className="text-neutral-500">%</span>}
  placeholder="0"
/>

// Large input with success state
<Input
  size="lg"
  state="success"
  placeholder="Username"
/>

// Input with help text
<Input
  placeholder="Email address"
  helpText="We'll never share your email with anyone"
/>
```

### Select

Dropdown select component with validation states and help text.

#### Sizes

- **sm**: Small select (32px height)
- **md**: Medium select (40px height) - default
- **lg**: Large select (48px height)

#### States

- **default**: Normal state
- **error**: Error state (validation failed)
- **success**: Success state (validation passed)

#### Props

```typescript
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  size?: 'sm' | 'md' | 'lg'
  state?: 'default' | 'error' | 'success'
  error?: string  // Error message displayed below select
  helpText?: string  // Help text displayed below select
  wrapperClassName?: string
  className?: string
}
```

#### Examples

```typescript
// Basic select
<Select>
  <option value="">Choose an option</option>
  <option value="PUT">PUT</option>
  <option value="CALL">CALL</option>
</Select>

// Select with error state
<Select state="error" error="Please select a trade type">
  <option value="">Choose trade type</option>
  <option value="PUT">PUT</option>
  <option value="CALL">CALL</option>
</Select>

// Large select with success state
<Select size="lg" state="success">
  <option value="OPEN">OPEN</option>
  <option value="CLOSED">CLOSED</option>
</Select>

// Select with help text
<Select helpText="Choose the type of option trade">
  <option value="">Select trade type</option>
  <option value="PUT">PUT</option>
  <option value="CALL">CALL</option>
</Select>
```

---

## Variant System

The design system uses [class-variance-authority (CVA)](https://cva.style) to provide type-safe component variants. This ensures consistency and prevents styling errors through TypeScript inference.

### How It Works

Variants define different visual styles for components:

- **Variant**: Visual appearance (primary, secondary, outline, ghost, etc.)
- **Size**: Component dimensions (sm, md, lg)
- **State**: Validation or interaction states (default, error, success)

### Benefits

1. **Type Safety**: TypeScript ensures you only use valid variant combinations
2. **Consistency**: All components follow the same variant patterns
3. **Maintainability**: Centralized style definitions in `lib/design/variants.ts`
4. **Composability**: Combine variants for complex styling needs

### Example Usage

```typescript
import { buttonVariants } from '@/lib/design/variants'

// Using variants directly
<button className={buttonVariants({ variant: 'primary', size: 'lg' })}>
  Click me
</button>

// Combining with additional classes
import { cn } from '@/lib/utils/cn'

<button className={cn(buttonVariants({ variant: 'outline' }), 'mt-4')}>
  Custom button
</button>
```

### Available Variant Functions

- `buttonVariants`: Button styling variants
- Additional variants defined in `lib/design/variants.ts`

---

## Migration Guide

### Before and After Examples

#### Hardcoded Button (Before)

```typescript
// ❌ Old pattern - hardcoded styles
<button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
  Click me
</button>
```

#### Design System Button (After)

```typescript
// ✅ New pattern - design system component
import { Button } from '@/components/design-system/button/button'

<Button variant="primary">
  Click me
</Button>
```

#### Hardcoded Badge (Before)

```typescript
// ❌ Old pattern - inline styles and hardcoded colors
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
  OPEN
</span>
```

#### Design System Badge (After)

```typescript
// ✅ New pattern - semantic badge component
import { Badge } from '@/components/design-system/badge/badge'

<Badge variant="success">OPEN</Badge>
```

#### Hardcoded Alert (Before)

```typescript
// ❌ Old pattern - custom alert implementation
<div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
  <p className="font-bold">Error</p>
  <p className="text-sm">An error occurred.</p>
</div>
```

#### Design System Alert (After)

```typescript
// ✅ New pattern - accessible alert component
import { Alert, AlertTitle, AlertDescription } from '@/components/design-system/alert/alert'

<Alert variant="error">
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>An error occurred.</AlertDescription>
</Alert>
```

#### Hardcoded Color Logic (Before)

```typescript
// ❌ Old pattern - hardcoded P&L color logic
function getPnLColor(value: number) {
  if (value > 0) return 'text-green-600'
  if (value < 0) return 'text-red-600'
  return 'text-gray-600'
}

<span className={getPnLColor(position.pnl)}>
  {formatCurrency(position.pnl)}
</span>
```

#### Semantic Color Function (After)

```typescript
// ✅ New pattern - semantic color function
import { getPnlColor } from '@/lib/design/colors'

const colors = getPnlColor(position.pnl)

<span className={`${colors.text} font-semibold`}>
  {formatCurrency(position.pnl)}
</span>
```

### Migration Steps

1. **Identify component to migrate**: Find components using hardcoded colors or styles
2. **Import design system component**: Replace with appropriate design system component
3. **Map props**: Convert existing props to design system API
4. **Test thoroughly**: Verify functionality and visual appearance
5. **Run tests**: Ensure all tests pass after migration

### Common Patterns

#### Migrating Buttons

```typescript
// Find and replace pattern:
// Old: className="bg-{color}-{shade} ..."
// New: variant="{variant}"

// Old colors to variants:
// bg-blue-500 → variant="primary"
// bg-gray-200 → variant="secondary" or "ghost"
// border-{color} → variant="outline"
// bg-red-600 → variant="destructive"
```

#### Migrating Status Indicators

```typescript
// Old: Custom span with colored text/background
// New: Badge component with semantic variant

// Status to variant mapping:
// "OPEN", "ACTIVE" → variant="success"
// "CLOSED", "EXPIRED" → variant="default"
// "ERROR", "FAILED" → variant="error"
// "PENDING", "WARNING" → variant="warning"
```

---

## Best Practices

### Component Usage

1. **Always use design system components** instead of creating custom styled elements
2. **Use semantic variants** (success, error) rather than color names (green, red)
3. **Leverage TypeScript** - component props are fully typed
4. **Follow accessibility guidelines** - use proper ARIA attributes
5. **Test across devices** - all components are responsive

### Color Usage

1. **Use semantic color functions** (`getPnlColor`, `getStatusColor`) for dynamic colors
2. **Don't hardcode color values** - use design tokens
3. **Maintain sufficient contrast** - aim for WCAG AA (4.5:1 minimum)
4. **Test with colorblind simulation** - don't rely solely on color to convey meaning

### Performance

1. **Import only what you need** - tree-shaking will remove unused code
2. **Avoid inline styles** - use Tailwind classes or design tokens
3. **Use appropriate sizes** - don't use `lg` when `sm` suffices
4. **Minimize re-renders** - components are optimized with React.forwardRef

---

## Accessibility

All design system components are built with accessibility as a first-class concern.

### Features

- **Keyboard Navigation**: All interactive components support keyboard navigation (Tab, Enter, Space, Escape)
- **Screen Reader Support**: Proper ARIA attributes and semantic HTML
- **Focus Management**: Clear focus indicators on all interactive elements
- **Color Contrast**: WCAG AA compliant color contrast ratios (4.5:1 minimum)
- **Responsive**: Works on all screen sizes and input methods

### Testing

- Tested with NVDA and VoiceOver screen readers
- Keyboard-only navigation verified
- Color contrast verified with axe DevTools
- Mobile touch target sizes meet WCAG guidelines (44x44px minimum)

### Keyboard Shortcuts

- **Button**: Enter or Space to activate
- **Dismissible Alert**: Escape to dismiss
- **Removable Badge**: Click or Enter on X button to remove

---

## Performance

### Metrics

The design system meets or exceeds all performance targets:

- **Lighthouse Performance**: ≥ 90
- **Bundle Size Impact**: < 10% increase from baseline
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Cumulative Layout Shift**: 0

### Optimizations

- **Tree-shaking**: Only imported components are included in bundle
- **Code splitting**: Components loaded on-demand where appropriate
- **CSS optimization**: Tailwind PurgeCSS removes unused styles
- **Zero runtime CSS**: All styles compiled at build time

### Bundle Analysis

```bash
# Analyze bundle size
pnpm build
pnpm analyze
```

---

## Troubleshooting

Common issues and solutions when working with the design system.

### Component Not Rendering

**Problem**: Component doesn't appear or shows no styling.

**Solutions**:
```typescript
// ✅ Correct import path
import { Button } from '@/components/design-system/button/button'

// ❌ Wrong - imports index file
import { Button } from '@/components/design-system/button'

// ✅ Verify component is mounted
console.log('Rendering Button:', props)
return <Button {...props}>Click me</Button>
```

### TypeScript Errors with Props

**Problem**: TypeScript complains about variant props or types.

**Solutions**:
```typescript
// ✅ Use string literals for variants
<Button variant="primary" size="md">Click</Button>

// ❌ Wrong - using variables without typing
const variant = 'primary'  // Type is 'string', not specific literal
<Button variant={variant}>Click</Button>

// ✅ Correct - use type assertion or const assertion
const variant = 'primary' as const
<Button variant={variant}>Click</Button>

// ✅ Or type the variable explicitly
const variant: 'primary' | 'secondary' = 'primary'
<Button variant={variant}>Click</Button>
```

### Styles Not Applying

**Problem**: Custom className not overriding component styles.

**Solutions**:
```typescript
// ✅ Use cn() utility to merge classes properly
import { cn } from '@/lib/utils/cn'

<Button className={cn('mt-4', customClass)}>
  Click me
</Button>

// ❌ Wrong - Tailwind specificity issues
<Button className="bg-blue-500">  // Won't override variant styles
  Click me
</Button>

// ✅ Better - use variants or use !important sparingly
<Button variant="primary" className="!bg-blue-500">
  Click me
</Button>
```

### Input/Select Not Showing Error State

**Problem**: Validation errors not displaying properly.

**Solutions**:
```typescript
// ✅ Pass error prop - automatically sets state to 'error'
<Input error="This field is required" />

// ✅ Or explicitly set state
<Input state="error" />

// ✅ With form library (React Hook Form)
<Input
  {...register('email')}
  error={errors.email?.message}
/>

// ❌ Wrong - forgetting to connect error state
<Input />
{errors.email && <span>{errors.email.message}</span>}
```

### Badge or Alert Not Dismissing

**Problem**: Dismissible components don't close when clicked.

**Solutions**:
```typescript
// ✅ Provide onDismiss/onRemove handler
const [visible, setVisible] = useState(true)

{visible && (
  <Alert variant="info" dismissible onDismiss={() => setVisible(false)}>
    <AlertDescription>Info message</AlertDescription>
  </Alert>
)}

// ✅ For removable Badge
<Badge variant="success" onRemove={() => handleRemove(id)}>
  Tag
</Badge>

// ❌ Wrong - forgetting to manage visibility state
<Alert dismissible>Message</Alert>
```

### Prefix/Suffix Not Positioning Correctly

**Problem**: Input prefix or suffix overlaps with text.

**Solutions**:
```typescript
// ✅ Use ReactNode for complex prefix/suffix
<Input
  prefix={<span className="text-neutral-500 text-sm">$</span>}
  type="number"
/>

// ✅ Or use string - component handles sizing
<Input prefix="$" type="number" />

// ❌ Wrong - forgetting to account for padding
<Input className="pl-2" prefix="$" />  // Prefix will overlap
```

### Color Palette Not Matching

**Problem**: Custom colors don't match design system.

**Solutions**:
```typescript
// ✅ Use Tailwind config colors
<div className="bg-primary-500 text-white">Content</div>

// ✅ Use semantic color functions
import { getPnlColor } from '@/lib/design/colors'
const colors = getPnlColor(value)
<span className={colors.text}>{value}</span>

// ❌ Wrong - hardcoded hex values
<div style={{ backgroundColor: '#43D984' }}>Content</div>
```

### Button Loading State Not Working

**Problem**: Loading spinner doesn't appear.

**Solutions**:
```typescript
// ✅ Pass loading prop
<Button loading disabled>
  Saving...
</Button>

// Note: loading prop should also disable the button
// to prevent multiple submissions

// ✅ With async handler
const [loading, setLoading] = useState(false)

const handleSubmit = async () => {
  setLoading(true)
  try {
    await saveData()
  } finally {
    setLoading(false)
  }
}

<Button loading={loading} onClick={handleSubmit}>
  Save
</Button>
```

### Accessibility Issues

**Problem**: Screen readers not announcing component states.

**Solutions**:
```typescript
// ✅ Always provide id for Input/Select with errors
<Input
  id="email"
  error="Invalid email"
  aria-label="Email address"
/>

// ✅ Alert automatically sets role="alert"
<Alert variant="error">
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>Message here</AlertDescription>
</Alert>

// ✅ Button with icon should have accessible label
<Button aria-label="Delete item">
  <TrashIcon />
</Button>
```

### Build or Import Errors

**Problem**: Build fails or imports not resolving.

**Solutions**:
```bash
# Clear Next.js cache
rm -rf .next
pnpm dev

# Verify TypeScript is not erroring
pnpm type-check

# Check for circular dependencies
# Components should not import from each other

# ✅ Correct - each component is independent
import { Button } from '@/components/design-system/button/button'
import { Badge } from '@/components/design-system/badge/badge'

# ❌ Wrong - circular imports
# button.tsx imports from badge.tsx
# badge.tsx imports from button.tsx
```

### Performance Issues

**Problem**: Components causing slow renders or large bundle.

**Solutions**:
```typescript
// ✅ Import only what you need
import { Button } from '@/components/design-system/button/button'

// ❌ Wrong - barrel imports can prevent tree-shaking
import { Button, Badge, Alert } from '@/components/design-system'

// ✅ Use React.memo for expensive components
import { memo } from 'react'
export const ExpensiveComponent = memo(({ data }) => {
  // Component logic
})

// ✅ Analyze bundle size
// pnpm build && pnpm analyze
```

### Still Having Issues?

1. **Check the component source code**: `components/design-system/[component]/`
2. **Review test files**: `components/design-system/[component]/__tests__/`
3. **Check the variant definitions**: `lib/design/variants.ts`
4. **Verify Tailwind configuration**: `tailwind.config.ts`
5. **Check the design system page**: `/design-system` for live examples
6. **Review the README**: `lib/design/README.md` for technical details

---

## Contributing

### Adding a New Component

1. Create component directory in `components/design-system/`
2. Implement component with TypeScript and proper types
3. Add variants using class-variance-authority if needed
4. Write comprehensive tests
5. Add to component gallery (`app/design-system/page.tsx`)
6. Document in this guide

### Code Standards

- Use TypeScript strict mode
- Follow existing component patterns
- Write JSDoc comments for all public APIs
- Include usage examples in component files
- Test all variants and states
- Verify accessibility with axe DevTools

### Testing Requirements

- Unit tests for all variants and states
- Integration tests for complex interactions
- Visual regression tests for styling changes
- Accessibility tests with automated tools
- Manual testing with keyboard and screen readers

---

## Resources

### Documentation

- [Component Gallery](/design-system) - Interactive showcase
- [Design Tokens](/lib/design/tokens.ts) - Token definitions
- [Semantic Colors](/lib/design/colors.ts) - Color functions
- [Variants](/lib/design/variants.ts) - Variant system

### External References

- [Tailwind CSS](https://tailwindcss.com/docs) - Utility classes
- [class-variance-authority](https://cva.style) - Variant system
- [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/) - Accessibility guidelines
- [React](https://react.dev) - Component framework

---

## Changelog

### Version 1.0.0 (February 2026)

- Initial release with 5 core components (Button, Badge, Alert, Input, Select)
- Complete design token system with type-safe variants
- Semantic color functions for P&L and status colors
- Interactive component gallery with live examples
- Comprehensive documentation with troubleshooting guide
- Full accessibility compliance (WCAG 2.1 AA)
- Form components with validation state support

---

## Support

For questions, issues, or feature requests:

1. Check this documentation first
2. Review the [component gallery](/design-system) for examples
3. Check the [lib/design/README.md](/lib/design/README.md) for technical details
4. Create an issue in the project repository

---

**Built with ❤️ by the GreekWheel team**
