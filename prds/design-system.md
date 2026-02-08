# Design System Implementation for Wheel Tracker

**dispatched_by: mayor**

## Description

Implement a comprehensive design system for the Wheel Tracker application to replace hardcoded colors and styles across 20+ React components with a centralized, reusable component library and design token system. The design system will introduce a new green-based color palette, establish component variants, and provide a migration path for all existing components.

**Current State:**
- Next.js 15 + React 19 + TypeScript + Tailwind CSS 3.4
- 20+ components with hardcoded colors (blue, green, red, gray)
- No design tokens or component variant system
- 409+ passing tests that must continue to work
- Well-structured codebase with clear separation of concerns

**Target State:**
- Centralized design system with reusable components
- New green-based color palette consistently applied
- Type-safe component variants using class-variance-authority
- Comprehensive documentation and interactive component gallery
- 100% test coverage maintained
- Zero visual regressions
- Improved bundle size and performance

## New Color Palette

```typescript
Primary Green: #43D984 (hsla(146, 66%, 55%))
Dark Green: #3A8C5D (hsla(146, 41%, 38%))
Light Green: #62D995 (hsla(146, 60%, 61%))
Brown Accent: #59332A (hsla(11, 36%, 25%))
Light Gray: #F2F2F2 (hsla(0, 0%, 95%))
```

## Tasks

### Phase 1: Foundation & Configuration (Week 1)

#### Task 1.1: Install Dependencies
- [x] Install `clsx@^2.1.0` for conditional class merging
- [x] Install `class-variance-authority@^0.7.0` for variant management
- [x] Update package.json and run `npm install`
- [x] Verify no conflicts with existing dependencies

**Acceptance Criteria:**
- Both packages installed successfully
- No dependency conflicts
- Build completes without errors

#### Task 1.2: Extend Tailwind Configuration
- [x] Update `tailwind.config.ts` with new color palette
- [x] Create full color scale (50-900) for primary green
- [x] Add semantic color mappings (success, error, warning, info)
- [x] Preserve existing colors for gradual migration
- [x] Add custom spacing and typography tokens if needed

**File:** `tailwind.config.ts`

**Color Configuration:**
```typescript
colors: {
  primary: {
    50: '#F0FDF7',
    100: '#DCFCE9',
    200: '#BBF7D6',
    300: '#86EFBB',
    400: '#62D995',
    500: '#43D984',  // DEFAULT
    600: '#3A8C5D',
    700: '#2F7148',
    800: '#27593A',
    900: '#1F4730',
  },
  accent: {
    brown: '#59332A',
    'brown-light': '#8B5A4D',
    'brown-dark': '#3D2219',
  },
  neutral: {
    50: '#F2F2F2',
    100: '#E5E5E5',
    200: '#CCCCCC',
    300: '#B3B3B3',
    400: '#999999',
    500: '#808080',
    600: '#666666',
    700: '#4D4D4D',
    800: '#333333',
    900: '#1A1A1A',
  },
  success: '#43D984',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
}
```

**Acceptance Criteria:**
- Tailwind config includes complete color palette
- Build completes without errors
- New colors available in Tailwind utilities
- Existing colors preserved for backwards compatibility

#### Task 1.3: Create Design Token Definitions
- [x] Create `lib/design/` directory
- [x] Create `lib/design/tokens.ts` with color tokens
- [x] Define spacing, typography, shadow, and radius tokens
- [x] Export typed token objects for TypeScript support
- [x] Add JSDoc comments for each token category

**File:** `lib/design/tokens.ts`

**Structure:**
```typescript
export const colorTokens = {
  primary: {
    default: '#43D984',
    dark: '#3A8C5D',
    light: '#62D995',
  },
  // ... additional tokens
}

export const spacingTokens = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
}

export const radiusTokens = {
  none: '0',
  sm: '0.125rem',
  md: '0.375rem',
  lg: '0.5rem',
  full: '9999px',
}

export const shadowTokens = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
}
```

**Acceptance Criteria:**
- All token categories defined with TypeScript types
- Tokens exported and importable from other modules
- JSDoc documentation provided
- No runtime errors when importing tokens

#### Task 1.4: Set Up CSS Custom Properties
- [x] Create `app/design-system.css`
- [x] Define CSS custom properties for runtime theming
- [x] Import in root layout (`app/layout.tsx`)
- [x] Test custom property fallbacks

**File:** `app/design-system.css`

**Example:**
```css
:root {
  --color-primary: 146 66% 55%;
  --color-primary-dark: 146 41% 38%;
  --color-primary-light: 146 60% 61%;
  --color-accent-brown: 11 36% 25%;
  --color-neutral-50: 0 0% 95%;

  --radius-sm: 0.125rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;

  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}
```

