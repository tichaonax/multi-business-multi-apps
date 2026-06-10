/**
 * Inline tests for cash-rounding-utils.ts (MBM-239)
 * Run with: npx tsx scripts/test-cash-rounding.ts
 */

import { calcCashRounding, getCashRoundingConfig, distributeRoundingAdjustment } from '../src/lib/cash-rounding-utils'

let passed = 0
let failed = 0

function expect(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) {
    console.log(`  ✓  ${label}`)
    passed++
  } else {
    console.log(`  ✗  ${label}`)
    console.log(`       expected: ${JSON.stringify(expected)}`)
    console.log(`       actual:   ${JSON.stringify(actual)}`)
    failed++
  }
}

function near(a: number, b: number) { return Math.abs(a - b) < 0.001 }

console.log('\n── getCashRoundingConfig ─────────────────────────────')

const defaultConfig = getCashRoundingConfig({})
expect('defaults: enabled=true', defaultConfig.enabled, true)
expect('defaults: step=0.50', defaultConfig.step, 0.50)
expect('defaults: upThreshold=0.05', defaultConfig.upThreshold, 0.05)

const customConfig = getCashRoundingConfig({ cashRoundingEnabled: false, cashRoundingStep: '0.10', cashRoundingUpThreshold: '0.01' })
expect('custom: enabled=false', customConfig.enabled, false)
expect('custom: step=0.10', customConfig.step, 0.10)
expect('custom: upThreshold=0.01', customConfig.upThreshold, 0.01)

console.log('\n── calcCashRounding ──────────────────────────────────')

const cfg = { enabled: true, step: 0.50, upThreshold: 0.05 }

// Exact boundary
const exact = calcCashRounding(2.50, cfg)
expect('$2.50 → EXACT', exact.direction, 'EXACT')
expect('$2.50 → adjustment=0', exact.adjustment, 0)

// Auto-apply: $2.62 → $3.00, diff=$0.38 > $0.05 → NOT auto
const r262 = calcCashRounding(2.62, cfg)
expect('$2.62 → direction UP', r262.direction, 'UP')
expect('$2.62 → roundedAmount=3.00', Math.round(r262.roundedAmount * 100), 300)
expect('$2.62 → adjustment=0.38', Math.round(r262.adjustment * 100), 38)
expect('$2.62 → isAutoApply=false (diff 0.38 > threshold 0.05)', r262.isAutoApply, false)

// Auto-apply: $2.47 → $2.50, diff=$0.03 ≤ $0.05 → auto
const r247 = calcCashRounding(2.47, cfg)
expect('$2.47 → roundedAmount=2.50', Math.round(r247.roundedAmount * 100), 250)
expect('$2.47 → adjustment=0.03', Math.round(r247.adjustment * 100), 3)
expect('$2.47 → isAutoApply=true (diff 0.03 ≤ threshold 0.05)', r247.isAutoApply, true)

// Disabled
const disabled = calcCashRounding(2.62, { enabled: false, step: 0.50, upThreshold: 0.05 })
expect('disabled → EXACT', disabled.direction, 'EXACT')
expect('disabled → no adjustment', disabled.adjustment, 0)

// Step $0.10
const cfg10 = { enabled: true, step: 0.10, upThreshold: 0.05 }
const r1031 = calcCashRounding(1.03, cfg10)
expect('$1.03 step=0.10 → roundedAmount=1.10', Math.round(r1031.roundedAmount * 100), 110)
expect('$1.03 step=0.10 → adjustment=0.07', Math.round(r1031.adjustment * 100), 7)
expect('$1.03 step=0.10 → isAutoApply=false (0.07 > 0.05)', r1031.isAutoApply, false)

console.log('\n── distributeRoundingAdjustment ──────────────────────')

const lines = [
  { poolItemId: 'a', productName: 'Chicken', emoji: '🍗', weightKg: 0.4, pricePerKg: 4.00, linePrice: 1.60 },
  { poolItemId: 'b', productName: 'Rice',    emoji: '🍚', weightKg: 0.3, pricePerKg: 1.00, linePrice: 0.30 },
  { poolItemId: 'c', productName: 'Veg',     emoji: '🥦', weightKg: 0.2, pricePerKg: 0.80, linePrice: 0.16 },
]
// total = 2.06, rounded to 2.50 → adjustment = 0.44
const dist = distributeRoundingAdjustment(lines, 0.44)
const sumLinePrices = Math.round(dist.lines.reduce((s, l) => s + l.linePrice, 0) * 100) / 100
expect('distribution sum = 2.50 (2.06 + 0.44)', sumLinePrices, 2.50)
expect('distribution totalPrice field = 2.50', dist.totalPrice, 2.50)
expect('distribution returns 3 lines', dist.lines.length, 3)
// Each line's pricePerKg should reflect the new linePrice
const chickenLine = dist.lines[0]
const expectedPpkg = Math.round((chickenLine.linePrice / chickenLine.weightKg) * 100) / 100
expect('chicken pricePerKg recomputed correctly', chickenLine.pricePerKg, expectedPpkg)

// Edge: single line
const singleDist = distributeRoundingAdjustment(
  [{ poolItemId: 'x', productName: 'X', emoji: '', weightKg: 1.0, pricePerKg: 2.62, linePrice: 2.62 }],
  0.38
)
expect('single line: sum = 3.00', singleDist.totalPrice, 3.00)
expect('single line: linePrice = 3.00', singleDist.lines[0].linePrice, 3.00)

// Edge: empty lines
const emptyDist = distributeRoundingAdjustment([], 0.50)
expect('empty lines → totalPrice = 0', emptyDist.totalPrice, 0)

// Largest-remainder: $2.62 → $3.00 (+$0.38) across 3 equal lines ($0.62 each)
// 38 cents / 3 ≈ 12.67c each → two lines get 13c, one gets 12c; sum = 38c exactly
const equalLines = [
  { poolItemId: 'a', productName: 'A', emoji: '', weightKg: 0.1, pricePerKg: 6.20, linePrice: 0.62 },
  { poolItemId: 'b', productName: 'B', emoji: '', weightKg: 0.1, pricePerKg: 6.20, linePrice: 0.62 },
  { poolItemId: 'c', productName: 'C', emoji: '', weightKg: 0.1, pricePerKg: 6.20, linePrice: 0.62 },
]
const eqDist = distributeRoundingAdjustment(equalLines, 0.38)
const eqSum = Math.round(eqDist.lines.reduce((s, l) => s + l.linePrice, 0) * 100) / 100
expect('largest-remainder: 3 equal lines sum = 2.24 (1.86 + 0.38)', eqSum, 2.24)

console.log(`\n─────────────────────────────────────────────────────`)
console.log(`  ${passed} passed  |  ${failed} failed`)
if (failed > 0) {
  console.log('  ❌  Some tests failed\n')
  process.exit(1)
} else {
  console.log('  ✅  All tests passed\n')
}
