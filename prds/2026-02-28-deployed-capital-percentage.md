# PRD: Deployed Capital Percentage

**Date:** 2026-02-28
**Author:** Product Manager Agent
**Status:** Draft
**Task ID:** 6

## Problem Statement

Options traders running the wheel strategy need to understand how much of their total account value is currently tied up in open positions (cash-secured puts and stock holdings). Today, GreekWheel tracks deposits/withdrawals (net invested capital) and shows open position costs on the dashboard, but it does not surface the relationship between the two as a clear, at-a-glance percentage.

Without a deployed capital percentage, traders cannot quickly answer the question: "How much of my account is currently at risk?" This is critical for the wheel strategy because selling cash-secured puts requires holding the full assignment value in reserve. A trader at 90% deployment has very little room to manage positions that move against them or to seize new opportunities, while a trader at 50% has significant flexibility. The community consensus (r/thetagang, Option Alpha, Rockwell Trading) is that keeping deployment between 50-70% is prudent, with anything above 80% considered aggressive.

Currently, to compute this number a user would have to manually cross-reference data from the Deposits page (net invested) with data from the Positions and Trades pages (open PUT collateral + open position cost). The information exists in the system but is not synthesized or presented.

## Goals

- Surface deployed capital percentage prominently on the P&L Dashboard so traders see it at a glance
- Show per-position and per-wheel deployment contribution to help traders understand allocation
- Enable traders to maintain healthy capital utilization by making over-deployment visible
- No new data entry required -- compute entirely from existing CashDeposit, Trade, and Position data

## Non-Goals

- Margin account support -- this feature assumes a cash-secured account model (no leverage)
- Real-time buying power sync with a brokerage (e.g., IBKR, Schwab API integration)
- Configurable deployment thresholds or alerts (could be a future enhancement)
- Changes to the deposit/withdrawal flow or data model
- Historical deployed-capital-over-time charting (could be a future enhancement)

## Research Findings

### Competitive Analysis

**Thinkorswim (Schwab):** Shows "Option Buying Power" and "Cash Available to Trade" in the Account Info sidebar. Traders can see total equity minus maintenance requirements. However, it does not express this as a simple percentage of account value, which many users find unintuitive.

**Tastytrade:** Displays "Net Liq" (net liquidation value) alongside "Buying Power" and "Buying Power Used." The platform does not directly show a single "% deployed" number but makes the raw values prominently available. Advanced users derive the percentage manually.

**OptionWheelTracker.app:** Focuses on per-campaign ACB (adjusted cost basis) tracking. Does not surface a portfolio-wide deployment percentage. Each ticker campaign shows its own capital requirements but there is no aggregation across campaigns relative to total account size.

**Option Alpha:** Recommends position sizing as a percentage of account value (typically 1-5% per position). Their content emphasizes tracking overall capital allocation but their free tools do not include a deployment dashboard.

**Google Sheets / Notion trackers:** Community spreadsheets (TradingOptionsCashflow, OptionBoxer, Drawbridge Finance) often include a "% of portfolio" column per position but require manual account balance entry.

**Key takeaway:** No competing wheel tracker product surfaces a clean "deployed capital %" metric. This is a differentiator for GreekWheel.

### Best Practices

1. **Position sizing rule of thumb:** Most wheel strategy educators recommend deploying no more than 10-15% of portfolio per single underlying, and keeping total deployment under 50-70% to maintain flexibility.
2. **Buying Power Reduction (BPR):** The industry-standard way to express capital tied up by a position. For cash-secured puts, BPR = strike price * 100 * contracts. For stock positions, BPR = total cost of shares.
3. **Visual thresholds:** Financial dashboards commonly use color-coded gauges or progress bars to show utilization: green (<50%), yellow (50-70%), orange (70-85%), red (>85%). This mirrors CPU/memory utilization dashboards that users are familiar with.
4. **Percentage as primary, dollar amount as secondary:** Users find the percentage more actionable than raw dollar amounts because it is normalized to their account size.

### Existing System Context

**Data available for computation:**

