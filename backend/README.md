# Backend - Trade Entry API

This directory will contain the Trade Entry API Backend.

## Integration

The backend receives trade data from the frontend via the integration layer.

### Expected API Endpoints

#### POST /api/trades
Submit a new trade entry.

**Request Body:**
```json
{
  "symbol": "AAPL",
  "type": "BUY",
  "quantity": 100,
  "price": 150.25,
  "timestamp": "2026-02-06T12:00:00Z",
  "metadata": {
    "source": "trade-entry-form",
    "version": "1.0"
  }
}
```

**Response (Success):**
```json
{
  "id": "trade_123",
  "symbol": "AAPL",
  "type": "BUY",
  "quantity": 100,
  "price": 150.25,
  "timestamp": "2026-02-06T12:00:00Z",
  "status": "submitted"
}
```

**Response (Error):**
```json
{
  "error": "Validation failed",
  "details": {
    "field": "price",
    "message": "Price cannot be negative"
  }
}
```

#### GET /api/trades
Retrieve trade history with optional filters.

**Query Parameters:**
- `symbol`: Filter by trading symbol
- `type`: Filter by trade type (BUY/SELL)
- `startDate`: Start of date range
- `endDate`: End of date range

## Development

The backend API should:
1. Accept trade data from the integration layer
2. Validate and sanitize input
3. Store trades in the database
4. Return appropriate responses with trade IDs
5. Provide trade history retrieval
6. Handle authentication (via Bearer tokens)
