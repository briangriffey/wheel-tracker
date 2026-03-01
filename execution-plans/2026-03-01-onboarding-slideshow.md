# Execution Plan: First-Time User Onboarding Slideshow

**Source PRD:** `prds/2026-03-01-onboarding-slideshow.md`
**Date:** 2026-03-01
**Author:** Architect Agent
**Selected Approach:** Option A -- Full-Screen Modal Slideshow (Custom Built)

## Overview

This feature adds a 6-slide onboarding modal that appears on the P&L Dashboard the first time a user logs in after creating their account. The slideshow walks the user through GreekWheel's core features (wheel strategy, deposits, trades, positions, dashboard, scanner) and ends with CTAs to record a deposit or create a trade. A new `onboardingCompletedAt` field on the User model tracks completion state. The slideshow is built as a custom Client Component with slide navigation, progress dots, keyboard support, and fade transitions. A "Replay intro tour" link on the Help page allows users to re-trigger the slideshow at any time by resetting their onboarding state.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Slideshow container | New component wrapping existing `Dialog` from `components/ui/dialog.tsx` | Dialog already provides backdrop, focus trap, ESC handling, body scroll lock, and ARIA attributes. Avoids reinventing modal infrastructure. |
| Component type | Client Component (`'use client'`) | Needs `useState` for current slide, keyboard event listeners, and transition animations. Cannot be a Server Component. |
| Onboarding state storage | `onboardingCompletedAt DateTime?` on User model (server-side) | PRD requires cross-device persistence. localStorage would not sync across browsers/devices. A nullable timestamp also provides analytics value (when users complete onboarding). |
| Onboarding state check | Server-side in `app/dashboard/page.tsx`, passed as prop to PLDashboard | The dashboard page already calls `auth()` to get the session. Adding a lightweight Prisma query to check `onboardingCompletedAt` is efficient and avoids a client-side fetch. |
| Complete/skip action | Server Action (`completeOnboarding`) | Consistent with other mutation patterns in the codebase (e.g., `pauseWheel`, `completeWheel`). Revalidates the dashboard path. |
| Existing user handling | Backfill migration sets `onboardingCompletedAt = NOW()` for all existing users | Ensures only genuinely new users (created after feature ships) see the slideshow. |
| Slide transitions | CSS transition with opacity fade | Simple, professional, no external animation library needed. A horizontal slide would require more complex transform logic for minimal UX gain. |
| Icons per slide | Lucide React icons (`lucide-react` already in `package.json`) | Consistent with existing codebase usage. No custom illustrations needed for v1. |
| Slideshow trigger | Prop `showOnboarding: boolean` passed from server to PLDashboard to OnboardingSlideshow | Avoids additional client-side data fetching. The server already knows if onboarding is needed. |
| Backdrop click behavior | Does NOT dismiss the slideshow | Unlike the standard Dialog which closes on backdrop click, the onboarding slideshow should only close via Skip, CTA buttons, or the X button. This prevents accidental dismissal. |
| Re-triggerable | Yes -- "Replay intro tour" link on Help page | Team lead decision. Sets `onboardingCompletedAt` back to null and redirects to `/dashboard`. Requires a `resetOnboarding` server action and a small Help page modification. |

## Phase 1: Data Layer

### Task 1.1: Add onboardingCompletedAt field to User model and create migration

**Parallel:** Yes -- can run alongside Task 1.2
**Depends on:** None
**Assigned to:** frontend
**Files:**
- `prisma/schema.prisma` -- modify -- add `onboardingCompletedAt` field to User model
- `prisma/migrations/[timestamp]_add_onboarding_completed_at/migration.sql` -- create -- migration file

**Details:**

1. Add the field to the User model in `prisma/schema.prisma`, after the existing `subscriptionEndsAt` field (line 68):

```prisma
model User {
  // ... existing fields ...
  subscriptionEndsAt       DateTime?        // End of current billing period (for grace period)

  // Onboarding
  onboardingCompletedAt    DateTime?        // null = not completed, timestamp = when completed/skipped

  // Relations
  trades           Trade[]
  // ... rest of relations ...
}
```

2. Generate a Prisma migration. The migration SQL should be:

```sql
-- AlterTable
ALTER TABLE "User" ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);

-- Backfill: Mark all existing users as having completed onboarding
-- so only new users created after this migration see the slideshow
UPDATE "User" SET "onboardingCompletedAt" = NOW() WHERE "onboardingCompletedAt" IS NULL;
```

