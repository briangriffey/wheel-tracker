package positions

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// APIClient handles communication with the Position Management API
type APIClient struct {
	baseURL    string
	httpClient *http.Client
}

// NewAPIClient creates a new Position Management API client
func NewAPIClient(baseURL string) *APIClient {
	return &APIClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// FetchPositions retrieves all positions from the API
func (c *APIClient) FetchPositions() ([]Position, error) {
	resp, err := c.httpClient.Get(c.baseURL + "/api/positions")
	if err != nil {
		return nil, fmt.Errorf("failed to fetch positions: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API returned status %d: %s", resp.StatusCode, string(body))
	}

	var positions []Position
	if err := json.NewDecoder(resp.Body).Decode(&positions); err != nil {
		return nil, fmt.Errorf("failed to decode positions: %w", err)
	}

	return positions, nil
}

// FetchPosition retrieves a specific position by ID
func (c *APIClient) FetchPosition(id string) (*Position, error) {
	resp, err := c.httpClient.Get(fmt.Sprintf("%s/api/positions/%s", c.baseURL, id))
	if err != nil {
		return nil, fmt.Errorf("failed to fetch position: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, fmt.Errorf("position not found: %s", id)
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API returned status %d: %s", resp.StatusCode, string(body))
	}

	var position Position
	if err := json.NewDecoder(resp.Body).Decode(&position); err != nil {
		return nil, fmt.Errorf("failed to decode position: %w", err)
	}

	return &position, nil
}

// StreamPositions establishes a connection to receive real-time position updates
// This will be implemented once the Position Management API supports streaming
func (c *APIClient) StreamPositions() (<-chan Position, error) {
	// TODO: Implement streaming connection when API is available
	updates := make(chan Position)
	close(updates)
	return updates, fmt.Errorf("streaming not yet implemented")
}
