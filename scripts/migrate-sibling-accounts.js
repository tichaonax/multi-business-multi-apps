#!/usr/bin/env node

/**
 * Sibling Expense Accounts Migration Script
 *
 * This script performs the database migration to add sibling account support
 * to the ExpenseAccount table.
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function migrateSiblingAccounts() {
  console.log('🚀 Starting Sibling Expense Accounts Migration...\n')

  try {
    // Check if migration already applied
    const existingColumns = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'ExpenseAccount'
        AND column_name IN ('isSibling', 'parentAccountId', 'siblingNumber', 'canMerge')
    `

    if (existingColumns.length === 4) {
      console.log('✅ Migration already applied. Skipping...')
      return
    }

    console.log('📝 Applying database schema changes...')

    // Add new columns
    await prisma.$executeRaw`
      ALTER TABLE "ExpenseAccount"
      ADD COLUMN "isSibling" BOOLEAN NOT NULL DEFAULT false
    `

    await prisma.$executeRaw`
      ALTER TABLE "ExpenseAccount"
      ADD COLUMN "parentAccountId" TEXT
    `

    await prisma.$executeRaw`
      ALTER TABLE "ExpenseAccount"
      ADD COLUMN "siblingNumber" INTEGER
    `

    await prisma.$executeRaw`
      ALTER TABLE "ExpenseAccount"
      ADD COLUMN "canMerge" BOOLEAN NOT NULL DEFAULT true
    `

    console.log('🔗 Adding foreign key constraint...')

    // Add foreign key constraint
    await prisma.$executeRaw`
      ALTER TABLE "ExpenseAccount"
      ADD CONSTRAINT "ExpenseAccount_parentAccountId_fkey"
      FOREIGN KEY ("parentAccountId") REFERENCES "ExpenseAccount"("id") ON DELETE SET NULL
    `

    console.log('⚡ Creating indexes for performance...')

    // Create indexes
    await prisma.$executeRaw`
      CREATE INDEX "ExpenseAccount_parentAccountId_idx" ON "ExpenseAccount"("parentAccountId")
    `

    await prisma.$executeRaw`
      CREATE INDEX "ExpenseAccount_isSibling_idx" ON "ExpenseAccount"("isSibling")
    `

    await prisma.$executeRaw`
      CREATE INDEX "ExpenseAccount_siblingNumber_idx" ON "ExpenseAccount"("siblingNumber")
    `

    console.log('🔍 Validating migration...')

    // Validate the migration
    const validationResults = await prisma.$queryRaw`
      SELECT
        (SELECT COUNT(*) FROM information_schema.columns
         WHERE table_name = 'ExpenseAccount'
           AND column_name IN ('isSibling', 'parentAccountId', 'siblingNumber', 'canMerge')) as columns_added,
        (SELECT COUNT(*) FROM pg_indexes
         WHERE tablename = 'ExpenseAccount'
           AND indexname IN ('ExpenseAccount_parentAccountId_idx', 'ExpenseAccount_isSibling_idx', 'ExpenseAccount_siblingNumber_idx')) as indexes_created,
        (SELECT COUNT(*) FROM pg_constraint
         WHERE conname = 'ExpenseAccount_parentAccountId_fkey') as constraints_added
    `

    const { columns_added, indexes_created, constraints_added } = validationResults[0]

    if (columns_added !== 4) {
      throw new Error(`Expected 4 columns, but ${columns_added} were added`)
    }

    if (indexes_created !== 3) {
      throw new Error(`Expected 3 indexes, but ${indexes_created} were created`)
    }

    if (constraints_added !== 1) {
      throw new Error(`Expected 1 constraint, but ${constraints_added} were added`)
    }

    console.log('✅ Migration completed successfully!')
    console.log(`   - Added 4 new columns`)
    console.log(`   - Created 3 indexes`)
    console.log(`   - Added 1 foreign key constraint`)

    // Log migration completion
    await prisma.auditLog.create({
      data: {
        action: 'database_migration',
        entityType: 'ExpenseAccount',
        entityId: 'sibling_accounts_migration',
        details: {
          migration: 'add_sibling_expense_accounts',
          columnsAdded: ['isSibling', 'parentAccountId', 'siblingNumber', 'canMerge'],
          indexesCreated: ['ExpenseAccount_parentAccountId_idx', 'ExpenseAccount_isSibling_idx', 'ExpenseAccount_siblingNumber_idx'],
          constraintsAdded: ['ExpenseAccount_parentAccountId_fkey']
        },
        userId: 'system',
        businessId: 'system'
      }
    })

  } catch (error) {
    console.error('💥 Migration failed:', error.message)

    // Log migration failure
    try {
      await prisma.auditLog.create({
        data: {
          action: 'database_migration_failed',
          entityType: 'ExpenseAccount',
          entityId: 'sibling_accounts_migration',
          details: {
            error: error.message,
            migration: 'add_sibling_expense_accounts'
          },
          userId: 'system',
          businessId: 'system'
        }
      })
    } catch (logError) {
      console.error('Failed to log migration error:', logError.message)
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
Sibling Expense Accounts Migration Script

Usage: node migrate-sibling-accounts.js [options]

Options:
  --help, -h          Show this help message
  --dry-run           Show what would be done without making changes
  --force             Force migration even if already applied

Examples:
  node migrate-sibling-accounts.js
  node migrate-sibling-accounts.js --dry-run
`)
  process.exit(0)
}

if (args.includes('--dry-run')) {
  console.log('🔍 Dry run mode - no changes will be made')
  console.log('Migration would add:')
  console.log('  - Columns: isSibling, parentAccountId, siblingNumber, canMerge')
  console.log('  - Indexes: parentAccountId, isSibling, siblingNumber')
  console.log('  - Foreign key: parentAccountId -> ExpenseAccount.id')
  process.exit(0)
}

migrateSiblingAccounts().catch(error => {
  console.error('💥 Migration script failed:', error)
  process.exit(1)
})