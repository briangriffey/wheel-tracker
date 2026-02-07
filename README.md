# Wheel Tracker - Position Management Integration

Integration service that connects the Position Management API with the Position Display UI.

## Architecture

This service acts as an integration layer between:
- **Position Management API** (backend) - Provides position data and management operations
- **Position Display UI** (frontend) - Displays positions and real-time updates

### Components

1. **HTTP API Gateway** - Proxies requests between UI and backend API
2. **WebSocket Server** - Streams real-time position updates to connected clients
3. **Position API Client** - Handles communication with the Position Management API

## Endpoints

### REST API
- `GET /health` - Health check endpoint
- `GET /api/positions` - Fetch all positions
- `GET /api/positions/{id}` - Fetch specific position

### WebSocket
- `WS /ws/positions` - Real-time position updates stream

## Configuration

Environment variables:
- `PORT` - Service port (default: 8080)
- `POSITION_API_URL` - Position Management API URL (default: http://localhost:8081)

## Development

```bash
# Install dependencies
go mod download

# Run the service
go run main.go

# Build
go build -o wheeltracker

# Run tests
go test ./...
```

## Integration Status

This integration layer is ready to connect the Position Management API (being developed by polecat shiny) and the Position Display UI (being developed by polecat fury) once those components are available.
