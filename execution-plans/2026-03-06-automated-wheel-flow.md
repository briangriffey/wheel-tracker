# Execution Plan: Automated Wheel Strategy Flow

**Source PRD:** `prds/2026-03-06-automated-wheel-flow.md`
**Date:** 2026-03-06
**Author:** Architect Agent
**Selected Approach:** Option B — Smart Trade Entry with Context-Aware Form

## Overview

This plan automates the wheel strategy lifecycle by modifying server actions to auto-link trades, positions, and wheels, then enhancing the trade entry form with context-aware position selection and wheel indicators. The backend changes (auto-linking in `createTrade`, `assignPut`, `assignCall`, `closeOption`) form Phase 1, a new query layer for position/wheel lookups forms Phase 2, and the UI enhancements (trade form, position card, assign dialogs, trade list badges) form Phases 3-4. No schema migrations are required.

## Team Lead Decisions (Incorporated)

1. **Multiple positions for same ticker:** Show a warning but allow it. Position selector handles it.
2. **Auto-link BUY_TO_CLOSE trades to wheels:** Yes.
3. **Migrate orphaned trades:** Deferred to a separate task.
4. **BUY_TO_CLOSE creating wheels:** No, only SELL_TO_OPEN triggers wheel creation.
5. **Wheel status after CALL assignment:** Change to IDLE, back to ACTIVE on next PUT.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Wheel find-or-create scope | ACTIVE or IDLE status | When selling a new PUT, we should find an ACTIVE or IDLE wheel (IDLE means cycle complete, waiting for new PUT). Creating only if none exist. |
| Component boundary for TradeEntryForm | Stays `'use client'` | Already a client component. New position selector and wheel badge are client-side with data fetched via server action on ticker change. |
| Position lookup for form | New server action `getOpenPositionsForTicker` | Lightweight query returning only what the form needs. Avoids over-fetching. |
| Wheel lookup for form | New server action `getActiveWheelForTicker` | Returns wheel id + ticker for badge display. |
| BUY_TO_CLOSE auto-linking | Look up the original SELL_TO_OPEN trade's wheelId | Match by ticker + type + OPEN status to find the trade being closed, inherit its wheelId. |
| Wheel premium tracking | Update `totalPremiums` on every SELL_TO_OPEN trade creation | Accumulate premiums as trades are created, not just on assignment. |
| Transaction isolation | Keep existing Serializable for `createTrade` | Wheel find-or-create must be atomic with trade creation to prevent duplicate wheels. |

## Phase 1: Backend Auto-Linking (Server Actions)

### Task 1.1: Add wheel auto-linking to `createTrade`

**Parallel:** No (foundational — all other tasks depend on this)
**Depends on:** None
**Assigned to:** backend
**Files:**
- `lib/actions/trades.ts` — modify — add wheel find-or-create logic inside the transaction

**Details:**

Inside the `createTrade` function's `$transaction` block (after the trade limit check, before `tx.trade.create`), add the following logic:

1. **SELL_TO_OPEN PUT:** Find an existing wheel for this user+ticker with status `ACTIVE` or `IDLE`. If found, use its `id` as `wheelId`. If IDLE, update wheel status to `ACTIVE`. If not found, create a new wheel with status `ACTIVE` and use its `id`. Set `wheelId` on the trade. Update wheel's `lastActivityAt` and add the trade's premium (per-share * contracts * 100) to `totalPremiums`.

2. **SELL_TO_OPEN CALL with positionId:** Look up the position's `wheelId`. If it exists, set `wheelId` on the trade. Also update wheel's `lastActivityAt` and add premium to `totalPremiums`.

3. **SELL_TO_OPEN CALL without positionId:** Look for an ACTIVE wheel for user+ticker. If found, set `wheelId`. (This handles naked calls that the user may want tracked.)

4. **BUY_TO_CLOSE (PUT or CALL):** Find the open SELL_TO_OPEN trade for the same user+ticker+type that is being closed. If that trade has a `wheelId`, inherit it. (Note: `closeOption` already handles the closing mechanics — this only applies when `createTrade` is used for BUY_TO_CLOSE entries. The actual close flow uses `closeOption` which already updates `lastActivityAt`.)

5. **Multiple positions warning:** When a SELL_TO_OPEN CALL is created and multiple OPEN positions exist for the ticker, the server action should still succeed but include a warning in the response. Extend the success return type:

```typescript
type CreateTradeResult = {
  id: string
  wheelId?: string
  wheelTicker?: string
  warnings?: string[]
}
```

Key implementation notes:
- The wheel lookup must happen inside the serializable transaction to prevent race conditions (two concurrent PUT sales creating duplicate wheels).
- Use `prisma.wheel.findFirst({ where: { userId, ticker, status: { in: ['ACTIVE', 'IDLE'] } }, orderBy: { lastActivityAt: 'desc' } })` to find the most recently active wheel.
- When creating a new wheel, set `cycleCount: 0`, `totalPremiums: premium * contracts * 100` (the per-share premium times shares).
- Remember: the `premium` field in the Trade model is **per-share**, so total premium = `premium * contracts * 100`.
- Revalidate `/wheels` and `/wheels/[wheelId]` in addition to existing revalidations.

