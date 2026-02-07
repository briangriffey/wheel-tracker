# Market Data Source

This module provides a unified interface for fetching market data (stock prices, historical data) from various providers.

## Features

- **Provider abstraction**: Switch between different market data providers with configuration
- **Mock provider**: Built-in mock provider for development and testing
- **Rate limiting**: Configurable rate limits per provider
- **Retry logic**: Automatic retry on transient failures
- **Type safety**: Full TypeScript support with comprehensive type definitions

## Quick Start

```typescript
import { getMarketDataProvider } from '@/lib/market-data';

const provider = getMarketDataProvider();

// Get a single quote
const quote = await provider.getQuote('AAPL');
console.log(`AAPL: $${quote.price}`);

// Get multiple quotes
const quotes = await provider.getBatchQuotes(['AAPL', 'GOOGL', 'MSFT']);

// Get historical prices
const startDate = new Date('2024-01-01');
const endDate = new Date('2024-12-31');
const history = await provider.getHistoricalPrices('AAPL', startDate, endDate);
```

## Configuration

Configure the market data provider via environment variables (see `.env.example`):

```bash
MARKET_DATA_PROVIDER=mock           # Provider to use
MARKET_DATA_API_KEY=your-key-here   # API key (not needed for mock)
MARKET_DATA_RATE_LIMIT=60           # Requests per minute
MARKET_DATA_CACHE_TTL=300           # Cache TTL in seconds
MARKET_DATA_RETRY_ATTEMPTS=3        # Retry attempts on failure
```

## Supported Providers

### Mock Provider (Default)
- No API key required
- Returns realistic simulated data
- Perfect for development and testing

### Alpha Vantage
- Coming soon
- Free tier available with rate limits

### Polygon.io
- Coming soon
- Real-time and historical data

### Yahoo Finance
- Coming soon
- Free access (unofficial API)

### IEX Cloud
- Coming soon
- Professional-grade data

## Architecture

```
lib/market-data/
├── types.ts              # Core type definitions
├── provider.ts           # Provider interface and base class
├── factory.ts            # Provider factory
├── config.ts             # Configuration management
├── providers/
│   └── mock-provider.ts  # Mock implementation
└── index.ts              # Module exports
```

## Extending with New Providers

To add a new market data provider:

1. Create a new file in `providers/` (e.g., `alpha-vantage-provider.ts`)
2. Extend `BaseMarketDataProvider`
3. Implement all required methods
4. Add the provider to the factory in `factory.ts`
5. Add the provider enum value to `types.ts`

Example:

```typescript
import { BaseMarketDataProvider } from '../provider';
import { Quote, HistoricalPrice } from '../types';

export class AlphaVantageProvider extends BaseMarketDataProvider {
  async getQuote(symbol: string): Promise<Quote> {
    // Implementation here
  }

  async getBatchQuotes(symbols: string[]): Promise<Quote[]> {
    // Implementation here
  }

  async getHistoricalPrices(
    symbol: string,
    startDate: Date,
    endDate: Date
  ): Promise<HistoricalPrice[]> {
    // Implementation here
  }

  async healthCheck(): Promise<boolean> {
    // Implementation here
  }
}
```

## Testing

The mock provider is designed for testing and will return:
- Realistic price variations (+/- 1% for quotes)
- Historical data with OHLC values
- Consistent base prices for common symbols (AAPL, GOOGL, etc.)

## Error Handling

All provider methods may throw errors. Handle them appropriately:

```typescript
try {
  const quote = await provider.getQuote('AAPL');
} catch (error) {
  console.error('Failed to fetch quote:', error);
  // Handle error (fallback, retry, notify user, etc.)
}
```

## Future Enhancements

- [ ] Implement Alpha Vantage provider
- [ ] Implement Polygon.io provider
- [ ] Add caching layer (Redis/in-memory)
- [ ] Add WebSocket support for real-time data
- [ ] Add data validation and sanitization
- [ ] Add metrics and monitoring
- [ ] Add batch request optimization
