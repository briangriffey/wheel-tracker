package positions

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

// Position represents a trading position
type Position struct {
	ID        string    `json:"id"`
	Symbol    string    `json:"symbol"`
	Quantity  float64   `json:"quantity"`
	EntryPrice float64  `json:"entry_price"`
	CurrentPrice float64 `json:"current_price"`
	PnL       float64   `json:"pnl"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Service handles position management integration
type Service struct {
	apiURL    string
	clients   map[*websocket.Conn]bool
	clientsMu sync.RWMutex
	upgrader  websocket.Upgrader
}

// NewService creates a new position integration service
func NewService(apiURL string) *Service {
	return &Service{
		apiURL:  apiURL,
		clients: make(map[*websocket.Conn]bool),
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // TODO: Configure CORS properly
			},
		},
	}
}

// GetPositions fetches all positions from the Position Management API
func (s *Service) GetPositions(w http.ResponseWriter, r *http.Request) {
	// TODO: Call Position Management API when available
	// For now, return integration stub
	resp := map[string]interface{}{
		"status": "integration_ready",
		"message": "Position Management API integration pending",
		"api_url": s.apiURL,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// GetPosition fetches a specific position by ID
func (s *Service) GetPosition(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	positionID := vars["id"]

	// TODO: Call Position Management API when available
	resp := map[string]interface{}{
		"status": "integration_ready",
		"message": fmt.Sprintf("Position %s integration pending", positionID),
		"api_url": s.apiURL,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// WebSocketHandler handles WebSocket connections for real-time position updates
func (s *Service) WebSocketHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := s.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}
	defer conn.Close()

	s.clientsMu.Lock()
	s.clients[conn] = true
	s.clientsMu.Unlock()

	defer func() {
		s.clientsMu.Lock()
		delete(s.clients, conn)
		s.clientsMu.Unlock()
	}()

	// Send initial connection message
	welcome := map[string]interface{}{
		"type": "connected",
		"message": "Position updates will stream here when API is integrated",
	}
	conn.WriteJSON(welcome)

	// Keep connection alive and handle incoming messages
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}
		// TODO: Handle incoming messages when needed
	}
}

// BroadcastPosition sends position update to all connected WebSocket clients
func (s *Service) BroadcastPosition(position Position) {
	s.clientsMu.RLock()
	defer s.clientsMu.RUnlock()

	for client := range s.clients {
		err := client.WriteJSON(position)
		if err != nil {
			log.Printf("WebSocket write error: %v", err)
			client.Close()
		}
	}
}
