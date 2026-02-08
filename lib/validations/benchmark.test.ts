import { describe, it, expect } from 'vitest'
import {
  BenchmarkTickerSchema,
  SetupBenchmarkSchema,
  UpdateBenchmarkSchema,
  DeleteBenchmarkSchema,
  GetComparisonSchema,
} from './benchmark'

describe('Benchmark Validation Schemas', () => {
  describe('BenchmarkTickerSchema', () => {
    it('should accept valid tickers', () => {
      expect(BenchmarkTickerSchema.parse('SPY')).toBe('SPY')
      expect(BenchmarkTickerSchema.parse('QQQ')).toBe('QQQ')
      expect(BenchmarkTickerSchema.parse('VTI')).toBe('VTI')
      expect(BenchmarkTickerSchema.parse('DIA')).toBe('DIA')
      expect(BenchmarkTickerSchema.parse('IWM')).toBe('IWM')
    })

    it('should reject invalid tickers', () => {
      expect(() => BenchmarkTickerSchema.parse('AAPL')).toThrow()
      expect(() => BenchmarkTickerSchema.parse('INVALID')).toThrow()
      expect(() => BenchmarkTickerSchema.parse('')).toThrow()
      expect(() => BenchmarkTickerSchema.parse('spy')).toThrow() // lowercase
    })
  })

  describe('SetupBenchmarkSchema', () => {
    it('should validate correct setup data', () => {
      const input = {
        ticker: 'SPY',
        initialCapital: 10000,
        setupDate: new Date('2024-01-01'),
      }

      const result = SetupBenchmarkSchema.parse(input)

      expect(result.ticker).toBe('SPY')
      expect(result.initialCapital).toBe(10000)
      expect(result.setupDate).toBeInstanceOf(Date)
    })

    it('should coerce string dates to Date objects', () => {
      const input = {
        ticker: 'SPY',
        initialCapital: 10000,
        setupDate: '2024-01-01',
      }

      const result = SetupBenchmarkSchema.parse(input)

      expect(result.setupDate).toBeInstanceOf(Date)
    })

    it('should reject zero initial capital', () => {
      const input = {
        ticker: 'SPY',
        initialCapital: 0,
        setupDate: new Date('2024-01-01'),
      }

      expect(() => SetupBenchmarkSchema.parse(input)).toThrow(
        'Initial capital must be greater than 0'
      )
    })

    it('should reject negative initial capital', () => {
      const input = {
        ticker: 'SPY',
        initialCapital: -1000,
        setupDate: new Date('2024-01-01'),
      }

      expect(() => SetupBenchmarkSchema.parse(input)).toThrow(
        'Initial capital must be positive'
      )
    })

    it('should reject infinite initial capital', () => {
      const input = {
        ticker: 'SPY',
        initialCapital: Infinity,
        setupDate: new Date('2024-01-01'),
      }

      expect(() => SetupBenchmarkSchema.parse(input)).toThrow()
    })

    it('should reject invalid ticker', () => {
      const input = {
        ticker: 'AAPL',
        initialCapital: 10000,
        setupDate: new Date('2024-01-01'),
      }

      expect(() => SetupBenchmarkSchema.parse(input)).toThrow()
    })

    it('should require all fields', () => {
      expect(() => SetupBenchmarkSchema.parse({})).toThrow()
      expect(() =>
        SetupBenchmarkSchema.parse({
          ticker: 'SPY',
          initialCapital: 10000,
        })
      ).toThrow()
    })
  })

  describe('UpdateBenchmarkSchema', () => {
    it('should validate correct update data', () => {
      const input = {
        ticker: 'SPY',
      }

      const result = UpdateBenchmarkSchema.parse(input)

      expect(result.ticker).toBe('SPY')
    })

    it('should reject invalid ticker', () => {
      const input = {
        ticker: 'AAPL',
      }

      expect(() => UpdateBenchmarkSchema.parse(input)).toThrow()
    })

    it('should require ticker', () => {
      expect(() => UpdateBenchmarkSchema.parse({})).toThrow()
    })
  })

  describe('DeleteBenchmarkSchema', () => {
    it('should validate correct delete data', () => {
      const input = {
        ticker: 'SPY',
      }

      const result = DeleteBenchmarkSchema.parse(input)

      expect(result.ticker).toBe('SPY')
    })

    it('should reject invalid ticker', () => {
      const input = {
        ticker: 'INVALID',
      }

      expect(() => DeleteBenchmarkSchema.parse(input)).toThrow()
    })

    it('should require ticker', () => {
      expect(() => DeleteBenchmarkSchema.parse({})).toThrow()
    })
  })

  describe('GetComparisonSchema', () => {
    it('should validate with ticker', () => {
      const input = {
        ticker: 'SPY',
      }

      const result = GetComparisonSchema.parse(input)

      expect(result.ticker).toBe('SPY')
    })

    it('should validate without ticker', () => {
      const input = {}

      const result = GetComparisonSchema.parse(input)

      expect(result.ticker).toBeUndefined()
    })

    it('should reject invalid ticker', () => {
      const input = {
        ticker: 'AAPL',
      }

      expect(() => GetComparisonSchema.parse(input)).toThrow()
    })
  })
})
