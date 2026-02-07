package pnl

import (
	"testing"
	"time"
)

func TestPosition_IsOpen(t *testing.T) {
	tests := []struct {
		name string
		pos  *Position
		want bool
	}{
		{
			name: "open position",
			pos: &Position{
				Status: PositionStatusOpen,
			},
			want: true,
		},
		{
			name: "closed position",
			pos: &Position{
				Status: PositionStatusClosed,
			},
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.pos.IsOpen(); got != tt.want {
				t.Errorf("Position.IsOpen() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestPosition_IsClosed(t *testing.T) {
	tests := []struct {
		name string
		pos  *Position
		want bool
	}{
		{
			name: "closed position",
			pos: &Position{
				Status: PositionStatusClosed,
			},
			want: true,
		},
		{
			name: "open position",
			pos: &Position{
				Status: PositionStatusOpen,
			},
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.pos.IsClosed(); got != tt.want {
				t.Errorf("Position.IsClosed() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestPositionTypes(t *testing.T) {
	if PositionTypeLong != "long" {
		t.Errorf("PositionTypeLong = %v, want \"long\"", PositionTypeLong)
	}
	if PositionTypeShort != "short" {
		t.Errorf("PositionTypeShort = %v, want \"short\"", PositionTypeShort)
	}
}

func TestPositionStatuses(t *testing.T) {
	if PositionStatusOpen != "open" {
		t.Errorf("PositionStatusOpen = %v, want \"open\"", PositionStatusOpen)
	}
	if PositionStatusClosed != "closed" {
		t.Errorf("PositionStatusClosed = %v, want \"closed\"", PositionStatusClosed)
	}
}

func TestPositionStructure(t *testing.T) {
	now := time.Now()
	closedAt := now.Add(1 * time.Hour)

	pos := &Position{
		ID:           "test-123",
		Symbol:       "AAPL",
		Type:         PositionTypeLong,
		Status:       PositionStatusClosed,
		Quantity:     100,
		EntryPrice:   150.0,
		ExitPrice:    160.0,
		CurrentPrice: 160.0,
		OpenedAt:     now,
		ClosedAt:     &closedAt,
	}

	if pos.ID != "test-123" {
		t.Errorf("Position.ID = %v, want test-123", pos.ID)
	}
	if pos.Symbol != "AAPL" {
		t.Errorf("Position.Symbol = %v, want AAPL", pos.Symbol)
	}
	if pos.Type != PositionTypeLong {
		t.Errorf("Position.Type = %v, want long", pos.Type)
	}
	if pos.Status != PositionStatusClosed {
		t.Errorf("Position.Status = %v, want closed", pos.Status)
	}
	if pos.Quantity != 100 {
		t.Errorf("Position.Quantity = %v, want 100", pos.Quantity)
	}
	if pos.EntryPrice != 150.0 {
		t.Errorf("Position.EntryPrice = %v, want 150.0", pos.EntryPrice)
	}
	if pos.ExitPrice != 160.0 {
		t.Errorf("Position.ExitPrice = %v, want 160.0", pos.ExitPrice)
	}
	if pos.ClosedAt == nil || !pos.ClosedAt.Equal(closedAt) {
		t.Errorf("Position.ClosedAt = %v, want %v", pos.ClosedAt, closedAt)
	}
}
