# Deprecation Guide: Legacy Utilities

This guide documents deprecated patterns in the Wheel Tracker codebase and provides migration paths to the new Design System.

## Overview

As part of **Design System Phase 6**, we're deprecating old utility patterns in favor of the new centralized design system. This improves:

- **Consistency**: Unified color and styling patterns
- **Type Safety**: Better TypeScript support with design tokens
- **Maintainability**: Clear separation of concerns
- **Developer Experience**: Comprehensive documentation and examples

## Deprecated Module

### `@/lib/utils/position-calculations`

**Status**: ⚠️ Deprecated (Phase 6)
**Reason**: Mixed concerns (calculations, colors, formatting in one file)

This module is deprecated in favor of:
- `@/lib/calculations/position` - Position calculations
- `@/lib/design/colors` - Color utilities
- `@/lib/utils/format` - Formatting utilities (to be created)

## Migration Path

### 1. Color Functions

#### `getPnLColorClass()` and `getPnLBackgroundClass()`

**Old (Deprecated):**
```typescript
import { getPnLColorClass, getPnLBackgroundClass } from '@/lib/utils/position-calculations'

const textColor = getPnLColorClass(pnl)
const bgColor = getPnLBackgroundClass(pnl)
```

**New (Recommended):**
```typescript
import { getPnlColor } from '@/lib/design/colors'

const colors = getPnlColor(pnl)
const textColor = colors.text
const bgColor = colors.bg
const borderColor = colors.border  // Bonus: border color included!
```

**Benefits:**
- Single function call returns all color variants
- Consistent with other design system color functions
- Better type safety with `ColorVariant` type

### 2. Position Calculations

#### `calculateUnrealizedPnL()` (old signature)

**Old (Deprecated):**
```typescript
import { calculateUnrealizedPnL } from '@/lib/utils/position-calculations'

const pnl = calculateUnrealizedPnL(currentValue, totalCost)
```

**New (Recommended):**
```typescript
import { calculateUnrealizedPnL } from '@/lib/calculations/position'

const result = calculateUnrealizedPnL(position, currentPrice)
// Returns: { unrealizedPnL, unrealizedPnLPercent, currentValue }
```

**Benefits:**
- Returns both amount and percentage in one call
- Accepts position object for better type safety
- Clearer calculation logic

#### `calculateUnrealizedPnLPercentage()`

**Old (Deprecated):**
```typescript
import { calculateUnrealizedPnLPercentage } from '@/lib/utils/position-calculations'

const percent = calculateUnrealizedPnLPercentage(currentValue, totalCost)
```

**New (Recommended):**
```typescript
import { calculateUnrealizedPnL } from '@/lib/calculations/position'

const result = calculateUnrealizedPnL(position, currentPrice)
const percent = result.unrealizedPnLPercent
```

**Benefits:**
- No need for separate function calls
- Consistent data structure

### 3. Simple Utilities

#### `calculateCurrentPrice()`

**Old (Deprecated):**
```typescript
import { calculateCurrentPrice } from '@/lib/utils/position-calculations'

const price = calculateCurrentPrice(currentValue, shares)
```

**New (Recommended):**
```typescript
// Just calculate inline - it's simple enough!
const price = shares > 0 ? currentValue / shares : 0
```

**Benefits:**
- Reduces unnecessary abstraction
- Clearer at call site

#### `calculateTotalCoveredCallPremium()`

**Old (Deprecated):**
```typescript
import { calculateTotalCoveredCallPremium } from '@/lib/utils/position-calculations'

const total = calculateTotalCoveredCallPremium(coveredCalls)
```

**New (Recommended):**
```typescript
// Use Array.reduce() directly
const total = coveredCalls.reduce((sum, call) => sum + call.premium, 0)
```

**Benefits:**
- Standard JavaScript pattern
- More flexible (easy to add conditions)

#### `calculateDaysHeld()`

**Old (Deprecated):**
```typescript
import { calculateDaysHeld } from '@/lib/utils/position-calculations'

const days = calculateDaysHeld(acquiredDate, closedDate)
```

**New (Option 1 - Inline):**
```typescript
const endDate = closedDate ?? new Date()
const days = Math.ceil(Math.abs(endDate.getTime() - acquiredDate.getTime()) / (1000 * 60 * 60 * 24))
```

**New (Option 2 - Shared Date Utils):**
```typescript
// Create lib/utils/date.ts for shared date utilities
import { calculateDaysBetween } from '@/lib/utils/date'

const days = calculateDaysBetween(acquiredDate, closedDate ?? new Date())
```

**Benefits:**
- Better code organization
- Reusable across different contexts

### 4. Formatting Functions

#### `formatCurrency()` and `formatPercentage()`

**Old (Deprecated):**
```typescript
import { formatCurrency, formatPercentage } from '@/lib/utils/position-calculations'

const formattedAmount = formatCurrency(amount)
const formattedPercent = formatPercentage(percent)
```

**New (Recommended):**
```typescript
// Create lib/utils/format.ts
import { formatCurrency, formatPercentage } from '@/lib/utils/format'

const formattedAmount = formatCurrency(amount)
const formattedPercent = formatPercentage(percent)
```

**Benefits:**
- Dedicated module for formatting utilities
- Better separation of concerns
- Easy to add more formatters

**Example `lib/utils/format.ts`:**
```typescript
/**
 * Formatting Utilities
 */

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPercentage(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}
```

## Tools & Scripts

### Check for Deprecated Usage

```bash
# Run migration check
pnpm migrate:check

# Run with detailed migration instructions
pnpm migrate:check:fix
```

### ESLint Warnings

The ESLint configuration now warns when you import from deprecated modules:

```typescript
// ⚠️ ESLint will warn:
import { getPnLColorClass } from '@/lib/utils/position-calculations'
// Warning: This module contains deprecated utilities...
```

### Runtime Warnings (Development Only)

When you use deprecated functions in development, you'll see console warnings:

```
⚠️ calculateUnrealizedPnL from @/lib/utils/position-calculations is deprecated.
   Use calculateUnrealizedPnL from @/lib/calculations/position instead.
```

## Migration Checklist

- [ ] Identify all deprecated imports in your files
- [ ] Update color utilities to use `@/lib/design/colors`
- [ ] Update calculation functions to use `@/lib/calculations/position`
- [ ] Create `@/lib/utils/format` for formatting utilities
- [ ] Replace simple utilities with inline calculations
- [ ] Test your changes thoroughly
- [ ] Run `pnpm migrate:check` to verify no deprecated usage remains
- [ ] Update tests if needed

## Timeline

**Phase 6 (Current)**:
- ✅ Deprecation warnings added
- ✅ Migration tools created
- ⏳ Components being migrated

**Phase 7 (Future)**:
- Remove deprecated module completely
- Update all components to use new patterns
- Remove migration scripts

## Need Help?

- Review `lib/design/README.md` for Design System documentation
- Check `docs/DESIGN_SYSTEM.md` for comprehensive guide
- Run `pnpm migrate:check --fix` for migration hints
- Ask the team for code review on migration PRs

## Related Documentation

- [Design System Documentation](../lib/design/README.md)
- [Design System Overview](./DESIGN_SYSTEM.md)
- [Color Utilities API](../lib/design/colors.ts)
- [Position Calculations API](../lib/calculations/position.ts)