- `CashDeposit` model: Stores deposits and withdrawals with `amount` and `type` (DEPOSIT/WITHDRAWAL). The `getDepositSummary()` action already computes `netInvested` (total deposits minus total withdrawals). This represents the "account value from net deposits" -- the denominator of the deployed capital formula.

- `Trade` model: Open PUT trades (`status=OPEN`, `type=PUT`) represent capital that is reserved (cash-secured). The capital held per put = `strikePrice * shares` (where shares = contracts * 100).

- `Position` model: Open positions (`status=OPEN`) represent capital deployed in stock. The capital deployed = `totalCost`.

- `DashboardMetrics` interface in `lib/queries/dashboard.ts`: Already computes `cashDeposits` (netInvested), and the query already fetches open positions and open trades. The infrastructure to add the new metric is straightforward.

- `MetricCard` and `StatCard` components: Existing dashboard components support `currency`, `percentage`, and `number` formatting. A new percentage metric can use these directly.

**Formula:**

```
Deployed Capital ($) = SUM(open PUT strikePrice * shares) + SUM(open position totalCost)
Account Value ($) = netInvested (sum of deposits - sum of withdrawals)
Deployed Capital (%) = (Deployed Capital / Account Value) * 100
```

Note: Open CALL trades do NOT consume additional capital beyond the shares already held, so they are excluded.

## Proposed Solutions

### Option A: Dashboard-Only Metric Card

**Description:** Add a single new `MetricCard` to the P&L Dashboard's "Portfolio Overview" row showing "Capital Deployed" as a percentage, with the dollar amount as a subtitle. The computation happens server-side in `getDashboardMetrics()` and is returned alongside existing metrics.

**Pros:**
- Minimal implementation effort; leverages existing `MetricCard` component and `getDashboardMetrics` query
- Data is already largely available in the dashboard query (open positions, trades, deposits)
- Consistent with the existing dashboard layout and UX patterns
- No new API endpoints, no new database queries, no schema changes

**Cons:**
- Only visible on the dashboard page; users on other pages (Wheels, Trades) cannot see deployment at a glance
- No per-position or per-ticker breakdown of deployment contribution
- No visual indicator (color/gauge) for deployment health -- just a number

**Effort:** Small
**Dependencies:** None -- all required data is already queried in `getDashboardMetrics`

### Option B: Dashboard Metric Card + Per-Wheel Deployment on Wheels Pages

**Description:** Same as Option A, plus: on each Wheel Detail page (`/wheels/[id]`), show the percentage of total capital that this specific wheel consumes. On the Wheels List page, add a "Capital %" column or badge to each wheel card. The dashboard gets the aggregate metric; the wheel pages get per-wheel context.

**Pros:**
- Gives traders both the portfolio-level view (dashboard) and the per-wheel view (wheels pages)
- Helps traders identify which wheels are consuming the most capital, enabling better rebalancing decisions
- Per-wheel deployment is directly actionable: "TSLA is using 25% of my account, that's too much"
- Builds on the existing WheelOverview metrics grid (which already shows 4 stats)

**Cons:**
- More implementation surface area: changes to dashboard query, wheel detail page, wheels list page
- Requires computing per-wheel deployment by aggregating open PUT trades and open positions per wheel, which means modifying the `getWheelDetail` action or adding a new query
- The wheel detail page is a server component that would need the deposit summary passed down or fetched independently

**Effort:** Medium
**Dependencies:** The `getWheelDetail` action needs to include open PUT strike * shares data; the wheels pages need access to the user's net invested figure for the denominator.

### Option C: Dashboard Metric with Visual Gauge + Per-Wheel Badges + Scanner Integration

**Description:** Everything from Option B, plus: replace the simple percentage number on the dashboard with a visual gauge/progress bar that uses color thresholds (green/yellow/orange/red). Also integrate with the scanner: when a user views scan results, show how selecting a new PUT on a given ticker would change their deployed capital percentage (a "what-if" preview).

