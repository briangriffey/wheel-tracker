# Wheel Lifecycle Automation - Implementation Summary

**Bead:** wh-zu6d - [GAP-5] Automatic Wheel Lifecycle Management
**Date:** 2026-02-09
**Status:** Complete

## Overview

Implemented automatic wheel status transitions and cycle tracking for the wheel options strategy. The system now automatically manages wheel state transitions based on trade and position events, eliminating manual tracking requirements.

## What Was Implemented

### 1. Database Schema Changes

**File:** `prisma/schema.prisma`

- Added `WheelStep` enum with values: IDLE, PUT, HOLDING, COVERED
- Added `currentStep` field to `Wheel` model to track position in cycle
- Created migration: `20260209181307_add_wheel_current_step`

### 2. Type Definitions

**File:** `lib/types/wheel.ts` (NEW)

- `WheelStep` enum for cycle tracking
- `WheelStatus` enum for overall wheel state
- `WHEEL_STEP_TRANSITIONS` state machine definition
- `isValidWheelStepTransition()` validation function

### 3. Enhanced Server Actions

#### Wheels Actions (`lib/actions/wheels.ts`)

**New Functions:**
- `updateWheelStatus(wheelId, step, status?)` - Transition wheel to new step with validation
- `incrementCycle(wheelId, premiumToAdd, realizedPLToAdd)` - Increment cycle count and update totals
- `findActiveWheel(ticker)` - Find active/idle wheel for a ticker

**Enhanced Functions:**
- `getWheels()` - Now includes `currentStep` field
- `getWheelDetail()` - Now includes `currentStep` field

#### Trades Actions (`lib/actions/trades.ts`)

**Enhanced Functions:**
- `createTrade()` - Now accepts `wheelId` parameter, validates no multiple active PUTs, updates wheel status
  - When PUT created: transitions wheel to PUT step
  - When CALL created: transitions wheel to COVERED step

**New Functions:**
- `linkTradeToWheel(tradeId, wheelId)` - Link existing trade to wheel with validation

#### Positions Actions (`lib/actions/positions.ts`)

**Enhanced Functions:**
- `assignPut()` - Transitions wheel to HOLDING step when PUT is assigned
- `assignCall()` - Increments cycle count, updates totals, transitions wheel to IDLE when CALL is assigned

### 4. UI Components

**File:** `components/trades/wheel-link-prompt.tsx` (NEW)

Interactive dialog component for wheel linking:
- Detects existing active/idle wheel for ticker
- Presents options: Link to existing, Create new, Skip
- Handles wheel creation and trade linking
- Provides visual feedback and loading states

### 5. Validation Enhancements

**File:** `lib/validations/trade.ts`

- Added `wheelId` field to `CreateTradeSchema`

## Wheel State Machine

```
IDLE ──────────────┐
  ↑                │
  │                │ PUT created
  │                ↓
  │              PUT
  │                │
  │                │ PUT assigned
  │                ↓
  │            HOLDING
  │                │
  │                │ CALL created
  │                ↓
  │            COVERED
  │                │
  │                │ CALL assigned
  └────────────────┘
```

## Automatic Transitions

### PUT Trade Created
- **Trigger:** `createTrade()` with type=PUT and wheelId
- **Action:** Wheel transitions to `PUT` step, status=ACTIVE
- **Validation:** Cannot have multiple active PUTs on same wheel

### PUT Assigned
- **Trigger:** `assignPut()`
- **Action:** Wheel transitions to `HOLDING` step, status=ACTIVE
- **Creates:** Position linked to wheel

### CALL Trade Created
- **Trigger:** `createTrade()` with type=CALL, positionId, and wheelId
- **Action:** Wheel transitions to `COVERED` step, status=ACTIVE

### CALL Assigned (Cycle Complete)
- **Trigger:** `assignCall()`
- **Actions:**
  1. Close position with realized P/L
  2. Increment wheel `cycleCount`
  3. Update `totalPremiums` (PUT + CALL premiums)
  4. Update `totalRealizedPL` (position P/L)
  5. Transition wheel to `IDLE` step, status=IDLE
  6. Ready for next cycle

## Usage Example

### Creating a PUT and Starting a Wheel

