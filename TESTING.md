# Testing Guide

> Comprehensive testing documentation for Wheel Tracker

## Table of Contents

- [Overview](#overview)
- [Test Types](#test-types)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Fixtures & Helpers](#test-fixtures--helpers)
- [CI/CD Integration](#cicd-integration)
- [Coverage Goals](#coverage-goals)
- [Best Practices](#best-practices)

## Overview

Wheel Tracker uses a comprehensive testing strategy with three types of tests:

1. **Unit Tests** - Test individual functions and components in isolation
2. **Integration Tests** - Test Server Actions and API routes with database
3. **E2E Tests** - Test complete user flows in a real browser

### Technology Stack

- **Vitest** - Fast unit and integration test runner
- **Playwright** - End-to-end browser testing
- **React Testing Library** - Component testing utilities
- **Prisma** - Database testing with PostgreSQL

## Test Types

### Unit Tests

Unit tests validate individual functions, utilities, and React components in isolation.

**Location**: Co-located with source files (`*.test.ts`, `*.test.tsx`)

**Examples**:
- `lib/calculations/profit-loss.test.ts` - P&L calculation logic
- `lib/utils/csv.test.ts` - CSV export utilities
- `lib/validations/trade.test.ts` - Zod schema validation
- `components/dashboard/__tests__/metric-card.test.tsx` - React components

**Run**: `pnpm test` or `pnpm test:run`

### Integration Tests

Integration tests validate Server Actions and API routes with a real database connection.

**Location**: Co-located with actions (`*.integration.test.ts`)

**Examples**:
- `lib/actions/trades.integration.test.ts` - Trade CRUD operations
- `lib/actions/positions.integration.test.ts` - Position lifecycle
- `lib/actions/benchmarks.integration.test.ts` - Benchmark setup
- `app/api/export/pl/route.test.ts` - CSV export API

**Database**: Uses test database instance with automatic cleanup

**Run**: `pnpm test:run`

### End-to-End (E2E) Tests

E2E tests validate complete user flows in a real browser with Playwright.

**Location**: `/e2e/*.spec.ts`

**Examples**:
- `e2e/auth.spec.ts` - Registration, login, logout, protected routes
- `e2e/trades.spec.ts` - Create trade, view trades, update status
- `e2e/positions.spec.ts` - View positions, position details
- `e2e/dashboard.spec.ts` - Dashboard metrics, charts, CSV export

**Browser**: Chromium (can add Firefox, WebKit)

**Run**: `pnpm test:e2e`

## Running Tests

### Quick Commands

```bash
# Run all unit/integration tests (watch mode)
pnpm test

# Run all tests once (CI mode)
pnpm test:run

# Run tests with coverage report
pnpm test:coverage

# Run tests with UI
pnpm test:ui

# Run E2E tests
pnpm test:e2e

# Run E2E tests with UI
pnpm test:e2e:ui

# Debug E2E tests
pnpm test:e2e:debug

# View E2E test report
pnpm test:e2e:report
```

### Prerequisites

**For Unit/Integration Tests**:
1. Install dependencies: `pnpm install`
2. Start PostgreSQL: `docker compose up -d`
3. Generate Prisma Client: `pnpm db:generate`
4. Push schema: `pnpm db:push`

**For E2E Tests**:
1. All of the above, plus:
2. Install Playwright browsers: `pnpm exec playwright install chromium`

### Environment Setup

Create a `.env` file (copy from `.env.example`):

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5435/wheeltracker"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="test-secret-for-development"

# Optional: Alpha Vantage API
ALPHA_VANTAGE_API_KEY="demo"

# Optional: Cron Secret
CRON_SECRET="test-cron-secret"
```

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest'
import { calculateProfitLoss } from './profit-loss'

describe('calculateProfitLoss', () => {
  it('should calculate profit for expired PUT', () => {
    const result = calculateProfitLoss({
      type: 'PUT',
      status: 'EXPIRED',
      premium: 250,
      strikePrice: 150,
      contracts: 1,
    })

    expect(result.profit).toBe(250)
    expect(result.profitPercent).toBeGreaterThan(0)
  })
})
```

### Integration Test Example

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { createTrade } from './trades'

let testUserId: string

describe('Trade Integration Tests', () => {
  beforeAll(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: { email: 'test@example.com', name: 'Test User' },
    })
    testUserId = user.id
  })

  afterAll(async () => {
    // Cleanup
    await prisma.trade.deleteMany({ where: { userId: testUserId } })
    await prisma.user.deleteMany({ where: { id: testUserId } })
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Clean trades before each test
    await prisma.trade.deleteMany({ where: { userId: testUserId } })
  })

  it('should create a trade', async () => {
    const result = await createTrade({
      ticker: 'AAPL',
      type: 'PUT',
      action: 'SELL_TO_OPEN',
      strikePrice: 150.0,
      premium: 2.5,
      contracts: 1,
      expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })

    expect(result.success).toBe(true)
    expect(result.data?.id).toBeDefined()
  })
})
```

### E2E Test Example

```typescript
import { test, expect } from './fixtures/authenticated-page'
import { testDb } from './helpers/db'

test.describe('Trade Lifecycle', () => {
  test('should create a new trade', async ({ authenticatedPage: page, testUser }) => {
    await page.goto('/trades/new')

    // Fill form
    await page.fill('input[name="ticker"]', 'AAPL')
    await page.selectOption('select[name="type"]', 'PUT')
    await page.fill('input[name="strikePrice"]', '150.00')
    await page.fill('input[name="premium"]', '2.50')
    await page.fill('input[name="contracts"]', '1')

    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    await page.fill('input[name="expirationDate"]', nextMonth.toISOString().split('T')[0])

    // Submit
    await page.click('button[type="submit"]')

    // Verify success
    await expect(page.locator('text=/created successfully/i')).toBeVisible()

    // Verify in database
    const trades = await testDb.trade.findMany({
      where: { userId: testUser.id, ticker: 'AAPL' },
    })
    expect(trades).toHaveLength(1)
  })
})
```

## Test Fixtures & Helpers

### E2E Test Fixtures

#### Authenticated Page Fixture

Provides an authenticated Playwright page with automatic user setup/cleanup:

```typescript
import { test, expect } from './fixtures/authenticated-page'

test('my test', async ({ authenticatedPage, testUser }) => {
  // authenticatedPage is already logged in
  // testUser contains { id, email, name }

  await authenticatedPage.goto('/dashboard')
  expect(testUser.email).toBe('test@example.com')
})
```

#### Database Helpers

Located in `e2e/helpers/db.ts`:

```typescript
import { createTestUser, cleanupTestUsers, TEST_USERS, testDb } from './helpers/db'

// Create a test user
const user = await createTestUser()
const user2 = await createTestUser(TEST_USERS.secondary)

// Clean up test data
await cleanupTestUsers()
```

#### Auth Helpers

Located in `e2e/helpers/auth.ts`:

```typescript
import { login, register, logout } from './helpers/auth'

// Login
await login(page, { email: 'test@example.com', password: 'password' })

// Register
await register(page, { name: 'Test', email: 'test@example.com', password: 'password' })

// Logout
await logout(page)
```

## CI/CD Integration

### GitHub Actions Workflow

Tests run automatically on every pull request and push to `main`:

**Jobs**:
1. **Quality Checks** - TypeScript, ESLint, Prettier
2. **Unit Tests** - Vitest with coverage reporting
3. **E2E Tests** - Playwright with PostgreSQL service
4. **Build Check** - Production build verification

**Configuration**: `.github/workflows/ci.yml`

### Running Locally Like CI

```bash
# Type checking
pnpm type-check

# Linting
pnpm lint

# Formatting
pnpm format:check

# Tests
pnpm test:run
pnpm test:coverage
pnpm test:e2e

# Build
pnpm build
```

### PR Requirements

Pull requests must pass all checks before merging:
- ✅ TypeScript type check
- ✅ ESLint (no errors)
- ✅ Prettier (correct formatting)
- ✅ All unit tests pass
- ✅ All integration tests pass
- ✅ All E2E tests pass
- ✅ Production build succeeds

## Coverage Goals

### Targets

- **Overall Coverage**: >70%
- **Critical Paths**: 100% (auth, trades, positions, P&L calculations)
- **Unit Tests**: High coverage of business logic
- **Integration Tests**: All Server Actions and API routes
- **E2E Tests**: All critical user flows

### Checking Coverage

```bash
# Generate coverage report
pnpm test:coverage

# View HTML report
open coverage/index.html
```

### Coverage Reports

Coverage reports are automatically generated in CI and uploaded to Codecov.

## Best Practices

### General Guidelines

1. **Test Behavior, Not Implementation** - Focus on what the code does, not how it does it
2. **Write Descriptive Test Names** - Use clear, specific test descriptions
3. **Follow AAA Pattern** - Arrange, Act, Assert
4. **Keep Tests Independent** - Each test should run in isolation
5. **Use Factories/Fixtures** - Reuse test data setup logic
6. **Clean Up After Tests** - Always clean up database state

### Unit Tests

- ✅ Test pure functions and utilities
- ✅ Mock external dependencies (APIs, database)
- ✅ Test edge cases and error scenarios
- ✅ Keep tests fast (<100ms each)
- ❌ Don't test framework code
- ❌ Don't test implementation details

### Integration Tests

- ✅ Use real database connections
- ✅ Test database transactions and rollbacks
- ✅ Verify data persistence
- ✅ Test authorization and permissions
- ✅ Clean up test data in `afterAll`/`afterEach`
- ❌ Don't test external APIs (mock them)

### E2E Tests

- ✅ Test complete user workflows
- ✅ Use realistic user interactions
- ✅ Verify database state when necessary
- ✅ Test responsive design (if needed)
- ✅ Use `data-testid` for stable selectors
- ❌ Don't test every edge case (use unit tests)
- ❌ Don't make tests flaky with hard-coded waits

### Test Data

```typescript
// ✅ Good - Use factories
const user = await createTestUser({
  email: 'test@example.com',
  name: 'Test User',
})

// ❌ Bad - Duplicate setup code
const user = await prisma.user.create({
  data: {
    email: 'test@example.com',
    name: 'Test User',
    password: await bcrypt.hash('password', 10),
  },
})
```

### Async Testing

```typescript
// ✅ Good - Use async/await
it('should fetch data', async () => {
  const result = await fetchData()
  expect(result).toBeDefined()
})

// ❌ Bad - Missing await
it('should fetch data', async () => {
  const result = fetchData() // Missing await!
  expect(result).toBeDefined() // This will fail
})
```

## Troubleshooting

### Common Issues

**Database connection errors**:
- Ensure PostgreSQL is running: `docker compose up -d`
- Check `DATABASE_URL` in `.env`
- Run `pnpm db:push` to sync schema

**Playwright browser issues**:
- Install browsers: `pnpm exec playwright install chromium`
- For CI: Use `--with-deps` flag

**Test timeouts**:
- Increase timeout in test: `test.setTimeout(30000)`
- For E2E: Increase in `playwright.config.ts`

**Flaky tests**:
- Use `waitForLoadState` instead of hard-coded waits
- Use proper selectors (`data-testid`)
- Clean up test data properly

## Resources

- [Vitest Documentation](https://vitest.dev)
- [Playwright Documentation](https://playwright.dev)
- [React Testing Library](https://testing-library.com/react)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)

## Contributing

When adding new features:

1. Write tests FIRST (TDD) or alongside implementation
2. Ensure all tests pass: `pnpm test:run && pnpm test:e2e`
3. Check coverage: `pnpm test:coverage`
4. Verify CI passes before merging

Questions? Check existing tests for examples or ask the team!