**Pros:**
- Best user experience: the visual gauge instantly communicates deployment health without reading a number
- Scanner integration helps traders make informed decisions before opening new positions
- Color thresholds follow industry-standard UX patterns for utilization dashboards
- Most complete solution that addresses awareness, per-position context, and forward-looking decision support

**Cons:**
- Largest implementation effort spanning dashboard, wheels, and scanner
- Scanner "what-if" requires calculating prospective capital deployment for a trade that does not yet exist
- Visual gauge component does not exist in the current design system and would need to be built
- Risk of scope creep; the scanner integration touches a multi-phase pipeline

**Effort:** Large
**Dependencies:** New gauge/progress-bar component for the design system; scanner results would need access to the user's capital data; `ScanResult` display components would need modification.

## Recommendation

**Option B (Dashboard Metric Card + Per-Wheel Deployment)** strikes the right balance between user value and implementation effort. It gives traders the critical portfolio-level metric on the dashboard and the per-wheel context they need to make rebalancing decisions -- without the complexity of building a new gauge component or modifying the scanner pipeline.

Option A is viable as a first pass but leaves significant value on the table. Option C is the aspirational end state but introduces unnecessary scope for an initial release. The gauge and scanner integration from Option C can be built incrementally in follow-up work after Option B validates the feature.

## User Stories

- As a wheel trader, I want to see what percentage of my deposited capital is currently deployed so that I can assess my overall risk exposure at a glance.
- As a wheel trader, I want to see the dollar amount of deployed capital alongside the percentage so that I understand the absolute magnitude.
- As a wheel trader, I want to see how much capital each wheel is consuming (as a percentage of my total account) so that I can identify over-concentrated positions.
- As a wheel trader, I want the deployed capital percentage to update when I change the dashboard time range so that it reflects the current snapshot regardless of filter.

## Acceptance Criteria

- [ ] The P&L Dashboard "Portfolio Overview" row includes a new metric card showing "Deployed Capital" with the percentage value (e.g., "62.5%") and a subtitle showing the dollar amount (e.g., "$31,250 of $50,000").
- [ ] Deployed capital is calculated as: (sum of open PUT `strikePrice * shares` + sum of open position `totalCost`) / `netInvested` * 100.
- [ ] Open CALL trades are excluded from the deployed capital numerator (shares are already counted via position totalCost).
- [ ] If the user has no deposits recorded (netInvested = 0), the metric displays "N/A" or a prompt to record deposits rather than dividing by zero.
- [ ] The deployed capital percentage uses the `colorize` prop on `MetricCard` to show green when under 50%, yellow/neutral when 50-70%, and red when over 85%.
- [ ] Each Wheel Detail page (`/wheels/[id]`) shows the capital deployed by that wheel as both a dollar amount and a percentage of the user's total account.
- [ ] Each wheel card on the Wheels List page (`/wheels`) shows the capital percentage for that wheel (e.g., a small badge or additional metric).
- [ ] The `DashboardMetrics` TypeScript interface is extended with `deployedCapitalAmount`, `deployedCapitalPercent`, and `accountValue` fields.
- [ ] The API endpoint `/api/dashboard` returns the new fields.
- [ ] The metric updates correctly when the time range selector is changed (though deployment is always a current-snapshot metric, not a historical one -- the metric should remain consistent across time ranges).

## UX Considerations

**Dashboard placement:** The new "Deployed Capital" card should be added to the "Portfolio Overview" row (currently 3 cards: Total Portfolio Value, If You Bought SPY, vs SPY). It can be added as a 4th card in the row, which the existing `grid-cols-1 md:grid-cols-3` would need to change to `md:grid-cols-4` or `md:grid-cols-2 lg:grid-cols-4` for better responsive behavior.

**Metric card format:** Use the existing `MetricCard` component with `formatAs="percentage"` and a subtitle for the dollar breakdown. Example rendering:

```
Deployed Capital
62.5%
$31,250 of $50,000
```

**Color coding:** Leverage the existing `colorize` behavior but with a custom interpretation:
- Green: < 50% deployed (conservative, lots of flexibility)
- Default (gray/neutral): 50-70% deployed (moderate, acceptable range)
- Orange/Yellow: 70-85% deployed (getting aggressive)
- Red: > 85% deployed (over-deployed, limited flexibility)

