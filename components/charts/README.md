# Wheel Charts

This directory contains chart components for visualizing wheel strategy data.

## WheelCharts Component

The `WheelCharts` component provides comprehensive visualizations for wheel strategy performance:

### Features

1. **P&L Over Time** - Line chart showing cumulative profit/loss as trades close
2. **Premiums by Month** - Bar chart displaying total premiums collected each month
3. **Win Rate** - Pie chart showing the distribution of profitable vs unprofitable positions
4. **Cycle Duration** - Bar chart showing how long each completed wheel cycle took

### Usage

```typescript
import { WheelCharts } from '@/components/charts'
import { getWheelDetail } from '@/lib/actions/wheels'

export default async function WheelDetailPage({ params }: { params: { id: string } }) {
  const result = await getWheelDetail(params.id)

  if (!result.success) {
    return <div>Error: {result.error}</div>
  }

  const wheelData = {
    trades: result.data.trades,
    positions: result.data.positions,
    startedAt: result.data.startedAt,
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">
        {result.data.ticker} Wheel Performance
      </h1>

      <WheelCharts wheelData={wheelData} />
    </div>
  )
}
```

### Props

```typescript
interface WheelChartsProps {
  wheelData: {
    trades: Trade[]
    positions: Position[]
    startedAt: Date
  }
  loading?: boolean
}
```

### Data Types

```typescript
interface Trade {
  id: string
  type: string
  action: string
  status: string
  strikePrice: number
  premium: number
  contracts: number
  expirationDate: Date
  openDate: Date
  closeDate: Date | null
}

interface Position {
  id: string
  shares: number
  costBasis: number
  totalCost: number
  status: string
  realizedGainLoss: number | null
  acquiredDate: Date
  closedDate: Date | null
}
```

### Empty States

The component handles empty states gracefully:
- Shows "No closed trades yet" when there are no closed trades
- Shows "No premium data available" when no premiums have been collected
- Shows "No closed positions yet" when there are no closed positions
- Shows "No completed cycles yet" when there are no completed wheel cycles

### Loading State

Pass `loading={true}` to show skeleton loading UI:

```typescript
<WheelCharts wheelData={wheelData} loading={true} />
```

### Styling

All charts use the design system's Card component and are responsive:
- Desktop: 2-column grid
- Mobile: Single column stack

Charts use consistent colors from the design system:
- P&L: Blue (#3b82f6)
- Premiums: Green (#10b981)
- Winners: Green (#10b981)
- Losers: Red (#ef4444)
- Breakeven: Gray (#6b7280)

## Testing

Run tests with:

```bash
pnpm test wheel-charts.test
```

## Dependencies

- Recharts 3.7.0+ - React chart library
- Design System Card components
- React 19.2.4+
