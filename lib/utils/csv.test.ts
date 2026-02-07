import { describe, it, expect } from 'vitest'
import {
  escapeCsvField,
  arrayToCSV,
  formatDateForCSV,
  formatNumberForCSV,
  generateExportFilename,
} from './csv'

describe('CSV Utility Functions', () => {
  describe('escapeCsvField', () => {
    it('should return empty string for null and undefined', () => {
      expect(escapeCsvField(null)).toBe('')
      expect(escapeCsvField(undefined)).toBe('')
    })

    it('should return numbers as strings', () => {
      expect(escapeCsvField(123)).toBe('123')
      expect(escapeCsvField(45.67)).toBe('45.67')
      expect(escapeCsvField(0)).toBe('0')
    })

    it('should return simple strings unchanged', () => {
      expect(escapeCsvField('hello')).toBe('hello')
      expect(escapeCsvField('test123')).toBe('test123')
    })

    it('should wrap strings with commas in quotes', () => {
      expect(escapeCsvField('hello, world')).toBe('"hello, world"')
      expect(escapeCsvField('value1,value2')).toBe('"value1,value2"')
    })

    it('should escape quotes by doubling them', () => {
      expect(escapeCsvField('say "hello"')).toBe('"say ""hello"""')
      expect(escapeCsvField('"quoted"')).toBe('"""quoted"""')
    })

    it('should wrap strings with newlines in quotes', () => {
      expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"')
      expect(escapeCsvField('multi\nline\ntext')).toBe('"multi\nline\ntext"')
    })

    it('should handle complex strings with multiple special characters', () => {
      expect(escapeCsvField('Notes: "Important", review\nASAP')).toBe(
        '"Notes: ""Important"", review\nASAP"'
      )
    })
  })

  describe('arrayToCSV', () => {
    it('should convert a simple 2D array to CSV', () => {
      const data = [
        ['Name', 'Age', 'City'],
        ['Alice', 30, 'NYC'],
        ['Bob', 25, 'LA'],
      ]
      const expected = 'Name,Age,City\nAlice,30,NYC\nBob,25,LA'
      expect(arrayToCSV(data)).toBe(expected)
    })

    it('should handle empty array', () => {
      expect(arrayToCSV([])).toBe('')
    })

    it('should handle single row', () => {
      const data = [['A', 'B', 'C']]
      expect(arrayToCSV(data)).toBe('A,B,C')
    })

    it('should handle null and undefined values', () => {
      const data = [
        ['Name', 'Value'],
        ['Test', null],
        [undefined, 123],
      ]
      const expected = 'Name,Value\nTest,\n,123'
      expect(arrayToCSV(data)).toBe(expected)
    })

    it('should properly escape fields with special characters', () => {
      const data = [
        ['Field1', 'Field2'],
        ['value, with comma', 'normal'],
        ['value "with quotes"', 'also "quoted"'],
      ]
      const expected =
        'Field1,Field2\n"value, with comma",normal\n"value ""with quotes""","also ""quoted"""'
      expect(arrayToCSV(data)).toBe(expected)
    })
  })

  describe('formatDateForCSV', () => {
    it('should return empty string for null and undefined', () => {
      expect(formatDateForCSV(null)).toBe('')
      expect(formatDateForCSV(undefined)).toBe('')
    })

    it('should format date as YYYY-MM-DD', () => {
      const date = new Date('2026-02-07T12:34:56.789Z')
      expect(formatDateForCSV(date)).toBe('2026-02-07')
    })

    it('should handle different dates correctly', () => {
      expect(formatDateForCSV(new Date('2025-01-01T00:00:00Z'))).toBe('2025-01-01')
      expect(formatDateForCSV(new Date('2025-12-31T23:59:59Z'))).toBe('2025-12-31')
    })
  })

  describe('formatNumberForCSV', () => {
    it('should return empty string for null and undefined', () => {
      expect(formatNumberForCSV(null)).toBe('')
      expect(formatNumberForCSV(undefined)).toBe('')
    })

    it('should format numbers with 2 decimal places', () => {
      expect(formatNumberForCSV(123.456)).toBe('123.46')
      expect(formatNumberForCSV(100)).toBe('100.00')
      expect(formatNumberForCSV(0)).toBe('0.00')
      expect(formatNumberForCSV(-45.67)).toBe('-45.67')
    })

    it('should round numbers correctly', () => {
      // Note: JavaScript's toFixed() uses banker's rounding (round half to even)
      expect(formatNumberForCSV(123.446)).toBe('123.45') // Rounds down
      expect(formatNumberForCSV(123.456)).toBe('123.46') // Rounds up
    })
  })

  describe('generateExportFilename', () => {
    it('should generate filename with default extension', () => {
      const filename = generateExportFilename('report')
      expect(filename).toMatch(/^report-\d{4}-\d{2}-\d{2}\.csv$/)
    })

    it('should generate filename with custom extension', () => {
      const filename = generateExportFilename('data', 'txt')
      expect(filename).toMatch(/^data-\d{4}-\d{2}-\d{2}\.txt$/)
    })

    it('should include current date in filename', () => {
      const today = new Date().toISOString().split('T')[0]
      const filename = generateExportFilename('test')
      expect(filename).toBe(`test-${today}.csv`)
    })
  })
})
