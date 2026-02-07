# Wheel Tracker

A trade tracking and position management system.

## Architecture

The application consists of three main components:

### 1. Frontend (Trade Entry Form)
- User interface for entering trade data
- Located in `frontend/`
- Communicates with backend via the integration layer

### 2. Backend (Trade Entry API)
- REST API for trade data management
- Located in `backend/`
- Handles data persistence and business logic

### 3. Integration Layer
- Connects frontend and backend components
- Located in `src/integration/`
- Provides unified API client and data transformation
- Handles authentication and error handling

## Project Structure

```
wheel-tracker/
├── frontend/           # Trade entry form UI
├── backend/            # Trade entry API
├── src/
│   └── integration/    # Integration layer
│       ├── index.js                    # Main entry point
│       ├── apiClient.js                # HTTP client
│       └── tradeEntryIntegration.js    # Trade integration logic
├── config/             # Configuration files
│   ├── default.json    # Development config
│   └── production.json # Production config
└── package.json        # Root package configuration
```

## Getting Started

### Installation

```bash
npm install
```

### Development

Run both frontend and backend in development mode:

```bash
npm run dev
```

Or run them separately:

```bash
npm run dev:frontend
npm run dev:backend
```

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

## Integration Usage

The integration layer provides a simple API for connecting the frontend form to the backend:

```javascript
const { createTradeEntryIntegration } = require('./src/integration');

// Create integration instance
const integration = createTradeEntryIntegration({
  apiBaseURL: 'http://localhost:3001',
  authToken: 'your-auth-token'
});

// Submit a trade
const result = await integration.submitTrade({
  symbol: 'AAPL',
  type: 'BUY',
  quantity: 100,
  price: 150.25
});

// Get trade history
const history = await integration.getTradeHistory({
  symbol: 'AAPL'
});
```

## Configuration

Configuration is managed through files in the `config/` directory:

- `default.json`: Development settings
- `production.json`: Production settings (uses environment variables)

### Environment Variables

- `API_BASE_URL`: Backend API base URL
- `PORT`: Frontend port (default: 3000)
- `API_PORT`: Backend API port (default: 3001)
- `CORS_ORIGINS`: Allowed CORS origins (comma-separated)

## Contributing

This project is part of the Gas Town multi-agent development system.

## License

MIT
