# Design System Phase 6: Deprecation Complete ✅

## Summary

Successfully implemented deprecation warnings for legacy utility patterns as part of Design System Phase 6 rollout.

## What Was Done

### 1. JSDoc @deprecated Warnings ✅

Added comprehensive deprecation documentation to all legacy functions in `lib/utils/position-calculations.ts`:

- ✅ Module-level deprecation notice
- ✅ `calculateUnrealizedPnL()` - 7 functions deprecated
- ✅ `calculateUnrealizedPnLPercentage()`
- ✅ `calculateCurrentPrice()`
- ✅ `calculateDaysHeld()`
- ✅ `calculateTotalCoveredCallPremium()`
- ✅ `getPnLColorClass` / `getPnLBackgroundClass` re-exports
- ✅ `formatCurrency()`
- ✅ `formatPercentage()`

Each deprecation includes:
- Clear explanation of why it's deprecated
- Migration path to new patterns
- Before/after code examples
- Link to recommended replacement

### 2. Runtime Console Warnings ✅

Added development-only console warnings to 7 deprecated functions:

```typescript
if (process.env.NODE_ENV === 'development') {
  console.warn('Function X is deprecated. Use Y instead.')
}
```

These warnings will alert developers during development without impacting production builds.

### 3. ESLint Rules ✅

Updated `eslint.config.mjs` with `no-restricted-imports` rule:

```javascript
{
  rules: {
    "no-restricted-imports": [
      "warn",
      {
        paths: [
          {
            name: "@/lib/utils/position-calculations",
            message: "Deprecated: Use @/lib/calculations/position and @/lib/design/colors instead."
          }
        ]
      }
    ]
  }
}
```

This will warn developers in their IDE when importing from the deprecated module.

### 4. Migration Helper Script ✅

Created `scripts/find-deprecated-usage.ts` that:

- Scans the codebase for deprecated pattern usage
- Reports findings grouped by file
- Provides migration instructions with `--fix` flag
- Exits with error code if deprecated usage found (CI-friendly)

Added npm scripts:
```bash
pnpm migrate:check          # Scan for deprecated usage
pnpm migrate:check:fix      # Show detailed migration instructions
```

### 5. Documentation ✅

Created comprehensive migration documentation:

**`docs/DEPRECATION_GUIDE.md`**:
- Overview of deprecation strategy
- Detailed migration paths for each deprecated function
- Before/after code examples
- Tools and scripts documentation
- Migration checklist
- Timeline and roadmap

## Files Changed

### Modified
- `lib/utils/position-calculations.ts` - Added deprecation warnings
- `eslint.config.mjs` - Added linting rules
- `package.json` - Added migration scripts

### Created
- `scripts/find-deprecated-usage.ts` - Migration helper tool
- `docs/DEPRECATION_GUIDE.md` - Migration documentation
- `DEPRECATION_PHASE6.md` - This summary

## Current Usage (Pre-Migration)

The migration script found deprecated usage in:

```
components/dashboard/metric-card.tsx
components/dashboard/benchmark-comparison-chart.tsx
components/dashboard/benchmark-comparison-section.tsx
components/dashboard/pl-by-ticker-chart.tsx
components/dashboard/pl-over-time-chart.tsx
components/dashboard/stat-card.tsx
components/positions/position-card.tsx
components/positions/assign-call-dialog.tsx
```

Most components are using `formatCurrency()` and `formatPercentage()`, which should be migrated to a new `@/lib/utils/format` module.

## Next Steps (Phase 7)

1. **Create Format Utilities Module**
   - Create `lib/utils/format.ts`
   - Move `formatCurrency()` and `formatPercentage()`
   - Add tests

2. **Migrate Components**
   - Update all components to use new patterns
   - Replace deprecated imports
   - Update tests

3. **Verify Migration**
   - Run `pnpm migrate:check` to ensure no deprecated usage
   - Run full test suite
   - Manual testing of affected components

4. **Remove Deprecated Code**
   - Delete `lib/utils/position-calculations.ts`
   - Remove migration scripts
   - Update documentation

## Acceptance Criteria Met ✅

- ✅ Deprecated functions have clear warnings
- ✅ Linting rules catch old patterns
- ✅ Migration path is clear
- ✅ Tools provided to help migration

## Testing

### Verify Deprecation Warnings

```bash
# Check JSDoc warnings
grep "@deprecated" lib/utils/position-calculations.ts

# Check console warnings
grep "console.warn" lib/utils/position-calculations.ts

# Check ESLint rules
cat eslint.config.mjs | grep -A 10 "no-restricted-imports"
```

### Run Migration Check

```bash
# Install dependencies first
pnpm install

# Run migration check
pnpm migrate:check

# Get detailed migration instructions
pnpm migrate:check:fix
```

### Test in Development

When using deprecated functions in dev mode, console warnings will appear:

```
⚠️ calculateUnrealizedPnL from @/lib/utils/position-calculations is deprecated.
   Use calculateUnrealizedPnL from @/lib/calculations/position instead.
```

## Benefits

1. **Developer Guidance**: Clear warnings guide developers to new patterns
2. **IDE Support**: ESLint warnings appear in IDE before code review
3. **Migration Tools**: Automated scanning helps track migration progress
4. **Documentation**: Comprehensive guide reduces migration friction
5. **Type Safety**: New patterns use better TypeScript types
6. **Consistency**: Unified design system patterns across codebase

## Related Work

- Phase 1: Design Tokens
- Phase 2: Semantic Colors
- Phase 3: Component Variants
- Phase 4: Component Library
- Phase 5: Performance Testing
- **Phase 6: Deprecation (This Phase)** ✅
- Phase 7: Migration & Cleanup (Next)

## Questions?

See:
- `docs/DEPRECATION_GUIDE.md` - Migration instructions
- `lib/design/README.md` - Design system documentation
- `docs/DESIGN_SYSTEM.md` - Complete design system guide
