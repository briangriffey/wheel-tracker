# Wheel Tracker

Portfolio tracking application for managing and analyzing trading positions.

## Features

### Trade Entry Integration (Phase 1)

Integration layer connecting the frontend trade entry form with the backend API:

- **TradeEntryIntegration** class for submitting trades and fetching history
- **ApiClient** with authentication and error handling support
- Environment-specific configuration (dev/prod)
- Data validation and transformation
- Comprehensive error handling and response formatting

See [src/integration/](src/integration/) for the integration module and [frontend/README.md](frontend/README.md) / [backend/README.md](backend/README.md) for usage examples.

### Market Data Source (Phase 3)

Unified market data interface supporting multiple providers:

- **Mock provider** for development and testing
- Extensible architecture for real providers (Alpha Vantage, Polygon.io, Yahoo Finance, IEX Cloud)
- Real-time quotes and historical price data
- Built-in rate limiting and retry logic
- Full TypeScript support

See [lib/market-data/README.md](lib/market-data/README.md) for detailed documentation.

## Setup

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Configure your market data provider (defaults to mock for development)

## Development

The market data module is designed to work standalone and integrates with:
- Price Fetching Service (Phase 3)
- P&L Calculation Engine (Phase 4)
- Portfolio Analytics (Phase 6)
