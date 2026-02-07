package positions

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestNewService(t *testing.T) {
	apiURL := "http://localhost:8081"
	svc := NewService(apiURL)

	if svc.apiURL != apiURL {
		t.Errorf("expected apiURL %s, got %s", apiURL, svc.apiURL)
	}

	if svc.clients == nil {
		t.Error("expected clients map to be initialized")
	}
}

func TestGetPositions(t *testing.T) {
	svc := NewService("http://localhost:8081")

	req := httptest.NewRequest("GET", "/api/positions", nil)
	w := httptest.NewRecorder()

	svc.GetPositions(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected status 200, got %d", resp.StatusCode)
	}

	var body map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if body["status"] != "integration_ready" {
		t.Errorf("expected status 'integration_ready', got %v", body["status"])
	}
}

func TestGetPosition(t *testing.T) {
	svc := NewService("http://localhost:8081")

	req := httptest.NewRequest("GET", "/api/positions/test-123", nil)
	w := httptest.NewRecorder()

	// Need to set up mux vars for this test
	// For now, just verify the handler doesn't panic
	defer func() {
		if r := recover(); r != nil {
			t.Errorf("GetPosition panicked: %v", r)
		}
	}()

	// This will fail to get mux vars but shouldn't panic
	svc.GetPosition(w, req)
}

func TestPosition(t *testing.T) {
	p := Position{
		ID:           "test-123",
		Symbol:       "AAPL",
		Quantity:     100,
		EntryPrice:   150.0,
		CurrentPrice: 155.0,
		PnL:          500.0,
	}

	if p.ID != "test-123" {
		t.Errorf("expected ID test-123, got %s", p.ID)
	}

	if p.Symbol != "AAPL" {
		t.Errorf("expected symbol AAPL, got %s", p.Symbol)
	}
}
