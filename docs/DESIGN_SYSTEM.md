# Wheel Tracker Design System

**Version:** 1.0.0
**Last Updated:** February 2026
**Status:** Production Ready

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Color Palette](#color-palette)
4. [Design Tokens](#design-tokens)
5. [Components](#components)
6. [Migration Guide](#migration-guide)
7. [Best Practices](#best-practices)
8. [Accessibility](#accessibility)
9. [Performance](#performance)
10. [Contributing](#contributing)

---

## Introduction

The Wheel Tracker Design System is a comprehensive, production-ready component library and design token system built for consistency, accessibility, and developer experience. It replaces hardcoded styles across 20+ components with a centralized, reusable system.

### Key Benefits

- **Consistency**: Unified visual language across the entire application
- **Accessibility**: WCAG 2.1 AA compliant components with keyboard navigation and screen reader support
- **Type Safety**: Full TypeScript support with strict typing
- **Performance**: Optimized bundle size with tree-shaking support
- **Developer Experience**: Well-documented, easy-to-use API with helpful examples

### What's Included

- **3 Core Components**: Button, Badge, Alert
- **Design Tokens**: Colors, spacing, shadows, border radius
- **Semantic Color System**: Context-aware color utilities for P&L, status, and UI states
- **Component Variants**: Type-safe variant system using class-variance-authority
- **Interactive Gallery**: Live component showcase at `/design-system`

---

## Getting Started

### Installation

The design system is already integrated into the Wheel Tracker application. To use components in your code:

```typescript
// Import components
import { Button } from '@/components/design-system/button/button'
import { Badge } from '@/components/design-system/badge/badge'
import { Alert, AlertTitle, AlertDescription } from '@/components/design-system/alert/alert'

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

- Initial release with 3 core components (Button, Badge, Alert)
- Complete design token system
- Semantic color functions
- Interactive component gallery
- Comprehensive documentation
- Full accessibility compliance (WCAG 2.1 AA)

---

## Support

For questions, issues, or feature requests:

1. Check this documentation first
2. Review the [component gallery](/design-system) for examples
3. Check the [lib/design/README.md](/lib/design/README.md) for technical details
4. Create an issue in the project repository

---

**Built with ❤️ by the Wheel Tracker team**