**Acceptance criteria:**
- [ ] SELL_TO_OPEN PUT creates or finds a wheel and sets `wheelId` on the trade
- [ ] SELL_TO_OPEN PUT on a ticker with an IDLE wheel reactivates it to ACTIVE
- [ ] SELL_TO_OPEN CALL with positionId inherits the position's wheelId
- [ ] BUY_TO_CLOSE inherits wheelId from the matching open trade
- [ ] Wheel `totalPremiums` is updated with the trade's total premium (per-share * shares)
- [ ] Wheel `lastActivityAt` is updated
- [ ] No duplicate wheels are created under concurrent requests
- [ ] Existing trades without wheelId continue to work (no regressions)
- [ ] Response includes `wheelId` and `wheelTicker` when auto-linked
- [ ] `/wheels` path is revalidated

---

### Task 1.2: Update `assignCall` to update wheel stats and status

**Parallel:** Yes — can run alongside Task 1.3
**Depends on:** Task 1.1
**Assigned to:** backend
**Files:**
- `lib/actions/positions.ts` — modify — update `assignCall` function

**Details:**

In the `assignCall` function, after the position is closed and trade is marked ASSIGNED, add wheel update logic inside the existing transaction:

1. Look up the trade's `wheelId` (already available in the `trade` select — add `wheelId` to the select clause).
2. If `wheelId` exists:
   - Increment `cycleCount` by 1
   - Update `totalRealizedPL` by adding the `realizedGainLoss` value (already calculated in the function)
   - Update `lastActivityAt` to `new Date()`
   - **Set wheel status to `IDLE`** (per team lead decision — cycle complete, waiting for new PUT)
3. Revalidate `/wheels` and `/wheels/[wheelId]`.

Add `wheelId` to the trade select clause (currently missing):
```typescript
select: {
  // ... existing fields
  wheelId: true,  // ADD THIS
}
```

**Acceptance criteria:**
- [ ] `cycleCount` is incremented by 1 when a covered call is assigned
- [ ] `totalRealizedPL` is updated with the realized gain/loss
- [ ] `lastActivityAt` is updated
- [ ] Wheel status changes from ACTIVE to IDLE
- [ ] Wheels page is revalidated
- [ ] Works correctly when trade has no wheelId (no errors)

---

### Task 1.3: Update `closeOption` to auto-link BUY_TO_CLOSE and update wheel premiums

**Parallel:** Yes — can run alongside Task 1.2
**Depends on:** Task 1.1
**Assigned to:** backend
**Files:**
- `lib/actions/trades.ts` — modify — update `closeOption` function

**Details:**

The `closeOption` function currently updates `lastActivityAt` if the trade has a `wheelId`. Enhance it to also update `totalPremiums` and `totalRealizedPL` on the wheel:

1. Inside the transaction, after updating the trade status to CLOSED:
   - If `trade.wheelId` exists, update the wheel:
     - Subtract the `closePremium * contracts * 100` from `totalPremiums` (buying back reduces net premium)
     - Add the `netPL * contracts * 100` (which is `(originalPremium - closePremium) * contracts * 100`) to `totalRealizedPL`
     - Update `lastActivityAt`

Wait — looking at the current code more carefully, `closePremium` is stored as a per-share value and `netPL` is calculated as `originalPremium - closePremium` (both per-share). The `realizedGainLoss` stored on the trade is also per-share. So when updating wheel stats, we need to multiply by `shares` (which is `contracts * 100`).

Actually, reviewing the trade model: `premium` is per-share, `closePremium` is per-share, and `realizedGainLoss` is per-share. But looking at the `closeOption` code:
```typescript
const netPL = originalPremium - closePremium
```
This is per-share. The stored `realizedGainLoss` is also this per-share value.

For the wheel's `totalRealizedPL`, we need the total dollar P&L. So:
- Add `netPL * trade.shares` (where `trade.shares` = contracts * 100) — wait, we need `trade.shares` in the select. Currently `shares` is not selected. We also need `contracts`.

Add to the select clause:
```typescript
select: {
  // ... existing fields
  shares: true,     // ADD
  contracts: true,  // ADD
}
```

Then in the wheel update:
```typescript
await tx.wheel.update({
  where: { id: trade.wheelId },
  data: {
    lastActivityAt: new Date(),
    totalRealizedPL: { increment: netPL * trade.shares },
  },
})
```

Note: `totalPremiums` was already incremented when the SELL_TO_OPEN trade was created (Task 1.1). When a BUY_TO_CLOSE happens via `closeOption`, we should adjust `totalPremiums` by subtracting the close premium cost:
```typescript
totalPremiums: { decrement: closePremium * trade.shares },
```

This way `totalPremiums` reflects net premiums collected (opened minus closed).

**Acceptance criteria:**
- [ ] When an option is closed early, wheel `totalRealizedPL` is updated with the net P&L (in total dollars, not per-share)
- [ ] Wheel `totalPremiums` is decremented by the close premium cost (total dollars)
- [ ] `lastActivityAt` is updated
- [ ] No errors when trade has no wheelId

---

