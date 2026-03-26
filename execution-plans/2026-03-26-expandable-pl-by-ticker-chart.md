# Execution Plan: Expandable P&L by Ticker Chart

**Source PRD:** `PRDs/2026-03-26-expandable-pl-by-ticker-chart.md`
**Date:** 2026-03-26
**Author:** Architect Agent
**Selected Approach:** Option A — Expand Icon with Height Toggle

## Overview

Add an expand/collapse toggle to the P&L by Ticker bar chart card. When expanded, the chart increases in height (300px to 600px on desktop, 400px on mobile), spans the full grid width (`lg:col-span-2`), and enables horizontal scrolling with a sticky Y-axis when the ticker count exceeds what fits in the visible area. The collapsed state is identical to current behavior — zero regression risk. No data model or backend changes required.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Component type | Client Component (already `'use client'`) | Requires `useState` for expand/collapse toggle |
| State management | Local `useState` inside `PLByTickerChart` | PRD says state resets on reload; no persistence needed |
| Icon library | Lucide React (`Maximize2` / `Minimize2`) | Already a project dependency (`lucide-react ^0.564.0`) |
| Height animation | CSS `transition` on `max-height` | No framer-motion in deps; CSS transition is sufficient and zero-cost |
| Horizontal scroll | Outer div with `overflow-x: auto`, dynamic chart width | Standard Recharts scrollable pattern; avoids Brush component |
| Sticky Y-axis | Separate `BarChart` rendered outside scroll container for Y-axis, main chart inside scroll container | Keeps Y-axis visible while scrolling; proven pattern from Recharts community |
| Grid span on expand | Pass `isExpanded` up to `PLDashboard` via callback; parent toggles `lg:col-span-2` | Chart component shouldn't know about its grid context; parent controls layout |
| Bar width calculation | `Math.max(containerWidth, tickerCount * 100)` px | 100px per ticker group (4 bars) ensures readable bars at up to 30 tickers |
| Scroll affordance | Fade gradient overlays on left/right edges | Subtle visual cue without extra scrollbar styling |
| Mobile expanded height | 400px (vs 600px desktop) | Prevents excessive page-level scrolling on small screens |

## Phase 1: Chart Component — Expand/Collapse Toggle & Height Animation

### Task 1.1: Add expand/collapse state and icon button to PLByTickerChart

**Parallel:** No — this is the foundation
**Depends on:** None
**Assigned to:** frontend (informational)
**Files:**
- `components/dashboard/pl-by-ticker-chart.tsx` — modify

**Details:**

Add expand/collapse functionality to the `PLByTickerChart` component:

1. Add a new prop to the component interface:

```typescript
interface PLByTickerChartProps {
  data: PLByTickerDataPoint[]
  loading?: boolean
  onExpandChange?: (expanded: boolean) => void
}
```

2. Add local state:

```typescript
const [isExpanded, setIsExpanded] = useState(false)
```

3. Create a toggle handler:

```typescript
const handleToggle = () => {
  const next = !isExpanded
  setIsExpanded(next)
  onExpandChange?.(next)
}
```

4. Import Lucide icons at the top:

```typescript
import { Maximize2, Minimize2 } from 'lucide-react'
```

5. Modify the `CardHeader` in the normal (non-loading, non-empty) render to include the icon button. Change the `CardHeader` to use a flex row layout with the title on the left and the icon button on the right:

```typescript
<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
  <CardTitle>P&L by Ticker</CardTitle>
  <button
    onClick={handleToggle}
    className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
    aria-label={isExpanded ? 'Collapse chart' : 'Expand chart'}
  >
    {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
  </button>
</CardHeader>
```

6. Also add the icon button to the empty state `CardHeader` so the layout is consistent (even though expand does nothing meaningful on empty data — it maintains visual consistency).

7. Replace the fixed `height={300}` on `ResponsiveContainer` with a dynamic value:

```typescript
const chartHeight = isExpanded ? (typeof window !== 'undefined' && window.innerWidth < 768 ? 400 : 600) : 300
```

Note: Since this is a client component, `window` is available. Use a simpler approach — just use Tailwind responsive classes on the container wrapper rather than JS window checks. Wrap the `ResponsiveContainer` in a div:

```typescript
<div
  className={cn(
    'transition-[max-height] duration-300 ease-in-out overflow-hidden',
    isExpanded ? 'max-h-[600px] md:max-h-[600px]' : 'max-h-[300px]'
  )}
>
  <ResponsiveContainer width="100%" height={isExpanded ? 600 : 300}>
    ...
  </ResponsiveContainer>
</div>
```

For mobile, when expanded use 400px instead. To avoid JS window checks, use a CSS-only approach: render the `ResponsiveContainer` at `height="100%"` and control the outer div height:

```typescript
<div
  className={cn(
    'transition-[height] duration-300 ease-in-out',
    isExpanded ? 'h-[400px] md:h-[600px]' : 'h-[300px]'
  )}
>
  <ResponsiveContainer width="100%" height="100%">
    ...
  </ResponsiveContainer>
</div>
```

8. Import `cn` from `@/lib/utils/cn` (check if already imported — it is not currently).

**Acceptance criteria:**
- [ ] Expand/collapse icon button visible in card header, right-aligned
- [ ] Clicking the icon toggles between expanded (600px desktop / 400px mobile) and collapsed (300px)
- [ ] Icon changes between `Maximize2` (collapsed) and `Minimize2` (expanded)
- [ ] Height transition is smooth (CSS `transition` on height)
- [ ] `onExpandChange` callback fires with the new boolean state
- [ ] Button has `aria-label` for accessibility
- [ ] Loading and empty states render without errors
- [ ] Collapsed state is pixel-identical to current behavior (regression-free)

---

## Phase 2: Dashboard Layout — Full-Width Grid Span on Expand

### Task 2.1: Wire expand state into PLDashboard grid layout

**Parallel:** No
**Depends on:** Task 1.1
**Assigned to:** frontend (informational)
**Files:**
- `components/dashboard/pl-dashboard.tsx` — modify

**Details:**

1. Add state in `PLDashboard` to track expansion:

```typescript
const [plByTickerExpanded, setPLByTickerExpanded] = useState(false)
```

2. In the Charts grid section (around line 217), modify the `PLByTickerChart` and its wrapper to respond to the expanded state:

Current:
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <div className="lg:col-span-2">
    <PLOverTimeChart data={plOverTime} loading={loading} />
  </div>
  <PLByTickerChart data={plByTicker} loading={loading} />
  <WinRateChart data={winRateData} loading={loading} />
</div>
```

Updated:
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <div className="lg:col-span-2">
    <PLOverTimeChart data={plOverTime} loading={loading} />
  </div>
  <div className={plByTickerExpanded ? 'lg:col-span-2' : ''}>
    <PLByTickerChart
      data={plByTicker}
      loading={loading}
      onExpandChange={setPLByTickerExpanded}
    />
  </div>
  <WinRateChart data={winRateData} loading={loading} />
</div>
```

When expanded, the PLByTickerChart takes the full width (`lg:col-span-2`) and the WinRateChart drops to the row below. When collapsed, the original side-by-side layout is restored.

3. The `PLByTickerChart` dynamic import needs the `onExpandChange` prop to be passed through. Since it's dynamically imported, verify the prop is forwarded. The current dynamic import pattern:

```typescript
const PLByTickerChart = dynamic(
  () => import('./pl-by-ticker-chart').then((mod) => ({ default: mod.PLByTickerChart })),
  { loading: () => <LoadingCard height="h-96" />, ssr: false }
)
```

This will automatically forward any props passed to the dynamic component, so no change is needed to the dynamic import itself.

**Acceptance criteria:**
- [ ] When expanded, the P&L by Ticker chart spans full width (`lg:col-span-2`)
- [ ] When collapsed, the chart returns to its single-column grid position
- [ ] The Win Rate chart moves below when P&L by Ticker is expanded
- [ ] Layout transition feels natural (grid reflow is immediate; chart height animates)

---

## Phase 3: Horizontal Scrolling with Sticky Y-Axis

### Task 3.1: Implement scrollable chart container with sticky Y-axis

**Parallel:** No
**Depends on:** Task 1.1
**Assigned to:** frontend (informational)
**Files:**
- `components/dashboard/pl-by-ticker-chart.tsx` — modify

**Details:**