Important: The backfill UPDATE must be included in the migration file. After running `npx prisma migrate dev --name add_onboarding_completed_at`, manually edit the generated `migration.sql` to add the `UPDATE` statement before committing.

3. Run `npx prisma generate` to regenerate the Prisma client so the new field is available in TypeScript.

**Acceptance criteria:**
- [ ] `onboardingCompletedAt DateTime?` field exists on the User model in `schema.prisma`
- [ ] Migration file created and includes both the ALTER TABLE and the backfill UPDATE
- [ ] `npx prisma generate` succeeds and the field is available in the generated client
- [ ] Existing users have `onboardingCompletedAt` set to a non-null timestamp after migration
- [ ] New users created after migration have `onboardingCompletedAt` as null

---

### Task 1.2: Create completeOnboarding and resetOnboarding server actions

**Parallel:** Yes -- can run alongside Task 1.1
**Depends on:** None (uses the field added in 1.1 but can be coded in parallel; just needs the migration applied before testing)
**Assigned to:** frontend
**Files:**
- `lib/actions/onboarding.ts` -- create -- server actions for completing and resetting onboarding

**Details:**

Create a new server action file with two exported functions:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

type ActionResult = { success: true } | { success: false; error: string }

/**
 * Mark the current user's onboarding as completed.
 * Called when the user completes, skips, or clicks a CTA on the onboarding slideshow.
 */
export async function completeOnboarding(): Promise<ActionResult> {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated' }
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { onboardingCompletedAt: new Date() },
    })

    revalidatePath('/dashboard')

    return { success: true }
  } catch (error) {
    console.error('Error completing onboarding:', error)
    return { success: false, error: 'Failed to complete onboarding' }
  }
}

/**
 * Reset the current user's onboarding state so the slideshow will re-appear
 * on their next visit to the dashboard. Used by the "Replay intro tour" link
 * on the Help page.
 */
export async function resetOnboarding(): Promise<ActionResult> {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated' }
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { onboardingCompletedAt: null },
    })

    revalidatePath('/dashboard')
    revalidatePath('/help')

    return { success: true }
  } catch (error) {
    console.error('Error resetting onboarding:', error)
    return { success: false, error: 'Failed to reset onboarding' }
  }
}
```

Key implementation notes:
- `completeOnboarding` uses `auth()` from `@/lib/auth` to get the session, consistent with how `app/dashboard/page.tsx` authenticates.
- Uses `session.user.id` (available via the NextAuth type augmentation in `types/next-auth.d.ts`).
- `completeOnboarding` revalidates `/dashboard` so the server component re-renders and no longer passes `showOnboarding: true`.
- `resetOnboarding` sets `onboardingCompletedAt` to `null`, revalidates both `/dashboard` and `/help`.

**Acceptance criteria:**
- [ ] `lib/actions/onboarding.ts` exports both `completeOnboarding` and `resetOnboarding` functions
- [ ] Both use `auth()` to get the authenticated user's ID
- [ ] `completeOnboarding` sets `onboardingCompletedAt` to the current timestamp
- [ ] `resetOnboarding` sets `onboardingCompletedAt` to `null`
- [ ] Both return `{ success: false, error: 'Not authenticated' }` if no session
- [ ] `completeOnboarding` calls `revalidatePath('/dashboard')`
- [ ] `resetOnboarding` calls `revalidatePath('/dashboard')` and `revalidatePath('/help')`
- [ ] Neither function throws on error; both return `{ success: false, error: string }`

---

## Phase 2: Slideshow Component

### Task 2.1: Build the OnboardingSlideshow component

**Parallel:** No
**Depends on:** Task 1.2 (needs `completeOnboarding` action)
**Assigned to:** frontend
**Files:**
- `components/onboarding/onboarding-slideshow.tsx` -- create -- the main slideshow component
- `components/onboarding/slide-data.ts` -- create -- slide content configuration
- `components/onboarding/index.ts` -- create -- barrel export

**Details:**

**Step A: Create slide content configuration (`components/onboarding/slide-data.ts`)**

Define the slide data as a typed array. Each slide has an `id`, `heading`, `body`, `icon` (Lucide icon component name), and an optional `isFinal` flag:

```typescript
import type { LucideIcon } from 'lucide-react'
import {
  RefreshCcw,
  Wallet,
  FileText,
  BarChart3,
  CheckCircle2,
} from 'lucide-react'