### Task 1.4: Update `assignPut` to update wheel `totalPremiums`

**Parallel:** Yes — can run alongside Tasks 1.2 and 1.3
**Depends on:** Task 1.1
**Assigned to:** backend
**Files:**
- `lib/actions/positions.ts` — modify — update `assignPut` function

**Details:**

The `assignPut` function already links the position to the wheel (line 132: `...(trade.wheelId && { wheelId: trade.wheelId })`). It also updates `lastActivityAt`.

However, when a PUT is assigned, we should update `totalRealizedPL` on the wheel to reflect that the premium has been fully earned (the option was exercised, so the full premium is realized):

1. Inside the transaction, after creating the position:
   - If `trade.wheelId` exists, update the wheel:
     - Add `trade.premium * trade.shares` to `totalRealizedPL` (premium is per-share, multiply by shares for total)
     - Already updating `lastActivityAt` (existing code)

Wait — actually, the premium was already added to `totalPremiums` when the trade was created (Task 1.1). When the PUT is assigned, the premium is fully realized (not buying it back). So we should move the premium from "collected" to "realized":
- Add `Number(trade.premium) * trade.shares` to `totalRealizedPL`

We need `trade.shares` in the select. Currently `shares` is already selected (line 76). Good.

But wait — the premium per-share value needs to be converted. `trade.premium` is a Prisma Decimal. Use `Number(trade.premium)`.

Actually, I need to reconsider the semantics of `totalPremiums` vs `totalRealizedPL`:
- `totalPremiums` = total premium dollars collected across all trades in this wheel
- `totalRealizedPL` = total realized profit/loss (includes premium + stock gains/losses)

For a PUT that gets assigned:
- The premium was collected when the trade was opened — already tracked in `totalPremiums` (from Task 1.1)
- The P&L of the PUT assignment itself is: the premium collected (since the option was exercised, you keep the full premium but must buy shares)
- The full cycle P&L is calculated when the CALL is assigned (Task 1.2)

So for `assignPut`, we should NOT update `totalRealizedPL` — that happens when the CALL completes the cycle. The PUT premium is already in `totalPremiums`. No additional wheel stat changes are needed beyond what already exists (position linking + lastActivityAt).

Actually, let me reconsider. An expired PUT also earns the full premium as realized P&L. The `updateTradeStatus` function handles EXPIRED status. We should handle that too.

Let me simplify: for `assignPut`, the existing code is sufficient. The wheel linkage already works. No additional stats updates needed here beyond what Task 1.1 handles.

**However**, we should ensure that when a trade expires (status -> EXPIRED), the wheel stats are updated. This should be in Task 1.5.

Mark this task as: **No changes needed for `assignPut` beyond existing behavior.** Remove this task.

---

### Task 1.4 (revised): Update `updateTradeStatus` to handle EXPIRED trades for wheel stats

**Parallel:** Yes — can run alongside Tasks 1.2 and 1.3
**Depends on:** Task 1.1
**Assigned to:** backend
**Files:**
- `lib/actions/trades.ts` — modify — update `updateTradeStatus` function

**Details:**

When a trade expires worthless (status -> EXPIRED), the full premium is realized profit. Update the wheel:

1. Fetch the trade's `wheelId` and `shares` and `premium` (add to the select clause):
```typescript
select: {
  userId: true,
  status: true,
  expirationDate: true,
  wheelId: true,     // ADD
  shares: true,      // ADD
  premium: true,     // ADD
}
```

2. After updating the trade status, if status is `EXPIRED` and `trade.wheelId` exists:
   - Update wheel `lastActivityAt`
   - Add the full premium to `totalRealizedPL`: `Number(trade.premium) * trade.shares`
   - Note: `totalPremiums` was already set when the trade was created (Task 1.1), so no change there

3. Revalidate `/wheels` and `/wheels/[wheelId]`.

**Acceptance criteria:**
- [ ] When a trade expires worthless, wheel `totalRealizedPL` is updated with the full premium (total dollars)
- [ ] Wheel `lastActivityAt` is updated
- [ ] Wheels pages are revalidated
- [ ] No errors when trade has no wheelId
- [ ] No changes for non-EXPIRED status transitions

---

## Phase 2: Query Layer for Form Data

### Task 2.1: Create server actions for form data queries

**Parallel:** Yes — independent of Phase 1 completion for development, but runtime depends on Phase 1 data
**Depends on:** None (can be developed in parallel with Phase 1)
**Assigned to:** backend
**Files:**
- `lib/actions/wheel-queries.ts` — create — new server actions for form data

**Details:**

Create a new file with two server actions that the enhanced trade form will call:

