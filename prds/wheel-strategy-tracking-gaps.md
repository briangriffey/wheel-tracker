# Wheel Strategy Tracking - Gap Analysis & Implementation Plan

**Document Version:** 1.0
**Created:** 2026-02-08
**Status:** Implementation Roadmap

---

## Executive Summary

This document identifies the gaps between the Wheel Strategy Tracking PRD (prds/wheel-strategy-tracking.md) and the current implementation. Analysis reveals that while foundational infrastructure exists (database schema, basic CRUD operations), most of the guided workflow features, validation rules, and automation that make the wheel strategy seamless are **not implemented**.

**Critical Missing Features:**
- ❌ Roll options functionality (completely absent)
- ❌ Early close options (BUY_TO_CLOSE flows)
- ❌ Guided PUT assignment dialog
- ❌ Guided "Sell Covered Call" dialog
- ❌ Automatic wheel lifecycle management
- ❌ Wheel-aware trade creation (selling a PUT doesn't start a wheel)
- ❌ Comprehensive validation rules
- ❌ Enhanced position states (COVERED, PENDING_CLOSE)
- ❌ Notification delivery system
- ❌ Complete analytics/reporting UI

---

## Implementation Status Overview

### ✅ What Has Been Implemented

#### Foundation Layer (Phase 1)
- ✅ Wheel database schema (`Wheel` model with status, cycleCount, premiums, P&L tracking)
- ✅ Roll tracking fields in schema (`rolledFromId`, `rolledToId`)
- ✅ Wheel relationship fields on Trade and Position models
- ✅ Basic wheel CRUD actions:
  - `createWheel()`
  - `getWheels()`
  - `getWheelDetail()`
  - `updateWheel()`
  - `pauseWheel()`
  - `completeWheel()`
- ✅ Wheels list page (`/wheels`)
- ✅ Wheel detail page (`/wheels/[id]`)
- ✅ Wheel visualization components (charts, status, cycle history)

#### Trade & Position Management
- ✅ Trade CRUD operations (`createTrade`, `updateTrade`, `deleteTrade`, `updateTradeStatus`)
- ✅ Position tracking with assignment trades
- ✅ `assignPut()` - Creates position from PUT assignment
- ✅ `assignCall()` - Closes position from CALL assignment with P&L calculation
- ✅ Position queries with related trades

#### Batch Operations
- ✅ `batchMarkExpired()` - Mark multiple trades as expired
- ✅ `batchMarkAssigned()` - Mark multiple trades as assigned
- ✅ `batchUpdateTradeStatus()` - Generic batch status update
- ✅ Expiration calendar page (`/expirations`)
- ✅ Expiration calendar component with grouped trades

#### Notification Queries
- ✅ `getUpcomingExpirations()` - Trades expiring in N days
- ✅ `getITMOptions()` - Options that are in-the-money
- ✅ `getPositionsWithoutCalls()` - Positions ready for covered calls

#### UI Components
- ✅ `<AssignCallDialog>` - Guided CALL assignment with P&L summary and "Start New PUT" prompt
- ✅ `<PositionCard>` - Display position details with actions
- ✅ `<WheelCard>` - Wheel summary card
- ✅ Wheel analytics components (status, cycle history, trades list)

---

### ❌ What Is Missing (Implementation Gaps)

The following sections are organized sequentially to ensure proper implementation order and avoid gaps.

---

## STORY 1: Roll Options Functionality

**Priority:** HIGH
**PRD Reference:** User Story 7 (lines 477-502), FR-2 (lines 554-581)
**Status:** ❌ NOT IMPLEMENTED

### What's Missing

1. **Server Action:** `rollOption()` function
   - Should accept: current trade ID, new strike, new expiration, premiums
   - Creates two linked trades: BUY_TO_CLOSE (current) + SELL_TO_OPEN (new)
   - Calculates net credit/debit
   - Preserves wheel continuity (same wheelId)
   - Updates wheel lastActivityAt

2. **Validation Schema:** `RollOptionSchema` and `RollOptionInput` type
   - Validate new strike and expiration are valid
   - Ensure trade is OPEN before rolling
   - Verify both premiums are provided

3. **UI Component:** `<RollOptionDialog>`
   - Shows current option details (strike, expiration, premium)
   - Input fields for new strike, new expiration
   - Input fields for close premium and open premium
   - Displays net credit/debit calculation
   - Shows "You will receive/pay $X" message
   - Confirmation button

4. **Integration Points:**
   - Trade detail page: Add "Roll Option" button for OPEN trades
   - Trade list: Add roll action in dropdown menu
   - Position card: Add "Roll Call" button for active covered calls

### Acceptance Criteria
- [ ] `rollOption()` server action creates two linked trades atomically
- [ ] Rolled trades show relationship in UI (rolledFrom/rolledTo)
- [ ] Net premium calculated and displayed correctly
- [ ] Wheel status and lastActivityAt updated
- [ ] Cannot roll CLOSED, EXPIRED, or ASSIGNED trades
- [ ] Both trades share same wheelId

### Files to Create/Modify
- `lib/actions/roll-options.ts` - New file with rollOption action
- `lib/validations/roll-option.ts` - New file with validation schema
- `components/trades/roll-option-dialog.tsx` - New dialog component
- `app/trades/[id]/page.tsx` - Add roll button to trade detail
- `components/positions/position-card.tsx` - Add roll call button

---

## STORY 2: Early Close Options (BUY_TO_CLOSE)

**Priority:** HIGH
**PRD Reference:** Implicit in FR-2 (lines 554-581) and trade actions
**Status:** ⚠️ PARTIALLY IMPLEMENTED (schema exists, no UI)

### What's Missing

1. **Guided Close Flow:** `<CloseOptionDialog>`
   - Accept close premium (user enters amount paid to buy back)
   - Calculate net profit/loss (original premium - close premium)
   - Show "Are you sure?" confirmation
   - Updates trade status to CLOSED
   - For covered calls: position returns to OPEN status (no longer covered)

2. **Integration with Positions:**
   - When closing a covered CALL early, position should become OPEN again
   - Position status should be recalculated (COVERED → OPEN)
   - Update position's list of covered calls

3. **UI Integration Points:**
   - Trade detail page: "Close Early" or "Buy to Close" button
   - Trade list: "Close" action in dropdown
   - Position card: "Close Call Early" for active covered calls

### Acceptance Criteria
- [ ] `<CloseOptionDialog>` component created
- [ ] Dialog shows premium collected vs. premium paid
- [ ] Net P&L displayed (original - close premium)
- [ ] Trade status updated to CLOSED with closeDate
- [ ] For covered calls, position status reverts to OPEN
- [ ] Cannot close already CLOSED, EXPIRED, or ASSIGNED trades

### Files to Create/Modify
- `components/trades/close-option-dialog.tsx` - New dialog component
- `lib/actions/trades.ts` - Enhance closeOption logic to handle covered calls
- `app/trades/[id]/page.tsx` - Add "Buy to Close" button
- `components/positions/position-card.tsx` - Add "Close Call Early" button

---

## STORY 3: Guided PUT Assignment Dialog

**Priority:** HIGH
**PRD Reference:** User Story 2 (lines 297-328), FR-4 (lines 615-648)
**Status:** ❌ NOT IMPLEMENTED

### What's Missing

1. **UI Component:** `<AssignPutDialog>`
   - Display PUT details (ticker, strike, premium, contracts)
   - Calculate and show:
     - Total cost (strike × shares)
     - Premium credit received
     - Effective cost basis per share
     - Current stock price (if available)
     - Unrealized gain/loss at current price
   - Warning if significant unrealized loss
   - Confirmation button "Assign PUT & Create Position"
   - After assignment: Optional prompt "Sell Covered Call?"

2. **Enhanced `assignPut()` Action:**
   - Add wheelId parameter (if PUT belongs to wheel)
   - Update wheel status to appropriate state
   - Increment wheel lastActivityAt
   - Link position to wheel

3. **Integration Points:**
   - Trade detail page for PUT trades
   - Expiration calendar: "Assign" action for ITM PUTs
   - Dashboard: ITM PUT notifications with quick assign button

### Acceptance Criteria
- [ ] `<AssignPutDialog>` component shows cost breakdown clearly
- [ ] Current price fetched and unrealized P&L calculated
- [ ] After assignment, optional "Sell Call" prompt appears
- [ ] Wheel status updated (if trade belongs to wheel)
- [ ] Position correctly linked to both assignmentTrade and wheel
- [ ] Cannot assign non-PUT trades or already assigned trades

### Files to Create/Modify
- `components/trades/assign-put-dialog.tsx` - New dialog component
- `lib/actions/positions.ts` - Enhance assignPut to update wheel
- `app/trades/[id]/page.tsx` - Add "Assign PUT" button for PUT trades
- `components/expirations/expiration-row.tsx` - Add assign button

---

## STORY 4: Guided "Sell Covered Call" Dialog

**Priority:** HIGH
**PRD Reference:** User Story 3 (lines 329-360), FR-4 (lines 615-648)
**Status:** ⚠️ PARTIALLY IMPLEMENTED (callback exists, no dialog)

### What's Missing

1. **UI Component:** `<SellCoveredCallDialog>`
   - Pre-filled fields:
     - Ticker (locked from position)
     - Position ID (locked)
     - Contracts (locked to position size / 100)
   - User input fields:
     - Strike price (with suggested strikes)
     - Premium collected
     - Expiration date (date picker)
   - Validation warnings:
     - ⚠️ Strike < cost basis → "Will realize loss if assigned"
     - ✓ Strike > cost basis → "Will realize gain if assigned"
     - ❌ Position already has active CALL → "Cannot sell multiple calls"
   - "Sell Call" confirmation button

2. **Enhanced `createTrade()` for Covered Calls:**
   - Validate no existing OPEN calls on position
   - Link trade to position (positionId)
   - Link trade to wheel (if position has wheelId)
   - Update position status to COVERED (NEW state needed)
   - Update wheel lastActivityAt

3. **Integration Points:**
   - Position detail page: "Sell Covered Call" button
   - Position card: "Sell Call" quick action
   - After PUT assignment: immediate "Sell Call?" prompt
   - Dashboard: "Positions without calls" widget with sell buttons

### Acceptance Criteria
- [ ] `<SellCoveredCallDialog>` pre-fills ticker, position, contracts
- [ ] Strike price validation with warnings (below/above cost basis)
- [ ] Cannot create call if position already has OPEN call
- [ ] Position status changes to COVERED after call created
- [ ] Trade correctly linked to both position and wheel
- [ ] Suggested strikes displayed based on current price

### Files to Create/Modify
- `components/positions/sell-covered-call-dialog.tsx` - New dialog component
- `lib/validations/trade.ts` - Add validation for covered calls
- `lib/actions/trades.ts` - Enhance createTrade to handle covered calls
- `app/positions/[id]/page.tsx` - Add "Sell Call" button
- `components/positions/position-card.tsx` - Enhance with sell call action

---

## STORY 5: Automatic Wheel Lifecycle Management

**Priority:** HIGH
**PRD Reference:** FR-1 (lines 507-553), User Stories 1-4
**Status:** ❌ NOT IMPLEMENTED

### What's Missing

1. **Wheel Status State Machine:**
   - Current: Only ACTIVE, IDLE, PAUSED, COMPLETED exist
   - Missing: No automatic transitions based on trades/positions
   - Needed: Track current step in cycle (PUT → HOLDING → COVERED → COMPLETE)

2. **Automatic Wheel Linking:**
   - When creating a PUT trade, prompt: "Start new wheel?" or "Add to existing wheel?"
   - If no active wheel for ticker exists, auto-create one
   - Link trade to wheel immediately (wheelId)

3. **Cycle Count Increment:**
   - When CALL is assigned (position closes), increment wheel.cycleCount
   - Update wheel.totalPremiums (sum of all premiums)
   - Update wheel.totalRealizedPL (sum of all closed position P&L)

4. **Wheel Status Transitions:**
   - IDLE → ACTIVE: When PUT created
   - ACTIVE (PUT phase) → ACTIVE (HOLDING phase): When PUT assigned
   - ACTIVE (HOLDING) → ACTIVE (COVERED): When CALL created
   - ACTIVE (COVERED) → IDLE: When CALL assigned (cycle complete)

5. **Server Action Enhancements:**
   - `createTrade()`: Check for wheel, prompt to create/link
   - `assignPut()`: Update wheel to "holding" state
   - `createTrade()` (for CALL): Update wheel to "covered" state
   - `assignCall()`: Increment cycle, update totals, set to IDLE

### Acceptance Criteria
- [ ] Creating a PUT prompts for wheel creation/linking
- [ ] Wheel status automatically transitions based on trades/positions
- [ ] Cycle count increments when position closes
- [ ] Total premiums and realized P&L aggregate correctly
- [ ] Wheel "current step" visible in UI (Step 1/3, Step 2/3, etc.)
- [ ] Cannot have multiple active PUTs on same wheel simultaneously

### Files to Create/Modify
- `lib/actions/wheels.ts` - Add updateWheelStatus(), incrementCycle()
- `lib/actions/trades.ts` - Enhance to prompt for wheel linking
- `lib/actions/positions.ts` - Enhance assignPut/assignCall to update wheel
- `components/trades/wheel-link-prompt.tsx` - New prompt component
- `lib/types/wheel.ts` - Add WheelStep enum

---

## STORY 6: Enhanced Position States

**Priority:** MEDIUM
**PRD Reference:** FR-3 (lines 583-614)
**Status:** ❌ NOT IMPLEMENTED (only OPEN and CLOSED exist)

### What's Missing

1. **Database Schema Update:**
   - Current: `enum PositionStatus { OPEN, CLOSED }`
   - Needed: `enum PositionStatus { OPEN, COVERED, PENDING_CLOSE, CLOSED }`
   - Migration to add new states

2. **State Transitions:**
   - OPEN: Position acquired, no active CALL
   - COVERED: Position has an active (OPEN) CALL
   - PENDING_CLOSE: CALL is ITM near expiration (auto-detected)
   - CLOSED: Position sold via CALL assignment

3. **Business Logic:**
   - When CALL created against position → COVERED
   - When CALL expires/closes → OPEN
   - When CALL is ITM within 3 days of expiration → PENDING_CLOSE
   - When CALL assigned → CLOSED

4. **UI Updates:**
   - Position cards show status badge (Open, Covered, Pending Close)
   - Different actions available based on status
   - Color coding: OPEN (blue), COVERED (green), PENDING_CLOSE (yellow), CLOSED (gray)

### Acceptance Criteria
- [ ] Database migration adds COVERED and PENDING_CLOSE states
- [ ] Position status updates when CALL created/closed
- [ ] PENDING_CLOSE detected automatically for ITM calls near expiration
- [ ] UI shows correct status badge and color
- [ ] Cannot sell call if status is COVERED (validation)

### Files to Create/Modify
- `prisma/schema.prisma` - Update PositionStatus enum
- `prisma/migrations/` - Create migration script
- `lib/actions/positions.ts` - Add status transition logic
- `lib/queries/positions.ts` - Add pending close detection query
- `components/positions/position-status-badge.tsx` - New component

---

## STORY 7: Comprehensive Validation Rules

**Priority:** MEDIUM
**PRD Reference:** FR-7 (lines 710-741)
**Status:** ❌ NOT IMPLEMENTED

### What's Missing

1. **Cash-Secured PUT Validation:**
   - Formula: `cashRequired = strikePrice × shares`
   - Check user's available cash balance
   - Warning: "Requires $X in cash. You have $Y available."
   - Allow override with confirmation

2. **Covered CALL Validation:**
   - Verify position has sufficient shares
   - Prevent multiple open CALLs on same position (server-side check)
   - Warning if strike < cost basis: "Guaranteed loss of $X if assigned"
   - Suggestion: "Recommended strike: $X (cost basis + 2%)"

3. **Assignment Validation:**
   - PUT assignment: Confirm user has cash or is willing to use margin
   - CALL assignment: Show detailed profit breakdown before confirming
   - Require explicit confirmation checkbox

4. **Wheel Continuity Validation:**
   - Warn if creating trade outside active wheel: "Not linked to active wheel. Create new wheel?"
   - Prevent closing position with active CALL: "Close or assign the covered call first"
   - Suggest linking trades to existing wheel for same ticker

### Acceptance Criteria
- [ ] Cash requirement validated for PUTs (server + client)
- [ ] Cannot create multiple open calls on same position (server-side)
- [ ] Strike price warnings shown in sell call dialog
- [ ] Confirmation required for risky actions (guaranteed loss)
- [ ] Suggested strikes calculated based on cost basis
- [ ] Wheel linking suggestions displayed

### Files to Create/Modify
- `lib/validations/wheel-rules.ts` - New validation rules module
- `lib/actions/trades.ts` - Add validation checks before createTrade
- `components/trades/validation-warnings.tsx` - Warning display component
- `lib/queries/user.ts` - Add getCashBalance() query
- Integration in all dialog components

---

## STORY 8: Notification Delivery System

**Priority:** MEDIUM
**PRD Reference:** FR-5 (lines 649-676)
**Status:** ⚠️ QUERIES EXIST, NO DELIVERY

### What's Missing

1. **Notification Model & Storage:**
   - Database table for in-app notifications
   - Fields: userId, type, message, read status, createdAt, relatedTradeId, relatedPositionId

2. **Notification Triggers:**
   - Daily cron job: Check for options expiring in 3 days
   - Real-time check: Detect ITM options at expiration
   - Daily check: Positions without covered calls for 7+ days

3. **In-App Notification UI:**
   - Notification bell icon in header (with unread count badge)
   - Notification dropdown panel
   - Notification list page
   - Mark as read functionality
   - Quick actions from notifications (Assign, Sell Call, etc.)

4. **Email Notifications (Optional):**
   - User preference settings
   - Email templates
   - Integration with email service (SendGrid, AWS SES)

5. **Dashboard Alerts Widget:**
   - "Action Required" section showing:
     - N options expiring in 3 days
     - M options are ITM
     - K positions ready for covered calls
   - Click to view details or take action

### Acceptance Criteria
- [ ] Notification model created in database
- [ ] Cron job or scheduled task checks for conditions daily
- [ ] In-app notifications appear in header bell icon
- [ ] Unread count badge displays correctly
- [ ] Notification panel shows recent notifications
- [ ] Quick actions link to appropriate dialogs
- [ ] Email notifications (optional) sent based on user preferences
- [ ] Dashboard alerts widget shows actionable items

### Files to Create/Modify
- `prisma/schema.prisma` - Add Notification model
- `lib/notifications/triggers.ts` - Notification generation logic
- `lib/notifications/email.ts` - Email sending logic (optional)
- `components/layout/notification-bell.tsx` - Header notification icon
- `components/notifications/notification-panel.tsx` - Dropdown panel
- `app/notifications/page.tsx` - Notification list page
- `lib/actions/notifications.ts` - Mark as read action
- Configure cron job (Vercel Cron, AWS EventBridge, etc.)

---

## STORY 9: Complete Analytics & Reporting

**Priority:** LOW
**PRD Reference:** FR-6 (lines 677-709), User Story 6 (lines 433-476)
**Status:** ⚠️ CALCULATIONS EXIST, UI INCOMPLETE

### What's Missing

1. **Per-Wheel Metrics:**
   - Already calculated in `lib/calculations/wheel.ts`
   - Need UI to display:
     - Average profit per cycle
     - Win rate (profitable cycles / total)
     - Average cycle duration (days)
     - Annualized return
     - Best cycle, worst cycle

2. **Portfolio Metrics Dashboard:**
   - Total wheels (active/idle/completed) - EXISTS
   - Total capital deployed (sum of open positions)
   - Total premiums collected (sum across all wheels)
   - Overall win rate
   - Best/worst performing tickers

3. **Visualizations:**
   - P&L over time chart per wheel - EXISTS in wheel-charts.tsx
   - Need to add:
     - Win rate by ticker (bar chart)
     - Premium collection by month (line chart)
     - Cycle duration distribution (histogram)

4. **Export Functionality:**
   - Export wheel history to CSV
   - Include all trades, positions, premiums, P&L
   - Format for tax reporting

### Acceptance Criteria
- [ ] Per-wheel metrics displayed on wheel detail page
- [ ] Portfolio metrics dashboard shows aggregate statistics
- [ ] Win rate chart displays per-ticker performance
- [ ] Premium collection chart shows monthly trends
- [ ] Cycle duration histogram shows distribution
- [ ] Export to CSV generates properly formatted file
- [ ] CSV includes all necessary fields for tax reporting

### Files to Create/Modify
- `components/analytics/portfolio-metrics.tsx` - Portfolio dashboard
- `components/charts/win-rate-chart.tsx` - Win rate by ticker
- `components/charts/premium-collection-chart.tsx` - Monthly premiums
- `components/charts/cycle-duration-histogram.tsx` - Duration distribution
- `lib/actions/export.ts` - CSV export functionality
- `app/analytics/page.tsx` - Full analytics page
- Enhance `app/wheels/[id]/page.tsx` - Add metrics display

---

## STORY 10: Integration & Polish

**Priority:** LOW
**PRD Reference:** Phase 6 (lines 994-1010)
**Status:** ⚠️ NEEDS WORK

### What's Missing

1. **Mobile Responsiveness:**
   - Review all new dialogs on mobile
   - Ensure forms are usable on small screens
   - Test expiration calendar on mobile

2. **Accessibility:**
   - ARIA labels on all dialogs
   - Keyboard navigation for all actions
   - Screen reader support

3. **Documentation:**
   - User guide for wheel strategy
   - Help tooltips in key places
   - FAQ section updates

4. **Performance:**
   - Database query optimization
   - Lazy loading for large trade lists
   - Caching for wheel metrics

### Acceptance Criteria
- [ ] All pages/dialogs responsive on mobile (320px+)
- [ ] Accessibility audit passes WCAG 2.1 AA
- [ ] User guide written and published
- [ ] Help tooltips added to complex forms
- [ ] Page load times < 2 seconds
- [ ] Large lists paginated or virtualized

### Files to Review/Modify
- All dialog components - Add ARIA labels, test mobile
- All page components - Test responsive layout
- `app/help/` - Add wheel strategy guide
- Add tooltips throughout UI
- Optimize database queries with indexes

---

## Implementation Strategy

### Sequential Implementation Order

To avoid gaps and ensure each feature builds on the previous, implement in this order:

#### Phase 1: Core Workflows (Weeks 1-3)
**Dependencies:** None
**Stories:** 2, 3, 4

1. **STORY 3** - Guided PUT Assignment Dialog
   - No dependencies
   - Foundation for other flows

2. **STORY 4** - Guided "Sell Covered Call" Dialog
   - Depends on: STORY 3 (for "Sell Call?" prompt after assignment)

3. **STORY 2** - Early Close Options
   - Depends on: STORY 4 (for position status updates)

#### Phase 2: Advanced Features (Weeks 4-5)
**Dependencies:** Phase 1
**Stories:** 1, 6

4. **STORY 6** - Enhanced Position States
   - Depends on: STORY 4 (affects covered call status)
   - Must complete before: STORY 1 (rolling needs correct states)

5. **STORY 1** - Roll Options Functionality
   - Depends on: STORY 6 (correct position states)

#### Phase 3: Automation (Weeks 6-7)
**Dependencies:** Phases 1-2
**Stories:** 5, 7

6. **STORY 5** - Automatic Wheel Lifecycle Management
   - Depends on: STORYs 3, 4 (guided flows must exist first)
   - Critical for seamless experience

7. **STORY 7** - Comprehensive Validation Rules
   - Depends on: STORY 5 (wheel linking validation)

#### Phase 4: Enhancements (Weeks 8-9)
**Dependencies:** Phases 1-3
**Stories:** 8, 9

8. **STORY 8** - Notification Delivery System
   - Depends on: All core workflows complete
   - Can run in parallel with STORY 9

9. **STORY 9** - Complete Analytics & Reporting
   - Depends on: STORY 5 (wheel data must be complete)
   - Can run in parallel with STORY 8

#### Phase 5: Polish (Week 10)
**Dependencies:** All previous phases
**Stories:** 10

10. **STORY 10** - Integration & Polish
    - Must be last
    - Reviews and refines everything

---

## Risk Mitigation

### High-Risk Areas

1. **Database Migrations (STORY 6)**
   - Risk: Breaking existing position data
   - Mitigation: Write careful migration with rollback plan
   - Test migration on staging with production data copy

2. **Wheel Lifecycle Logic (STORY 5)**
   - Risk: Complex state management, easy to create bugs
   - Mitigation: Comprehensive unit tests for each transition
   - Create state machine diagram before coding

3. **Validation Rules (STORY 7)**
   - Risk: False positives blocking legitimate trades
   - Mitigation: Use warnings instead of errors where possible
   - Add "Override" option with explicit confirmation

4. **Notification System (STORY 8)**
   - Risk: Email delivery issues, spam filtering
   - Mitigation: Start with in-app only, add email as optional feature
   - Rate limiting to prevent notification spam

---

## Testing Strategy

### For Each Story

1. **Unit Tests:**
   - All server actions
   - Validation logic
   - Calculation functions

2. **Integration Tests:**
   - Full workflow tests (PUT → Assignment → CALL → Assignment)
   - Database transaction integrity
   - Wheel state transitions

3. **UI Tests:**
   - Dialog interactions
   - Form validation
   - Mobile responsiveness

4. **E2E Tests (Critical Paths):**
   - Complete wheel cycle
   - Roll option workflow
   - Early close workflow

---

## Success Criteria

### Story Completion Definition

A story is considered **DONE** when:
1. ✅ All server actions implemented and tested
2. ✅ All validation schemas created
3. ✅ All UI components created and responsive
4. ✅ Unit tests written and passing (>80% coverage)
5. ✅ Integration tests written and passing
6. ✅ UI tested on mobile and desktop
7. ✅ Accessibility audit passed
8. ✅ Documentation updated
9. ✅ Code reviewed and approved
10. ✅ Deployed to staging and verified

### Overall Completion

The entire gap analysis is complete when:
- All 10 stories marked as DONE
- Full wheel cycle works end-to-end without manual intervention
- Users can complete roll, close, assign flows seamlessly
- Notifications alert users proactively
- Analytics provide actionable insights
- No critical bugs in production

---

## Appendix A: Quick Reference - Missing Components

### Server Actions to Create
- `lib/actions/roll-options.ts` → `rollOption()`
- `lib/actions/wheels.ts` → `updateWheelStatus()`, `incrementCycle()`
- `lib/actions/notifications.ts` → `createNotification()`, `markAsRead()`
- `lib/actions/export.ts` → `exportWheelToCSV()`

### UI Components to Create
- `components/trades/assign-put-dialog.tsx`
- `components/trades/roll-option-dialog.tsx`
- `components/trades/close-option-dialog.tsx`
- `components/positions/sell-covered-call-dialog.tsx`
- `components/trades/wheel-link-prompt.tsx`
- `components/layout/notification-bell.tsx`
- `components/notifications/notification-panel.tsx`
- `components/analytics/portfolio-metrics.tsx`
- `components/charts/win-rate-chart.tsx`
- `components/charts/premium-collection-chart.tsx`
- `components/charts/cycle-duration-histogram.tsx`
- `components/positions/position-status-badge.tsx`
- `components/trades/validation-warnings.tsx`

### Database Changes
- Migration: Add COVERED, PENDING_CLOSE to PositionStatus enum
- New model: Notification (userId, type, message, read, createdAt, relatedTradeId, relatedPositionId)
- Indexes: Optimize wheel queries, position status queries

### Pages to Create/Enhance
- `app/notifications/page.tsx` - Notification list
- `app/analytics/page.tsx` - Full analytics dashboard
- Enhance `app/trades/[id]/page.tsx` - Add assign, roll, close buttons
- Enhance `app/positions/[id]/page.tsx` - Add sell call button
- Enhance `app/wheels/[id]/page.tsx` - Add metrics display

---

## Appendix B: Verification Checklist

Before marking the implementation complete, verify:

### User Can Complete Full Wheel Cycle
- [ ] Sell PUT (creates/links to wheel automatically)
- [ ] Assign PUT (guided dialog, creates position)
- [ ] Prompted immediately to sell covered call
- [ ] Sell covered call (guided dialog, links to position and wheel)
- [ ] Position shows as COVERED status
- [ ] Assign covered call (guided dialog, shows full P&L)
- [ ] Prompted immediately to start new PUT
- [ ] Wheel cycle count incremented
- [ ] Wheel totals updated correctly

### User Can Roll Options
- [ ] Open PUT can be rolled to new date/strike
- [ ] Open CALL can be rolled to new date/strike
- [ ] Net credit/debit displayed correctly
- [ ] Both trades created and linked
- [ ] Wheel continuity preserved

### User Can Close Early
- [ ] Open PUT can be closed early (BUY_TO_CLOSE)
- [ ] Open CALL can be closed early
- [ ] For covered calls, position reverts to OPEN
- [ ] Net P&L calculated correctly

### Notifications Work
- [ ] Expiring options detected
- [ ] ITM options detected
- [ ] Positions without calls detected
- [ ] In-app notifications appear in header
- [ ] Unread badge shows correct count
- [ ] Quick actions work from notifications
- [ ] Email notifications sent (if enabled)

### Validation Prevents Errors
- [ ] Cannot sell PUT without cash (or shows warning)
- [ ] Cannot sell multiple calls on same position
- [ ] Warning shown when strike < cost basis
- [ ] Suggested strikes calculated correctly
- [ ] Cannot close position with active call

### Analytics Are Accurate
- [ ] Per-wheel metrics display correctly
- [ ] Portfolio metrics aggregate correctly
- [ ] Charts render without errors
- [ ] Win rate calculations accurate
- [ ] Export to CSV includes all data

---

**Document End**

**Next Steps:**
1. Review this gap analysis with the team
2. Prioritize stories based on business needs
3. Begin Phase 1 (Stories 2, 3, 4) implementation
4. Implement sequentially to avoid gaps
5. Test thoroughly at each phase before proceeding

**Estimated Total Effort:** 10 weeks (sequential implementation)
**Team Size:** 1-2 developers
**Testing:** QA throughout, E2E testing after each phase
