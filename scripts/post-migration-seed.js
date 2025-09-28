#!/usr/bin/env node
/**
 * Post-Migration Seeding Script
 * Automatically runs after database migrations to ensure reference data is available
 *
 * This script runs the migration data seeding and handles any errors gracefully.
 * It's designed to be called automatically after `prisma migrate deploy`.
 *
 * Usage: node scripts/post-migration-seed.js
 */

const { seedMigrationData } = require('./seed-migration-data.js')

async function main() {
  console.log('🔄 Running post-migration seeding...')
  console.log('')

  try {
    await seedMigrationData()
    console.log('')
    console.log('✅ Post-migration seeding completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Post-migration seeding failed:', error.message)
    console.error('')
    console.error('📖 This is usually not critical - you can run seeding manually:')
    console.error('   npm run seed:migration')
    console.error('')
    console.error('💡 Or create admin user only:')
    console.error('   npm run create-admin')

    // Don't fail the deployment for seeding issues
    process.exit(0)
  }
}

if (require.main === module) {
  main()
}

module.exports = { main }