```typescript
'use server'

import { prisma } from '@/lib/db'
import { getCurrentUserId } from '@/lib/auth'

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export interface OpenPositionForForm {
  id: string
  ticker: string
  shares: number
  costBasis: number
  acquiredDate: Date
  wheelId: string | null
  hasOpenCall: boolean
}

/**
 * Get open positions for a specific ticker (used by trade entry form)
 */
export async function getOpenPositionsForTicker(
  ticker: string
): Promise<ActionResult<OpenPositionForForm[]>> {
  // Validate and normalize ticker
  // Get current user
  // Query positions with status OPEN, matching ticker (case-insensitive)
  // Include count of covered calls with status OPEN to determine hasOpenCall
  // Return simplified data for the form
}

export interface ActiveWheelForForm {
  id: string
  ticker: string
  status: string
  cycleCount: number
  totalPremiums: number
}

/**
 * Get active/idle wheel for a specific ticker (used by trade entry form)
 */
export async function getActiveWheelForTicker(
  ticker: string
): Promise<ActionResult<ActiveWheelForForm | null>> {
  // Validate and normalize ticker
  // Get current user
  // Find wheel with status ACTIVE or IDLE for this user+ticker
  // Return null if none found
}
```

Implementation details:
- Both functions should normalize ticker to uppercase
- `getOpenPositionsForTicker` should include a computed `hasOpenCall` boolean based on whether any covered call with status `OPEN` exists for that position
- Format `costBasis` and `acquiredDate` for display in the dropdown: "{shares} shares @ ${costBasis}/share (acquired {date})"
- These are read-only queries, no transaction needed

**Acceptance criteria:**
- [ ] `getOpenPositionsForTicker('AAPL')` returns all OPEN positions for AAPL with `hasOpenCall` flag
- [ ] `getActiveWheelForTicker('AAPL')` returns the active/idle wheel or null
- [ ] Both functions require authentication
- [ ] Ticker is case-insensitive (normalized to uppercase)
- [ ] Returns are properly serialized (no Prisma Decimal objects)

---

## Phase 3: Trade Entry Form Enhancements

### Task 3.1: Add position selector and wheel badge to TradeEntryForm

**Parallel:** No
**Depends on:** Task 2.1
**Assigned to:** frontend
**Files:**
- `components/forms/trade-entry-form.tsx` — modify — major enhancements
- `lib/validations/trade.ts` — modify — no changes needed (positionId already in schema)

**Details:**

Enhance the `TradeEntryForm` component with the following changes:

1. **Accept new props for pre-filling:**
```typescript
interface TradeEntryFormProps {
  onSuccess?: () => void
  onCancel?: () => void
  // New props for pre-filling from position card / assign dialog
  prefill?: {
    ticker?: string
    type?: 'PUT' | 'CALL'
    action?: 'SELL_TO_OPEN' | 'BUY_TO_CLOSE'
    positionId?: string
    contracts?: number
  }
  readOnlyFields?: ('ticker' | 'type' | 'action' | 'positionId' | 'contracts')[]
}
```

2. **Use `useForm` with `watch` to observe ticker, type, and action fields:**
```typescript
const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<TradeFormData>({
  resolver: zodResolver(CreateTradeSchema),
  defaultValues: {
    action: prefill?.action ?? 'SELL_TO_OPEN',
    ticker: prefill?.ticker ?? '',
    type: prefill?.type ?? undefined,
    contracts: prefill?.contracts ?? undefined,
    openDate: new Date().toISOString().split('T')[0],
  },
})

const watchedTicker = watch('ticker')
const watchedType = watch('type')
const watchedAction = watch('action')
```

3. **Fetch positions when type=CALL, action=SELL_TO_OPEN, and ticker has 1+ characters:**
```typescript
const [positions, setPositions] = useState<OpenPositionForForm[]>([])
const [activeWheel, setActiveWheel] = useState<ActiveWheelForForm | null>(null)
const [isLoadingPositions, setIsLoadingPositions] = useState(false)
const [multiplePositionsWarning, setMultiplePositionsWarning] = useState(false)

useEffect(() => {
  const ticker = watchedTicker?.toUpperCase()
  if (!ticker || ticker.length < 1) {
    setPositions([])
    setActiveWheel(null)
    return
  }

  // Debounce the fetch (300ms)
  const timer = setTimeout(async () => {
    // Fetch wheel info for any SELL_TO_OPEN trade
    if (watchedAction === 'SELL_TO_OPEN') {
      const wheelResult = await getActiveWheelForTicker(ticker)
      if (wheelResult.success) {
        setActiveWheel(wheelResult.data)
      }
    }

    // Fetch positions only for CALL + SELL_TO_OPEN
    if (watchedType === 'CALL' && watchedAction === 'SELL_TO_OPEN') {
      setIsLoadingPositions(true)
      const posResult = await getOpenPositionsForTicker(ticker)
      if (posResult.success) {
        setPositions(posResult.data)
        setMultiplePositionsWarning(posResult.data.length > 1)
        // Auto-select if exactly one position and no prefill
        if (posResult.data.length === 1 && !prefill?.positionId) {
          setValue('positionId', posResult.data[0].id)
        }
      }
      setIsLoadingPositions(false)
    } else {
      setPositions([])
    }
  }, 300)

  return () => clearTimeout(timer)
}, [watchedTicker, watchedType, watchedAction])
```