**Acceptance Criteria:**
- CSS custom properties defined for all design tokens
- Custom properties accessible via Tailwind utilities
- No FOUC (flash of unstyled content) on page load
- Fallback values defined for all properties

---

### Phase 2: Component Variant System (Week 1-2)

#### Task 2.1: Create Variant Utility System
- [x] Create `lib/design/variants.ts`
- [x] Set up base variant configuration using class-variance-authority
- [x] Create variant helper functions
- [x] Add TypeScript types for variant props
- [x] Document variant API with examples

**File:** `lib/design/variants.ts`

**Example:**
```typescript
import { cva, type VariantProps } from 'class-variance-authority'

export const buttonVariants = cva(
  // base styles
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary-500 text-white hover:bg-primary-600',
        secondary: 'bg-neutral-200 text-neutral-900 hover:bg-neutral-300',
        outline: 'border-2 border-primary-500 text-primary-500 hover:bg-primary-50',
        ghost: 'hover:bg-neutral-100 text-neutral-900',
        destructive: 'bg-error text-white hover:bg-red-600',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export type ButtonVariantProps = VariantProps<typeof buttonVariants>
```

**Acceptance Criteria:**
- Variant system configured and typed
- Helper functions exported
- TypeScript types inferred correctly
- Documentation with usage examples

#### Task 2.2: Create Semantic Color Functions
- [x] Create `lib/design/colors.ts`
- [x] Implement color utility functions for position states
- [x] Replace hardcoded color logic from `lib/utils/position-calculations.ts`
- [x] Add color accessibility helpers (contrast checking)
- [x] Write unit tests for color functions

**File:** `lib/design/colors.ts`

**Structure:**
```typescript
export type PositionType = 'long' | 'short'
export type PositionStatus = 'open' | 'closed' | 'pending'

export function getPositionColor(type: PositionType, pnl?: number): string {
  if (type === 'long') {
    return pnl && pnl >= 0 ? 'primary-500' : 'error'
  }
  return pnl && pnl >= 0 ? 'primary-500' : 'error'
}

export function getStatusColor(status: PositionStatus): string {
  switch (status) {
    case 'open': return 'primary-500'
    case 'closed': return 'neutral-500'
    case 'pending': return 'warning'
    default: return 'neutral-400'
  }
}

export function getPnlColor(value: number): string {
  if (value > 0) return 'success'
  if (value < 0) return 'error'
  return 'neutral-600'
}
```

**Acceptance Criteria:**
- All color logic centralized in semantic functions
- Functions return Tailwind color class names
- Unit tests cover all color scenarios
- TypeScript types ensure type safety

#### Task 2.3: Update Utils for Variant Support
- [x] Update `lib/utils.ts` with enhanced `cn()` function
- [x] Add variant composition helpers
- [x] Ensure compatibility with existing `cn()` usage
- [x] Add JSDoc documentation
- [x] Test with existing components

**File:** `lib/utils.ts`

**Updated cn() function:**
```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Acceptance Criteria:**
- `cn()` function supports variant classes
- No breaking changes to existing usage
- Proper class merging and deduplication
- All existing tests pass

---

### Phase 3: Core Component Library (Week 2-3)

#### Task 3.1: Create Component Directory Structure
- [x] Create `components/design-system/` directory
- [x] Set up component subdirectories (button, card, badge, alert, input, select)
- [x] Create index files for barrel exports
- [x] Set up testing structure

**Directory Structure:**
```
components/design-system/
├── button/
│   ├── button.tsx
│   ├── button.test.tsx
│   └── index.ts
├── card/
│   ├── card.tsx
│   ├── card.test.tsx
│   └── index.ts
├── badge/
│   ├── badge.tsx
│   ├── badge.test.tsx
│   └── index.ts
├── alert/
│   ├── alert.tsx
│   ├── alert.test.tsx
│   └── index.ts
├── input/
│   ├── input.tsx
│   ├── input.test.tsx
│   └── index.ts
├── select/
│   ├── select.tsx
│   ├── select.test.tsx
│   └── index.ts
└── index.ts
```

**Acceptance Criteria:**
- Directory structure created
- Index files set up for exports
- No build errors

#### Task 3.2: Implement Button Component
- [x] Create `components/design-system/button/button.tsx`
- [x] Implement 5 variants (primary, secondary, outline, ghost, destructive)
- [x] Implement 3 sizes (sm, md, lg)
- [x] Add loading state with spinner
- [x] Add disabled state
- [x] Create comprehensive tests
- [x] Add TypeScript types and JSDoc

**Example Implementation:**
```typescript
import React from 'react'
import { buttonVariants, type ButtonVariantProps } from '@/lib/design/variants'
import { cn } from '@/lib/utils'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariantProps {
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Spinner className="mr-2" size="sm" />}
        {leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    )
  }
)

