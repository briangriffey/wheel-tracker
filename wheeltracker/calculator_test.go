package pnl

import (
	"testing"
	"time"
)

func TestCalculateRealizedPnL(t *testing.T) {
	calc := NewCalculator()
	now := time.Now()

	tests := []struct {
		name    string
		pos     *Position
		want    float64
		wantErr error
	}{
		{
			name: "long position profit",
			pos: &Position{
				ID:         "1",
				Symbol:     "AAPL",
				Type:       PositionTypeLong,
				Status:     PositionStatusClosed,
				Quantity:   100,
				EntryPrice: 150.0,
				ExitPrice:  160.0,
				OpenedAt:   now,
				ClosedAt:   &now,
			},
			want:    1000.0, // (160 - 150) * 100
			wantErr: nil,
		},
		{
			name: "long position loss",
			pos: &Position{
				ID:         "2",
				Symbol:     "AAPL",
				Type:       PositionTypeLong,
				Status:     PositionStatusClosed,
				Quantity:   100,
				EntryPrice: 160.0,
				ExitPrice:  150.0,
				OpenedAt:   now,
				ClosedAt:   &now,
			},
			want:    -1000.0, // (150 - 160) * 100
			wantErr: nil,
		},
		{
			name: "short position profit",
			pos: &Position{
				ID:         "3",
				Symbol:     "TSLA",
				Type:       PositionTypeShort,
				Status:     PositionStatusClosed,
				Quantity:   50,
				EntryPrice: 200.0,
				ExitPrice:  180.0,
				OpenedAt:   now,
				ClosedAt:   &now,
			},
			want:    1000.0, // (200 - 180) * 50
			wantErr: nil,
		},
		{
			name: "short position loss",
			pos: &Position{
				ID:         "4",
				Symbol:     "TSLA",
				Type:       PositionTypeShort,
				Status:     PositionStatusClosed,
				Quantity:   50,
				EntryPrice: 180.0,
				ExitPrice:  200.0,
				OpenedAt:   now,
				ClosedAt:   &now,
			},
			want:    -1000.0, // (180 - 200) * 50
			wantErr: nil,
		},
		{
			name:    "nil position",
			pos:     nil,
			want:    0,
			wantErr: ErrInvalidPosition,
		},
		{
			name: "open position",
			pos: &Position{
				ID:           "5",
				Symbol:       "AAPL",
				Type:         PositionTypeLong,
				Status:       PositionStatusOpen,
				Quantity:     100,
				EntryPrice:   150.0,
				CurrentPrice: 160.0,
				OpenedAt:     now,
			},
			want:    0,
			wantErr: ErrPositionOpen,
		},
		{
			name: "zero quantity",
			pos: &Position{
				ID:         "6",
				Symbol:     "AAPL",
				Type:       PositionTypeLong,
				Status:     PositionStatusClosed,
				Quantity:   0,
				EntryPrice: 150.0,
				ExitPrice:  160.0,
				OpenedAt:   now,
				ClosedAt:   &now,
			},
			want:    0,
			wantErr: ErrInvalidPosition,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := calc.CalculateRealizedPnL(tt.pos)
			if err != tt.wantErr {
				t.Errorf("CalculateRealizedPnL() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got != tt.want {
				t.Errorf("CalculateRealizedPnL() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestCalculateUnrealizedPnL(t *testing.T) {
	calc := NewCalculator()
	now := time.Now()

	tests := []struct {
		name    string
		pos     *Position
		want    float64
		wantErr error
	}{
		{
			name: "long position profit",
			pos: &Position{
				ID:           "1",
				Symbol:       "AAPL",
				Type:         PositionTypeLong,
				Status:       PositionStatusOpen,
				Quantity:     100,
				EntryPrice:   150.0,
				CurrentPrice: 160.0,
				OpenedAt:     now,
			},
			want:    1000.0, // (160 - 150) * 100
			wantErr: nil,
		},
		{
			name: "long position loss",
			pos: &Position{
				ID:           "2",
				Symbol:       "AAPL",
				Type:         PositionTypeLong,
				Status:       PositionStatusOpen,
				Quantity:     100,
				EntryPrice:   160.0,
				CurrentPrice: 150.0,
				OpenedAt:     now,
			},
			want:    -1000.0, // (150 - 160) * 100
			wantErr: nil,
		},
		{
			name: "short position profit",
			pos: &Position{
				ID:           "3",
				Symbol:       "TSLA",
				Type:         PositionTypeShort,
				Status:       PositionStatusOpen,
				Quantity:     50,
				EntryPrice:   200.0,
				CurrentPrice: 180.0,
				OpenedAt:     now,
			},
			want:    1000.0, // (200 - 180) * 50
			wantErr: nil,
		},
		{
			name: "short position loss",
			pos: &Position{
				ID:           "4",
				Symbol:       "TSLA",
				Type:         PositionTypeShort,
				Status:       PositionStatusOpen,
				Quantity:     50,
				EntryPrice:   180.0,
				CurrentPrice: 200.0,
				OpenedAt:     now,
			},
			want:    -1000.0, // (180 - 200) * 50
			wantErr: nil,
		},
		{
			name:    "nil position",
			pos:     nil,
			want:    0,
			wantErr: ErrInvalidPosition,
		},
		{
			name: "closed position",
			pos: &Position{
				ID:         "5",
				Symbol:     "AAPL",
				Type:       PositionTypeLong,
				Status:     PositionStatusClosed,
				Quantity:   100,
				EntryPrice: 150.0,
				ExitPrice:  160.0,
				OpenedAt:   now,
				ClosedAt:   &now,
			},
			want:    0,
			wantErr: ErrPositionClosed,
		},
		{
			name: "zero current price",
			pos: &Position{
				ID:           "6",
				Symbol:       "AAPL",
				Type:         PositionTypeLong,
				Status:       PositionStatusOpen,
				Quantity:     100,
				EntryPrice:   150.0,
				CurrentPrice: 0,
				OpenedAt:     now,
			},
			want:    0,
			wantErr: ErrInvalidPosition,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := calc.CalculateUnrealizedPnL(tt.pos)
			if err != tt.wantErr {
				t.Errorf("CalculateUnrealizedPnL() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got != tt.want {
				t.Errorf("CalculateUnrealizedPnL() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestCalculatePnL(t *testing.T) {
	calc := NewCalculator()
	now := time.Now()

	tests := []struct {
		name    string
		pos     *Position
		want    float64
		wantErr error
	}{
		{
			name: "open position",
			pos: &Position{
				ID:           "1",
				Symbol:       "AAPL",
				Type:         PositionTypeLong,
				Status:       PositionStatusOpen,
				Quantity:     100,
				EntryPrice:   150.0,
				CurrentPrice: 160.0,
				OpenedAt:     now,
			},
			want:    1000.0,
			wantErr: nil,
		},
		{
			name: "closed position",
			pos: &Position{
				ID:         "2",
				Symbol:     "AAPL",
				Type:       PositionTypeLong,
				Status:     PositionStatusClosed,
				Quantity:   100,
				EntryPrice: 150.0,
				ExitPrice:  160.0,
				OpenedAt:   now,
				ClosedAt:   &now,
			},
			want:    1000.0,
			wantErr: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := calc.CalculatePnL(tt.pos)
			if err != tt.wantErr {
				t.Errorf("CalculatePnL() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got != tt.want {
				t.Errorf("CalculatePnL() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestCalculatePortfolioPnL(t *testing.T) {
	calc := NewCalculator()
	now := time.Now()

	tests := []struct {
		name              string
		positions         []*Position
		wantRealized      float64
		wantUnrealized    float64
		wantTotal         float64
		wantErr           error
	}{
		{
			name: "mixed portfolio",
			positions: []*Position{
				{
					ID:         "1",
					Symbol:     "AAPL",
					Type:       PositionTypeLong,
					Status:     PositionStatusClosed,
					Quantity:   100,
					EntryPrice: 150.0,
					ExitPrice:  160.0,
					OpenedAt:   now,
					ClosedAt:   &now,
				},
				{
					ID:           "2",
					Symbol:       "TSLA",
					Type:         PositionTypeLong,
					Status:       PositionStatusOpen,
					Quantity:     50,
					EntryPrice:   200.0,
					CurrentPrice: 210.0,
					OpenedAt:     now,
				},
				{
					ID:         "3",
					Symbol:     "MSFT",
					Type:       PositionTypeShort,
					Status:     PositionStatusClosed,
					Quantity:   75,
					EntryPrice: 300.0,
					ExitPrice:  290.0,
					OpenedAt:   now,
					ClosedAt:   &now,
				},
			},
			wantRealized:   1750.0, // 1000 (AAPL) + 750 (MSFT)
			wantUnrealized: 500.0,  // 500 (TSLA)
			wantTotal:      2250.0,
			wantErr:        nil,
		},
		{
			name:              "empty portfolio",
			positions:         []*Position{},
			wantRealized:      0,
			wantUnrealized:    0,
			wantTotal:         0,
			wantErr:           nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotRealized, gotUnrealized, gotTotal, err := calc.CalculatePortfolioPnL(tt.positions)
			if err != tt.wantErr {
				t.Errorf("CalculatePortfolioPnL() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if gotRealized != tt.wantRealized {
				t.Errorf("CalculatePortfolioPnL() realized = %v, want %v", gotRealized, tt.wantRealized)
			}
			if gotUnrealized != tt.wantUnrealized {
				t.Errorf("CalculatePortfolioPnL() unrealized = %v, want %v", gotUnrealized, tt.wantUnrealized)
			}
			if gotTotal != tt.wantTotal {
				t.Errorf("CalculatePortfolioPnL() total = %v, want %v", gotTotal, tt.wantTotal)
			}
		})
	}
}