Note: The current `MetricCard` `colorize` prop uses positive/negative logic for P&L. The color logic for deployment will need custom handling since higher values are worse, not better.

**Wheel Detail page:** Add a 5th stat to the existing 4-stat metrics grid in `WheelOverview`. The new stat would be "Capital Deployed" showing "$15,000 (30%)" or similar. This fits naturally in the existing grid layout.

**Wheels List page:** On each wheel card, add a small text line or badge showing the capital percentage. This should be subtle and not overwhelm the existing card design.

**Mobile considerations:** The dashboard grid should stack gracefully on mobile. The 4-card Portfolio Overview row should collapse to a 2x2 grid on medium screens and a single column on small screens. The existing responsive grid pattern (`grid-cols-1 md:grid-cols-3`) already handles this, just needs the breakpoint adjusted.

**Edge cases:**
- Zero deposits: Show "N/A" with a subtitle "Record deposits to track" linked to `/deposits`
- Over 100% deployment: Possible if deposits were withdrawn after positions were opened. Show the value in red (e.g., "112.5%") without capping at 100%.
- No open positions or puts: Show "0%" with subtitle "$0 of $50,000"

## Data Model Changes

No database schema changes are required. All data needed for this feature already exists:

- `CashDeposit.amount` and `CashDeposit.type` provide net invested (denominator)
- `Trade.strikePrice`, `Trade.shares`, `Trade.status`, `Trade.type` provide open PUT capital (part of numerator)
- `Position.totalCost` and `Position.status` provide open position capital (part of numerator)

The only changes are to computed values in the application layer:

1. **`DashboardMetrics` interface** (`lib/queries/dashboard.ts`): Add `deployedCapitalAmount: number`, `deployedCapitalPercent: number`, `accountValue: number`.

2. **`getDashboardMetrics` function** (`lib/queries/dashboard.ts`): Already queries open positions and trades. Add aggregation logic to sum up open PUT capital requirements and include it in the return value.

3. **Wheel detail/list queries**: May need to be extended to include per-wheel deployment data (open PUT trades and open position costs scoped to a specific wheel).

## Open Questions

- **Should deployed capital include pending/open CALL assignments?** If a covered call is deep ITM and likely to be assigned, should the capital be considered "about to be freed"? For simplicity, the initial implementation should count only the current state (shares still held = capital deployed). -- Needs confirmation from team lead.
- **Should the percentage color thresholds be user-configurable?** Some traders may consider 70% conservative while others consider it aggressive. For the initial release, hardcoded thresholds are simpler. -- Product decision, suggest hardcoded first.
- **Does the time range selector affect deployed capital?** Deployed capital is inherently a "right now" metric. Changing the time range to "1M" should not filter out current open positions. The metric should always show the current snapshot. -- Needs confirmation from team lead.

## References

- [Wheel Options Strategy Guide - Options Cafe](https://options.cafe/blog/wheel-options-strategy-complete-guide/)
- [Position Sizing - Option Alpha](https://optionalpha.com/learn/position-sizing)
- [Option Buying Power Explained - Options Trading IQ](https://optionstradingiq.com/option-buying-power-explained/)
- [OptionWheelTracker.app](https://optionwheeltracker.app)
- [r/thetagang discussion on wheel capital requirements](https://reddit.garudalinux.org/r/thetagang/comments/10nz72y/is_the_wheel_really_worth_it_to_do/)
- [ThetaGang bot (IBKR automation)](https://github.com/brndnmtthws/thetagang)
- [Thinkorswim Account Info docs](https://toslc.thinkorswim.com/center/howToTos/thinkManual/Left-Sidebar/Account-Info)
- [Tastytrade Portfolio Margin](https://tastytrade.com/learn/accounts/account-resources/what-is-portfolio-margin-how-it-works/)
- [Best Stocks for Wheel Strategy 2026 - Options Cafe](https://options.cafe/blog/best-stocks-for-wheel-strategy/)