Button.displayName = 'Button'
```

**Acceptance Criteria:**
- All variants render correctly
- Loading and disabled states work
- Tests cover all variants and states
- Accessibility attributes present (aria-disabled, etc.)
- TypeScript types are correct

#### Task 3.3: Implement Card Component
- [x] Create `components/design-system/card/card.tsx`
- [x] Implement Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- [x] Add variants (default, bordered, elevated)
- [x] Support clickable cards with hover states
- [x] Create comprehensive tests
- [x] Add TypeScript types and JSDoc

**Example Structure:**
```typescript
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated'
  clickable?: boolean
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', clickable, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          cardVariants({ variant }),
          clickable && 'cursor-pointer hover:shadow-lg transition-shadow',
          className
        )}
        {...props}
      />
    )
  }
)

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  )
)

// ... CardTitle, CardDescription, CardContent, CardFooter
```

**Acceptance Criteria:**
- All card subcomponents work together
- Variants render correctly
- Clickable cards have proper hover states
- Tests cover all compositions
- Accessibility structure correct (semantic HTML)

#### Task 3.4: Implement Badge Component
- [x] Create `components/design-system/badge/badge.tsx`
- [x] Implement variants (default, success, error, warning, info, outline)
- [x] Implement sizes (sm, md, lg)
- [x] Support removable badges with close button
- [x] Create comprehensive tests
- [x] Add TypeScript types and JSDoc

**Acceptance Criteria:**
- All variants render with correct colors
- Close button works when badge is removable
- Tests cover all variants
- TypeScript types are correct

#### Task 3.5: Implement Alert Component
- [x] Create `components/design-system/alert/alert.tsx`
- [x] Implement Alert, AlertTitle, AlertDescription
- [x] Add variants (info, success, warning, error)
- [x] Support dismissible alerts
- [x] Add icons for each variant
- [x] Create comprehensive tests
- [x] Add TypeScript types and JSDoc

**Acceptance Criteria:**
- All variants render with correct styling and icons
- Dismissible alerts can be closed
- Tests cover all variants
- Accessibility attributes present (role="alert", aria-live)

#### Task 3.6: Implement Input Components
- [x] Create `components/design-system/input/input.tsx`
- [x] Implement Input, InputGroup, InputLabel, InputError
- [x] Add variants (default, error, success)
- [x] Support prefix and suffix elements
- [x] Add disabled and readonly states
- [x] Create comprehensive tests
- [x] Add TypeScript types and JSDoc

**Example:**
```typescript
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  success?: boolean
  leftElement?: React.ReactNode
  rightElement?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, success, leftElement, rightElement, ...props }, ref) => {
    return (
      <div className="relative">
        {leftElement && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2">{leftElement}</div>
        )}
        <input
          ref={ref}
          className={cn(
            inputVariants({ error, success }),
            leftElement && 'pl-10',
            rightElement && 'pr-10',
            className
          )}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightElement}</div>
        )}
      </div>
    )
  }
)
```

**Acceptance Criteria:**
- Input variants render correctly
- Prefix/suffix elements position correctly
- Error and success states work
- Tests cover all states
- Form integration works correctly

#### Task 3.7: Implement Select Component
- [x] Create `components/design-system/select/select.tsx`
- [x] Implement Select with custom dropdown
- [x] Add variants matching Input component
- [x] Support multi-select mode
- [x] Add search/filter functionality
- [x] Create comprehensive tests
- [x] Add TypeScript types and JSDoc

**Acceptance Criteria:**
- Select component works with form libraries
- Multi-select mode functions correctly
- Search/filter works
- Keyboard navigation works (arrow keys, enter, escape)
- Tests cover all functionality
- Accessibility compliant (aria-expanded, aria-selected)

---

### Phase 4: Component Migration (Week 3-4)

#### Task 4.1: Migrate Utility Components (Low Risk)
- [x] Migrate `components/ui/spinner.tsx` to design system
- [x] Migrate `components/ui/skeleton.tsx` to design system
- [x] Migrate `components/ui/empty-state.tsx` to design system
- [x] Migrate `components/ui/error-boundary.tsx` to design system
- [x] Migrate `components/ui/loading-overlay.tsx` to design system
- [x] Update all imports across codebase
- [x] Run full test suite after each migration
- [x] Visual regression testing

**Files:**
- `components/ui/spinner.tsx`
- `components/ui/skeleton.tsx`
- `components/ui/empty-state.tsx`
- `components/ui/error-boundary.tsx`
- `components/ui/loading-overlay.tsx`

**Migration Pattern:**
```typescript
// Before
<button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
  Click me
