#!/usr/bin/env tsx
/**
 * Migration Helper: Find Deprecated Pattern Usage
 *
 * Scans the codebase for usage of deprecated utilities and provides migration guidance.
 *
 * Usage:
 *   pnpm tsx scripts/find-deprecated-usage.ts [--fix]
 *
 * Options:
 *   --fix    Show detailed migration instructions for each usage
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

interface DeprecatedPattern {
  pattern: string
  module: string
  replacement: string
  description: string
}

const DEPRECATED_PATTERNS: DeprecatedPattern[] = [
  {
    pattern: 'calculateUnrealizedPnL',
    module: '@/lib/utils/position-calculations',
    replacement: '@/lib/calculations/position',
    description: 'Use new calculateUnrealizedPnL(position, currentPrice) signature',
  },
  {
    pattern: 'calculateUnrealizedPnLPercentage',
    module: '@/lib/utils/position-calculations',
    replacement: '@/lib/calculations/position',
    description: 'Use calculateUnrealizedPnL(position, currentPrice).unrealizedPnLPercent',
  },
  {
    pattern: 'calculateCurrentPrice',
    module: '@/lib/utils/position-calculations',
    replacement: 'inline calculation',
    description: 'Replace with: shares > 0 ? currentValue / shares : 0',
  },
  {
    pattern: 'calculateDaysHeld',
    module: '@/lib/utils/position-calculations',
    replacement: 'inline calculation or @/lib/utils/date',
    description: 'Calculate inline or create shared date utilities module',
  },
  {
    pattern: 'calculateTotalCoveredCallPremium',
    module: '@/lib/utils/position-calculations',
    replacement: 'inline calculation',
    description: 'Replace with: coveredCalls.reduce((sum, call) => sum + call.premium, 0)',
  },
  {
    pattern: 'getPnLColorClass',
    module: '@/lib/utils/position-calculations',
    replacement: '@/lib/design/colors',
    description: 'Use getPnlColor(pnl).text for complete color variant',
  },
  {
    pattern: 'getPnLBackgroundClass',
    module: '@/lib/utils/position-calculations',
    replacement: '@/lib/design/colors',
    description: 'Use getPnlColor(pnl).bg for complete color variant',
  },
  {
    pattern: 'formatCurrency',
    module: '@/lib/utils/position-calculations',
    replacement: '@/lib/utils/format',
    description: 'Create dedicated formatting utilities module',
  },
  {
    pattern: 'formatPercentage',
    module: '@/lib/utils/position-calculations',
    replacement: '@/lib/utils/format',
    description: 'Create dedicated formatting utilities module',
  },
]

interface Finding {
  file: string
  line: number
  pattern: string
  context: string
  replacement: string
  description: string
}

function findUsages(): Finding[] {
  const findings: Finding[] = []
  const searchDirs = ['app', 'components', 'lib']

  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue

    for (const pattern of DEPRECATED_PATTERNS) {
      try {
        // Use grep to find usages
        const result = execSync(
          `grep -rn "${pattern.pattern}" ${dir} --include="*.ts" --include="*.tsx" || true`,
          { encoding: 'utf-8' }
        )

        if (result.trim()) {
          const lines = result.trim().split('\n')
          for (const line of lines) {
            const match = line.match(/^([^:]+):(\d+):(.+)$/)
            if (match) {
              const [, file, lineNum, context] = match

              // Skip if it's the deprecated file itself or test files
              if (
                file.includes('position-calculations.ts') ||
                file.includes('position-calculations.test.ts') ||
                file.includes('find-deprecated-usage.ts')
              ) {
                continue
              }

              findings.push({
                file,
                line: parseInt(lineNum, 10),
                pattern: pattern.pattern,
                context: context.trim(),
                replacement: pattern.replacement,
                description: pattern.description,
              })
            }
          }
        }
      } catch (error) {
        // grep returns non-zero exit code when no matches found
        // This is expected, so we can ignore it
      }
    }
  }

  return findings
}

function groupByFile(findings: Finding[]): Map<string, Finding[]> {
  const grouped = new Map<string, Finding[]>()

  for (const finding of findings) {
    if (!grouped.has(finding.file)) {
      grouped.set(finding.file, [])
    }
    grouped.get(finding.file)!.push(finding)
  }

  return grouped
}

function printReport(findings: Finding[], showFix: boolean) {
  console.log('\n🔍 Deprecated Pattern Usage Report\n')
  console.log('=' .repeat(80))

  if (findings.length === 0) {
    console.log('\n✅ No deprecated pattern usage found! Great job!\n')
    return
  }

  const grouped = groupByFile(findings)

  console.log(`\n⚠️  Found ${findings.length} usage(s) across ${grouped.size} file(s)\n`)

  for (const [file, fileFindings] of grouped) {
    console.log(`\n📄 ${file}`)
    console.log('-'.repeat(80))

    for (const finding of fileFindings) {
      console.log(`  Line ${finding.line}: ${finding.pattern}`)
      console.log(`    Context: ${finding.context.substring(0, 70)}...`)

      if (showFix) {
        console.log(`    ❌ Deprecated: ${finding.pattern}`)
        console.log(`    ✅ Replace with: ${finding.replacement}`)
        console.log(`    💡 Migration: ${finding.description}`)
      }
      console.log()
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('\n📚 Migration Guide\n')
  console.log('1. Design System Colors:')
  console.log('   - Use @/lib/design/colors for getPnlColor(), getStatusColor(), etc.')
  console.log('   - New functions return complete ColorVariant objects')
  console.log('')
  console.log('2. Position Calculations:')
  console.log('   - Use @/lib/calculations/position for position-related calculations')
  console.log('   - New functions accept position objects for better type safety')
  console.log('')
  console.log('3. Formatting Utilities:')
  console.log('   - Create @/lib/utils/format for formatCurrency() and formatPercentage()')
  console.log('   - Separates formatting concerns from calculation logic')
  console.log('')
  console.log('4. Simple Utilities:')
  console.log('   - Replace simple helper functions with inline calculations')
  console.log('   - Reduces unnecessary abstraction layers')
  console.log('')
  console.log('Run with --fix flag for detailed migration instructions per usage.')
  console.log('')
}

function main() {
  const args = process.argv.slice(2)
  const showFix = args.includes('--fix')

  console.log('🔎 Scanning codebase for deprecated pattern usage...')

  const findings = findUsages()
  printReport(findings, showFix)

  // Exit with error code if deprecated usage found
  if (findings.length > 0) {
    process.exit(1)
  }
}

main()
