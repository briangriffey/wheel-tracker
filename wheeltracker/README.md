# Wheel Tracker

Portfolio tracking application for managing and analyzing trading positions.

## Features

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
