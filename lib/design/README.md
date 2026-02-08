# Design System

This directory contains the Wheel Tracker design system foundation, providing consistent styling and component variants across the application.

## Overview

The design system is organized into two main modules:

1. **Design Tokens** (`tokens.ts`) - Foundational design values (colors, spacing, shadows, etc.)
2. **Component Variants** (`variants.ts`) - Type-safe component styling using class-variance-authority

## Design Tokens

Design tokens provide the foundational design values used throughout the application.

### Usage

```typescript
import { designTokens, colorTokens, spacingTokens } from '@/lib/design/tokens'

// Access specific tokens
const primaryColor = designTokens.colors.primary[500]  // #43D984
const cardPadding = designTokens.spacing.md            // 1rem
const buttonRadius = designTokens.radius.md            // 0.5rem
const cardShadow = designTokens.shadows.sm             // Shadow preset
```

### Available Token Categories

- **Colors**: `primary`, `accent`, `neutral`, `semantic` (success, error, warning, info)
- **Spacing**: `xs`, `sm`, `md`, `lg`, `xl`, `2xl`
- **Border Radius**: `none`, `sm`, `md`, `lg`, `full`
- **Shadows**: `sm`, `md`, `lg`, `xl`

## Component Variants

Component variants provide type-safe, composable styling for UI components using class-variance-authority (CVA).

### Core Concept

Variants allow you to define different visual styles for components and compose them together with full TypeScript support.

```typescript
import { buttonVariants } from '@/lib/design/variants'

// Get className string for a component
const className = buttonVariants({
  variant: 'solid',
  size: 'md',
  color: 'primary'
})
// Returns: "inline-flex items-center ... bg-green-600 text-white ..."
```

### Available Component Variants

#### Button Variants

Provides consistent button styling with multiple visual variants, sizes, and colors.

**Variants**: `solid` (default), `outline`, `ghost`, `link`
**Sizes**: `sm`, `md` (default), `lg`
**Colors**: `primary`, `accent`, `neutral`, `success`, `error`

```tsx
import { buttonVariants } from '@/lib/design/variants'

// Default button (solid, medium, primary)
<button className={buttonVariants()}>
  Click me
</button>

// Large outline accent button
<button className={buttonVariants({ variant: 'outline', size: 'lg', color: 'accent' })}>
  Save Changes
</button>

// Ghost error button
<button className={buttonVariants({ variant: 'ghost', color: 'error' })}>
  Delete
</button>

// Link-style button
<button className={buttonVariants({ variant: 'link' })}>
  Learn More
</button>
```

#### Card Variants

Provides consistent card container styling with different visual treatments and padding options.

**Variants**: `default` (default), `elevated`, `outlined`, `ghost`
**Padding**: `sm`, `md` (default), `lg`, `xl`

```tsx
import { cardVariants } from '@/lib/design/variants'

// Default card with medium padding
<div className={cardVariants()}>
  Card content
</div>

// Elevated card with large padding
<div className={cardVariants({ variant: 'elevated', padding: 'lg' })}>
  Important content with prominent shadow
</div>

// Outlined card with extra large padding
<div className={cardVariants({ variant: 'outlined', padding: 'xl' })}>
  Well-spaced content
</div>

// Minimal ghost card
<div className={cardVariants({ variant: 'ghost', padding: 'sm' })}>
  Subtle content container
</div>
```

#### Badge Variants

Small labeled UI elements for status indicators, categories, or counts.

**Variants**: `solid` (default), `subtle`, `outline`
**Sizes**: `sm`, `md` (default), `lg`
**Colors**: `primary`, `accent`, `neutral`, `success`, `error`, `warning`, `info`

```tsx
import { badgeVariants } from '@/lib/design/variants'

// Solid success badge
<span className={badgeVariants({ variant: 'solid', color: 'success' })}>
  Active
</span>

// Subtle warning badge
<span className={badgeVariants({ variant: 'subtle', color: 'warning' })}>
  Pending
</span>

// Outline info badge with small size
<span className={badgeVariants({ variant: 'outline', color: 'info', size: 'sm' })}>
  New
</span>

// Large error badge
<span className={badgeVariants({ color: 'error', size: 'lg' })}>
  Critical
</span>
```

#### Input Variants

Form input styling with different sizes and validation states.

**Sizes**: `sm`, `md` (default), `lg`
**States**: `default` (default), `error`, `success`

```tsx
import { inputVariants } from '@/lib/design/variants'

// Default input
<input
  type="text"
  className={inputVariants()}
  placeholder="Enter text"
/>

// Large input with error state
<input
  type="email"
  className={inputVariants({ size: 'lg', state: 'error' })}
  placeholder="Email address"
/>

// Small input with success state
<input
  type="text"
  className={inputVariants({ size: 'sm', state: 'success' })}
  placeholder="Username"
/>
```

#### Text Variants

Typography styling for headings, body text, and labels.

**Variants**: `body` (default), `label`, `caption`, `h1`, `h2`, `h3`, `h4`
**Weights**: `normal` (default), `medium`, `semibold`, `bold`
**Colors**: `default`, `muted`, `primary`, `accent`, `error`, `success`

```tsx
import { textVariants } from '@/lib/design/variants'

// Main heading
<h1 className={textVariants({ variant: 'h1', weight: 'bold' })}>
  Welcome to Wheel Tracker
</h1>

// Section heading
<h2 className={textVariants({ variant: 'h2', weight: 'semibold', color: 'primary' })}>
  Your Portfolio
</h2>

// Body text with muted color
<p className={textVariants({ variant: 'body', color: 'muted' })}>
  Track your options trading with ease.
</p>

// Form label
<label className={textVariants({ variant: 'label', weight: 'medium' })}>
  Email Address
</label>

// Small caption text
<span className={textVariants({ variant: 'caption', color: 'muted' })}>
  Last updated 5 minutes ago
</span>
```

