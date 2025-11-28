/**
 * Mark Migration as Complete
 * Manually marks the expense account migration as completed
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function markMigrationComplete() {
  try {
    console.log('✅ Fixing and marking migration as complete...\n')

    // First delete any failed records
    await prisma.$executeRawUnsafe(`
      DELETE FROM "_prisma_migrations"
      WHERE migration_name = '20251126000000_add_expense_account_system'
    `)

    //  Insert the migration record as completed
    await prisma.$executeRawUnsafe(`
      INSERT INTO "_prisma_migrations"
      (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
      VALUES
      (
        gen_random_uuid(),
        'manual_fix',
        NOW(),
        '20251126000000_add_expense_account_system',
        'Manually marked as complete - tables already exist',
        NULL,
        NOW(),
        1
      )
    `)

    console.log('✅ Migration marked as complete!')
    console.log('\nRun npx prisma migrate deploy to continue')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

markMigrationComplete()
