import '@testing-library/jest-dom/vitest'
import { config } from 'dotenv'
import { expect } from 'vitest'
import { toHaveNoViolations } from 'jest-axe'

// Load environment variables from .env file
config()

// Extend expect with axe matchers for accessibility testing
expect.extend(toHaveNoViolations)
