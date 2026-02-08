# Design System

Centralized design tokens and utilities for consistent styling across the Wheel Tracker application.

## Modules

### `tokens.ts`

Design token definitions including colors, spacing, border radius, and shadows.

```typescript
import { designTokens } from '@/lib/design/tokens'

const primaryColor = designTokens.colors.primary[500]
const cardPadding = designTokens.spacing.md
const buttonRadius = designTokens.radius.md
const cardShadow = designTokens.shadows.sm
```

### `colors.ts`

Semantic color utility functions that return Tailwind CSS class names based on application states.

#### Basic Usage

```typescript
import { getPnlColor, getStatusColor, getSemanticColor } from '@/lib/design/colors'

// P&L colors
const pnlColors = getPnlColor(125.50)
// Returns: { text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' }

// Status colors
const statusColors = getStatusColor('OPEN')
// Returns: { text: 'text-green-800', bg: 'bg-green-100', border: 'border-green-200' }

// Semantic colors
const warningColors = getSemanticColor('warning')
// Returns: { text: 'text-yellow-800', bg: 'bg-yellow-50', border: 'border-yellow-200' }
```

#### Available Functions

##### `getPnlColor(value: number): ColorVariant`

Returns color classes for profit/loss values:
- Positive values → Green
- Negative values → Red
- Zero → Gray

```typescript
const colors = getPnlColor(-50.25)
// { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' }
```

##### `getStatusColor(status: TradeStatus | PositionStatus): ColorVariant`

Returns color classes for trade and position statuses:
- `OPEN` → Green
- `ASSIGNED` → Purple
- `EXPIRED` → Yellow
- `CLOSED` → Gray

```typescript
const colors = getStatusColor('ASSIGNED')
// { text: 'text-purple-800', bg: 'bg-purple-100', border: 'border-purple-200' }
```

##### `getPositionColor(type: PositionType, pnl?: number | null): ColorVariant`

Returns color classes for positions based on type and P&L:

```typescript
const colors = getPositionColor('STOCK', 150.50)
// Returns P&L-based colors (green for positive)
```

##### `getSemanticColor(state: 'success' | 'error' | 'warning' | 'info'): ColorVariant`

Returns color classes for contextual UI states:

```typescript
const errorColors = getSemanticColor('error')
// { text: 'text-red-800', bg: 'bg-red-50', border: 'border-red-200' }
```

#### Backward Compatibility

Legacy helper functions for existing code:

```typescript
import { getPnLColorClass, getPnLBackgroundClass } from '@/lib/design/colors'

const textColor = getPnLColorClass(100) // 'text-green-600'
const bgColor = getPnLBackgroundClass(100) // 'bg-green-50'
```

#### Accessibility Helpers

WCAG contrast checking utilities:

```typescript
import { getContrastRatio, meetsContrastAA, meetsContrastAAA } from '@/lib/design/colors'

// Calculate contrast ratio
const ratio = getContrastRatio('#000000', '#FFFFFF')
// Returns: 21 (maximum contrast)

// Check WCAG AA compliance (4.5:1 for normal text, 3:1 for large text)
const passesAA = meetsContrastAA('#000000', '#FFFFFF', false)
// Returns: true

// Check WCAG AAA compliance (7:1 for normal text, 4.5:1 for large text)
const passesAAA = meetsContrastAAA('#000000', '#FFFFFF', false)
// Returns: true
```

## Usage in Components

### Server Components

```typescript
import { getPnlColor } from '@/lib/design/colors'

export default function PositionCard({ pnl }: { pnl: number }) {
  const colors = getPnlColor(pnl)

  return (
    <div className={`${colors.bg} ${colors.border} border-2 rounded-lg p-4`}>
      <span className={colors.text}>{formatCurrency(pnl)}</span>
    </div>
  )
}
```

### Client Components

```typescript
'use client'

import { getStatusColor } from '@/lib/design/colors'
import { useState } from 'react'

export function StatusBadge({ status }: { status: TradeStatus }) {
  const colors = getStatusColor(status)

  return (
    <span className={`${colors.bg} ${colors.text} px-2.5 py-0.5 rounded-full text-xs font-medium`}>
      {status}
    </span>
  )
}
```

## Color Variant Type

All color functions return a `ColorVariant` object:

```typescript
type ColorVariant = {
  text: string    // Tailwind text color class (e.g., 'text-green-600')
  bg: string      // Tailwind background color class (e.g., 'bg-green-50')
  border: string  // Tailwind border color class (e.g., 'border-green-200')
}
```

## Design Principles

1. **Semantic over literal** - Use semantic functions (`getPnlColor`) instead of hardcoding colors
2. **Consistent color scales** - All colors follow the same 50-900 scale
3. **Accessibility first** - Test contrast ratios with provided utilities
4. **Type safety** - All functions are fully typed with TypeScript
5. **Tailwind integration** - Returns Tailwind class names for easy usage

## Testing

Comprehensive unit tests ensure color functions work correctly:

```bash
# Run color function tests
pnpm test lib/design/__tests__/colors.test.ts

# Run all design system tests
pnpm test lib/design/
```

## Future Enhancements

- [ ] Add dark mode support
- [ ] Expand position type colors beyond STOCK
- [ ] Add gradient utilities for charts
- [ ] Theme customization API
- [ ] Color palette generation utilities