When expanded and the number of tickers exceeds what fits comfortably (more than ~6 tickers for expanded width), enable horizontal scrolling with a sticky Y-axis.

Architecture: Render two side-by-side elements — a fixed-width Y-axis chart on the left, and a scrollable main chart on the right. Both share the same data and scale.

1. Compute whether scrolling is needed:

```typescript
const MIN_BAR_GROUP_WIDTH = 100 // px per ticker (4 bars)
const needsScroll = isExpanded && data.length > 6
const scrollableWidth = data.length * MIN_BAR_GROUP_WIDTH
```

2. When `isExpanded && needsScroll`, replace the single `ResponsiveContainer` + `BarChart` with the following structure:

```tsx
<div className="flex">
  {/* Fixed Y-axis */}
  <div className="flex-shrink-0 w-[60px]">
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `$${value.toFixed(0)}`}
          width={55}
        />
      </BarChart>
    </ResponsiveContainer>
  </div>
  {/* Scrollable chart area */}
  <div className="flex-1 overflow-x-auto" ref={scrollContainerRef}>
    <div style={{ width: scrollableWidth, minWidth: '100%' }}>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="ticker" tick={{ fontSize: 12 }} />
          <YAxis hide />
          <Tooltip
            formatter={(value: number | undefined) =>
              value !== undefined ? formatCurrency(value) : 'N/A'
            }
            labelStyle={{ color: '#111827' }}
          />
          <Legend />
          <Bar dataKey="realizedPL" fill="#10b981" name="Realized P&L" />
          <Bar dataKey="unrealizedPL" fill="#f59e0b" name="Unrealized P&L" />
          <Bar dataKey="premiumPL" fill="#8b5cf6" name="Premium P&L" />
          <Bar dataKey="totalPL" fill="#3b82f6" name="Total P&L" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
</div>
```

3. The Y-axis in the fixed panel must share the same domain as the main chart. Compute the Y-axis domain from the data:

```typescript
const yDomain = React.useMemo(() => {
  if (data.length === 0) return [0, 0]
  const allValues = data.flatMap(d => [d.realizedPL, d.unrealizedPL, d.premiumPL, d.totalPL])
  const min = Math.min(...allValues)
  const max = Math.max(...allValues)
  const padding = (max - min) * 0.1 || 10
  return [Math.floor(min - padding), Math.ceil(max + padding)]
}, [data])
```

Pass `domain={yDomain}` to both YAxis instances (the visible one and the hidden one) to keep them in sync.

4. Add a `useRef` for the scroll container:

```typescript
const scrollContainerRef = useRef<HTMLDivElement>(null)
```

5. When not expanded or when `data.length <= 6`, render the original single `ResponsiveContainer` + `BarChart` (current behavior, no scroll). This means the scroll layout is only used when `isExpanded && needsScroll`.

6. Chart height variable to use in both branches:

```typescript
// Use a number for ResponsiveContainer height prop
// CSS handles the responsive mobile/desktop difference via the wrapper div
const chartHeight = isExpanded ? 600 : 300
```

For the wrapper div, continue using the Tailwind classes from Task 1.1 (`h-[400px] md:h-[600px]` when expanded). The ResponsiveContainer inside should use `height="100%"` so it fills the wrapper.

**Acceptance criteria:**
- [ ] When expanded with <= 6 tickers, no horizontal scroll (chart fits naturally)
- [ ] When expanded with > 6 tickers, horizontal scrolling is enabled
- [ ] Y-axis remains fixed/visible during horizontal scrolling
- [ ] Y-axis scale matches the scrollable chart's scale exactly
- [ ] Scrolling works with mouse wheel, trackpad, and touch gestures
- [ ] When collapsed, chart renders exactly as before (single ResponsiveContainer, no scroll)

---

### Task 3.2: Add scroll fade gradient affordance

**Parallel:** Yes — can run alongside Task 3.1 (but builds on the same file, so coordinate)
**Depends on:** Task 1.1
**Assigned to:** frontend (informational)
**Files:**
- `components/dashboard/pl-by-ticker-chart.tsx` — modify

**Details:**

Add subtle fade gradients on the left and right edges of the scrollable chart container to indicate that the chart can be scrolled.

1. Track scroll position to show/hide gradients:

```typescript
const [showLeftGradient, setShowLeftGradient] = useState(false)
const [showRightGradient, setShowRightGradient] = useState(false)

const handleScroll = useCallback(() => {
  const el = scrollContainerRef.current
  if (!el) return
  setShowLeftGradient(el.scrollLeft > 0)
  setShowRightGradient(el.scrollLeft < el.scrollWidth - el.clientWidth - 1)
}, [])

useEffect(() => {
  const el = scrollContainerRef.current
  if (!el || !needsScroll) return
  // Initialize right gradient on mount
  setShowRightGradient(el.scrollWidth > el.clientWidth)
  el.addEventListener('scroll', handleScroll, { passive: true })
  return () => el.removeEventListener('scroll', handleScroll)
}, [needsScroll, handleScroll, data.length])
```

2. Wrap the scrollable area in a `relative` container and add gradient overlays:

```tsx
<div className="relative flex-1">
  {showLeftGradient && (
    <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
  )}
  {showRightGradient && (
    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
  )}
  <div className="overflow-x-auto" ref={scrollContainerRef} onScroll={handleScroll}>
    {/* chart content */}
  </div>
</div>
```

3. The gradients should only render when `needsScroll` is true.

**Acceptance criteria:**
- [ ] Right fade gradient visible when chart is scrollable and not scrolled to the end
- [ ] Left fade gradient visible when chart has been scrolled away from the start
- [ ] Both gradients hidden when chart is not scrollable
- [ ] Gradients do not interfere with chart interaction (pointer-events-none)
- [ ] Gradients use white-to-transparent to match the Card background

---

## Phase 4: Polish & Edge Cases

### Task 4.1: Handle edge cases and ensure responsive behavior

**Parallel:** No
**Depends on:** Task 1.1, Task 2.1, Task 3.1, Task 3.2
**Assigned to:** frontend (informational)
**Files:**
- `components/dashboard/pl-by-ticker-chart.tsx` — modify

**Details:**

1. **0 tickers (empty state):** Verify the expand button is present in the empty state header but does nothing disruptive. The empty state message should still display centered. Consider hiding the expand button when `data.length === 0` since there is nothing to expand:

```typescript
{data.length > 0 && (
  <button onClick={handleToggle} ...>
    {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
  </button>
)}
```

Update the empty state render to NOT include the expand button (remove it from the empty state `CardHeader`).

2. **1-5 tickers (collapsed):** No changes needed — current behavior is preserved.

3. **1-5 tickers (expanded):** Chart should expand in height but NOT show horizontal scrolling (bars will be wider). This is handled by the `needsScroll` check (`data.length > 6`).

4. **6-10 tickers (expanded):** Same as above, bars fit comfortably at expanded width. The threshold of 6 may need tuning — consider that expanded width is roughly 2x collapsed width, so more tickers fit.

5. **10+ tickers (expanded):** Horizontal scrolling kicks in. Verify bar readability at 100px per ticker group width.

6. **Loading state:** The loading skeleton should NOT show the expand button. The current loading state renders a generic skeleton — this is fine, no changes needed.

7. **Window resize:** If the window is resized while expanded, the ResponsiveContainer handles width automatically. The scroll container should also adapt. No additional logic needed since `overflow-x: auto` handles this natively.