4. **Render position selector dropdown** (between ticker and strike price fields, only when type=CALL and action=SELL_TO_OPEN):
```tsx
{watchedType === 'CALL' && watchedAction === 'SELL_TO_OPEN' && (
  <div className="col-span-2">
    <label className="block text-sm font-medium text-neutral-700">
      Position
    </label>
    {isLoadingPositions ? (
      <div>Loading positions...</div>
    ) : positions.length > 0 ? (
      <>
        <Select
          {...register('positionId')}
          disabled={readOnlyFields?.includes('positionId')}
        >
          <option value="">Select a position</option>
          {positions.map(pos => (
            <option key={pos.id} value={pos.id} disabled={pos.hasOpenCall}>
              {pos.shares} shares @ ${pos.costBasis.toFixed(2)}/share
              (acquired {new Date(pos.acquiredDate).toLocaleDateString('en-US', { timeZone: 'UTC' })})
              {pos.hasOpenCall ? ' [Has Open Call]' : ''}
            </option>
          ))}
        </Select>
        {multiplePositionsWarning && (
          <p className="mt-1 text-xs text-yellow-600">
            Multiple positions found for this ticker. Please select the correct one.
          </p>
        )}
      </>
    ) : watchedTicker ? (
      <p className="mt-1 text-sm text-gray-500">
        No open positions found for {watchedTicker?.toUpperCase()}.
      </p>
    ) : null}
  </div>
)}
```

5. **Render wheel badge** (below form header, when auto-linking will occur):
```tsx
{activeWheel && watchedAction === 'SELL_TO_OPEN' && (
  <div className="rounded-md bg-green-50 p-3 border border-green-200 mb-4">
    <p className="text-sm text-green-800">
      This trade will be added to your <strong>{activeWheel.ticker}</strong> wheel
      (Cycle {activeWheel.cycleCount + 1}).
    </p>
  </div>
)}
{!activeWheel && watchedAction === 'SELL_TO_OPEN' && watchedTicker && watchedTicker.length >= 1 && (
  <div className="rounded-md bg-blue-50 p-3 border border-blue-200 mb-4">
    <p className="text-sm text-blue-800">
      A new wheel will be created for <strong>{watchedTicker.toUpperCase()}</strong>.
    </p>
  </div>
)}
```

6. **Apply prefill values on mount:**
```typescript
useEffect(() => {
  if (prefill) {
    if (prefill.ticker) setValue('ticker', prefill.ticker)
    if (prefill.type) setValue('type', prefill.type)
    if (prefill.action) setValue('action', prefill.action)
    if (prefill.positionId) setValue('positionId', prefill.positionId)
    if (prefill.contracts) setValue('contracts', prefill.contracts)
  }
}, [prefill, setValue])
```

7. **Make fields read-only when specified:**
For each field in `readOnlyFields`, set the input/select to `disabled` and add a `readOnly` visual style.

8. **Handle the success response** to show wheel linking info:
```typescript
if (result.success) {
  const data = result.data as { id: string; wheelId?: string; wheelTicker?: string }
  if (data.wheelId) {
    toast.success(`Trade created and linked to ${data.wheelTicker} wheel!`)
  } else {
    toast.success('Trade created successfully!')
  }
  // ...
}
```

**Acceptance criteria:**
- [ ] When type=CALL and action=SELL_TO_OPEN, a position dropdown appears after entering a ticker
- [ ] Positions with an existing open CALL are shown but disabled in the dropdown
- [ ] If exactly one position exists, it is auto-selected
- [ ] If multiple positions exist, a warning is shown
- [ ] When action=SELL_TO_OPEN, a wheel badge shows whether the trade will be added to an existing wheel or create a new one
- [ ] Pre-filled values are applied correctly from the `prefill` prop
- [ ] Read-only fields cannot be changed when specified
- [ ] Success toast reflects wheel linking status
- [ ] Position data is debounced (300ms) to avoid excessive API calls
- [ ] Form works identically to before when no prefill is provided (no regressions)

---

### Task 3.2: Wire "Sell Covered Call" button on PositionCard

**Parallel:** Yes — can run alongside Task 3.3
**Depends on:** Task 3.1
**Assigned to:** frontend
**Files:**
- `components/positions/positions-list.tsx` — modify — replace toast with trade form modal
- `components/positions/position-card.tsx` — no changes needed (already passes `onSellCall`)

**Details:**

In `positions-list.tsx`, the `handleSellCall` function currently shows a toast. Replace it with opening a trade form modal pre-filled for a covered call:

1. **Add state for selected position:**
```typescript
const [sellCallPosition, setSellCallPosition] = useState<PositionWithCalculations | null>(null)
```

2. **Replace `handleSellCall`:**
```typescript
const handleSellCall = (positionId: string) => {
  const position = positions.find(p => p.id === positionId)
  if (position) {
    setSellCallPosition(position)
    setIsTradeModalOpen(true)
  }
}
```

