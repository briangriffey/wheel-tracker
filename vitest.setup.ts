import '@testing-library/jest-dom/vitest'
import { config } from 'dotenv'
import { toHaveNoViolations } from 'jest-axe'
import { expect, vi } from 'vitest'

// Load environment variables from .env file
config()

// Extend expect with axe-core matchers
expect.extend(toHaveNoViolations)

// Mock Next.js server functions
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))