export interface SlideContent {
  id: number
  heading: string
  body: string
  Icon: LucideIcon | null  // null for the welcome slide (uses custom theta)
  isFinal?: boolean
}

export const slides: SlideContent[] = [
  {
    id: 1,
    heading: 'Welcome to GreekWheel',
    body: 'Your personal tracker for the options wheel strategy. Let us show you around -- this will take less than a minute.',
    Icon: null, // Custom theta symbol for welcome slide
  },
  {
    id: 2,
    heading: 'Track Your Wheel Rotations',
    body: 'The wheel strategy cycles through three steps: sell a cash-secured PUT, get assigned stock, then sell covered CALLs. GreekWheel tracks every step automatically.',
    Icon: RefreshCcw,
  },
  {
    id: 3,
    heading: 'Start With Your Deposits',
    body: 'Record your cash deposits so GreekWheel can calculate your returns and compare your performance against buying SPY.',
    Icon: Wallet,
  },
  {
    id: 4,
    heading: 'Log Your Trades',
    body: 'Create trades as you sell PUTs and CALLs. When a PUT gets assigned, mark it -- GreekWheel creates your stock position and calculates your cost basis automatically.',
    Icon: FileText,
  },
  {
    id: 5,
    heading: 'Track Your Performance',
    body: 'Your dashboard shows P&L, premium collected, win rate, and how you compare to SPY. The Scanner helps you find new wheel opportunities.',
    Icon: BarChart3,
  },
  {
    id: 6,
    heading: "You're Ready to Roll",
    body: 'Start by recording a deposit, or jump right in and create your first trade. You can always find help in the Help Center.',
    Icon: CheckCircle2,
    isFinal: true,
  },
]
```

**Step B: Build the slideshow component (`components/onboarding/onboarding-slideshow.tsx`)**

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/design-system'
import { completeOnboarding } from '@/lib/actions/onboarding'
import { slides } from './slide-data'

interface OnboardingSlideshowProps {
  isOpen: boolean
}
```

The component should:

1. **State**: `currentSlide` (0-indexed), `isClosing` (for exit animation).

2. **Render structure** (inside a fixed overlay, NOT using the existing Dialog directly since we need custom navigation and backdrop-click prevention):

```
Fixed overlay (z-50, bg-gray-500/75 backdrop)
  Centered container (max-w-lg, bg-white, rounded-lg, shadow-xl)
    Top bar: "Skip" link (left) and X close button (right)
    Slide content area (min-h-[320px] for consistent height):
      Icon (48px, text-primary-500; or theta symbol for slide 1)
      Heading (text-2xl, font-bold, text-neutral-900)
      Body (text-neutral-600, text-center, max-w-sm)
    Progress dots (6 dots, clickable to jump to slide)
    Navigation footer:
      If NOT final slide: [Back] (hidden on slide 1) ... [Next]
      If final slide: [Record a Deposit] (primary) + [Create a Trade] (outline)
                       [Explore on My Own] (ghost/text link below)
```

3. **Navigation logic**:
   - `goNext()`: increment `currentSlide`, bounded at `slides.length - 1`
   - `goBack()`: decrement `currentSlide`, bounded at 0
   - `goToSlide(index)`: set `currentSlide` to `index` (for dot navigation)
   - `handleSkip()`: call `completeOnboarding()`, then close
   - `handleCTA(path)`: call `completeOnboarding()`, then `router.push(path)`
   - `handleExplore()`: call `completeOnboarding()`, then close

4. **Keyboard handling** (via `useEffect`):
   - `ArrowRight` or `Enter`: go to next slide (if not final)
   - `ArrowLeft`: go to previous slide
   - `Escape`: skip/close the slideshow

5. **Focus management**:
   - When open, prevent body scroll (`document.body.style.overflow = 'hidden'`)
   - Focus trap within the modal (use `tabIndex={-1}` on the container and focus it on mount)
   - Restore body scroll on close

6. **Transition**: Use a CSS fade transition on the slide content area. When `currentSlide` changes, fade out the content and fade in the new slide. This can be achieved with a `key={currentSlide}` on the content wrapper and a CSS animation class:

```css
/* Add to the component or as inline style */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

Or use Tailwind's `animate-` classes with a simple opacity transition via inline style + `transition-opacity duration-200`.

7. **Slide 1 (Welcome) theta symbol**: Render a custom theta `<span>` matching the branding in `app/(auth)/login/page.tsx`:

```tsx
<div className="w-16 h-16 rounded-full bg-primary-500 flex items-center justify-center">
  <span className="text-white font-bold text-3xl">&#920;</span>
</div>
```

8. **ARIA attributes**:
   - Container: `role="dialog"`, `aria-modal="true"`, `aria-label="Welcome to GreekWheel"`
   - Progress dots: `role="tablist"`, each dot `role="tab"`, `aria-selected`, `aria-label="Slide N"`
   - Skip button: `aria-label="Skip onboarding"`
   - Close button: `aria-label="Close onboarding"`

9. **Prevent backdrop click dismissal**: The backdrop `div` should NOT have an `onClick` handler (unlike the standard Dialog). Only Skip, X, CTA buttons, and Escape key can close the slideshow.

**Step C: Create barrel export (`components/onboarding/index.ts`)**

```typescript
export { OnboardingSlideshow } from './onboarding-slideshow'
```

**Acceptance criteria:**
- [ ] Slideshow renders 6 slides matching the PRD content exactly
- [ ] "Skip" link is visible on every slide and closes the slideshow + calls `completeOnboarding()`
- [ ] "Back" button is hidden on slide 1; "Next" button is visible on slides 1-5
- [ ] Slide 6 shows "Record a Deposit" (links to `/deposits`), "Create a Trade" (links to `/trades/new`), and "Explore on My Own" (dismisses)
- [ ] Progress dots show 6 dots; current slide dot is highlighted; dots are clickable to jump
- [ ] Keyboard: ArrowRight/Enter = next, ArrowLeft = back, Escape = skip
- [ ] Focus is trapped in the modal when open
- [ ] Body scroll is locked when open, restored when closed
- [ ] Backdrop click does NOT dismiss the slideshow
- [ ] Slide transitions use a fade animation
- [ ] Responsive: works on 320px-width screens (content stacks, buttons wrap)
- [ ] ARIA attributes present: `role="dialog"`, `aria-modal="true"`, progress dots with `role="tablist"`

---

## Phase 3: Dashboard Integration

### Task 3.1: Wire onboarding slideshow into the Dashboard page

**Parallel:** No
**Depends on:** Task 1.1, Task 2.1
**Assigned to:** frontend
**Files:**
- `app/dashboard/page.tsx` -- modify -- check onboarding state and pass prop
- `components/dashboard/pl-dashboard.tsx` -- modify -- accept and render OnboardingSlideshow

**Details:**

**Step A: Query onboarding state in the Dashboard page**

In `app/dashboard/page.tsx`, after the `auth()` call (line 28-31), query the user's `onboardingCompletedAt` field:

```typescript
import { prisma } from '@/lib/db'

// Inside DashboardPage, after the auth check:
const user = await prisma.user.findUnique({
  where: { id: session.user.id },
  select: { onboardingCompletedAt: true },
})

const showOnboarding = user ? user.onboardingCompletedAt === null : false
```

Pass `showOnboarding` to `PLDashboard`:

```tsx
<PLDashboard
  initialMetrics={metrics}
  initialPLOverTime={plOverTime}
  initialPLByTicker={plByTicker}
  initialWinRateData={winRateData}
  showOnboarding={showOnboarding}