3. **Update the Modal to pass prefill when selling covered call:**
```tsx
<Modal
  isOpen={isTradeModalOpen}
  onClose={() => {
    setIsTradeModalOpen(false)
    setSellCallPosition(null)
  }}
  title={sellCallPosition ? `Sell Covered Call on ${sellCallPosition.ticker}` : 'Create New Trade'}
  description={sellCallPosition
    ? `Selling a covered call against your ${sellCallPosition.shares} shares of ${sellCallPosition.ticker}`
    : 'Enter the details of your options trade'
  }
  size="lg"
>
  <TradeEntryForm
    onSuccess={() => {
      setIsTradeModalOpen(false)
      setSellCallPosition(null)
      router.refresh()
    }}
    onCancel={() => {
      setIsTradeModalOpen(false)
      setSellCallPosition(null)
    }}
    prefill={sellCallPosition ? {
      ticker: sellCallPosition.ticker,
      type: 'CALL',
      action: 'SELL_TO_OPEN',
      positionId: sellCallPosition.id,
      contracts: sellCallPosition.shares / 100,
    } : undefined}
    readOnlyFields={sellCallPosition ? ['ticker', 'type', 'action', 'positionId'] : undefined}
  />
</Modal>
```

4. **Reset sellCallPosition when the "New Trade" button is clicked:**
```typescript
// In the existing New Trade button onClick:
onClick={() => {
  setSellCallPosition(null)
  setIsTradeModalOpen(true)
}}
```

**Acceptance criteria:**
- [ ] Clicking "Sell Covered Call" on a position card opens the trade form modal
- [ ] The modal title reflects the ticker
- [ ] The form is pre-filled with ticker, type=CALL, action=SELL_TO_OPEN, positionId, and contracts
- [ ] Ticker, type, action, and positionId fields are read-only
- [ ] The "New Trade" button still opens a blank trade form
- [ ] After successful trade creation, the modal closes and positions refresh

---

### Task 3.3: Wire post-assignment "Sell Covered Call" flow in AssignPutDialog

**Parallel:** Yes — can run alongside Task 3.2
**Depends on:** Task 3.1
**Assigned to:** frontend
**Files:**
- `components/trades/assign-put-dialog.tsx` — modify — wire `onSellCoveredCall` callback
- Parent component(s) that render `AssignPutDialog` — modify — pass `onSellCoveredCall` that opens trade form

**Details:**

The `AssignPutDialog` already has an `onSellCoveredCall` callback prop and shows a "Sell Covered Call?" prompt after assignment. The problem is that the parent components don't pass a useful `onSellCoveredCall` handler.

1. **Find where AssignPutDialog is rendered.** It is rendered inside `TradeActionsDialog`. Read this component to understand how to wire the callback.

Looking at `TradeActionsDialog` — it renders the `AssignPutDialog` and needs to be updated to:
- Accept an `onSellCoveredCall` callback or handle it internally
- When the user clicks "Sell Covered Call" after assignment, navigate to the trade form or open a modal

Since `TradeActionsDialog` is a dialog itself, the cleanest approach is to:
- Accept a new prop: `onSellCoveredCall?: (ticker: string, positionId: string, contracts: number) => void`
- Pass it through to `AssignPutDialog`
- In the parent page (`trades/page.tsx` or `TradeList`), handle this callback by opening a trade form modal

However, `TradeActionsDialog` needs to know the `positionId` that was created by the assignment. The `assignPut` action returns `{ positionId, tradeId }`. So the flow is:
1. User clicks "Confirm Assignment" in AssignPutDialog
2. `assignPut` returns the new `positionId`
3. "Sell Covered Call?" prompt appears
4. User clicks "Sell Covered Call on {ticker}"
5. `onSellCoveredCall` is called with `(ticker, positionId, contracts)`

The `AssignPutDialog` needs to store the `positionId` from the assignment result and pass it to the callback. Currently `handleSellCoveredCall` just calls `onSellCoveredCall?.()` with no args.

Modify `AssignPutDialog`:
- Store `positionId` from the `assignPut` result in state
- Pass it to the callback: `onSellCoveredCall?.(trade.ticker, positionId, trade.contracts)`

Update the `AssignPutDialogProps.onSellCoveredCall` type:
```typescript
onSellCoveredCall?: (ticker: string, positionId: string, contracts: number) => void
```

Then in the parent (`TradeList` or wherever `TradeActionsDialog` is rendered), handle this callback by opening a trade form modal with prefill.

Check `trade-list.tsx` and `trade-actions-dialog.tsx` to determine the exact wiring path. The `TradeActionsDialog` is likely the component that creates the `AssignPutDialog`.

**Files to check/modify:**
- `components/trades/trade-actions-dialog.tsx` — read to understand where AssignPutDialog is rendered, then modify to wire `onSellCoveredCall`
- `components/trades/trade-list.tsx` — modify to add a trade form modal for the covered call flow
- `components/trades/assign-put-dialog.tsx` — modify `onSellCoveredCall` type signature and pass positionId

**Acceptance criteria:**
- [ ] After PUT assignment, clicking "Sell Covered Call" opens a pre-filled trade form
- [ ] The trade form is pre-filled with ticker, type=CALL, action=SELL_TO_OPEN, positionId (from assignment), and contracts
- [ ] Ticker, type, action, and positionId fields are read-only
- [ ] The flow works from the trades page (TradeActionsDialog -> AssignPutDialog -> Trade Form)

---

## Phase 4: Trade List & Wheel Dashboard Enhancements

### Task 4.1: Add wheel badge to trade list rows

**Parallel:** Yes — can run alongside Task 4.2
**Depends on:** Task 1.1
**Assigned to:** frontend
**Files:**
- `components/trades/trade-list.tsx` — modify — add wheel badge column/indicator
- `lib/queries/trades.ts` — modify — include wheel relation in trade queries

