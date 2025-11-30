#!/usr/bin/env node

/**
 * Sibling Expense Accounts Rollback Script
 *
 * This script rolls back the database migration for sibling expense accounts,
 * removing all added columns, indexes, and constraints.
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function rollbackSiblingAccounts() {
  console.log('🔄 Starting Sibling Expense Accounts Rollback...\n')

  try {
    // Check if migration was applied
    const existingColumns = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'ExpenseAccount'
        AND column_name IN ('isSibling', 'parentAccountId', 'siblingNumber', 'canMerge')
    `

    if (existingColumns.length === 0) {
      console.log('✅ No migration to rollback. Skipping...')
      return
    }

    console.log('⚠️  This will permanently remove sibling account data!')
    console.log('   Make sure you have a backup before proceeding.\n')

    // Check for existing sibling data
    const siblingCount = await prisma.expenseAccount.count({
      where: { isSibling: true }
    })

    if (siblingCount > 0) {
      console.log(`📊 Found ${siblingCount} sibling accounts that will be deleted.`)
      const proceed = process.argv.includes('--force')
      if (!proceed) {
        console.log('Use --force to proceed with data loss.')
        process.exit(1)
      }
    }

    console.log('🗑️  Removing sibling accounts...')
    await prisma.expenseAccount.deleteMany({
      where: { isSibling: true }
    })

    console.log('🔗 Removing foreign key constraint...')
    await prisma.$executeRaw`
      ALTER TABLE "ExpenseAccount"
      DROP CONSTRAINT IF EXISTS "ExpenseAccount_parentAccountId_fkey"
    `

    console.log('⚡ Removing indexes...')
    await prisma.$executeRaw`
      DROP INDEX IF EXISTS "ExpenseAccount_parentAccountId_idx"
    `
    await prisma.$executeRaw`
      DROP INDEX IF EXISTS "ExpenseAccount_isSibling_idx"
    `
    await prisma.$executeRaw`
      DROP INDEX IF EXISTS "ExpenseAccount_siblingNumber_idx"
    `

    console.log('📝 Removing columns...')
    await prisma.$executeRaw`
      ALTER TABLE "ExpenseAccount"
      DROP COLUMN IF EXISTS "canMerge"
    `
    await prisma.$executeRaw`
      ALTER TABLE "ExpenseAccount"
      DROP COLUMN IF EXISTS "siblingNumber"
    `
    await prisma.$executeRaw`
      ALTER TABLE "ExpenseAccount"
      DROP COLUMN IF EXISTS "parentAccountId"
    `
    await prisma.$executeRaw`
      ALTER TABLE "ExpenseAccount"
      DROP COLUMN IF EXISTS "isSibling"
    `

    console.log('🔍 Validating rollback...')

    // Validate the rollback
    const validationResults = await prisma.$queryRaw`
      SELECT
        (SELECT COUNT(*) FROM information_schema.columns
         WHERE table_name = 'ExpenseAccount'
           AND column_name IN ('isSibling', 'parentAccountId', 'siblingNumber', 'canMerge')) as columns_remaining,
        (SELECT COUNT(*) FROM pg_indexes
         WHERE tablename = 'ExpenseAccount'
           AND indexname IN ('ExpenseAccount_parentAccountId_idx', 'ExpenseAccount_isSibling_idx', 'ExpenseAccount_siblingNumber_idx')) as indexes_remaining,
        (SELECT COUNT(*) FROM pg_constraint
         WHERE conname = 'ExpenseAccount_parentAccountId_fkey') as constraints_remaining
    `

    const { columns_remaining, indexes_remaining, constraints_remaining } = validationResults[0]

    if (columns_remaining !== 0) {
      throw new Error(`${columns_remaining} columns still remain after rollback`)
    }

    if (indexes_remaining !== 0) {
      throw new Error(`${indexes_remaining} indexes still remain after rollback`)
    }

    if (constraints_remaining !== 0) {
      throw new Error(`${constraints_remaining} constraints still remain after rollback`)
    }

    console.log('✅ Rollback completed successfully!')
    console.log(`   - Deleted ${siblingCount} sibling accounts`)
    console.log(`   - Removed 4 columns`)
    console.log(`   - Removed 3 indexes`)
    console.log(`   - Removed 1 foreign key constraint`)

    // Log rollback completion
    await prisma.auditLog.create({
      data: {
        action: 'database_rollback',
        entityType: 'ExpenseAccount',
        entityId: 'sibling_accounts_rollback',
        details: {
          rollback: 'remove_sibling_expense_accounts',
          siblingAccountsDeleted: siblingCount,
          columnsRemoved: ['isSibling', 'parentAccountId', 'siblingNumber', 'canMerge'],
          indexesRemoved: ['ExpenseAccount_parentAccountId_idx', 'ExpenseAccount_isSibling_idx', 'ExpenseAccount_siblingNumber_idx'],
          constraintsRemoved: ['ExpenseAccount_parentAccountId_fkey']
        },
        userId: 'system',
        businessId: 'system'
      }
    })

  } catch (error) {
    console.error('💥 Rollback failed:', error.message)

    // Log rollback failure
    try {
      await prisma.auditLog.create({
        data: {
          action: 'database_rollback_failed',
          entityType: 'ExpenseAccount',
          entityId: 'sibling_accounts_rollback',
          details: {
            error: error.message,
            rollback: 'remove_sibling_expense_accounts'
          },
          userId: 'system',
          businessId: 'system'
        }
      })
    } catch (logError) {
      console.error('Failed to log rollback error:', logError.message)
    }

    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Handle command line arguments
const args = process.argv.slice(2)
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Sibling Expense Accounts Rollback Script

Usage: node rollback-sibling-accounts.js [options]

Options:
  --help, -h          Show this help message
  --force             Force rollback even with data loss
  --dry-run           Show what would be done without making changes

Examples:
  node rollback-sibling-accounts.js --force
  node rollback-sibling-accounts.js --dry-run
`)
  process.exit(0)
}

if (args.includes('--dry-run')) {
  console.log('🔍 Dry run mode - no changes will be made')
  console.log('Rollback would remove:')
  console.log('  - All sibling accounts (permanent data loss!)')
  console.log('  - Foreign key: ExpenseAccount_parentAccountId_fkey')
  console.log('  - Indexes: parentAccountId, isSibling, siblingNumber')
  console.log('  - Columns: isSibling, parentAccountId, siblingNumber, canMerge')
  process.exit(0)
}

rollbackSiblingAccounts().catch(error => {
  console.error('💥 Rollback script failed:', error)
  process.exit(1)
})