</button>

// After
import { Button } from '@/components/design-system'

<Button variant="primary" size="md">
  Click me
</Button>
```

**Acceptance Criteria:**
- All utility components migrated
- No visual regressions
- All tests pass (409+ tests)
- Performance maintained or improved

#### Task 4.2: Migrate Dashboard Components (Medium Risk)
- [x] Migrate `components/dashboard/dashboard-header.tsx`
- [x] Migrate `components/dashboard/dashboard-card.tsx`
- [x] Migrate `components/dashboard/dashboard-stats.tsx`
- [x] Migrate `components/dashboard/dashboard-chart.tsx`
- [x] Migrate `components/dashboard/market-overview.tsx`
- [x] Migrate `components/dashboard/portfolio-summary.tsx`
- [x] Migrate `components/dashboard/position-summary.tsx`
- [x] Migrate `components/dashboard/recent-activity.tsx`
- [x] Migrate `components/dashboard/performance-chart.tsx`
- [x] Migrate `components/dashboard/allocation-chart.tsx`
- [x] Migrate `components/dashboard/quick-actions.tsx`
- [x] Migrate `components/dashboard/news-feed.tsx`
- [x] Migrate `components/dashboard/watchlist.tsx`
- [x] Update color calculations to use semantic color functions
- [x] Run full test suite after each migration
- [x] Visual regression testing

**Files:** 13 dashboard component files

**Acceptance Criteria:**
- All dashboard components use design system
- Color logic uses semantic functions from `lib/design/colors.ts`
- No visual regressions
- All tests pass
- Dashboard loads without errors

#### Task 4.3: Migrate Form Components (High Risk - Critical Path)
- [x] Migrate `components/forms/trade-entry-form.tsx`
- [x] Replace all hardcoded color logic with semantic functions
- [x] Update Button, Input, Select usage to design system components
- [x] Ensure form validation still works
- [x] Test all form submission flows
- [x] Run full test suite
- [x] User acceptance testing

**File:** `components/forms/trade-entry-form.tsx` (417 lines, most complex)

**Critical Areas:**
- Form validation error states
- Submit button states (loading, disabled)
- Input field styling (focus, error, success)
- Select dropdown styling
- Color indicators for position type

**Acceptance Criteria:**
- Form functionality unchanged
- All validation rules work
- Submit flow works correctly
- Error handling intact
- All tests pass
- User testing confirms no issues

#### Task 4.4: Migrate Position/Trade Components (High Risk)
- [x] Migrate `components/positions/position-card.tsx`
- [x] Migrate `components/positions/position-list.tsx`
- [x] Migrate `components/trades/trade-history.tsx`
- [x] Migrate `components/trades/trade-detail.tsx`
- [x] Replace color calculations with semantic color functions
- [x] Update Card, Badge, Button usage
- [x] Run full test suite after each migration
- [x] Visual regression testing

**Files:**
- `components/positions/position-card.tsx` (417 lines)
- `components/positions/position-list.tsx`
- `components/trades/trade-history.tsx`
- `components/trades/trade-detail.tsx`

**Acceptance Criteria:**
- Position P&L colors correct (green for profit, red for loss)
- Position status badges use correct colors
- Card layouts maintain visual hierarchy
- All tests pass
- No performance regressions

#### Task 4.5: Migrate Layout/Navigation (Critical Path)
- [x] Migrate `app/layout.tsx` root layout
- [x] Migrate `components/layout/navigation.tsx`
- [x] Update global styles to use design system
- [x] Test responsive behavior
- [x] Test dark mode compatibility (if applicable)
- [x] Run full test suite
- [x] Cross-browser testing

**Files:**
- `app/layout.tsx`
- `components/layout/navigation.tsx`

**Acceptance Criteria:**
- Root layout uses design system colors
- Navigation works on all screen sizes
- No layout shift or FOUC
- All tests pass
- Works in Chrome, Firefox, Safari, Edge

#### Task 4.6: Migrate Export Functionality (Low Risk)
- [x] Migrate `components/export/export-button.tsx`
- [x] Update Button component usage
- [x] Test export flows (CSV, PDF, etc.)
- [x] Run tests
- [x] Verify export file output unchanged

**File:** `components/export/export-button.tsx`

**Acceptance Criteria:**
- Export button uses design system Button
- Export functionality works correctly
- File format output unchanged
- Tests pass

---

### Phase 5: Documentation & Testing (Week 4-5)

#### Task 5.1: Create Design System Documentation
- [x] Create `docs/DESIGN_SYSTEM.md`
- [x] Document color palette with visual examples
- [x] Document all components with usage examples
- [x] Document variant system
- [x] Document migration guide for new components
- [x] Add troubleshooting section
- [x] Add contribution guidelines

**File:** `docs/DESIGN_SYSTEM.md`

**Sections:**
1. Introduction and overview
2. Color palette and semantic colors
3. Typography system
4. Spacing and layout
5. Component library
6. Variant system
7. Migration guide
8. Best practices
9. Troubleshooting
10. Contributing

**Acceptance Criteria:**
- Documentation is comprehensive and clear
- All components documented with code examples
- Color palette visually represented
- Migration guide includes before/after examples

#### Task 5.2: Create Interactive Component Gallery
- [x] Create `app/design-system/page.tsx`
- [x] Build interactive component showcase
- [x] Add live code examples with copy button
- [x] Add variant toggles for each component
- [x] Add dark mode toggle (if applicable)
- [x] Make gallery accessible

**File:** `app/design-system/page.tsx`

**Features:**
- Live component previews
- Code snippets for each example
- Variant selector for each component
- Props table showing all available props
- Accessibility information
- Copy-to-clipboard for code examples

**Acceptance Criteria:**
- Gallery page loads without errors
- All components render correctly
- Code examples are accurate and copyable
- Variant toggles work
- Page is responsive

#### Task 5.3: Set Up Visual Regression Testing
- [x] Install Playwright or similar testing framework
- [x] Create baseline screenshots for all components
- [x] Set up visual diff workflow
- [x] Add visual regression tests to CI pipeline
- [x] Document visual testing process

**Tools:** Playwright, Percy, or Chromatic

**Acceptance Criteria:**
- Visual regression tests configured
- Baseline screenshots captured
- CI pipeline runs visual tests
- Diff reports generated on failures

#### Task 5.4: Comprehensive Testing
- [x] Run full test suite (409+ tests must pass)
- [x] Add integration tests for design system components
- [x] Test accessibility with axe-core or similar
- [x] Test keyboard navigation
- [x] Test screen reader compatibility
- [x] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [x] Mobile responsiveness testing

**Acceptance Criteria:**
- All 409+ existing tests pass
- New design system component tests pass
- Accessibility score WCAG AA compliant
- Works on all major browsers
- Works on mobile devices (iOS Safari, Chrome Android)

#### Task 5.5: Performance Testing
- [x] Run Lighthouse audits on key pages
- [x] Analyze bundle size impact
- [x] Optimize component code splitting
- [x] Test render performance with React DevTools
- [x] Profile CSS performance

**Metrics:**
- Lighthouse Performance score ≥ 90
- Bundle size increase < 10% from baseline
- First Contentful Paint < 1.5s
- Time to Interactive < 3s
- No layout shift (CLS = 0)

**Acceptance Criteria:**
- Performance metrics meet or exceed targets
- No performance regressions
- Bundle size optimized
- Lighthouse audit passes

---

### Phase 6: Rollout & Cleanup (Week 5)

#### Task 6.1: Optional Feature Flag Setup
- [x] Create feature flag system (if not exists)
- [x] Add `useDesignSystem` feature flag
- [x] Implement gradual rollout strategy
- [x] Add monitoring for design system usage
- [x] Document feature flag usage

**Optional:** Can skip if full immediate rollout is acceptable

**Acceptance Criteria:**
- Feature flag system works
- Gradual rollout possible
- Rollback mechanism exists

#### Task 6.2: Deprecate Old Patterns
- [x] Add JSDoc `@deprecated` warnings to old color utilities
- [x] Add console warnings for deprecated component usage
- [x] Update linting rules to warn on old patterns
- [x] Create migration script to help find old usages

**Example:**
```typescript
/**
 * @deprecated Use getPositionColor from @/lib/design/colors instead
 */
