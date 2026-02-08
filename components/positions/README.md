# Position Components

## PositionCard

A responsive card component for displaying stock position information with real-time P&L tracking.

### Features

- ✅ Displays all key position metrics (ticker, shares, cost basis, current price, etc.)
- ✅ Color-coded P&L (green for profit, red for loss, gray for break-even)
- ✅ Covered call premium tracking
- ✅ Loading and error states for price fetching
- ✅ Responsive design (mobile-first)
- ✅ Accessible (WCAG 2.1 AA compliant)
- ✅ Expandable details section
- ✅ Action buttons for selling covered calls and viewing details

### Usage

```tsx
import { PositionCard } from '@/components/positions/position-card'

const position = {
  id: 'pos-123',
  ticker: 'AAPL',
  shares: 100,
  costBasis: 150.00,
  totalCost: 15000.00,
  currentValue: 16500.00,
  status: 'OPEN',
  acquiredDate: new Date('2024-01-01'),
  closedDate: null,
  coveredCalls: [
    { id: 'call-1', premium: 250, status: 'OPEN' },
  ],
}

function PositionsPage() {
  const handleSellCall = (positionId: string) => {
    // Navigate to sell covered call form
    router.push(`/positions/${positionId}/sell-call`)
  }

  const handleViewDetails = (positionId: string) => {
    // Navigate to position details page
    router.push(`/positions/${positionId}`)
  }

  return (
    <PositionCard
      position={position}
      onSellCall={handleSellCall}
      onViewDetails={handleViewDetails}
      isLoadingPrice={false}
      priceError={null}
    />
  )
}
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `position` | `PositionCardData` | Yes | Position data to display |
| `onSellCall` | `(positionId: string) => void` | No | Callback when "Sell Covered Call" button is clicked |
| `onViewDetails` | `(positionId: string) => void` | No | Callback when "View Details" button is clicked |
| `isLoadingPrice` | `boolean` | No | Shows loading spinner when fetching current price |
| `priceError` | `string \| null` | No | Error message to display if price fetch fails |

### PositionCardData Type

```typescript
interface PositionCardData {
  id: string
  ticker: string
  shares: number
  costBasis: number          // Cost per share
  totalCost: number          // Total amount paid
  currentValue: number | null // Current market value
  status: 'OPEN' | 'CLOSED'
  acquiredDate: Date
  closedDate: Date | null
  coveredCalls?: Array<{
    id: string
    premium: number
    status: string
  }>
}
```

### States

#### Loading State
When `isLoadingPrice={true}`, the component displays loading spinners for current price and value fields.

#### Error State
When `priceError` is provided, the component displays a warning message with the error details.

#### Empty State
When `currentValue` is `null`, the component displays "N/A" for price-dependent fields.

### Examples

#### Basic Position Card
```tsx
<PositionCard position={position} />
```

#### With Action Buttons
```tsx
<PositionCard
  position={position}
  onSellCall={handleSellCall}
  onViewDetails={handleViewDetails}
/>
```

#### With Loading State
```tsx
<PositionCard
  position={position}
  isLoadingPrice={true}
/>
```

#### With Error State
```tsx
<PositionCard
  position={position}
  priceError="API rate limit exceeded"
/>
```

### Styling

The component uses Tailwind CSS for styling and is fully responsive:
- Mobile (< 640px): Single column layout
- Tablet/Desktop (≥ 640px): Multi-column grid layout

### Accessibility

- ✅ Proper ARIA labels for interactive elements
- ✅ Keyboard navigation support
- ✅ Screen reader friendly
- ✅ Semantic HTML structure
- ✅ Color contrast compliant (WCAG AA)

### Related Utilities

The component uses helper functions from `@/lib/utils/position-calculations`:

- `calculateUnrealizedPnL()` - Calculate profit/loss
- `calculateUnrealizedPnLPercentage()` - Calculate P&L percentage
- `calculateCurrentPrice()` - Calculate price per share
- `calculateDaysHeld()` - Calculate holding period
- `calculateTotalCoveredCallPremium()` - Sum covered call premiums
- `getPnLColorClass()` - Get color class based on P&L
- `getPnLBackgroundClass()` - Get background color based on P&L
- `formatCurrency()` - Format numbers as currency
- `formatPercentage()` - Format numbers as percentage

### Testing

The component includes comprehensive test coverage:
- ✅ Rendering tests (all metrics display correctly)
- ✅ Loading state tests
- ✅ Error state tests
- ✅ Color coding tests (P&L colors)
- ✅ Action button tests (click handlers)
- ✅ Expand/collapse tests
- ✅ Responsive design tests
- ✅ Accessibility tests
- ✅ Edge case tests (zero values, break-even, etc.)

Run tests:
```bash
pnpm test -- position-card
```