```typescript
// 1. Create PUT trade without wheel
const tradeResult = await createTrade({
  ticker: 'AAPL',
  type: 'PUT',
  action: 'SELL_TO_OPEN',
  strikePrice: 150,
  premium: 250,
  contracts: 1,
  expirationDate: new Date('2024-03-15')
})

// 2. UI shows WheelLinkPrompt component
// User chooses "Start New Wheel"

// 3. Component calls:
const wheelResult = await createWheel({
  ticker: 'AAPL',
  notes: 'Started from trade xyz'
})

// 4. Component links trade:
await linkTradeToWheel(tradeResult.data.id, wheelResult.data.id)

// Wheel is now:
// - status: ACTIVE
// - currentStep: PUT
// - cycleCount: 0
```

### Completing a Full Cycle

```typescript
// 1. PUT gets assigned
await assignPut({ tradeId: putTradeId })
// Wheel: currentStep = HOLDING

// 2. Sell covered CALL
await createTrade({
  ticker: 'AAPL',
  type: 'CALL',
  action: 'SELL_TO_OPEN',
  strikePrice: 160,
  premium: 300,
  contracts: 1,
  expirationDate: new Date('2024-04-15'),
  positionId: positionId,
  wheelId: wheelId
})
// Wheel: currentStep = COVERED

// 3. CALL gets assigned (completes cycle)
await assignCall({ tradeId: callTradeId })
// Wheel:
// - status: IDLE
// - currentStep: IDLE
// - cycleCount: 1
// - totalPremiums: 550 (250 + 300)
// - totalRealizedPL: (calculated from position close)
```

## Acceptance Criteria Status

- ✅ Creating PUT prompts for wheel creation/linking (WheelLinkPrompt component)
- ✅ Wheel status automatically transitions (updateWheelStatus)
- ✅ Cycle count increments when position closes (incrementCycle)
- ✅ Total premiums and realized P/L aggregate correctly (incrementCycle)
- ✅ Wheel "current step" visible in UI (included in getWheels, getWheelDetail)
- ✅ Cannot have multiple active PUTs on same wheel (validation in createTrade)

## Files Created

1. `lib/types/wheel.ts` - Wheel type definitions and state machine
2. `components/trades/wheel-link-prompt.tsx` - Wheel linking UI component
3. `prisma/migrations/20260209181307_add_wheel_current_step/` - Database migration
4. `WHEEL_LIFECYCLE_IMPLEMENTATION.md` - This document

## Files Modified

1. `prisma/schema.prisma` - Added WheelStep enum and currentStep field
2. `lib/actions/wheels.ts` - Added automation functions
3. `lib/actions/trades.ts` - Enhanced for wheel linking and status updates
4. `lib/actions/positions.ts` - Enhanced for wheel lifecycle management
5. `lib/validations/trade.ts` - Added wheelId field

## Testing Recommendations

1. **Unit Tests:**
   - Test state machine transitions in `lib/types/wheel.ts`
   - Test validation logic in `createTrade()` for multiple PUTs
   - Test cycle increment calculations

2. **Integration Tests:**
   - Test full wheel cycle: PUT → assign → CALL → assign
   - Test wheel linking with existing wheels
   - Test wheel creation during trade creation

3. **E2E Tests:**
   - Test WheelLinkPrompt UI interactions
   - Test wheel status display in wheels page
   - Test preventing multiple active PUTs

## Future Enhancements

1. **Notifications:** Alert users when trades expire or get assigned
2. **Analytics:** Dashboard showing cycle completion rates, average premiums per cycle
3. **Automatic CALL Suggestions:** Suggest optimal CALL strikes based on position cost basis
4. **Multi-Leg Orders:** Support rolling trades (close current, open new)
5. **Wheel Templates:** Pre-configured wheel strategies for common scenarios

## Notes

- All wheel transitions are validated through the state machine
- Failed transitions return clear error messages
- All updates are atomic (using Prisma transactions)
- Wheel totals are automatically recalculated on each cycle completion
- UI components handle loading states and error conditions
- All decimal values are properly converted for JSON serialization

## Migration Instructions

To apply this update to an existing database:

```bash
# 1. Pull latest code
git pull

# 2. Install dependencies
pnpm install

# 3. Run migration
npx prisma migrate dev

# 4. Generate Prisma client
npx prisma generate

# 5. Restart development server
pnpm dev
```

Existing wheels will have `currentStep` default to `IDLE`. Users should manually set the correct step for active wheels via the UI or database admin tool.