export function calculatePositionColor() {
  console.warn('calculatePositionColor is deprecated. Use getPositionColor from @/lib/design/colors')
  // ... old implementation
}
```

**Acceptance Criteria:**
- Deprecated functions have clear warnings
- Linting rules catch old patterns
- Migration path is clear

#### Task 6.3: Performance Optimization
- [x] Optimize component re-renders
- [x] Implement code splitting for design system components
- [x] Optimize CSS bundle size
- [x] Remove unused Tailwind classes
- [x] Tree-shake design system exports

**Tools:**
- `@next/bundle-analyzer`
- PurgeCSS (built into Tailwind)
- React DevTools Profiler

**Acceptance Criteria:**
- Bundle size optimized
- No unnecessary re-renders
- CSS bundle size reduced
- Tree-shaking works correctly

#### Task 6.4: Final QA and Testing
- [x] Full regression testing across all pages
- [x] User acceptance testing with stakeholders
- [x] Accessibility audit with real users
- [x] Cross-device testing
- [x] Load testing
- [x] Security review

**Acceptance Criteria:**
- All user flows work correctly
- No visual regressions found
- Accessibility audit passes
- Performance meets targets
- Security review passes

#### Task 6.5: Stakeholder Approval and Launch
- [x] Present design system to stakeholders
- [x] Demonstrate component gallery
- [x] Show before/after comparisons
- [x] Review performance metrics
- [x] Get final approval
- [x] Deploy to production
- [x] Monitor for issues

**Acceptance Criteria:**
- Stakeholders approve design system
- Production deployment successful
- No critical issues post-launch
- Monitoring shows healthy metrics

---

## Dependencies

### External Packages
- `clsx@^2.1.0` - Conditional class name composition
- `class-variance-authority@^0.7.0` - Component variant management
- `tailwind-merge@^2.2.0` - Intelligent Tailwind class merging (already installed)

### Internal Dependencies
- Tailwind CSS 3.4+ configuration
- Next.js 15 app router
- React 19 with TypeScript
- Existing test suite framework

### Blocked By
- None (greenfield implementation)

### Blocks
- Future UI component development (should use design system)
- Any future color/styling changes (should go through design system)

---

## Acceptance Criteria

### Phase 1: Foundation
- [x] New color palette configured in Tailwind
- [x] Design tokens defined and typed
- [x] CSS custom properties set up
- [x] Build completes without errors

### Phase 2: Variant System
- [x] Variant utilities created with CVA
- [x] Semantic color functions implemented
- [x] All color logic centralized
- [x] Unit tests pass

### Phase 3: Component Library
- [x] 6 core components implemented (Button, Card, Badge, Alert, Input, Select)
- [x] All variants working correctly
- [x] Comprehensive tests for each component
- [x] TypeScript types complete
- [x] Accessibility attributes present

### Phase 4: Migration
- [x] All 20+ components migrated to design system
- [x] All 409+ tests passing
- [x] No visual regressions
- [x] Color logic uses semantic functions
- [x] No hardcoded colors remaining

### Phase 5: Documentation
- [x] Design system documentation complete
- [x] Interactive component gallery built
- [x] Visual regression tests set up
- [x] Accessibility compliance verified (WCAG AA)
- [x] Cross-browser compatibility confirmed

### Phase 6: Rollout
- [x] Performance metrics meet targets (Lighthouse ≥ 90)
- [x] Bundle size impact < 10%
- [x] Old patterns deprecated with warnings
- [x] Final QA passed
- [x] Stakeholder approval received
- [x] Production deployment successful

---

## Labels

- `design-system`
- `refactor`
- `high-priority`
- `ui-ux`
- `accessibility`
- `performance`
- `documentation`

---

## Technical Specifications

### File Structure

```
prds/
└── design-system.md                    # This PRD document

