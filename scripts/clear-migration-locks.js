/**
 * Clear Migration Locks - Helper script to clear both file and database locks
 * Run this if migrations are stuck due to locks
 */

const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

async function clearLocks() {
  console.log('🧹 Clearing migration locks...\n')

  // 1. Clear file-based lock
  const lockFile = path.join(process.cwd(), '.migration.lock')
  if (fs.existsSync(lockFile)) {
    try {
      const lockStats = fs.statSync(lockFile)
      const lockAge = Date.now() - lockStats.mtimeMs
      const lockAgeMinutes = Math.round(lockAge / 1000 / 60)

      console.log(`📁 Found file lock (${lockAgeMinutes} minutes old)`)
      fs.unlinkSync(lockFile)
      console.log('✅ Removed file-based migration lock')
    } catch (e) {
      console.error('❌ Failed to remove file lock:', e.message)
    }
  } else {
    console.log('✅ No file-based lock found')
  }

  // 2. Clear database locks
  try {
    const prisma = new PrismaClient()

    // Find stuck migrations (started but not finished)
    const stuckMigrations = await prisma.$queryRaw`
      SELECT migration_name, started_at
      FROM _prisma_migrations
      WHERE started_at IS NOT NULL
      AND finished_at IS NULL
    `

    if (stuckMigrations.length > 0) {
      console.log(`\n🗄️  Found ${stuckMigrations.length} stuck database migrations:`)
      stuckMigrations.forEach(m => {
        const age = Math.round((Date.now() - new Date(m.started_at).getTime()) / 1000 / 60)
        console.log(`   - ${m.migration_name} (${age} minutes old)`)
      })

      // Clear stuck migrations
      const result = await prisma.$executeRaw`
        DELETE FROM _prisma_migrations
        WHERE started_at IS NOT NULL
        AND finished_at IS NULL
      `

      console.log(`✅ Removed ${result} stuck migration(s) from database`)
    } else {
      console.log('✅ No database locks found')
    }

    await prisma.$disconnect()
  } catch (e) {
    console.error('❌ Failed to clear database locks:', e.message)
    console.log('   (This is normal if database is not accessible)')
  }

  console.log('\n✅ Lock cleanup complete!')
  console.log('\nNext steps:')
  console.log('  1. Run: npx prisma migrate deploy')
  console.log('  2. Run: npm run service:restart')
}

clearLocks().catch(err => {
  console.error('Failed to clear locks:', err)
  process.exit(1)
})
