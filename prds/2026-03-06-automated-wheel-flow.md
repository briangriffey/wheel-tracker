# PRD: Automated Wheel Strategy Flow

**Date:** 2026-03-06
**Author:** Product Manager Agent
**Status:** Draft
**Task ID:** 6

## Problem Statement

The wheel strategy follows a predictable lifecycle: sell a cash-secured PUT, get assigned shares, sell covered CALLs against those shares, repeat. GreekWheel already tracks trades, positions, and wheels as separate entities, but the linkages between them require manual intervention at critical transition points, breaking the natural flow of the strategy.

Today, when a user's PUT is assigned, the `assignPut` action creates a position and links it to the trade, but it does **not** automatically create or link a Wheel. The trade creation form (`TradeEntryForm`) has no concept of wheels at all -- it creates trades with no `wheelId`. Similarly, when a user sells a covered call against a position, that CALL trade is not automatically linked to the same wheel. The user must manually create wheels, and the system provides no automatic association between trades, positions, and wheels.

This means a user performing the standard wheel cycle must: (1) manually create a wheel for the ticker, (2) somehow link their PUT trade to the wheel (no UI for this exists), (3) assign the PUT (position gets created, linked to wheel only if PUT was already linked), (4) manually ensure their covered call gets linked to the wheel. This friction defeats the purpose of having wheel-level tracking and makes the Wheels Dashboard and Wheel Detail View hollow -- they only show data for manually linked entities.

## Goals