/>
```

**Step B: Update PLDashboard to render the slideshow**

In `components/dashboard/pl-dashboard.tsx`:

1. Add `showOnboarding` to `PLDashboardProps`:

```typescript
interface PLDashboardProps {
  initialMetrics: DashboardMetrics
  initialPLOverTime: PLOverTimeDataPoint[]
  initialPLByTicker: PLByTickerDataPoint[]
  initialWinRateData: WinRateData
  showOnboarding?: boolean  // NEW
}
```

2. Import and render the OnboardingSlideshow:

```typescript
import { OnboardingSlideshow } from '@/components/onboarding'
```

3. Add state for local slideshow visibility (so it can be dismissed without waiting for revalidation):

```typescript
const [onboardingVisible, setOnboardingVisible] = useState(showOnboarding ?? false)
```

4. Render the slideshow at the top of the return (before all other content):

```tsx
{onboardingVisible && (
  <OnboardingSlideshow isOpen={onboardingVisible} />
)}
```

Note: The `OnboardingSlideshow` component calls `completeOnboarding()` internally, which triggers `revalidatePath('/dashboard')`. On the next server render, `showOnboarding` will be `false`. The local `onboardingVisible` state handles immediate client-side dismissal.

**Acceptance criteria:**
- [ ] Dashboard page queries `onboardingCompletedAt` for the authenticated user
- [ ] `showOnboarding` is `true` only when `onboardingCompletedAt` is null
- [ ] PLDashboard accepts `showOnboarding` prop
- [ ] OnboardingSlideshow renders when `showOnboarding` is true
- [ ] After completing/skipping the slideshow, it does not reappear on page reload (server-side state updated)
- [ ] If user is not authenticated, slideshow is not shown (dashboard redirects to login)
- [ ] No visual flash or layout shift -- the slideshow appears immediately if needed

---

## Phase 4: Help Page Replay Link

### Task 4.1: Add "Replay intro tour" link to the Help page

**Parallel:** Yes -- can run alongside Task 3.1
**Depends on:** Task 1.2 (needs `resetOnboarding` action)
**Assigned to:** frontend
**Files:**
- `components/onboarding/replay-tour-button.tsx` -- create -- client component for the replay button
- `app/help/page.tsx` -- modify -- add replay link to the Getting Started section

**Details:**

**Step A: Create ReplayTourButton client component**

Since the Help page (`app/help/page.tsx`) is a Server Component, and calling a server action with `useRouter` for redirect requires client-side interactivity, create a small Client Component:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { resetOnboarding } from '@/lib/actions/onboarding'
import toast from 'react-hot-toast'

export function ReplayTourButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleReplay = async () => {
    setLoading(true)
    const result = await resetOnboarding()

    if (result.success) {
      toast.success('Intro tour reset! Redirecting to dashboard...')
      router.push('/dashboard')
    } else {
      toast.error(result.error)
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleReplay}
      disabled={loading}
      className="text-blue-600 hover:underline text-sm font-medium disabled:opacity-50"
    >
      {loading ? 'Resetting...' : 'Replay Intro Tour'}
    </button>
  )
}
```

**Step B: Add the ReplayTourButton to the Help page**

In `app/help/page.tsx`, add the replay link to the "Getting Started" section (the gradient section around line 95-138). Add it below the 3-step grid, before the closing `</div>` of the Getting Started section:

```tsx
import { ReplayTourButton } from '@/components/onboarding/replay-tour-button'

// Inside the Getting Started section, after the grid-cols-3 div:
<div className="mt-6 pt-4 border-t border-blue-200/50 text-center">
  <p className="text-sm text-gray-600 mb-2">
    Want to see the welcome tour again?
  </p>
  <ReplayTourButton />
</div>
```

Also update the barrel export in `components/onboarding/index.ts`:

```typescript
export { OnboardingSlideshow } from './onboarding-slideshow'
export { ReplayTourButton } from './replay-tour-button'
```

**Acceptance criteria:**
- [ ] `ReplayTourButton` component calls `resetOnboarding()` and redirects to `/dashboard`
- [ ] Button shows loading state while the action is in progress
- [ ] Success toast appears before redirect
- [ ] Error toast appears if the action fails
- [ ] The replay link appears in the Help page's "Getting Started" section
- [ ] After clicking, the slideshow appears on the dashboard
- [ ] The link is subtle and does not dominate the Getting Started section

---

## Phase 5: Tests

### Task 5.1: Unit tests for OnboardingSlideshow, ReplayTourButton, and server actions

**Parallel:** No
**Depends on:** Task 1.2, Task 2.1, Task 3.1, Task 4.1
**Assigned to:** frontend
**Files:**
- `components/onboarding/__tests__/onboarding-slideshow.test.tsx` -- create -- component tests
- `components/onboarding/__tests__/replay-tour-button.test.tsx` -- create -- replay button tests
- `lib/actions/__tests__/onboarding.test.ts` -- create -- server action tests

**Details:**

**OnboardingSlideshow component tests:**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OnboardingSlideshow } from '../onboarding-slideshow'