#### Alert Variants

Alert boxes for displaying important messages to users.

**Variants**: `info` (default), `success`, `warning`, `error`

```tsx
import { alertVariants } from '@/lib/design/variants'

// Info alert
<div className={alertVariants({ variant: 'info' })}>
  This is an informational message.
</div>

// Success alert
<div className={alertVariants({ variant: 'success' })}>
  Your trade was created successfully!
</div>

// Warning alert
<div className={alertVariants({ variant: 'warning' })}>
  This action cannot be undone.
</div>

// Error alert
<div className={alertVariants({ variant: 'error' })}>
  Failed to save trade. Please try again.
</div>
```

## Advanced Usage

### Using TypeScript Types

All variant functions export TypeScript types for props:

```typescript
import {
  type ButtonVariantProps,
  type CardVariantProps,
  type BadgeVariantProps,
  buttonVariants
} from '@/lib/design/variants'

// Create a typed button component
interface MyButtonProps extends ButtonVariantProps {
  children: React.ReactNode
  onClick?: () => void
}

function MyButton({ variant, size, color, children, onClick }: MyButtonProps) {
  return (
    <button
      className={buttonVariants({ variant, size, color })}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

// Usage with full type safety
<MyButton variant="outline" size="lg" color="primary">
  Click me
</MyButton>
```

### Combining with Custom Classes

Use the `cn` utility to merge variant classes with custom classes:

```tsx
import { buttonVariants, cn } from '@/lib/design/variants'

<button
  className={cn(
    buttonVariants({ variant: 'solid', color: 'primary' }),
    'w-full',           // Custom width
    'mt-4',             // Custom margin
    isLoading && 'opacity-50 cursor-wait'  // Conditional classes
  )}
>
  Submit
</button>
```

### Creating Reusable Components

```tsx
import { buttonVariants, type ButtonVariantProps } from '@/lib/design/variants'
import { forwardRef } from 'react'

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariantProps {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, color, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, color }), className)}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'

export { Button }

// Usage
<Button variant="outline" size="lg" color="accent" onClick={handleClick}>
  Click me
</Button>
```

## Best Practices

### 1. Always Use Variants for Consistency

Instead of writing custom Tailwind classes for common components, use the variant system:

```tsx
// ❌ Don't do this
<button className="bg-green-600 text-white px-4 py-2 rounded-md">
  Click me
</button>

// ✅ Do this
<button className={buttonVariants()}>
  Click me
</button>
```

### 2. Leverage TypeScript

TypeScript will autocomplete available options and catch errors:

```typescript
// TypeScript will autocomplete 'solid', 'outline', 'ghost', 'link'
buttonVariants({ variant: '...' })

// TypeScript will catch typos
buttonVariants({ variant: 'sollid' })  // ❌ Error
```

### 3. Use Semantic Colors

Choose colors based on meaning, not just aesthetics:

```tsx
// ✅ Good - semantic color usage
<Badge color="success">Active</Badge>
<Badge color="error">Failed</Badge>
<Badge color="warning">Pending</Badge>

// ❌ Avoid - arbitrary color choices
<Badge color="primary">Failed</Badge>  // Confusing
```

### 4. Compose Variants

Build complex components by composing simple variants:

```tsx
function StatusCard({ status, children }) {
  const badgeColor = status === 'active' ? 'success' : 'error'

  return (
    <div className={cardVariants({ variant: 'elevated', padding: 'lg' })}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={textVariants({ variant: 'h3', weight: 'semibold' })}>
          Status
        </h3>
        <span className={badgeVariants({ color: badgeColor })}>
          {status}
        </span>
      </div>
      <p className={textVariants({ color: 'muted' })}>
        {children}
      </p>
    </div>
  )
}
```

## Testing

All variants are thoroughly tested. Run tests with:

```bash
pnpm test lib/design/__tests__/variants.test.ts
```

## Architecture

### Why class-variance-authority?

CVA provides:
- **Type Safety**: Full TypeScript inference for variant options
- **Performance**: Optimal className generation with caching
- **Composability**: Easy to combine variants with default values
- **DX**: Excellent developer experience with autocomplete

### File Structure

```
lib/design/
├── tokens.ts           # Design token definitions
├── variants.ts         # Component variant configurations
├── README.md           # This file
└── __tests__/
    ├── tokens.test.ts     # Token tests
    └── variants.test.ts   # Variant tests
```

## Migration Guide

### From Custom Tailwind Classes

If you have existing components with custom Tailwind classes:

1. Identify the component pattern (button, card, badge, etc.)
2. Find the matching variant function
3. Map your custom classes to variant options
4. Replace custom classes with variant function

```tsx
// Before
<button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-base">
  Submit
</button>

// After
<button className={buttonVariants({ variant: 'solid', size: 'md', color: 'primary' })}>
  Submit
</button>
```

### Adding New Variants

To add a new variant function:

1. Add the variant configuration to `variants.ts`
2. Export TypeScript types using `VariantProps`
3. Add comprehensive tests to `variants.test.ts`
4. Document usage in this README

## Related Documentation

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [class-variance-authority](https://cva.style/docs)
- [clsx](https://github.com/lukeed/clsx)

## Support

For questions or issues with the design system, contact the frontend team or open an issue in the repository.