- Eliminate all manual wheel/trade/position linking for the standard wheel lifecycle (sell PUT -> assigned -> sell CALL -> repeat)
- Ensure every PUT sold (SELL_TO_OPEN) is automatically associated with an active wheel for that ticker
- Ensure PUT assignment automatically creates both a Position and a Wheel (if one doesn't exist), with all entities linked
- Ensure covered calls sold against a position are automatically linked to the same wheel
- Make the Wheels Dashboard fully populated without requiring any manual setup from the user

## Non-Goals

- Broker integration or automatic trade import (stays manual entry)
- Automatic execution of trades (user still manually enters each trade)
- Multi-leg option strategies beyond the standard wheel (straddles, strangles, spreads)
- Retroactive linking of existing trades that were created before this feature (migration can be a separate effort)
- Changes to the wheel data model itself (no new fields on the Wheel model)

## Research Findings

### Competitive Analysis

| Competitor | Approach |
|---|---|
| [OptionWheelTracker](https://optionwheeltracker.app) | Manual journaling with "campaign" grouping. Users manually log each phase. ACB recalculates automatically but trade linking is manual. Uses "1-Click Roll Tracker" for convenience. |
| [CoveredWheel](https://www.coveredwheel.com) | Free trading journal for wheel strategy. Tracks trades and cost basis but does not appear to automate linkage between phases. |
| [wheelstrategy.io](https://wheelstrategy.io) | Educational resource and calculators only. Points users to PremiumTracker.com for journaling. Notes "Full automation is hard." |
| [TrackTheta](https://www.tracktheta.com) | Options tracking with automatic P&L. Focused on theta decay tracking but not wheel-specific automation. |
| Tastyworks / Thinkorswim | Professional broker platforms. Handle assignment automatically at the brokerage level, but journaling/tracking is separate from execution. |

**Key insight:** No competing wheel tracker automatically links trades into wheel cycles. They all require manual logging of each phase. This is an opportunity for GreekWheel to differentiate by providing seamless automatic lifecycle management.

### Best Practices

From the r/thetagang and r/options communities, the most common complaints about wheel tracking tools are:
1. Having to manually create "campaigns" or "wheels" before starting to trade
2. Forgetting to link a covered call to the right position/wheel
3. Losing track of which cycle they're on
4. Cost basis not reflecting the full wheel history

The ideal UX is: user enters a trade, and the system figures out the rest. The user should never have to think about wheels, positions, or linkages -- those are bookkeeping details that the app should handle.

### Existing System Context

**Current data model supports automation.** The Prisma schema already has:
- `Trade.wheelId` (optional FK to Wheel)
- `Trade.positionId` (optional FK to Position for covered calls)
- `Position.wheelId` (optional FK to Wheel)
- `Position.assignmentTradeId` (required FK linking back to the assigned PUT)

**Current gaps in server actions:**

1. **`createTrade` (lib/actions/trades.ts:60):** Creates trades with no wheel association. Does not look up or create wheels. The `CreateTradeSchema` has no `wheelId` field.

2. **`assignPut` (lib/actions/positions.ts:52):** Creates a position and links it to the trade's wheel IF the trade already has a `wheelId`. But since `createTrade` never sets `wheelId`, this linkage never happens in practice.

3. **`TradeEntryForm` (components/forms/trade-entry-form.tsx):** No wheel awareness. No `positionId` pre-filling for covered calls. The form is the same whether you're selling a new PUT, selling a covered call, or doing anything else.

4. **`closeOption` (lib/actions/trades.ts:368):** Properly updates wheel `lastActivityAt` if the trade has a `wheelId`, but again, trades rarely have one.

5. **`assignCall` (lib/actions/positions.ts:185):** Closes the position but does not update the wheel's `cycleCount` or `totalPremiums`. The wheel's aggregate stats are never updated.

**UI gaps:**
- The "Sell Covered Call" button on `PositionCard` currently just shows a toast: "Sell covered call functionality coming soon!"
- The `AssignPutDialog` shows a "Sell Covered Call?" prompt after assignment but the follow-through (`onSellCoveredCall`) is not wired to a form that pre-fills position/wheel data.

## Proposed Solutions

### Option A: Implicit Auto-Linking in Server Actions (Backend-Only)

**Description:** Modify the existing server actions (`createTrade`, `assignPut`, `assignCall`) to automatically find-or-create wheels and link entities. No UI changes needed beyond wiring existing buttons.

The logic would be:
1. **On `createTrade` (SELL_TO_OPEN PUT):** Look for an active wheel for this user+ticker. If found, set `wheelId` on the trade. If not found, create a new ACTIVE wheel and set `wheelId`.
2. **On `createTrade` (SELL_TO_OPEN CALL with `positionId`):** Look up the position's `wheelId` and set it on the CALL trade.
3. **On `assignPut`:** Position already inherits `wheelId` from the trade (existing logic). No change needed if step 1 is implemented.
4. **On `assignCall`:** Increment the wheel's `cycleCount`, update `totalPremiums` and `totalRealizedPL`.

**Pros:**
- Minimal code changes -- modifies 3-4 server actions
- No UI redesign needed
- Backwards compatible -- old trades without `wheelId` continue to work
- Transparent to user -- they just create trades as before, everything links automatically
- Low risk of breaking existing functionality

**Cons:**
- Does not solve the "Sell Covered Call" button not working
- User still needs to manually specify `positionId` when creating a CALL (no smart pre-filling)
- No visual feedback that auto-linking happened

**Effort:** Small
**Dependencies:** None -- all required fields already exist in the schema

### Option B: Smart Trade Entry with Context-Aware Form

**Description:** Extend Option A with a smarter trade entry experience. When creating a CALL trade, the form detects open positions for that ticker and offers to link the trade as a covered call. When creating a PUT, the form shows the user's existing wheel for that ticker (if any).

The logic would be:
1. All auto-linking from Option A
2. **Enhanced `TradeEntryForm`:** When user types a ticker and selects CALL + SELL_TO_OPEN, the form queries for open positions on that ticker and shows a dropdown to select which position to sell against. If only one exists, it's auto-selected.
3. **"Sell Covered Call" button works:** Wire the position card's "Sell Covered Call" button to open the trade form pre-filled with ticker, type=CALL, action=SELL_TO_OPEN, and `positionId` set.
4. **Post-assignment flow:** After PUT assignment, the "Sell Covered Call?" prompt navigates to the trade form pre-filled for that position.
5. **Wheel status indicator:** The trade form shows a small badge like "Part of AAPL Wheel" when the trade will be auto-linked.

**Pros:**
- Fully automated lifecycle with zero manual linking
- "Sell Covered Call" button finally works
- Context-aware form reduces errors (can't accidentally sell a naked call when they mean covered)
- Visual feedback that wheel tracking is happening
- Best UX of all options -- matches how users actually think about the strategy

**Cons:**
- More code changes than Option A (form enhancements, new queries)
- Need to handle edge cases (multiple open positions for same ticker, multiple contracts)
- Slightly more complex testing surface

**Effort:** Medium
**Dependencies:** None -- all required fields already exist in the schema

### Option C: Dedicated Wheel Lifecycle Wizard

**Description:** Instead of modifying the generic trade form, create a dedicated "Wheel Dashboard" action flow. Each wheel gets action buttons that guide the user through the next step: "Sell PUT" -> "Mark Assigned" -> "Sell Covered Call" -> "Mark Assigned/Expired" -> "Sell PUT" (new cycle). Each step uses a purpose-built form that only shows relevant fields.

The logic would be:
1. All auto-linking from Option A
2. **Wheel-centric navigation:** From the Wheels Dashboard, each wheel card shows a prominent "Next Step" button based on current state
3. **Step-specific forms:** Instead of a generic trade form, the wheel drives purpose-built mini-forms:
   - "Sell PUT" form: only shows strike, premium, contracts, expiration
   - "Mark Assigned" form: one-click confirmation (like current AssignPutDialog)
   - "Sell Covered Call" form: shows position context, only asks for strike, premium, expiration
4. **Wheel creation flow:** "Start New Wheel" from the dashboard creates the wheel and immediately opens the "Sell PUT" form
5. **Progress visualization:** Each wheel shows a step indicator (like the existing Step 1/2/3 visualization) with the next action highlighted

**Pros:**
- Most guided and beginner-friendly experience
- Impossible to make linking mistakes -- the system controls the flow
- Purpose-built forms are simpler than a generic form with conditional logic
- Wheel Dashboard becomes the primary navigation hub
- Step visualization makes the strategy tangible for new users

**Cons:**
- Largest implementation effort -- new forms, new routes, new components
- Duplicates some functionality with existing trade/position pages
- Users who prefer the generic trade form may find it restrictive
- Does not help users who enter trades from the Trades page directly
- Need to maintain two pathways (generic trade form still exists)

**Effort:** Large
**Dependencies:** Requires Option A as a foundation. May also want to revisit the Wheel Detail page layout.

## Recommendation

**Option B (Smart Trade Entry with Context-Aware Form)** is the recommended approach. It provides the best balance of automation, UX improvement, and implementation effort.

Option A alone is insufficient because the "Sell Covered Call" button doesn't work and users have no way to specify `positionId` in the current form. Option C is ideal long-term but is too large for the current scope and can be built incrementally on top of Option B.

Option B solves the core problem (automatic linking) while also completing a partially-built feature (the "Sell Covered Call" flow) and providing visual feedback to users. It can be implemented incrementally: backend auto-linking first (Option A), then form enhancements.

## User Stories

- As a wheel trader, I want my PUT trade to be automatically associated with a wheel for that ticker so that I don't have to manually create and manage wheels.
- As a wheel trader, when my PUT is assigned, I want the resulting position and the original PUT trade to all be linked to the same wheel automatically.
- As a wheel trader, I want to sell a covered call from my position card and have it automatically linked to the correct position and wheel.
- As a wheel trader, after my PUT is assigned, I want to be guided to sell a covered call with the form pre-filled so I can quickly continue the wheel cycle.
- As a wheel trader, I want to see which wheel a trade belongs to when I create it, so I have confidence the system is tracking my strategy correctly.
- As a wheel trader, I want my wheel's stats (cycle count, total premiums, total P&L) to update automatically as I complete cycles.

## Acceptance Criteria

- [ ] When a user creates a SELL_TO_OPEN PUT trade, the system automatically finds or creates an ACTIVE wheel for that user+ticker and sets `wheelId` on the trade.
- [ ] When a PUT is assigned via `assignPut`, the created position inherits the trade's `wheelId` (this already works if `wheelId` is set on the trade).
- [ ] When a user creates a SELL_TO_OPEN CALL with a `positionId`, the system automatically sets the trade's `wheelId` to match the position's `wheelId`.
- [ ] The "Sell Covered Call" button on the position card opens a trade form pre-filled with: ticker, type=CALL, action=SELL_TO_OPEN, positionId, and contracts matching the position's shares/100.
- [ ] After PUT assignment, the "Sell Covered Call" prompt navigates to a pre-filled trade form for the newly created position.
- [ ] When a CALL is assigned via `assignCall`, the wheel's `cycleCount` is incremented by 1, and `totalPremiums` and `totalRealizedPL` are updated.
- [ ] When a CALL expires worthless (trade status -> EXPIRED), the wheel's `lastActivityAt` is updated.
- [ ] The trade entry form shows a contextual indicator (e.g., "Linked to AAPL Wheel") when a trade will be auto-linked to a wheel.
- [ ] When creating a CALL (SELL_TO_OPEN) and the user types a ticker with open positions, the form shows a position selector dropdown.
- [ ] If there is exactly one open position for a ticker, it is auto-selected when creating a covered call.
- [ ] Existing trades without `wheelId` continue to function normally (no regressions).
- [ ] Wheels Dashboard accurately reflects all auto-linked trades and positions.
- [ ] All auto-linking happens within database transactions to ensure consistency.

## UX Considerations

**Trade Entry Form Changes:**
- When type=CALL and action=SELL_TO_OPEN, show a "Position" dropdown below the ticker field. Populate it with the user's open positions for that ticker. Format: "{shares} shares @ {costBasis}/share (acquired {date})".
- When auto-linked to a wheel, show a small info banner below the form header: "This trade will be added to your {ticker} wheel."
- If opened from the position card's "Sell Covered Call" button, the ticker, type, action, contracts, and positionId should all be pre-filled and the position field should be read-only.

**AssignPutDialog Enhancement:**
- The "Sell Covered Call" prompt after assignment should navigate to the trade form with pre-filled values. The prompt already exists in `assign-put-dialog.tsx` -- the `onSellCoveredCall` callback just needs to be wired to the form.

**Position Card "Sell Covered Call" Button:**
- Currently shows a toast saying "coming soon." Replace with actual functionality that opens the trade form (either modal or navigation) with pre-filled values.

**Wheel Badge in Trade List:**
- In the trades list table, show a small wheel icon or badge next to trades that are part of a wheel. Clicking it navigates to the wheel detail page.

## Data Model Changes

No schema changes are required. All necessary fields already exist:
- `Trade.wheelId` (optional String)
- `Trade.positionId` (optional String)
- `Position.wheelId` (optional String)
- `Wheel` model with `cycleCount`, `totalPremiums`, `totalRealizedPL`

The changes are purely in server action logic and UI components.

## Open Questions

1. **What happens when a user has multiple open positions for the same ticker?** (e.g., assigned on two separate PUTs at different strikes) -- The position selector dropdown handles this, but should the system warn the user? -- Team lead to decide.
2. **Should we auto-link BUY_TO_CLOSE trades to wheels?** When a user buys back a PUT or CALL early, should that trade's `wheelId` be set? Currently `closeOption` already updates the wheel's `lastActivityAt` if `wheelId` is set. -- Recommend yes, for completeness.
3. **Should existing orphaned trades be migrated?** Users who created trades before this feature will have trades without `wheelId`. Should we provide a one-time migration or a manual "Link to Wheel" action? -- Recommend deferring to a separate task.
4. **Should wheel creation happen for BUY_TO_CLOSE trades?** If a user enters a BUY_TO_CLOSE trade for a ticker with no wheel, should a wheel be created? -- Recommend no, only SELL_TO_OPEN triggers wheel creation.
5. **What status should the wheel have after a CALL assignment closes the position?** Currently ACTIVE. Should it change to IDLE to indicate the cycle is complete and the user should sell a new PUT? -- Team lead to decide, but recommend changing to IDLE and back to ACTIVE when a new PUT is sold.

## References

- [OptionWheelTracker](https://optionwheeltracker.app) -- Competitor with campaign-based manual tracking
- [CoveredWheel](https://www.coveredwheel.com) -- Free wheel strategy journal
- [wheelstrategy.io](https://wheelstrategy.io) -- Educational resource noting "Full automation is hard"
- [TrackTheta](https://www.tracktheta.com) -- Theta decay focused tracker
- Current codebase: `lib/actions/trades.ts`, `lib/actions/positions.ts`, `lib/actions/wheels.ts`, `components/forms/trade-entry-form.tsx`, `components/trades/assign-put-dialog.tsx`, `components/positions/position-card.tsx`
