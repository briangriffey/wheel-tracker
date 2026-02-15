import { describe, it, expect } from 'vitest'
import {
  CreateTradeSchema,
  UpdateTradeSchema,
  UpdateTradeStatusSchema,
  TradeTypeSchema,
  TradeActionSchema,
  TradeStatusSchema,
} from './trade'

describe('TradeTypeSchema', () => {
  it('should accept PUT', () => {
    expect(TradeTypeSchema.parse('PUT')).toBe('PUT')
  })

  it('should accept CALL', () => {
    expect(TradeTypeSchema.parse('CALL')).toBe('CALL')
  })

  it('should reject invalid types', () => {
    expect(() => TradeTypeSchema.parse('INVALID')).toThrow()
  })
})

describe('TradeActionSchema', () => {
  it('should accept SELL_TO_OPEN', () => {
    expect(TradeActionSchema.parse('SELL_TO_OPEN')).toBe('SELL_TO_OPEN')
  })

  it('should accept BUY_TO_CLOSE', () => {
    expect(TradeActionSchema.parse('BUY_TO_CLOSE')).toBe('BUY_TO_CLOSE')
  })

  it('should reject invalid actions', () => {
    expect(() => TradeActionSchema.parse('INVALID')).toThrow()
  })
})

describe('TradeStatusSchema', () => {
  it('should accept OPEN', () => {
    expect(TradeStatusSchema.parse('OPEN')).toBe('OPEN')
  })

  it('should accept CLOSED', () => {
    expect(TradeStatusSchema.parse('CLOSED')).toBe('CLOSED')
  })

  it('should accept EXPIRED', () => {
    expect(TradeStatusSchema.parse('EXPIRED')).toBe('EXPIRED')
  })

  it('should accept ASSIGNED', () => {
    expect(TradeStatusSchema.parse('ASSIGNED')).toBe('ASSIGNED')
  })

  it('should reject invalid statuses', () => {
    expect(() => TradeStatusSchema.parse('INVALID')).toThrow()
  })
})

describe('CreateTradeSchema', () => {
  const validInput = {
    ticker: 'AAPL',
    type: 'PUT' as const,
    action: 'SELL_TO_OPEN' as const,
    strikePrice: 150.0,
    premium: 2.5,
    contracts: 1,
    expirationDate: new Date('2026-03-15'),
  }

  it('should accept valid input', () => {
    const result = CreateTradeSchema.parse(validInput)
    expect(result.ticker).toBe('AAPL')
    expect(result.type).toBe('PUT')
    expect(result.strikePrice).toBe(150.0)
  })

  it('should uppercase ticker', () => {
    const result = CreateTradeSchema.parse({ ...validInput, ticker: 'aapl' })
    expect(result.ticker).toBe('AAPL')
  })

  it('should reject empty ticker', () => {
    expect(() => CreateTradeSchema.parse({ ...validInput, ticker: '' })).toThrow()
  })

  it('should reject ticker longer than 5 characters', () => {
    expect(() => CreateTradeSchema.parse({ ...validInput, ticker: 'TOOLONG' })).toThrow()
  })

  it('should reject ticker with non-letters', () => {
    expect(() => CreateTradeSchema.parse({ ...validInput, ticker: 'AAP1' })).toThrow()
    expect(() => CreateTradeSchema.parse({ ...validInput, ticker: 'AA-PL' })).toThrow()
  })

  it('should reject negative strike price', () => {
    expect(() => CreateTradeSchema.parse({ ...validInput, strikePrice: -10 })).toThrow()
  })

  it('should reject zero strike price', () => {
    expect(() => CreateTradeSchema.parse({ ...validInput, strikePrice: 0 })).toThrow()
  })

  it('should reject negative premium', () => {
    expect(() => CreateTradeSchema.parse({ ...validInput, premium: -1 })).toThrow()
  })

  it('should reject zero premium', () => {
    expect(() => CreateTradeSchema.parse({ ...validInput, premium: 0 })).toThrow()
  })

  it('should reject zero contracts', () => {
    expect(() => CreateTradeSchema.parse({ ...validInput, contracts: 0 })).toThrow()
  })

  it('should reject negative contracts', () => {
    expect(() => CreateTradeSchema.parse({ ...validInput, contracts: -1 })).toThrow()
  })

  it('should reject non-integer contracts', () => {
    expect(() => CreateTradeSchema.parse({ ...validInput, contracts: 1.5 })).toThrow()
  })

  it('should reject past expiration date', () => {
    expect(() =>
      CreateTradeSchema.parse({ ...validInput, expirationDate: new Date('2020-01-01') })
    ).toThrow()
  })

  it('should accept optional notes', () => {
    const result = CreateTradeSchema.parse({ ...validInput, notes: 'Test note' })
    expect(result.notes).toBe('Test note')
  })

  it('should reject notes longer than 1000 characters', () => {
    const longNotes = 'a'.repeat(1001)
    expect(() => CreateTradeSchema.parse({ ...validInput, notes: longNotes })).toThrow()
  })

  it('should accept optional openDate', () => {
    const openDate = new Date('2026-02-01')
    const result = CreateTradeSchema.parse({ ...validInput, openDate })
    expect(result.openDate).toEqual(openDate)
  })

  it('should accept optional positionId', () => {
    const result = CreateTradeSchema.parse({ ...validInput, positionId: 'clxyz1234567845678' })
    expect(result.positionId).toBe('clxyz1234567845678')
  })

  it('should accept CALL type', () => {
    const result = CreateTradeSchema.parse({ ...validInput, type: 'CALL' })
    expect(result.type).toBe('CALL')
  })

  it('should accept BUY_TO_CLOSE action', () => {
    const result = CreateTradeSchema.parse({ ...validInput, action: 'BUY_TO_CLOSE' })
    expect(result.action).toBe('BUY_TO_CLOSE')
  })

  it('should coerce string dates to Date objects', () => {
    const result = CreateTradeSchema.parse({
      ...validInput,
      expirationDate: '2026-03-15',
    })
    expect(result.expirationDate).toBeInstanceOf(Date)
  })
})

