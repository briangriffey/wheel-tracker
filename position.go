package pnl

import (
	"time"
)

// PositionType represents the type of position
type PositionType string

const (
	PositionTypeLong  PositionType = "long"
	PositionTypeShort PositionType = "short"
)

// PositionStatus represents the current status of a position
type PositionStatus string

const (
	PositionStatusOpen   PositionStatus = "open"
	PositionStatusClosed PositionStatus = "closed"
)

// Position represents a trading position
type Position struct {
	ID           string         `json:"id"`
	Symbol       string         `json:"symbol"`
	Type         PositionType   `json:"type"`
	Status       PositionStatus `json:"status"`
	Quantity     float64        `json:"quantity"`
	EntryPrice   float64        `json:"entry_price"`
	ExitPrice    float64        `json:"exit_price,omitempty"`
	CurrentPrice float64        `json:"current_price,omitempty"`
	OpenedAt     time.Time      `json:"opened_at"`
	ClosedAt     *time.Time     `json:"closed_at,omitempty"`
}

// IsOpen returns true if the position is currently open
func (p *Position) IsOpen() bool {
	return p.Status == PositionStatusOpen
}

// IsClosed returns true if the position has been closed
func (p *Position) IsClosed() bool {
	return p.Status == PositionStatusClosed
}
