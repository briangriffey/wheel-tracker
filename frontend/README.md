# Frontend - Trade Entry Form

This directory will contain the Trade Entry Frontend Form component.

## Integration

The frontend integrates with the backend via the `TradeEntryIntegration` module located in `../src/integration/`.

### Usage Example

```javascript
import { createTradeEntryIntegration } from '../src/integration';

const integration = createTradeEntryIntegration({
  apiBaseURL: 'http://localhost:3001'
});

// Submit a trade from the form
const result = await integration.submitTrade({
  symbol: 'AAPL',
  type: 'BUY',
  quantity: 100,
  price: 150.25
});

if (result.success) {
  console.log('Trade submitted:', result.tradeId);
} else {
  console.error('Trade failed:', result.error);
}
```

## Development

The frontend form component should:
1. Collect trade entry data from the user
2. Validate input client-side
3. Use the `TradeEntryIntegration` to submit to backend
4. Handle success/error responses appropriately
5. Display confirmation or error messages to the user