// Mock the server action
vi.mock('@/lib/actions/onboarding', () => ({
  completeOnboarding: vi.fn().mockResolvedValue({ success: true }),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))
```

Test cases:

1. **Renders the first slide on open** -- heading "Welcome to GreekWheel", body text visible
2. **Shows Skip link on every slide** -- "Skip" text is present
3. **Hides Back button on first slide** -- Back button not in DOM or hidden on slide 0
4. **Navigates forward with Next button** -- click Next, verify slide 2 heading appears
5. **Navigates backward with Back button** -- go to slide 2, click Back, verify slide 1 heading
6. **Shows progress dots** -- 6 dots rendered
7. **Clicking a progress dot jumps to that slide** -- click dot 3, verify slide 4 content
8. **Final slide shows CTA buttons** -- navigate to slide 6, verify "Record a Deposit", "Create a Trade", "Explore on My Own" are present
9. **Final slide does not show Next/Back buttons** -- on slide 6, Back and Next are absent
10. **Skip calls completeOnboarding** -- click Skip, verify the mock was called
11. **Keyboard ArrowRight navigates forward** -- fire keydown ArrowRight, verify slide change
12. **Keyboard ArrowLeft navigates backward** -- fire keydown ArrowLeft, verify slide change
13. **Keyboard Escape skips** -- fire keydown Escape, verify completeOnboarding called
14. **Does not render when isOpen is false** -- render with `isOpen={false}`, verify nothing in DOM

**ReplayTourButton component tests (`components/onboarding/__tests__/replay-tour-button.test.tsx`):**

```typescript
// Mock resetOnboarding and next/navigation
vi.mock('@/lib/actions/onboarding', () => ({
  resetOnboarding: vi.fn().mockResolvedValue({ success: true }),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))
```

Test cases:

15. **Renders "Replay Intro Tour" text** -- button text is present
16. **Calls resetOnboarding on click** -- click button, verify the mock was called
17. **Redirects to /dashboard on success** -- verify `router.push('/dashboard')` called
18. **Shows error toast on failure** -- mock resetOnboarding to return error, verify toast.error called
19. **Shows loading state while processing** -- click button, verify "Resetting..." text appears

**Server action tests (`lib/actions/__tests__/onboarding.test.ts`):**

These are integration-level tests that require mocking Prisma and auth. Follow the existing pattern from `lib/actions/positions.integration.test.ts`. Key test cases:

**completeOnboarding:**
1. **Returns error when not authenticated** -- mock `auth()` to return null, verify `{ success: false, error: 'Not authenticated' }`
2. **Updates onboardingCompletedAt for authenticated user** -- mock `auth()` to return a session, mock `prisma.user.update`, verify it is called with the correct where/data (non-null Date)
3. **Calls revalidatePath('/dashboard')** -- verify the mock is called

**resetOnboarding:**
4. **Returns error when not authenticated** -- mock `auth()` to return null, verify `{ success: false, error: 'Not authenticated' }`
5. **Sets onboardingCompletedAt to null for authenticated user** -- mock `auth()` to return a session, mock `prisma.user.update`, verify data contains `{ onboardingCompletedAt: null }`
6. **Calls revalidatePath for both /dashboard and /help** -- verify both calls

**Acceptance criteria:**
- [ ] Component tests cover all 14 slideshow test cases and 5 replay button test cases
- [ ] Server action tests cover both `completeOnboarding` (3 cases) and `resetOnboarding` (3 cases)
- [ ] All tests pass with `vitest`
- [ ] Mocking patterns are consistent with existing test files in the codebase

---

## QA Strategy

### Unit Tests
- `components/onboarding/__tests__/onboarding-slideshow.test.tsx` -- slide navigation, Skip behavior, keyboard handling, progress dots, CTA buttons, final slide state, ARIA attributes
- `components/onboarding/__tests__/replay-tour-button.test.tsx` -- replay button click, loading state, redirect, error handling
- `lib/actions/__tests__/onboarding.test.ts` -- auth check, database update, revalidation for both `completeOnboarding` and `resetOnboarding`

### Integration Tests
- Verify `completeOnboarding()` correctly updates the User record in the database
- Verify `resetOnboarding()` correctly sets `onboardingCompletedAt` to null
- Verify the dashboard page correctly queries `onboardingCompletedAt` and passes `showOnboarding` to PLDashboard

### UI / Visual Tests
- Slideshow on desktop (1280px): verify centered modal with max-w-lg, proper spacing, all 6 slides
- Slideshow on tablet (768px): verify modal fills appropriately, buttons do not overflow
- Slideshow on mobile (375px): verify full-width modal, stacked buttons on final slide, readable text
- Slideshow on small mobile (320px): verify no horizontal overflow, text wraps gracefully
- Each of the 6 slides captured individually for visual regression
- Help page "Getting Started" section with replay link visible

### E2E Tests
- **Happy path**: Create a new user account, log in, verify slideshow appears on dashboard, navigate through all 6 slides, click "Record a Deposit" CTA, verify redirect to `/deposits`, verify slideshow does not appear on return to dashboard
- **Skip path**: Log in as new user, click "Skip" on slide 2, verify slideshow closes, verify slideshow does not appear on page reload
- **Keyboard navigation**: Log in as new user, use ArrowRight to navigate through slides, press Escape to dismiss
- **Existing user**: Log in as existing user (with backfilled `onboardingCompletedAt`), verify slideshow does NOT appear
- **Replay path**: Log in as existing user, navigate to Help page, click "Replay Intro Tour", verify redirect to dashboard, verify slideshow appears again, complete it, verify it does not appear on next dashboard visit

## Dependency Graph

```
Phase 1:  [1.1 Schema Migration] ────┐
          [1.2 Server Actions]   ─────┤
                                      |
                                      v
Phase 2:  [2.1 Slideshow Component] ──┤
                                      |
                                      v
Phase 3:  [3.1 Dashboard Integration]─┬── (parallel)
Phase 4:  [4.1 Help Page Replay]  ────┘
                                      |
                                      v
Phase 5:  [5.1 Tests]
```

- Tasks 1.1 and 1.2 can run in parallel (schema change and server actions can be coded simultaneously; 1.2 just needs the migration applied before runtime testing)
- Task 2.1 depends on 1.2 (imports `completeOnboarding`)
- Task 3.1 depends on 1.1 (needs `onboardingCompletedAt` field in Prisma client) and 2.1 (imports `OnboardingSlideshow`)
- Task 4.1 depends on 1.2 (imports `resetOnboarding`) and can run in parallel with Task 3.1 since they touch different files
- Task 5.1 depends on all prior tasks

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Migration backfill misses existing users | High -- existing users see unwanted slideshow | The `UPDATE "User" SET "onboardingCompletedAt" = NOW()` statement runs in the same migration. Verify by querying the User table after migration to confirm no null values for pre-existing users. |
| Slideshow blocks dashboard interaction for new users who just want to explore | Medium | Skip button is visible on every slide. Escape key also dismisses. The modal is easy to close. |
| `auth()` in dashboard page adds a redundant auth call | Low | `auth()` is already called on line 28 of `app/dashboard/page.tsx`. The Prisma query to check `onboardingCompletedAt` uses `session.user.id` from that same call. No duplicate auth. |
| Large component bundle size from Lucide icons | Low | Lucide icons are tree-shakeable. Only 5 specific icons are imported. Impact is negligible. |
| Server action `completeOnboarding` fails silently | Medium | The action returns `{ success: false, error }` on failure. The slideshow component should still close (dismiss locally) even if the server action fails, to avoid trapping the user in a broken modal. On next page load, the server will re-check and potentially show the slideshow again. |
| CSS animation conflicts with existing styles | Low | The fade animation uses a simple `transition-opacity` or `@keyframes` scoped to the component. No global CSS changes. |

## Migration Notes

**Schema migration required:**

1. Add `onboardingCompletedAt DateTime?` to the User model
2. Run `npx prisma migrate dev --name add_onboarding_completed_at`
3. Edit the generated migration SQL to add the backfill UPDATE statement
4. Run `npx prisma generate` to update the Prisma client

**Backfill strategy:**
- All existing users get `onboardingCompletedAt = NOW()` so they never see the slideshow
- Only users created after the migration (with `onboardingCompletedAt = null`) will see it

**Rollback strategy:**
1. Revert code changes (remove component, undo dashboard page changes, remove server action)
2. Create a new migration to drop the column: `ALTER TABLE "User" DROP COLUMN "onboardingCompletedAt";`
3. Run `npx prisma generate`

No data loss occurs on rollback -- the column is informational only and does not affect any existing functionality.