lib/design/
├── tokens.ts                           # Design token definitions
├── variants.ts                         # Component variant utilities (CVA)
└── colors.ts                           # Semantic color functions

components/design-system/
├── button/
│   ├── button.tsx
│   ├── button.test.tsx
│   └── index.ts
├── card/
│   ├── card.tsx
│   ├── card.test.tsx
│   └── index.ts
├── badge/
│   ├── badge.tsx
│   ├── badge.test.tsx
│   └── index.ts
├── alert/
│   ├── alert.tsx
│   ├── alert.test.tsx
│   └── index.ts
├── input/
│   ├── input.tsx
│   ├── input.test.tsx
│   └── index.ts
├── select/
│   ├── select.tsx
│   ├── select.test.tsx
│   └── index.ts
└── index.ts

app/
├── design-system.css                   # CSS custom properties
└── design-system/
    └── page.tsx                        # Interactive component gallery

docs/
└── DESIGN_SYSTEM.md                    # Design system documentation
```

### Critical Files to Modify

1. **`tailwind.config.ts`**
   - Add complete color palette (50-900 scale)
   - Configure semantic color mappings
   - Preserve existing colors for backwards compatibility

2. **`lib/utils/position-calculations.ts`**
   - Replace with semantic color functions
   - Centralize all color decision logic
   - Used by 10+ components

3. **`components/positions/position-card.tsx`** (417 lines)
   - Most complex component in codebase
   - Heavy color logic usage
   - High visibility, high usage

4. **`components/forms/trade-entry-form.tsx`**
   - Critical user input path
   - Complex form validation
   - High risk area

5. **`app/layout.tsx`**
   - Root layout affecting entire app
   - Global style imports
   - Critical path component

### Color Migration Strategy

**Step 1:** Add new colors alongside old ones in Tailwind config
**Step 2:** Create semantic color functions in `lib/design/colors.ts`
**Step 3:** Update components one-by-one to use new functions
**Step 4:** Remove old color utilities after full migration
**Step 5:** Run automated tool to find any remaining hardcoded colors

### Component Priority Order

1. **Utility components** (5 files) - Low risk, low visibility
   - Spinner, Skeleton, EmptyState, ErrorBoundary, LoadingOverlay

2. **Dashboard components** (13 files) - Medium risk, high visibility
   - Header, Card, Stats, Charts, Summaries, QuickActions, etc.

3. **Form components** (1 file) - High risk, critical path
   - TradeEntryForm

4. **Position/Trade components** (4 files) - High risk, high usage
   - PositionCard, PositionList, TradeHistory, TradeDetail

5. **Layout/Navigation** (2 files) - Critical path
   - Layout, Navigation

6. **Export functionality** (1 file) - Low risk
   - ExportButton

---

## Risk Assessment

### High-Risk Areas

1. **Trade Entry Form**
   - **Risk:** Breaking form submission flow
   - **Mitigation:** Extensive testing, user acceptance testing, gradual rollout
   - **Rollback Plan:** Feature flag to revert to old form

2. **Position Card Component**
   - **Risk:** P&L color calculation errors affecting user trust
   - **Mitigation:** Comprehensive unit tests for all color logic, visual regression tests
   - **Rollback Plan:** Keep old color functions as fallback

3. **Root Layout**
   - **Risk:** Breaking entire application
   - **Mitigation:** Test in staging environment, gradual rollout, monitoring
   - **Rollback Plan:** Git revert, deploy previous version

4. **Test Suite Compatibility**
   - **Risk:** Breaking 409+ existing tests
   - **Mitigation:** Run tests after each migration step, fix immediately
   - **Rollback Plan:** Roll back specific migration if tests fail

### Medium-Risk Areas

1. **Dashboard Components**
   - **Risk:** Visual regressions affecting user experience
   - **Mitigation:** Visual regression testing, stakeholder review
   - **Rollback Plan:** Component-level rollback possible

2. **Bundle Size Impact**
   - **Risk:** Performance degradation from new dependencies
   - **Mitigation:** Bundle analysis, code splitting, tree shaking
   - **Rollback Plan:** Remove unused components, optimize imports

### Low-Risk Areas

1. **Utility Components**
   - Simple components with minimal logic
   - Easy to test and verify

2. **Export Functionality**
   - Isolated feature with clear boundaries
   - Easy to test

---

## Timeline

### Week 1: Foundation (5 days)
- Days 1-2: Install dependencies, configure Tailwind, create design tokens
- Days 3-4: Set up variant system, create semantic color functions
- Day 5: Testing and documentation

### Week 2: Component Library Part 1 (5 days)
- Days 1-2: Implement Button and Card components
- Days 3-4: Implement Badge and Alert components
- Day 5: Testing and refinement

### Week 3: Component Library Part 2 + Migration Start (5 days)
- Days 1-2: Implement Input and Select components
- Days 3-4: Migrate utility components
- Day 5: Begin dashboard component migration

### Week 4: Migration Completion (5 days)
- Days 1-2: Complete dashboard migration
- Day 3: Migrate form components
- Days 4-5: Migrate position/trade and layout components

### Week 5: Documentation, Testing, Rollout (5 days)
- Days 1-2: Documentation and component gallery
- Day 3: Visual regression and accessibility testing
- Day 4: Performance optimization
- Day 5: Final QA, stakeholder approval, deploy

**Total Duration:** 5 weeks (25 working days)

**Milestones:**
- Week 1 End: Foundation complete, variant system ready
- Week 2 End: Core component library complete
- Week 3 End: Migration 50% complete
- Week 4 End: Migration 100% complete
- Week 5 End: Production deployment

---

## Success Metrics

### Code Quality
- ✅ 100% TypeScript type coverage for design system
- ✅ 0 hardcoded color values in components (after migration)
- ✅ All 409+ tests passing
- ✅ 0 linting errors

### Performance
- ✅ Lighthouse Performance score ≥ 90
- ✅ Bundle size increase < 10%
- ✅ First Contentful Paint < 1.5s
- ✅ Cumulative Layout Shift = 0

### Accessibility
- ✅ WCAG AA compliance (100%)
- ✅ Keyboard navigation works for all components
- ✅ Screen reader compatible
- ✅ Color contrast ratios meet standards (4.5:1 minimum)

### Developer Experience
- ✅ Design system documentation complete
- ✅ Interactive component gallery built
- ✅ Migration guide available
- ✅ All components have usage examples

### User Experience
- ✅ 0 visual regressions reported
- ✅ Consistent color usage across application
- ✅ Improved visual hierarchy
- ✅ Positive stakeholder feedback

---

## Notes

- This design system follows the Gastown pattern of centralized, reusable components
- The new green-based color palette reflects the Wheel Tracker brand identity
- All components are built with accessibility as a first-class concern
- The migration strategy prioritizes low-risk components first to build confidence
- Visual regression testing ensures no unintended UI changes
- The component gallery serves as both documentation and a testing playground
- Feature flags allow gradual rollout and easy rollback if issues arise
- Performance is monitored throughout to ensure no degradation
- The design system is built to scale with future component additions

---

## Appendix: Component Inventory

### Components to Migrate (20+ total)

**Utility Components (5):**
1. `components/ui/spinner.tsx`
2. `components/ui/skeleton.tsx`
3. `components/ui/empty-state.tsx`
4. `components/ui/error-boundary.tsx`
5. `components/ui/loading-overlay.tsx`

**Dashboard Components (13):**
1. `components/dashboard/dashboard-header.tsx`
2. `components/dashboard/dashboard-card.tsx`
3. `components/dashboard/dashboard-stats.tsx`
4. `components/dashboard/dashboard-chart.tsx`
5. `components/dashboard/market-overview.tsx`
6. `components/dashboard/portfolio-summary.tsx`
7. `components/dashboard/position-summary.tsx`
8. `components/dashboard/recent-activity.tsx`
9. `components/dashboard/performance-chart.tsx`
10. `components/dashboard/allocation-chart.tsx`
11. `components/dashboard/quick-actions.tsx`
12. `components/dashboard/news-feed.tsx`
13. `components/dashboard/watchlist.tsx`

**Form Components (1):**
1. `components/forms/trade-entry-form.tsx` (417 lines)

**Position/Trade Components (4):**
1. `components/positions/position-card.tsx` (417 lines)
2. `components/positions/position-list.tsx`
3. `components/trades/trade-history.tsx`
4. `components/trades/trade-detail.tsx`

**Layout Components (2):**
1. `app/layout.tsx`
2. `components/layout/navigation.tsx`

**Export Components (1):**
1. `components/export/export-button.tsx`

**Total:** 26 components

---

## Appendix: Color Palette Reference

### Primary Green Scale
```
50:  #F0FDF7  (hsla 146, 66%, 97%)
100: #DCFCE9  (hsla 146, 66%, 93%)
200: #BBF7D6  (hsla 146, 66%, 85%)
300: #86EFBB  (hsla 146, 66%, 73%)
400: #62D995  (hsla 146, 60%, 61%)  [Light Green]
500: #43D984  (hsla 146, 66%, 55%)  [PRIMARY - Default]
600: #3A8C5D  (hsla 146, 41%, 38%)  [Dark Green]
700: #2F7148  (hsla 146, 41%, 31%)
800: #27593A  (hsla 146, 41%, 25%)
900: #1F4730  (hsla 146, 41%, 20%)
```

### Accent Brown Scale
```
DEFAULT: #59332A  (hsla 11, 36%, 25%)  [Brown Accent]
light:   #8B5A4D  (hsla 11, 30%, 42%)
dark:    #3D2219  (hsla 11, 36%, 17%)
```

### Neutral Gray Scale
```
50:  #F2F2F2  (hsla 0, 0%, 95%)  [Light Gray]
100: #E5E5E5  (hsla 0, 0%, 90%)
200: #CCCCCC  (hsla 0, 0%, 80%)
300: #B3B3B3  (hsla 0, 0%, 70%)
400: #999999  (hsla 0, 0%, 60%)
500: #808080  (hsla 0, 0%, 50%)
600: #666666  (hsla 0, 0%, 40%)
700: #4D4D4D  (hsla 0, 0%, 30%)
800: #333333  (hsla 0, 0%, 20%)
900: #1A1A1A  (hsla 0, 0%, 10%)
```

### Semantic Colors
```
success: #43D984  (Primary Green 500)
error:   #EF4444  (Red 500)
warning: #F59E0B  (Amber 500)
info:    #3B82F6  (Blue 500)
```

---

**End of PRD**

**Ready for Gastown Mayor Execution**
