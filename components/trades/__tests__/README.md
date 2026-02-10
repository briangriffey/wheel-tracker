# Trade Screen Improvements - Test Suite

This directory contains comprehensive unit tests for the trade screen improvements implementation.

## Test Coverage

### 1. Trade List Improvements (`trade-list-improvements.test.tsx`)

**Price Display Tests:**
- ✅ Displays current prices in table with proper formatting
- ✅ Marks stale prices (> 1 day old) with indicator
- ✅ Shows dash when price not available
- ✅ Formats prices with 2 decimal places

**Dropdown Menu Tests:**
- ✅ Shows Actions dropdown button for all trades
- ✅ Opens dropdown menu when clicking Actions
- ✅ Shows all actions for OPEN trades (View, Close, Expired, Assigned, Delete)
- ✅ Shows only View Details for non-OPEN trades

**Row Click Dialog Tests:**
- ✅ Opens dialog when clicking trade row
- ✅ Displays current price in dialog
- ✅ Closes dialog when clicking close button
- ✅ Prevents dialog opening when clicking Actions dropdown

**Refresh Prices Tests:**
- ✅ Displays Refresh Prices button
- ✅ Calls API and shows success toast
- ✅ Shows loading state while refreshing
- ✅ Shows error toast on failure

**Price Staleness Logic Tests:**
- ✅ Identifies prices older than 1 day as stale
- ✅ Handles edge cases (exactly 1 day, just over 1 day)

**Mobile View Tests:**
- ✅ Displays prices in mobile card view
- ✅ Shows tap hint on mobile cards

### 2. Trade Actions Dialog (`trade-actions-dialog.test.tsx`)

**Rendering Tests:**
- ✅ Renders/doesn't render based on isOpen prop
- ✅ Displays ticker, type badge, and status badge
- ✅ Shows current price when provided
- ✅ Hides price section when not provided
- ✅ Shows stale date indicator for old prices

**Trade Details Tests:**
- ✅ Displays strike price, premium, contracts, shares
- ✅ Formats dates correctly

**Action Button Tests:**
- ✅ Shows all actions for OPEN trades
- ✅ Shows only View Details for non-OPEN trades

**User Interaction Tests:**
- ✅ Closes on close button click
- ✅ Closes on backdrop click
- ✅ Calls updateTradeStatus for Expired/Assigned
- ✅ Calls deleteTrade with confirmation
- ✅ Doesn't delete when confirmation cancelled
- ✅ Shows success/error toasts
- ✅ Disables buttons during actions

**Currency Formatting Tests:**
- ✅ Formats currency values correctly with 2 decimals

### 3. Authentication Integration (`lib/__tests__/auth-integration.test.ts`)

**Query Functions:**
- ✅ Returns userId when session exists
- ✅ Returns null when session doesn't exist
- ✅ Filters trades by userId when authenticated
- ✅ Doesn't filter by userId when not authenticated
- ✅ Applies authentication to all query functions

**Action Functions:**
- ✅ Rejects createTrade when not authenticated
- ✅ Creates trade when authenticated
- ✅ Rejects updateTrade when not authenticated
- ✅ Rejects when trade belongs to different user
- ✅ Updates trade when authenticated and authorized
- ✅ Same pattern for all actions (delete, updateStatus, closeOption)

**Edge Cases:**
- ✅ Handles session with missing user.id
- ✅ Handles auth service throwing errors

### 4. Market Data Refresh API (`app/api/market-data/__tests__/refresh.test.ts`)

**Successful Refresh:**
- ✅ Refreshes all active tickers when no body provided
- ✅ Refreshes specified tickers from request body
- ✅ Uppercases ticker symbols
- ✅ Returns results with successful and failed tickers

**Empty Results:**
- ✅ Handles no active tickers gracefully
- ✅ Handles empty ticker array

**Error Handling:**
- ✅ Handles invalid JSON body
- ✅ Returns error when batch fetch fails
- ✅ Handles getActiveTickers failure

**Response Format:**
- ✅ Returns correct response structure
- ✅ Includes price, date, ticker in results
- ✅ Calculates summary counts correctly

**Rate Limiting:**
- ✅ Handles large number of tickers

## Running the Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm test -- --watch
```

### Run specific test file
```bash
npm test trade-list-improvements
npm test trade-actions-dialog
npm test auth-integration
npm test refresh
```

### Run tests with UI
```bash
npm run test:ui
```

### Run tests with coverage
```bash
npm run test:coverage
```

## Test Requirements

All tests use:
- **Vitest** - Test framework
- **React Testing Library** - Component testing
- **@testing-library/user-event** - User interaction simulation

## Coverage Goals

The test suite aims for:
- **90%+ statement coverage** for new components
- **85%+ branch coverage** for conditional logic
- **100% coverage** for authentication logic (critical path)

## CI/CD Integration

These tests are automatically run:
- On every commit (via pre-commit hook)
- On pull requests
- Before deployment

## Debugging Tests

### View test output in browser
```bash
npm run test:ui
```

### Run single test in debug mode
```bash
npm test -- -t "should display current prices"
```

### Enable verbose output
```bash
npm test -- --reporter=verbose
```

## Common Issues

### Tests failing locally but passing in CI
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check Node version matches CI: `node --version`

### Mock issues
- Ensure all mocks are cleared in `beforeEach`
- Check mock import paths are correct

### Async issues
- Always use `waitFor` for async operations
- Use `await userEvent.click()` not just `userEvent.click()`

## Writing New Tests

When adding new features to the trade screen:

1. Create test file in `__tests__` directory
2. Follow existing naming convention: `feature-name.test.tsx`
3. Include test categories:
   - Rendering tests
   - User interaction tests
   - Error handling tests
   - Edge case tests
4. Update this README with new test coverage

## Test Maintenance

- Review and update tests when requirements change
- Remove obsolete tests
- Keep test descriptions clear and specific
- Use descriptive variable names in test setup
