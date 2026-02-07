import { describe, it, expect } from 'vitest'
import {
  PositionStatusSchema,
  AssignPutSchema,
  AssignCallSchema,
  UpdatePositionSchema,
} from './position'

describe('PositionStatusSchema', () => {
  it('should accept OPEN', () => {
    expect(PositionStatusSchema.parse('OPEN')).toBe('OPEN')
  })

  it('should accept CLOSED', () => {
    expect(PositionStatusSchema.parse('CLOSED')).toBe('CLOSED')
  })

  it('should reject invalid statuses', () => {
    expect(() => PositionStatusSchema.parse('INVALID')).toThrow()
  })
})

describe('AssignPutSchema', () => {
  it('should accept valid trade ID', () => {
    const result = AssignPutSchema.parse({ tradeId: 'clxyz12345678' })
    expect(result.tradeId).toBe('clxyz12345678')
  })

  it('should require tradeId', () => {
    expect(() => AssignPutSchema.parse({})).toThrow()
  })

  it('should reject invalid CUID', () => {
    expect(() => AssignPutSchema.parse({ tradeId: 'invalid' })).toThrow()
    expect(() => AssignPutSchema.parse({ tradeId: '123' })).toThrow()
  })
})

describe('AssignCallSchema', () => {
  it('should accept valid trade ID', () => {
    const result = AssignCallSchema.parse({ tradeId: 'clxyz12345678' })
    expect(result.tradeId).toBe('clxyz12345678')
  })

  it('should require tradeId', () => {
    expect(() => AssignCallSchema.parse({})).toThrow()
  })

  it('should reject invalid CUID', () => {
    expect(() => AssignCallSchema.parse({ tradeId: 'invalid' })).toThrow()
  })
})

describe('UpdatePositionSchema', () => {
  const validInput = {
    id: 'clxyz12345678',
    notes: 'Test note',
  }

  it('should accept valid input', () => {
    const result = UpdatePositionSchema.parse(validInput)
    expect(result.id).toBe('clxyz12345678')
    expect(result.notes).toBe('Test note')
  })

  it('should require id', () => {
    expect(() => UpdatePositionSchema.parse({ notes: 'Test' })).toThrow()
  })

  it('should reject invalid CUID', () => {
    expect(() => UpdatePositionSchema.parse({ ...validInput, id: 'invalid' })).toThrow()
  })

  it('should accept optional notes', () => {
    const result = UpdatePositionSchema.parse({ id: 'clxyz12345678' })
    expect(result.id).toBe('clxyz12345678')
  })

  it('should reject notes longer than 1000 characters', () => {
    const longNotes = 'a'.repeat(1001)
    expect(() =>
      UpdatePositionSchema.parse({ id: 'clxyz12345678', notes: longNotes })
    ).toThrow()
  })

  it('should accept currentValue', () => {
    const result = UpdatePositionSchema.parse({
      id: 'clxyz12345678',
      currentValue: 15000.0,
    })
    expect(result.currentValue).toBe(15000.0)
  })

  it('should reject negative currentValue', () => {
    expect(() =>
      UpdatePositionSchema.parse({ id: 'clxyz12345678', currentValue: -100 })
    ).toThrow()
  })

  it('should reject zero currentValue', () => {
    expect(() =>
      UpdatePositionSchema.parse({ id: 'clxyz12345678', currentValue: 0 })
    ).toThrow()
  })

  it('should accept both notes and currentValue', () => {
    const result = UpdatePositionSchema.parse({
      id: 'clxyz12345678',
      notes: 'Updated note',
      currentValue: 15000.0,
    })
    expect(result.notes).toBe('Updated note')
    expect(result.currentValue).toBe(15000.0)
  })
})