8. **Touch scrolling:** `overflow-x: auto` with `-webkit-overflow-scrolling: touch` (Tailwind's default behavior) ensures smooth touch scrolling on iOS/Android. Add the class `scroll-smooth` to the scroll container for better UX, or omit it if it causes issues with programmatic scroll.

**Acceptance criteria:**
- [ ] Empty state (0 tickers): no expand button shown, empty message displays correctly
- [ ] 1-5 tickers expanded: chart grows taller, no horizontal scroll
- [ ] 10+ tickers expanded: horizontal scroll enabled with sticky Y-axis
- [ ] Loading state: no expand button visible, skeleton unchanged
- [ ] Touch scrolling works on mobile devices

---

## QA Strategy

### Unit Tests

- **File:** `components/dashboard/__tests__/pl-by-ticker-chart.test.tsx` (create)
- Test expand/collapse toggle:
  - Renders `Maximize2` icon by default (collapsed)
  - Clicking icon changes to `Minimize2` (expanded)
  - Clicking again returns to `Maximize2` (collapsed)
  - `onExpandChange` callback fires with correct boolean
- Test chart height:
  - Default render has 300px height wrapper
  - Expanded render has expanded height class
- Test empty state:
  - No expand button when data is empty
  - Empty message still renders
- Test loading state:
  - No expand button when loading
- Test scroll layout:
  - With > 6 data points and expanded, renders the split Y-axis + scroll layout
  - With <= 6 data points and expanded, renders single ResponsiveContainer
  - When collapsed, always renders single ResponsiveContainer regardless of data count

### Integration Tests

- **File:** `components/dashboard/__tests__/pl-dashboard.test.tsx` (modify existing)
- Add test: expanding PLByTickerChart changes grid class to `lg:col-span-2`
- Add test: collapsing PLByTickerChart removes `lg:col-span-2` class

### UI / Visual Tests

- **File:** `tests/visual/pl-by-ticker-chart.spec.ts` (create)
- Capture snapshots:
  - Collapsed state with 3 tickers (desktop, tablet, mobile)
  - Expanded state with 3 tickers (desktop, tablet, mobile)
  - Expanded state with 15 tickers — showing scroll (desktop)
  - Empty state (desktop)

### E2E Tests

- **File:** `tests/e2e/expandable-chart.spec.ts` (create)
- Flow: navigate to dashboard, verify chart is collapsed, click expand icon, verify chart expands, scroll horizontally (if many tickers), click collapse, verify chart returns to original size
- This test depends on having seed data with enough tickers — may need to set up test fixtures

## Dependency Graph

```
Phase 1:  [1.1] ────────────────┐
                                 │
Phase 2:  [2.1] (depends on 1.1)┤
                                 │
Phase 3:  [3.1] (depends on 1.1)┤── can run in parallel after 1.1
          [3.2] (depends on 1.1)┘
                                 │
                                 ▼
Phase 4:  [4.1] (depends on 1.1, 2.1, 3.1, 3.2)
```

**Suggested developer split:**
- **Frontend Dev 1:** Task 1.1 (expand toggle + height animation) then Task 2.1 (grid layout wiring) then Task 4.1 (edge cases + polish)
- **Frontend Dev 2:** Task 3.1 (horizontal scroll + sticky Y-axis) then Task 3.2 (fade gradients)

Dev 2 can start Task 3.1 as soon as Dev 1 completes Task 1.1 (they need the `isExpanded` state and `onExpandChange` prop to be in place). Dev 1 can proceed with Task 2.1 in parallel.

**File conflict avoidance:** Both devs touch `pl-by-ticker-chart.tsx`. To avoid merge conflicts:
- Dev 1 works on Tasks 1.1 and 4.1, which modify the outer component structure (state, props, CardHeader, height wrapper, empty/loading states).
- Dev 2 works on Tasks 3.1 and 3.2, which add the scroll container internals (the chart rendering logic inside the height wrapper).
- Dev 1's branch should be merged first (establishes the `isExpanded` state foundation), then Dev 2 rebases and adds the scroll logic.

**Recommended branch merge order:** Dev 1 (Tasks 1.1, 2.1, 4.1) merges first, then Dev 2 (Tasks 3.1, 3.2) rebases and merges.

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Y-axis scale mismatch between fixed and scrollable charts | High — bars would be misleading | Compute shared `yDomain` from data and pass to both YAxis components; unit test this |
| CSS height transition janky on some browsers | Low — cosmetic only | Use `will-change: height` if needed; fall back to instant toggle if animation is problematic |
| Merge conflicts between two devs on same file | Medium — delays integration | Merge Dev 1 first (structure), Dev 2 rebases (internals); clearly scoped regions |
| Recharts re-renders on scroll causing performance issues | Medium — could cause lag | The scroll container only scrolls the DOM, not re-rendering Recharts; verify with devtools profiler |
| Touch scrolling not smooth on older iOS Safari | Low — small user segment | `overflow-x: auto` with `-webkit-overflow-scrolling: touch` is well-supported; test on real device |

## Migration Notes

No database migrations, data backfilling, or coordinated deployment steps are needed. This is a purely frontend change. The feature can be deployed as a normal build with no rollback concerns beyond reverting the commit.
