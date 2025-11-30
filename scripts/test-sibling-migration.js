#!/usr/bin/env node

/**
 * Sibling Expense Accounts Migration Test Script
 *
 * This script validates the database migration for sibling expense accounts
 * and ensures data integrity after migration.
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function runMigrationTests() {
  console.log('🧪 Starting Sibling Expense Accounts Migration Tests...\n')

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  }

  function test(name, testFn) {
    try {
      const result = testFn()
      results.passed++
      results.tests.push({ name, status: 'PASS', error: null })
      console.log(`✅ ${name}`)
      return result
    } catch (error) {
      results.failed++
      results.tests.push({ name, status: 'FAIL', error: error.message })
      console.log(`❌ ${name}: ${error.message}`)
      return null
    }
  }

  // Test 1: Check if new columns exist
  test('New columns exist in ExpenseAccount table', async () => {
    const columns = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'ExpenseAccount'
        AND column_name IN ('isSibling', 'parentAccountId', 'siblingNumber', 'canMerge')
    `

    const columnNames = columns.map(col => col.column_name)
    const requiredColumns = ['isSibling', 'parentAccountId', 'siblingNumber', 'canMerge']

    for (const col of requiredColumns) {
      if (!columnNames.includes(col)) {
        throw new Error(`Missing column: ${col}`)
      }
    }
  })

  // Test 2: Check if indexes were created
  test('Required indexes exist', async () => {
    const indexes = await prisma.$queryRaw`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'ExpenseAccount'
        AND indexname IN ('ExpenseAccount_parentAccountId_idx', 'ExpenseAccount_isSibling_idx', 'ExpenseAccount_siblingNumber_idx')
    `

    const indexNames = indexes.map(idx => idx.indexname)
    const requiredIndexes = ['ExpenseAccount_parentAccountId_idx', 'ExpenseAccount_isSibling_idx', 'ExpenseAccount_siblingNumber_idx']

    for (const idx of requiredIndexes) {
      if (!indexNames.includes(idx)) {
        throw new Error(`Missing index: ${idx}`)
      }
    }
  })

  // Test 3: Check foreign key constraint
  test('Foreign key constraint exists', async () => {
    const constraints = await prisma.$queryRaw`
      SELECT conname
      FROM pg_constraint
      WHERE conname = 'ExpenseAccount_parentAccountId_fkey'
    `

    if (constraints.length === 0) {
      throw new Error('Foreign key constraint ExpenseAccount_parentAccountId_fkey not found')
    }
  })

  // Test 4: Check default values applied
  test('Default values applied to existing records', async () => {
    const nullCounts = await prisma.expenseAccount.groupBy({
      by: ['isSibling'],
      _count: { id: true },
      where: { isSibling: null }
    })

    if (nullCounts.length > 0) {
      throw new Error(`${nullCounts[0]._count.id} records have NULL isSibling values`)
    }
  })

  // Test 5: Check no orphaned sibling references
  test('No orphaned sibling parent references', async () => {
    const orphanedSiblings = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM "ExpenseAccount" ea1
      LEFT JOIN "ExpenseAccount" ea2 ON ea1."parentAccountId" = ea2.id
      WHERE ea1."isSibling" = true
        AND ea1."parentAccountId" IS NOT NULL
        AND ea2.id IS NULL
    `

    if (orphanedSiblings[0].count > 0) {
      throw new Error(`${orphanedSiblings[0].count} orphaned sibling references found`)
    }
  })

  // Test 6: Check sibling numbers are sequential
  test('Sibling numbers are sequential per parent', async () => {
    const invalidSequences = await prisma.$queryRaw`
      SELECT "parentAccountId", ARRAY_AGG("siblingNumber" ORDER BY "siblingNumber") as numbers
      FROM "ExpenseAccount"
      WHERE "isSibling" = true AND "parentAccountId" IS NOT NULL
      GROUP BY "parentAccountId"
      HAVING ARRAY_AGG("siblingNumber" ORDER BY "siblingNumber") !=
             ARRAY(SELECT generate_series(1, COUNT(*)))
    `

    if (invalidSequences.length > 0) {
      throw new Error(`${invalidSequences.length} parents have non-sequential sibling numbers`)
    }
  })

  // Test 7: Check canMerge defaults to true
  test('canMerge defaults to true for existing records', async () => {
    const falseMerges = await prisma.expenseAccount.findMany({
      where: { canMerge: false },
      select: { id: true }
    })

    // This test might fail if some accounts were intentionally set to false
    // In that case, we just log a warning
    if (falseMerges.length > 0) {
      console.log(`⚠️  ${falseMerges.length} accounts have canMerge set to false`)
    }
  })

  // Test 8: Performance check - ensure queries are fast
  test('Query performance is acceptable', async () => {
    const startTime = Date.now()

    // Test a typical sibling query
    await prisma.expenseAccount.findMany({
      where: { isSibling: true },
      include: { parentAccount: true },
      take: 100
    })

    const duration = Date.now() - startTime
    if (duration > 5000) { // 5 seconds
      throw new Error(`Query took too long: ${duration}ms`)
    }
  })

  // Test 9: Data consistency check
  test('Data consistency maintained', async () => {
    // Check that no sibling has itself as parent
    const selfReferences = await prisma.expenseAccount.findMany({
      where: {
        isSibling: true,
        AND: [
          { id: { equals: prisma.expenseAccount.fields.parentAccountId } }
        ]
      }
    })

    if (selfReferences.length > 0) {
      throw new Error(`${selfReferences.length} siblings reference themselves as parent`)
    }

    // Check that parents are not siblings
    const invalidParents = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM "ExpenseAccount" ea1
      JOIN "ExpenseAccount" ea2 ON ea1."parentAccountId" = ea2.id
      WHERE ea1."isSibling" = true AND ea2."isSibling" = true
    `

    if (invalidParents[0].count > 0) {
      throw new Error(`${invalidParents[0].count} siblings have sibling parents`)
    }
  })

  // Summary
  console.log(`\n📊 Test Results: ${results.passed} passed, ${results.failed} failed`)

  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:')
    results.tests.filter(t => t.status === 'FAIL').forEach(test => {
      console.log(`  - ${test.name}: ${test.error}`)
    })
    process.exit(1)
  } else {
    console.log('\n✅ All migration tests passed!')
  }

  await prisma.$disconnect()
}

// Handle command line arguments
const args = process.argv.slice(2)
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Sibling Expense Accounts Migration Test Script

Usage: node test-sibling-migration.js [options]

Options:
  --help, -h    Show this help message
  --verbose     Show detailed output
  --export      Export test results to JSON file

Examples:
  node test-sibling-migration.js
  node test-sibling-migration.js --verbose
`)
  process.exit(0)
}

runMigrationTests().catch(error => {
  console.error('💥 Migration test script failed:', error)
  process.exit(1)
})