import '@testing-library/jest-dom/vitest'
import { config } from 'dotenv'
import { vi } from 'vitest'
import { toHaveNoViolations } from 'jest-axe'
import { expect } from 'vitest'

// Load environment variables from .env file
config()

// Extend Vitest matchers with jest-axe
expect.extend(toHaveNoViolations)

// Mock Next.js revalidatePath and revalidateTag for server actions in tests
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))
