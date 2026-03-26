# PRD: Expandable P&L by Ticker Chart

**Date:** 2026-03-26
**Author:** Product Manager Agent
**Status:** Draft
**Task ID:** 1

## Problem Statement

The P&L by Ticker bar chart on the GreekWheel dashboard currently renders all tickers in a fixed-height 300px `ResponsiveContainer` with no ability to scroll or expand. As traders add more tickers to their wheel strategy portfolio, the bars become increasingly narrow and the X-axis labels compress together, making the chart unreadable. A trader with 10+ active wheels will see cramped, overlapping labels and thin bars that are difficult to compare visually.

This is a core analytics chart (one of only two on the dashboard alongside the P&L Over Time chart) and it directly answers the question "which tickers are making me money?" If a trader cannot quickly read this chart, they lose a critical decision-making tool for managing their wheel portfolio -- which tickers to continue wheeling, which to exit, and where their capital is best deployed.

The current fixed-size implementation also wastes screen real estate when a trader has only 2-3 tickers (excessive whitespace) and provides no way to drill deeper into the breakdown for any single ticker. There is no expand/collapse interaction, no horizontal scrolling, and no affordance indicating the chart can be interacted with beyond the existing Recharts tooltip on hover.

## Goals

- Allow traders with many tickers (10+) to view all P&L bars without label compression or overlap
- Provide an expand/collapse interaction so the chart can take up more screen space when the trader wants to focus on it
- Maintain readability and usability for traders with few tickers (1-5)
- Keep the interaction consistent with the rest of the dashboard design system (Card-based layout)

## Non-Goals

- Adding new data dimensions or metrics to the chart (e.g., trade count, win rate per ticker)
- Replacing the bar chart with a different visualization type (e.g., treemap, pie chart)
- Adding click-through drill-down to individual ticker detail pages (could be a follow-up)
- Changing the P&L Over Time chart or Win Rate chart
- Mobile-first redesign of the entire dashboard layout

## Research Findings

### Competitive Analysis

**TradesViz** offers 70+ interactive charts with click-to-explore functionality. Their P&L by symbol view uses expandable panels where clicking a summary row reveals detailed breakdowns. This "progressive disclosure" pattern is common across trading journals.

**Thinkorswim** uses collapsible sections in their Position Statement view with double-triangle arrows to expand/collapse all sections. Their chart panels support full-screen mode for focused analysis.

**SFTi-Pennies** (open-source trading journal) uses multi-timeframe analysis with 12+ interactive charts including performance by ticker, with expandable day/week/month views.

**Common patterns across competitors:**
- Progressive disclosure: show summary first, expand for detail
- Full-screen or enlarged chart mode for focused analysis
- Horizontal scrolling for large data sets (common in stock screeners)
- Color-coding by P&L direction (green positive, red negative) -- GreekWheel already does this via the design system

### Best Practices

**Dashboard UX best practices for traders (2025):**
- Use ample whitespace around key widgets to prevent information overload
- Progressive disclosure: present top-level summaries first, allow drill-down
- Support zoom and fullscreen modes for charts that need detailed analysis
- Maintain fixed axes when scrolling chart content so context is not lost

**Recharts horizontal scrolling patterns:**
- Recharts has no built-in scrollable chart API
- Common pattern: wrap chart in a div with `overflow-x: auto`, set chart width dynamically based on data point count (e.g., 80-100px per bar)
- Keep Y-axis sticky/fixed using CSS `position: sticky` or rendering a separate Y-axis component outside the scrollable container
- The Recharts `Brush` component provides a range selector but is counterintuitive on mobile and more suited for time-series data
- Alternative: use a CSS overflow container with a minimum width calculated from the number of tickers

### Existing System Context

**Current implementation** (`components/dashboard/pl-by-ticker-chart.tsx`):
- Uses Recharts `BarChart` inside a `ResponsiveContainer` at fixed 300px height
- Renders 4 grouped bars per ticker: Realized P&L, Unrealized P&L, Premium P&L, Total P&L
- Wrapped in the design system `Card` component with `variant="elevated"`
- Dynamically imported in `pl-dashboard.tsx` with `next/dynamic` for code splitting
- Lives in a 2-column grid layout alongside the Win Rate chart, with the P&L Over Time chart spanning full width above

**Data model** (`PLByTickerDataPoint`):
- `ticker: string`, `realizedPL: number`, `unrealizedPL: number`, `premiumPL: number`, `totalPL: number`
- Data comes from `getPLByTicker()` query, already sorted and aggregated server-side

