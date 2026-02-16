# Visual Regression Testing

This directory contains visual regression tests for the GreekWheel design system components using Playwright.

## Overview

Visual regression testing captures screenshots of UI components and compares them against baseline images to detect unintended visual changes. This helps catch CSS regressions, layout bugs, and styling inconsistencies across browsers and viewports.

## Setup

### Prerequisites

- Node.js 18+
- pnpm 8+
- Chromium browser (installed automatically by Playwright)

### Installation

Playwright and its dependencies are already installed. If you need to reinstall browsers:

```bash
pnpm exec playwright install --with-deps chromium
```

## Running Tests

### Run all visual regression tests

```bash
pnpm test:visual
```

### Run tests in UI mode (interactive)

```bash
pnpm test:visual:ui
```

### Run tests in debug mode

```bash
pnpm test:visual:debug
```

### Update baseline screenshots

When you intentionally change component styles, update the baseline screenshots:

```bash
pnpm test:visual:update
```

**⚠️ Important:** Only update baselines when the visual changes are intentional. Review all changes carefully before committing updated screenshots.

### View test report

After running tests, view the HTML report:

```bash
pnpm test:visual:report
```

## Test Structure

### Test File

- `design-system.spec.ts` - Comprehensive visual regression tests for all design system components

### Configuration

- `playwright.config.ts` - Playwright configuration at project root
- `screenshot-styles.css` - CSS to ensure consistent screenshots (removes animations, cursors)

### Baseline Screenshots

Baseline screenshots are stored in `tests/visual/design-system.spec.ts-snapshots/` organized by:
- Browser (e.g., `chromium-desktop`)
- Test name (e.g., `button-variants.png`)

## Test Coverage

The visual regression tests cover:

### Core Components
- **Button** - All variants, sizes, states (including hover)
- **Badge** - All variants, sizes, removable
- **Alert** - All variants, dismissible
- **Input** - Sizes, states, prefix/suffix, focus/error states
- **Select** - Sizes, states

### Feedback Components
- **Spinner** - Sizes, overlay
- **Skeleton** - Basic and preset variants (card, chart, table)
- **Empty State** - Basic and with action
- **Error Message** - With and without retry

### Interactive Components
- **Dialog** - Open and closed states
- **Modal** - Open and closed states
- **Help Icon** - Icon and tooltip variants, hover state

### Visual Elements
- **Color Palette** - Primary green shades, semantic colors
- **Full Page** - Complete design system gallery

## Viewports Tested

Tests run on multiple viewport sizes to ensure responsive design:

- **Desktop** - 1280x720 (Chromium)
- **Tablet** - iPad Pro (Chromium)
- **Mobile** - iPhone 12 (Chromium)

## CI/CD Integration

Visual regression tests run automatically in the CI pipeline on:
- Pull requests
- Pushes to main branch

### CI Configuration

The tests run in GitHub Actions with:
- Automatic retries (2 retries on failure)
- Screenshot artifacts on failure
- HTML report generation
- Diff reports for failed comparisons

## Best Practices

### When to Update Baselines

✅ **DO update** when:
- You intentionally change component styles
- You add new design system components
- You update color palette or tokens
- You fix visual bugs

❌ **DON'T update** when:
- Tests fail due to unintended changes
- You haven't reviewed the visual diffs
- Changes affect production components you didn't intend to modify

### Writing New Visual Tests

When adding new components or pages:

1. Add test case to `design-system.spec.ts` or create new spec file
2. Navigate to the page/component
3. Wait for page to be fully loaded
4. Take screenshot with descriptive name
5. Run tests to generate baseline
6. Review baseline screenshot
7. Commit baseline with test code

Example:

```typescript
test('new component variant', async ({ page }) => {
  const component = page.locator('#new-component')
  await component.scrollIntoViewIfNeeded()
  await expect(component).toHaveScreenshot('new-component-variant.png')
})
```

### Handling Flaky Tests

If tests are flaky (randomly failing):

1. Check for animations - ensure they're disabled in `screenshot-styles.css`
2. Add explicit waits for dynamic content
3. Use `waitForLoadState('networkidle')` for pages with async data
4. Adjust `maxDiffPixelRatio` in config if needed (current: 0.01 = 1%)

### Troubleshooting

#### Tests fail with "Screenshot comparison failed"

1. Run `pnpm test:visual:ui` to see visual diffs
2. Review the diff report in the UI
3. If changes are intentional, run `pnpm test:visual:update`
4. If changes are not intentional, fix the CSS/component

#### Tests timeout

1. Increase timeout in `playwright.config.ts`
2. Check if dev server is running properly
3. Verify `baseURL` in config matches your dev server

#### Screenshots look different locally vs CI

1. Ensure you're using the same Playwright version
2. Check that `screenshot-styles.css` is being applied
3. Verify font rendering settings are consistent
4. Consider if environment-specific styles exist

## Maintenance

### Regular Updates

- Review and update baselines when design system changes
- Keep Playwright and browsers up to date
- Prune old/unused baseline screenshots
- Monitor test execution time and optimize if needed

### Adding New Tests

When adding new components to the design system:

1. Add component to gallery page (`app/design-system/page.tsx`)
2. Add visual regression test to `design-system.spec.ts`
3. Generate baseline with `pnpm test:visual:update`
4. Commit test and baseline together

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Visual Testing Guide](https://playwright.dev/docs/test-snapshots)
- [Design System Gallery](/design-system) - http://localhost:3000/design-system

## Support

For questions or issues with visual regression testing:
- Check this README first
- Review Playwright documentation
- Check test logs and reports
- Ask team members familiar with the design system
