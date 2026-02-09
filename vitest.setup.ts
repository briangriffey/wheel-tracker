import '@testing-library/jest-dom/vitest'
import { config } from 'dotenv'
import { expect, vi } from 'vitest'
import { toHaveNoViolations } from 'jest-axe'

// Load environment variables from .env file
config()

// Extend expect with axe matchers for accessibility testing
expect.extend(toHaveNoViolations)

// Mock Next.js cache functions for testing
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))