**Design system components available:**
- `Card`, `CardHeader`, `CardTitle`, `CardContent` -- already used by this chart
- `Button` -- could be used for expand/collapse toggle
- No existing expand/collapse or collapsible panel component in the design system

## Proposed Solutions

### Option A: Expand Icon with Height Toggle

**Description:** Add an expand/collapse icon button in the card header. When collapsed (default), the chart renders at its current 300px height. When expanded, the chart grows to 500-600px height and the chart width is calculated dynamically based on the number of tickers (e.g., `max(100%, tickerCount * 100px)`), with horizontal scrolling enabled via `overflow-x: auto` on the chart container. The Y-axis remains sticky. A visible expand icon (e.g., chevron-down or maximize icon) in the `CardHeader` next to the title provides the affordance.

**Pros:**
- Simple, familiar interaction pattern (click to expand/collapse)
- Minimal UI footprint -- just one icon button added to existing card header
- Graceful degradation: collapsed state is identical to current behavior, no regressions
- Horizontal scroll only appears when needed (many tickers), hidden for small portfolios
- Works within the existing Card component pattern

**Cons:**
- Expanding the chart pushes content below it down, which may feel jarring
- Horizontal scrolling inside a card can feel unexpected if not properly afforded
- Two interaction modes (expand + scroll) may be slightly complex for new users

**Effort:** Small
**Dependencies:** None -- uses existing Recharts, Card components, and CSS overflow

### Option B: Dedicated Fullscreen/Modal View

**Description:** Keep the dashboard chart at its current compact size as a summary view. Add a "View Full Chart" or maximize icon button that opens the P&L by Ticker chart in a fullscreen overlay/modal. The modal version renders with ample space -- full viewport width and height -- with horizontal scrolling if needed and larger bar widths for easy comparison.

**Pros:**
- Clean separation between summary (dashboard) and detail (modal) views
- No layout disruption on the dashboard -- other cards stay in place
- Maximum space for the chart in fullscreen mode
- Familiar pattern from tools like Thinkorswim and Grafana
- Easy to add more detail in the modal later (e.g., additional metrics, sorting)

**Cons:**
- Context switch: opening a modal takes the user out of the dashboard flow
- Requires building or importing a modal/overlay component (not in current design system)
- More implementation effort than a simple height toggle
- Users may not discover the fullscreen button without guidance

**Effort:** Medium
**Dependencies:** Needs a modal/overlay component (could use Headless UI Dialog or similar)

### Option C: Responsive Auto-Sizing with Horizontal Scroll

**Description:** Remove the fixed 300px height and instead make the chart container automatically size based on the number of tickers. For 1-5 tickers, render at standard size. For 6-10 tickers, increase height slightly. For 10+ tickers, enable horizontal scrolling with a fixed bar width per ticker (e.g., 80px per group of 4 bars), a sticky Y-axis, and scroll indicators (fade gradients on edges or a subtle scrollbar). No explicit expand/collapse button -- the chart adapts automatically.

**Pros:**
- Zero-click solution -- the chart always looks good regardless of ticker count
- No new UI controls to learn
- Adapts seamlessly as the user adds or removes tickers
- Scroll indicators provide clear affordance for horizontal scrolling

**Cons:**
- Less user control -- cannot manually expand for a closer look when desired
- Dynamic height changes could cause layout shifts when data loads
- Scroll indicators add visual complexity
- Harder to implement well across breakpoints (mobile, tablet, desktop)
- May not fully solve the "I want to focus on this chart" use case

**Effort:** Medium
**Dependencies:** None, but requires careful responsive CSS work and testing across breakpoints

## Recommendation

**Option A (Expand Icon with Height Toggle)** is the recommended approach. It provides the best balance of simplicity, user control, and implementation effort. The collapsed state preserves the current behavior exactly, so there is zero regression risk. The expand interaction is a well-understood pattern (used by Grafana, Google Analytics, and many dashboard tools). Horizontal scrolling only kicks in when the expanded chart needs it, keeping the experience clean for small portfolios.

Option B (Fullscreen Modal) is a strong alternative if the team wants a more dramatic separation between summary and detail views, but adds complexity and a context switch that may not be warranted for this chart alone. It could be considered as a future enhancement applicable to all dashboard charts.

Option C is elegant in theory but removes user agency and introduces layout-shift risks that are hard to get right.

## User Stories

