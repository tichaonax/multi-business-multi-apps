/**
 * Fix Failed Migration
 * Removes the failed migration from the database so new migrations can be applied
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixFailedMigration() {
  try {
    console.log('🔧 Fixing failed migration...\n')

    // Delete the failed migration records
    await prisma.$executeRawUnsafe(`
      DELETE FROM "_prisma_migrations"
      WHERE migration_name IN ('add_expense_account_indexes', '20251126000000_add_expense_account_system')
    `)

    console.log('✅ Removed failed migrations from database')
    console.log('\nYou can now run: npx prisma migrate deploy')

  } catch (error) {
    console.error('❌ Error fixing migration:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixFailedMigration()