**Details:**

1. **Update `getTrades` query** to include wheel info:
```typescript
include: {
  position: { ... },  // existing
  wheel: {            // ADD
    select: {
      id: true,
      ticker: true,
      status: true,
    },
  },
},
```

2. **In `TradeList` component**, add a wheel badge to each trade row. When a trade has a `wheelId`, show a small circular icon or badge. The trade type from `getTrades` already includes `wheelId` in the Trade model, but we need the wheel data for display.

The `TradeList` receives `initialTrades: Trade[]`. Since `Trade` from Prisma includes `wheelId`, we can check for it. But to show the wheel ticker/link, we need the included `wheel` relation. Update the type:

```typescript
interface TradeWithWheel extends Trade {
  wheel?: {
    id: string
    ticker: string
    status: string
  } | null
}
```

3. **Render the badge** in the trade row (after the ticker or status badge):
```tsx
{trade.wheel && (
  <a
    href={`/wheels/${trade.wheel.id}`}
    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
    title={`Part of ${trade.wheel.ticker} wheel`}
  >
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
    Wheel
  </a>
)}
```

**Acceptance criteria:**
- [ ] Trades that belong to a wheel show a small "Wheel" badge
- [ ] Clicking the badge navigates to the wheel detail page
- [ ] Trades without a wheel show no badge
- [ ] The badge shows on both mobile and desktop views

---

### Task 4.2: Wire "Start New PUT" flow in AssignCallDialog

**Parallel:** Yes — can run alongside Task 4.1
**Depends on:** Task 3.1
**Assigned to:** frontend
**Files:**
- `components/positions/assign-call-dialog.tsx` — modify — wire `onStartNewPut` callback
- `components/positions/position-card.tsx` — modify — pass `onStartNewPut` callback
- `components/positions/positions-list.tsx` — modify — handle the callback

**Details:**

The `AssignCallDialog` already has an `onStartNewPut` callback prop and shows a "Start New PUT on {ticker}?" prompt after CALL assignment. Wire it to open a trade form pre-filled for a new PUT.

1. **In `positions-list.tsx`**, add state and handler:
```typescript
const [newPutTicker, setNewPutTicker] = useState<string | null>(null)

const handleStartNewPut = (ticker: string) => {
  setNewPutTicker(ticker)
  setSellCallPosition(null)
  setIsTradeModalOpen(true)
}
```

2. **Update the Modal prefill logic:**
```tsx
prefill={sellCallPosition ? {
  // ... existing covered call prefill
} : newPutTicker ? {
  ticker: newPutTicker,
  type: 'PUT',
  action: 'SELL_TO_OPEN',
} : undefined}
```

3. **Pass `onStartNewPut` through PositionCard to AssignCallDialog.** The `PositionCard` creates the `AssignCallDialog` internally. We need to pass the handler down:
   - Add `onStartNewPut?: (ticker: string) => void` to `PositionCardProps`
   - Pass it to `AssignCallDialog` inside `PositionCard`
   - In `PositionsList`, pass `onStartNewPut={(ticker) => handleStartNewPut(ticker)}` to each `PositionCard`

4. **Reset newPutTicker when modal closes:**
```typescript
onClose={() => {
  setIsTradeModalOpen(false)
  setSellCallPosition(null)
  setNewPutTicker(null)
}}
```

**Acceptance criteria:**
- [ ] After CALL assignment, clicking "Start New PUT" opens a pre-filled trade form
- [ ] The form is pre-filled with ticker and type=PUT, action=SELL_TO_OPEN
- [ ] Only the ticker is pre-filled (strike, premium, etc. are blank for user to fill)
- [ ] The modal title reflects the action ("Sell New PUT on {ticker}")
- [ ] After creating the PUT, the modal closes and the page refreshes

---

## Phase 5: Integration Testing & Polish

### Task 5.1: End-to-end testing of the full wheel lifecycle

**Parallel:** No
**Depends on:** All previous tasks
**Assigned to:** qa
**Files:**
- Test files as determined by QA agent

**Details:**

The QA agent should test the full wheel lifecycle end-to-end:

1. **Create a SELL_TO_OPEN PUT** — verify wheel is auto-created, trade has `wheelId`
2. **Assign the PUT** — verify position is created with `wheelId`, wheel `lastActivityAt` updates
3. **Sell a covered CALL from position card** — verify form pre-fills correctly, trade has `wheelId` and `positionId`
4. **Assign the CALL** — verify wheel `cycleCount` increments, `totalRealizedPL` updates, wheel status changes to IDLE
5. **Sell a new PUT** — verify IDLE wheel reactivates to ACTIVE, same wheel is reused
6. **Close a PUT early (BUY_TO_CLOSE via closeOption)** — verify wheel `totalPremiums` adjusts
7. **Expire a trade** — verify wheel `totalRealizedPL` and `lastActivityAt` update
8. **Verify trade list shows wheel badges** on all linked trades
9. **Verify Wheels Dashboard** shows accurate stats

---

## QA Strategy

