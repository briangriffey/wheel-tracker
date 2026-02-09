import { describe, it, expect } from 'vitest'
import { BatchExpireSchema, BatchAssignSchema } from './batch'

describe('Batch Validation Schemas', () => {
  describe('BatchExpireSchema', () => {
    it('should validate valid input', () => {
      const validInput = {
        tradeIds: ['clh123456789', 'clh987654321'],
      }

      const result = BatchExpireSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('should reject empty trade IDs array', () => {
      const invalidInput = {
        tradeIds: [],
      }

      const result = BatchExpireSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('At least one trade ID')
      }
    })

    it('should reject more than 100 trade IDs', () => {
      const invalidInput = {
        tradeIds: Array.from({ length: 101 }, (_, i) => `clh${i.toString().padStart(9, '0')}`),
      }

      const result = BatchExpireSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Cannot expire more than 100')
      }
    })

    it('should reject invalid CUID format', () => {
      const invalidInput = {
        tradeIds: ['not-a-valid-cuid'],
      }

      const result = BatchExpireSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid trade ID')
      }
    })

    it('should accept exactly 100 trade IDs', () => {
      const validInput = {
        tradeIds: Array.from({ length: 100 }, (_, i) => `clh${i.toString().padStart(9, '0')}`),
      }

      const result = BatchExpireSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('should accept exactly 1 trade ID', () => {
      const validInput = {
        tradeIds: ['clh123456789'],
      }

      const result = BatchExpireSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })
  })

  describe('BatchAssignSchema', () => {
    it('should validate valid input', () => {
      const validInput = {
        tradeIds: ['clh123456789', 'clh987654321'],
      }

      const result = BatchAssignSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('should reject empty trade IDs array', () => {
      const invalidInput = {
        tradeIds: [],
      }

      const result = BatchAssignSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('At least one trade ID')
      }
    })

    it('should reject more than 50 trade IDs', () => {
      const invalidInput = {
        tradeIds: Array.from({ length: 51 }, (_, i) => `clh${i.toString().padStart(9, '0')}`),
      }

      const result = BatchAssignSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Cannot assign more than 50')
      }
    })

    it('should reject invalid CUID format', () => {
      const invalidInput = {
        tradeIds: ['invalid-id', 'another-invalid'],
      }

      const result = BatchAssignSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid trade ID')
      }
    })

    it('should accept exactly 50 trade IDs', () => {
      const validInput = {
        tradeIds: Array.from({ length: 50 }, (_, i) => `clh${i.toString().padStart(9, '0')}`),
      }

      const result = BatchAssignSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('should accept exactly 1 trade ID', () => {
      const validInput = {
        tradeIds: ['clh123456789'],
      }

      const result = BatchAssignSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('should reject mixed valid and invalid CUIDs', () => {
      const invalidInput = {
        tradeIds: ['clh123456789', 'not-a-cuid', 'clh987654321'],
      }

      const result = BatchAssignSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })
  })
})
