#!/usr/bin/env node
/**
 * Migration and Seeding Script
 * Runs database migrations followed by reference data seeding
 *
 * This script combines migration and seeding into a single command for
 * production deployments and development setup.
 *
 * Usage: node scripts/migrate-and-seed.js
 * or:    npm run migrate:seed
 */

const { exec } = require('child_process')
const { promisify } = require('util')
const execAsync = promisify(exec)

async function runCommand(command, description) {
  console.log(`🔄 ${description}...`)
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd(),
      env: { ...process.env }
    })

    if (stdout) console.log(stdout)
    if (stderr) console.error(stderr)

    console.log(`✅ ${description} completed`)
    return true
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message)
    return false
  }
}

async function main() {
  console.log('🚀 Starting migration and seeding process...')
  console.log('')

  // Step 1: Run database migrations
  const migrateSuccess = await runCommand(
    'npx prisma migrate deploy',
    'Running database migrations'
  )

  if (!migrateSuccess) {
    console.error('❌ Migration failed - stopping process')
    process.exit(1)
  }

  console.log('')

  // Step 2: Generate Prisma client (in case schema changed)
  await runCommand(
    'npx prisma generate',
    'Generating Prisma client'
  )

  console.log('')

  // Step 3: Run seeding
  const seedSuccess = await runCommand(
    'npm run seed:migration',
    'Seeding reference data'
  )

  console.log('')
  if (seedSuccess) {
    console.log('🎉 Migration and seeding completed successfully!')
    console.log('')
    console.log('✅ Database is ready for use with:')
    console.log('   • All migrations applied')
    console.log('   • Reference data seeded')
    console.log('   • Admin user available (admin@business.local / admin123)')
  } else {
    console.log('⚠️  Migration completed but seeding had issues')
    console.log('')
    console.log('📖 You can run seeding manually:')
    console.log('   npm run seed:migration')
  }

  process.exit(0)
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Process failed:', error)
    process.exit(1)
  })
}

module.exports = { main }