### Unit Tests
- `lib/actions/trades.ts` — test `createTrade` wheel find-or-create logic for all trade type/action combinations
- `lib/actions/positions.ts` — test `assignCall` wheel stat updates and status change to IDLE
- `lib/actions/trades.ts` — test `closeOption` wheel premium adjustments
- `lib/actions/trades.ts` — test `updateTradeStatus` EXPIRED wheel updates
- `lib/actions/wheel-queries.ts` — test `getOpenPositionsForTicker` and `getActiveWheelForTicker`
- Expected test files: `lib/actions/__tests__/trades-wheel-linking.test.ts`, `lib/actions/__tests__/positions-wheel-stats.test.ts`, `lib/actions/__tests__/wheel-queries.test.ts`

### Integration Tests
- Full wheel lifecycle: PUT -> assign -> CALL -> assign -> new PUT
- Concurrent trade creation (verify no duplicate wheels)
- BUY_TO_CLOSE premium adjustment
- Trade expiration stats update
- Expected test files: `lib/actions/__tests__/wheel-lifecycle.integration.test.ts`

### UI / Visual Tests
- TradeEntryForm with position selector visible
- TradeEntryForm with wheel badge visible
- TradeEntryForm with pre-filled values (covered call mode)
- Trade list with wheel badges
- Expected test files: `tests/visual/trade-form-wheel.test.ts`

### E2E Tests
- Full user flow: create PUT -> assign -> sell CALL from position card -> assign CALL -> sell new PUT
- Verify wheel dashboard reflects changes at each step
- Expected test files: `tests/e2e/wheel-lifecycle.spec.ts`

## Dependency Graph

```
Phase 1:  [1.1] ──────────────┬──── (foundation)
                               │
          [1.2] ──┐            │
          [1.3] ──┤  (parallel, depend on 1.1)
          [1.4] ──┘            │
                               │
Phase 2:  [2.1] ──────────────┤  (can develop in parallel with Phase 1)
                               │
                               ▼
Phase 3:  [3.1] ──────────────┬──── (depends on 2.1)
                               │
          [3.2] ──┐            │
          [3.3] ──┘  (parallel, depend on 3.1)
                               │
                               ▼
Phase 4:  [4.1] ──┐
          [4.2] ──┘  (parallel, 4.1 depends on 1.1, 4.2 depends on 3.1)
                               │
                               ▼
Phase 5:  [5.1] ──────────────── (depends on all)
```

### Parallel Assignment Strategy for 2 Frontend Devs

**Frontend Dev 1 (backend-heavy):** Tasks 1.1, 1.2, 1.3, 1.4, 2.1
- All server action modifications and new queries
- Files: `lib/actions/trades.ts`, `lib/actions/positions.ts`, `lib/actions/wheel-queries.ts`

**Frontend Dev 2 (UI-heavy):** Tasks 3.1, 3.2, 3.3, 4.1, 4.2
- All component modifications
- Files: `components/forms/trade-entry-form.tsx`, `components/positions/positions-list.tsx`, `components/positions/position-card.tsx`, `components/positions/assign-call-dialog.tsx`, `components/trades/assign-put-dialog.tsx`, `components/trades/trade-list.tsx`, `lib/queries/trades.ts`

This split minimizes file conflicts:
- Dev 1 only touches `lib/actions/` and creates `lib/actions/wheel-queries.ts`
- Dev 2 only touches `components/` and `lib/queries/trades.ts`
- No shared files between the two devs

Dev 2 can start Task 3.1 as soon as Dev 1 completes Task 2.1 (the query actions). Tasks 4.1 and 4.2 can begin once their respective dependencies are met.

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Race condition creating duplicate wheels | Medium | Use serializable transaction for wheel find-or-create (already in place for trade creation) |
| Premium calculation errors (per-share vs total) | High | Document clearly that `premium` is per-share; always multiply by `shares` (contracts * 100) for totals. Add unit tests for all premium calculations. |
| Form UX regression (existing trade creation) | Medium | Ensure default form behavior (no prefill) is unchanged. All new UI is conditional on type/action selection. |
| Wheel stats drift from manual trade edits | Low | `totalPremiums` and `totalRealizedPL` may become inaccurate if trades are manually edited/deleted. Defer reconciliation to a future task. |
| AssignPutDialog onSellCoveredCall wiring complexity | Medium | The callback chain is 3-4 components deep. Use a clear prop drilling pattern or consider a shared context if it becomes unwieldy. |
| BUY_TO_CLOSE trade matching ambiguity | Low | When finding the open trade to inherit wheelId from, match on userId + ticker + type + status=OPEN. If multiple open trades exist, use the most recent. |

## Migration Notes

No database migrations required. All necessary fields already exist in the schema.

No data backfilling is needed (team lead decided to defer orphaned trade migration to a separate task).

Rollback strategy: Since changes are purely in server action logic and UI components, a rollback is a simple code revert. No database schema changes to undo.

Deployment can be incremental:
1. Deploy Phase 1 first — backend auto-linking begins immediately for new trades
2. Deploy Phases 2-4 — UI enhancements activate
3. All changes are backwards-compatible — old clients without UI updates still benefit from auto-linking
