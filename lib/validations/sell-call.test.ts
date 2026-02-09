import { describe, it, expect } from 'vitest'
import { SellCallSchema } from './sell-call'

describe('SellCallSchema', () => {
  const validInput = {
    positionId: 'clw1234567890abcdefgh',
    strikePrice: 155,
    premium: 250,
    expirationDate: new Date('2026-03-15'),
    notes: 'Test notes',
  }

  describe('positionId validation', () => {
    it('accepts valid cuid', () => {
      const result = SellCallSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('rejects invalid cuid', () => {
      const result = SellCallSchema.safeParse({
        ...validInput,
        positionId: 'invalid-id',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid position ID')
      }
    })
  })

  describe('strikePrice validation', () => {
    it('accepts positive strike price', () => {
      const result = SellCallSchema.safeParse({
        ...validInput,
        strikePrice: 100,
      })
      expect(result.success).toBe(true)
    })

    it('rejects zero strike price', () => {
      const result = SellCallSchema.safeParse({
        ...validInput,
        strikePrice: 0,
      })
      expect(result.success).toBe(false)
    })

    it('rejects negative strike price', () => {
      const result = SellCallSchema.safeParse({
        ...validInput,
        strikePrice: -10,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Strike price must be positive')
      }
    })

    it('rejects infinite strike price', () => {
      const result = SellCallSchema.safeParse({
        ...validInput,
        strikePrice: Infinity,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('premium validation', () => {
    it('accepts positive premium', () => {
      const result = SellCallSchema.safeParse({
        ...validInput,
        premium: 500,
      })
      expect(result.success).toBe(true)
    })

    it('rejects zero premium', () => {
      const result = SellCallSchema.safeParse({
        ...validInput,
        premium: 0,
      })
      expect(result.success).toBe(false)
    })

    it('rejects negative premium', () => {
      const result = SellCallSchema.safeParse({
        ...validInput,
        premium: -100,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Premium must be positive')
      }
    })
  })

  describe('expirationDate validation', () => {
    it('accepts future date', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)

      const result = SellCallSchema.safeParse({
        ...validInput,
        expirationDate: futureDate,
      })
      expect(result.success).toBe(true)
    })

    it('rejects past date', () => {
      const pastDate = new Date('2020-01-01')

      const result = SellCallSchema.safeParse({
        ...validInput,
        expirationDate: pastDate,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Expiration date must be in the future')
      }
    })

    it('accepts date within 1-365 days range', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 45)

      const result = SellCallSchema.safeParse({
        ...validInput,
        expirationDate: futureDate,
      })
      expect(result.success).toBe(true)
    })

    it('rejects date more than 365 days in future', () => {
      const farFutureDate = new Date()
      farFutureDate.setDate(farFutureDate.getDate() + 400)

      const result = SellCallSchema.safeParse({
        ...validInput,
        expirationDate: farFutureDate,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Expiration date should be between 1 and 365 days from now'
        )
      }
    })

    it('coerces string dates to Date objects', () => {
      const result = SellCallSchema.safeParse({
        ...validInput,
        expirationDate: '2026-03-15',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.expirationDate).toBeInstanceOf(Date)
      }
    })
  })

  describe('notes validation', () => {
    it('accepts optional notes', () => {
      const result = SellCallSchema.safeParse({
        ...validInput,
        notes: 'This is a test note',
      })
      expect(result.success).toBe(true)
    })

    it('accepts missing notes', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { notes, ...inputWithoutNotes } = validInput
      const result = SellCallSchema.safeParse(inputWithoutNotes)
      expect(result.success).toBe(true)
    })

    it('accepts empty notes', () => {
      const result = SellCallSchema.safeParse({
        ...validInput,
        notes: '',
      })
      expect(result.success).toBe(true)
    })

    it('rejects notes longer than 1000 characters', () => {
      const longNotes = 'a'.repeat(1001)
      const result = SellCallSchema.safeParse({
        ...validInput,
        notes: longNotes,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Notes must be 1000 characters or less')
      }
    })

    it('accepts notes with exactly 1000 characters', () => {
      const maxLengthNotes = 'a'.repeat(1000)
      const result = SellCallSchema.safeParse({
        ...validInput,
        notes: maxLengthNotes,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('complete validation', () => {
    it('accepts all valid inputs', () => {
      const result = SellCallSchema.safeParse(validInput)
      expect(result.success).toBe(true)

      if (result.success) {
        expect(result.data).toMatchObject({
          positionId: validInput.positionId,
          strikePrice: validInput.strikePrice,
          premium: validInput.premium,
          notes: validInput.notes,
        })
        expect(result.data.expirationDate).toBeInstanceOf(Date)
      }
    })

    it('validates all fields when multiple are invalid', () => {
      const result = SellCallSchema.safeParse({
        positionId: 'invalid',
        strikePrice: -10,
        premium: 0,
        expirationDate: '2020-01-01',
        notes: 'a'.repeat(1001),
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        // Should have multiple errors
        expect(result.error.issues.length).toBeGreaterThan(1)
      }
    })
  })
})
