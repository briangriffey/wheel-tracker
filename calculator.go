package pnl

import (
	"errors"
)

var (
	// ErrInvalidPosition is returned when a position has invalid data
	ErrInvalidPosition = errors.New("invalid position")
	// ErrPositionClosed is returned when attempting to calculate unrealized P&L on a closed position
	ErrPositionClosed = errors.New("position is closed")
	// ErrPositionOpen is returned when attempting to calculate realized P&L on an open position
	ErrPositionOpen = errors.New("position is still open")
)

// Calculator provides P&L calculation functionality
type Calculator struct{}

// NewCalculator creates a new P&L calculator
func NewCalculator() *Calculator {
	return &Calculator{}
}

// CalculateRealizedPnL calculates the realized profit/loss for a closed position
func (c *Calculator) CalculateRealizedPnL(pos *Position) (float64, error) {
	if pos == nil {
		return 0, ErrInvalidPosition
	}

	if pos.Status != PositionStatusClosed {
		return 0, ErrPositionOpen
	}

	if pos.Quantity == 0 {
		return 0, ErrInvalidPosition
	}

	// Calculate P&L based on position type
	var pnl float64
	if pos.Type == PositionTypeLong {
		// Long: buy low, sell high
		pnl = (pos.ExitPrice - pos.EntryPrice) * pos.Quantity
	} else {
		// Short: sell high, buy low
		pnl = (pos.EntryPrice - pos.ExitPrice) * pos.Quantity
	}

	return pnl, nil
}

// CalculateUnrealizedPnL calculates the unrealized profit/loss for an open position
func (c *Calculator) CalculateUnrealizedPnL(pos *Position) (float64, error) {
	if pos == nil {
		return 0, ErrInvalidPosition
	}

	if pos.Status != PositionStatusOpen {
		return 0, ErrPositionClosed
	}

	if pos.Quantity == 0 || pos.CurrentPrice == 0 {
		return 0, ErrInvalidPosition
	}

	// Calculate P&L based on position type
	var pnl float64
	if pos.Type == PositionTypeLong {
		// Long: current value vs entry value
		pnl = (pos.CurrentPrice - pos.EntryPrice) * pos.Quantity
	} else {
		// Short: entry value vs current value
		pnl = (pos.EntryPrice - pos.CurrentPrice) * pos.Quantity
	}

	return pnl, nil
}

// CalculatePnL calculates the appropriate P&L based on position status
func (c *Calculator) CalculatePnL(pos *Position) (float64, error) {
	if pos == nil {
		return 0, ErrInvalidPosition
	}

	if pos.IsOpen() {
		return c.CalculateUnrealizedPnL(pos)
	}

	return c.CalculateRealizedPnL(pos)
}

// CalculatePortfolioPnL calculates total P&L across multiple positions
func (c *Calculator) CalculatePortfolioPnL(positions []*Position) (realized, unrealized, total float64, err error) {
	for _, pos := range positions {
		if pos.IsOpen() {
			pnl, calcErr := c.CalculateUnrealizedPnL(pos)
			if calcErr != nil {
				return 0, 0, 0, calcErr
			}
			unrealized += pnl
		} else {
			pnl, calcErr := c.CalculateRealizedPnL(pos)
			if calcErr != nil {
				return 0, 0, 0, calcErr
			}
			realized += pnl
		}
	}

	total = realized + unrealized
	return realized, unrealized, total, nil
}