- As a wheel trader with 3 tickers, I want the P&L by Ticker chart to look clean and readable at its default size so that I can quickly compare performance
- As a wheel trader with 15+ tickers, I want to expand the P&L by Ticker chart so that I can see all my tickers without labels overlapping
- As a wheel trader viewing an expanded chart, I want to scroll horizontally through my tickers while keeping the Y-axis visible so that I can compare dollar values accurately
- As a wheel trader who expanded the chart, I want to collapse it back to its default size so that I can return to the full dashboard overview
- As a wheel trader on a tablet, I want the expand and scroll interactions to work with touch gestures so that I can use the chart on my mobile device

## Acceptance Criteria

- [ ] An expand/collapse icon button is visible in the P&L by Ticker card header
- [ ] Clicking the expand icon increases the chart height from 300px to a larger size (500-600px)
- [ ] Clicking the collapse icon returns the chart to its default 300px height
- [ ] When expanded and the number of tickers exceeds what fits in the container width, horizontal scrolling is enabled
- [ ] The Y-axis remains visible (sticky) during horizontal scrolling
- [ ] The expand/collapse icon visually indicates the current state (e.g., chevron rotates, or maximize/minimize icons swap)
- [ ] The chart remains fully readable and functional in its default collapsed state (no regression)
- [ ] The chart renders correctly with 0 tickers (empty state unchanged), 1-5 tickers (no scroll needed), and 10+ tickers (scroll enabled when expanded)
- [ ] The expand/collapse state does not persist across page reloads (resets to collapsed)
- [ ] Touch-based horizontal scrolling works on mobile/tablet devices
- [ ] Loading and empty states continue to work correctly in both expanded and collapsed modes

## UX Considerations

**Expand/Collapse Icon Placement:** The icon should be placed in the `CardHeader`, right-aligned next to the `CardTitle` "P&L by Ticker". Use an icon from the existing icon set (e.g., `ChevronDown`/`ChevronUp` or `Maximize2`/`Minimize2` from Lucide, which is already used in the project). The icon should have a hover state and appropriate `aria-label` for accessibility.

**Animation:** The height transition should be smooth (CSS transition on `max-height` or using `framer-motion` if available). Avoid a jarring snap from 300px to 600px.

**Scroll Affordance:** When horizontal scrolling is active, consider adding subtle fade gradients on the left/right edges of the chart container to indicate scrollable content. Alternatively, rely on the visible scrollbar (styled to match the design system).

**Grid Layout Impact:** When expanded, the chart should break out of the 2-column grid and span full width (`lg:col-span-2`), pushing the Win Rate chart below. When collapsed, it returns to its single-column position. This gives the expanded chart maximum horizontal space.

**Mobile:** On small screens, the chart already spans full width. The expand interaction should still work but the height increase may be smaller (e.g., 400px instead of 600px) to avoid excessive scrolling on the page.

## Data Model Changes

None. The existing `PLByTickerDataPoint` interface and `getPLByTicker()` query are sufficient. No database or API changes are needed.

## Open Questions

- Should the expand/collapse state be remembered per session (e.g., via `sessionStorage`) or always reset to collapsed? -- Team lead decision
- Should other dashboard charts (P&L Over Time, Win Rate) also get expand/collapse icons for consistency, or is this specific to the P&L by Ticker chart? -- Team lead decision for scope
- What is the maximum number of tickers a realistic user might have? This affects the minimum bar width calculation. -- Product assumption: up to 30 tickers

## References

- [Recharts horizontal scroll patterns (GitHub issue)](https://github.com/recharts/recharts/issues/1364)
- [Scrollable graph with sticky Y-axis in Recharts (Medium)](https://medium.com/@SwathiMahadevarajan/scrollable-graph-sticky-y-axis-in-recharts-without-using-brush-3733f60b1177)
- [Dashboard design best practices for traders 2025](https://chartswatcher.com/pages/blog/top-dashboard-design-best-practices-for-traders-in-2025)
- [TradesViz trading journal (competitor)](https://www.tradesviz.com/)
- [Recharts Brush component for scroll (GeeksforGeeks)](https://www.geeksforgeeks.org/reactjs/create-a-brush-bar-chart-using-recharts-in-reactjs/)
- [Thinkorswim interactive elements (collapsible panels)](https://toslc.thinkorswim.com/center/howToTos/thinkManual/Getting-Started/Interactive-Elements)
- Current implementation: `components/dashboard/pl-by-ticker-chart.tsx`
- Dashboard page: `app/dashboard/page.tsx`
- Dashboard client component: `components/dashboard/pl-dashboard.tsx`
