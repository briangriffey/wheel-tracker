# Dialog Components

Guided dialog components for wheel strategy workflows.

## Sell Covered Call Dialog

The `SellCallDialog` component provides a guided workflow for selling covered calls against existing stock positions.

### Features

- **Pre-filled Position Data**: Automatically displays ticker, shares, cost basis, and contracts
- **Smart Strike Suggestion**: Suggests profitable strike prices based on desired return percentage
- **Real-time Validation**:
  - Warns when strike price is below cost basis (potential loss)
  - Prevents multiple open CALLs on the same position
  - Prevents selling calls on closed positions
- **Comprehensive Form**: Collects strike price, premium, expiration date, and notes
- **Responsive Design**: Works on mobile and desktop
- **Accessibility**: Keyboard navigation, ARIA labels, focus management

### Usage

```tsx
import { SellCallDialog } from '@/components/dialogs'
import { useState } from 'react'

function PositionDetailPage({ position }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <>
      <button onClick={() => setIsDialogOpen(true)}>
        Sell Covered Call
      </button>

      <SellCallDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        position={position}
        onSuccess={() => {
          console.log('Call created successfully!')
          setIsDialogOpen(false)
          // Refresh position data
        }}
        desiredReturn={5} // Optional: default is 5%
      />
    </>
  )
}
```

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `isOpen` | `boolean` | Yes | - | Controls dialog visibility |
| `onClose` | `() => void` | Yes | - | Called when dialog should close |
| `position` | `SellCallPosition` | Yes | - | Position to sell call against |
| `onSuccess` | `() => void` | No | - | Called after successful call creation |
| `desiredReturn` | `number` | No | `5` | Desired return % for strike suggestion |

### Position Type

```typescript
interface SellCallPosition {
  id: string
  ticker: string
  shares: number
  costBasis: number
  status: 'OPEN' | 'CLOSED'
  coveredCalls?: Array<{ status: string }>
}
```

### Validation Rules

1. **Position must be OPEN**: Cannot sell calls on closed positions
2. **No duplicate open CALLs**: Only one active CALL allowed per position
3. **Strike price validation**:
   - Must be positive
   - Warning shown if below cost basis
4. **Expiration date validation**:
   - Must be in the future
   - Must be within 1-365 days
5. **Premium validation**: Must be positive

### Strike Price Suggestion

The dialog calculates a suggested strike price using the formula:

```
suggestedStrike = costBasis * (1 + desiredReturn / 100)
```

For example, with a cost basis of $147.50 and 5% desired return:
```
suggestedStrike = 147.50 * 1.05 = $154.88
```

This ensures a profitable sale if the call is assigned.

### Error Handling

The dialog handles various error scenarios:

- **Position validation errors**: Displayed prominently at the top
- **Form validation errors**: Shown inline next to fields
- **Submission errors**: Toast notification with error message
- **Network errors**: Generic error toast

### Examples

#### Basic Usage

```tsx
<SellCallDialog
  isOpen={true}
  onClose={() => setOpen(false)}
  position={{
    id: 'pos_123',
    ticker: 'AAPL',
    shares: 100,
    costBasis: 147.50,
    status: 'OPEN',
    coveredCalls: []
  }}
/>
```

#### With Success Callback

```tsx
<SellCallDialog
  isOpen={true}
  onClose={() => setOpen(false)}
  position={position}
  onSuccess={() => {
    toast.success('Covered call created!')
    router.refresh() // Refresh server data
  }}
/>
```

#### Custom Desired Return

```tsx
<SellCallDialog
  isOpen={true}
  onClose={() => setOpen(false)}
  position={position}
  desiredReturn={10} // Suggest 10% return strike
/>
```

## Testing

Run tests with:

```bash
pnpm test components/dialogs/__tests__/sell-call-dialog.test.tsx
```

See test file for examples of:
- Rendering tests
- Position data display
- Strike price suggestions
- Validation warnings
- Form submission

## Related Components

- `Dialog` - Base dialog component
- `Input` - Form input component
- `Button` - Action buttons
- `Select` - Dropdown component

## Related Actions

- `createTrade()` - Server action to create CALL trade
- `suggestCallStrike()` - Calculate optimal strike price
- `validateStrikePrice()` - Validate strike vs cost basis
- `validatePositionState()` - Check position can accept CALL