describe('UpdateTradeSchema', () => {
  const validInput = {
    id: 'clxyz12345678',
    ticker: 'AAPL',
    type: 'PUT' as const,
  }

  it('should accept valid input with all fields', () => {
    const result = UpdateTradeSchema.parse({
      ...validInput,
      strikePrice: 150.0,
      premium: 2.5,
      contracts: 1,
      expirationDate: new Date('2026-03-15'),
    })
    expect(result.id).toBe('clxyz12345678')
    expect(result.ticker).toBe('AAPL')
  })

  it('should require id', () => {
    expect(() => UpdateTradeSchema.parse({ ticker: 'AAPL' })).toThrow()
  })

  it('should reject invalid cuid', () => {
    expect(() => UpdateTradeSchema.parse({ ...validInput, id: 'invalid' })).toThrow()
  })

  it('should accept partial updates', () => {
    const result = UpdateTradeSchema.parse({ id: 'clxyz12345678', premium: 3.0 })
    expect(result.id).toBe('clxyz12345678')
    expect(result.premium).toBe(3.0)
  })

  it('should uppercase ticker', () => {
    const result = UpdateTradeSchema.parse({ ...validInput, ticker: 'aapl' })
    expect(result.ticker).toBe('AAPL')
  })

  it('should validate optional fields', () => {
    expect(() => UpdateTradeSchema.parse({ ...validInput, strikePrice: -10 })).toThrow()
    expect(() => UpdateTradeSchema.parse({ ...validInput, premium: 0 })).toThrow()
    expect(() => UpdateTradeSchema.parse({ ...validInput, contracts: 1.5 })).toThrow()
  })

  it('should accept closeDate', () => {
    const closeDate = new Date('2026-02-15')
    const result = UpdateTradeSchema.parse({ ...validInput, closeDate })
    expect(result.closeDate).toEqual(closeDate)
  })
})

describe('UpdateTradeStatusSchema', () => {
  it('should accept valid input', () => {
    const result = UpdateTradeStatusSchema.parse({
      id: 'clxyz12345678',
      status: 'EXPIRED',
    })
    expect(result.id).toBe('clxyz12345678')
    expect(result.status).toBe('EXPIRED')
  })

  it('should require id', () => {
    expect(() => UpdateTradeStatusSchema.parse({ status: 'EXPIRED' })).toThrow()
  })

  it('should require status', () => {
    expect(() => UpdateTradeStatusSchema.parse({ id: 'clxyz12345678' })).toThrow()
  })

  it('should reject invalid status', () => {
    expect(() =>
      UpdateTradeStatusSchema.parse({ id: 'clxyz12345678', status: 'INVALID' })
    ).toThrow()
  })

  it('should accept all valid statuses', () => {
    const statuses = ['OPEN', 'CLOSED', 'EXPIRED', 'ASSIGNED']
    statuses.forEach((status) => {
      const result = UpdateTradeStatusSchema.parse({ id: 'clxyz12345678', status })
      expect(result.status).toBe(status)
    })
  })

  it('should accept optional closeDate', () => {
    const closeDate = new Date('2026-02-15')
    const result = UpdateTradeStatusSchema.parse({
      id: 'clxyz12345678',
      status: 'CLOSED',
      closeDate,
    })
    expect(result.closeDate).toEqual(closeDate)
  })

  it('should coerce string dates to Date objects', () => {
    const result = UpdateTradeStatusSchema.parse({
      id: 'clxyz12345678',
      status: 'CLOSED',
      closeDate: '2026-02-15',
    })
    expect(result.closeDate).toBeInstanceOf(Date)
  })
})
