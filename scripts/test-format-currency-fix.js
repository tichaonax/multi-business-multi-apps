// Test the formatCurrency fix for Prisma Decimal strings

function formatCurrency(amount) {
  // Handle Prisma Decimal (returned as string) and regular numbers
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  const validAmount = typeof numericAmount === 'number' && !isNaN(numericAmount) ? numericAmount : 0

  return `$${validAmount.toFixed(2)}`
}

console.log('Testing formatCurrency with different input types:\n')

// Test cases
const testCases = [
  { input: 65.99, expected: '$65.99', description: 'Number' },
  { input: '65.99', expected: '$65.99', description: 'String (Prisma Decimal)' },
  { input: '129.99', expected: '$129.99', description: 'String (Prisma Decimal)' },
  { input: 0, expected: '$0.00', description: 'Zero number' },
  { input: '0', expected: '$0.00', description: 'Zero string' },
  { input: null, expected: '$0.00', description: 'Null' },
  { input: undefined, expected: '$0.00', description: 'Undefined' },
  { input: 'invalid', expected: '$0.00', description: 'Invalid string (NaN)' },
  { input: '', expected: '$0.00', description: 'Empty string' },
  { input: 89.99, expected: '$89.99', description: 'Cordless Drill price (number)' },
  { input: '89.99', expected: '$89.99', description: 'Cordless Drill price (Decimal string)' }
]

let passed = 0
let failed = 0

testCases.forEach(({ input, expected, description }) => {
  const result = formatCurrency(input)
  const status = result === expected ? '✅' : '❌'

  if (result === expected) {
    passed++
  } else {
    failed++
  }

  console.log(`${status} ${description}:`)
  console.log(`   Input: ${JSON.stringify(input)} (${typeof input})`)
  console.log(`   Expected: ${expected}`)
  console.log(`   Got: ${result}`)

  if (result !== expected) {
    console.log(`   FAILED!`)
  }
  console.log('')
})

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`)

if (failed === 0) {
  console.log('\n✅ All tests passed! The fix works correctly.')
} else {
  console.log('\n❌ Some tests failed. Please review the implementation.')
  process.exit(1)
}
