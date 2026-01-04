const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const { execSync } = require('child_process')
const prisma = new PrismaClient()

/**
 * Restore Demo Data from Backup Template
 *
 * This script restores demo data from the golden backup template.
 * Useful for resetting demo data to pristine state quickly.
 */

async function restoreDemoTemplate() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║       🔄 Restoring Demo Data from Template                ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  console.log('')

  const startTime = Date.now()

  try {
    // ═══════════════════════════════════════════════════════════
    // Step 1: Load Template
    // ═══════════════════════════════════════════════════════════
    console.log('📂 Loading backup template...\n')

    const templatesDir = path.join(process.cwd(), 'seed-data', 'templates')
    const jsonPath = path.join(templatesDir, 'demo-data-template-v1.0.json')
    const gzPath = path.join(templatesDir, 'demo-data-template-v1.0.json.gz')

    let template

    // Try compressed first, then uncompressed
    if (fs.existsSync(gzPath)) {
      console.log('   📦 Loading compressed template...')
      const compressed = fs.readFileSync(gzPath)
      const decompressed = zlib.gunzipSync(compressed)
      template = JSON.parse(decompressed.toString())
      console.log('   ✅ Loaded compressed template')
    } else if (fs.existsSync(jsonPath)) {
      console.log('   📄 Loading uncompressed template...')
      template = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
      console.log('   ✅ Loaded uncompressed template')
    } else {
      throw new Error('Demo template not found! Please create it first:\n   node scripts/create-demo-template.js')
    }

    console.log('')
    console.log('📋 Template Information:')
    console.log(`   Version: ${template.metadata.version}`)
    console.log(`   Created: ${new Date(template.metadata.createdAt).toLocaleString()}`)
    console.log(`   Businesses: ${template.metadata.businessCount}`)
    console.log('')

    // ═══════════════════════════════════════════════════════════
    // Step 2: Confirm Restoration
    // ═══════════════════════════════════════════════════════════
    console.log('⚠️  WARNING: This will delete all existing demo data!')
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n')

    // Wait 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000))

    console.log('✅ Proceeding with restoration...\n')

    // ═══════════════════════════════════════════════════════════
    // Step 3: Clean Existing Demo Data
    // ═══════════════════════════════════════════════════════════
    console.log('🧹 Cleaning existing demo data...\n')

    // Get existing demo businesses
    const existingDemoBusinesses = await prisma.businesses.findMany({
      where: { isDemo: true },
      select: { id: true, name: true }
    })

    if (existingDemoBusinesses.length > 0) {
      console.log(`   Found ${existingDemoBusinesses.length} existing demo businesses`)
      const businessIds = existingDemoBusinesses.map(b => b.id)

      // Delete in reverse dependency order
      console.log('   🗑️  Deleting demo data...')

      // Delete employees and users
      const demoEmployees = await prisma.employees.findMany({
        where: { primaryBusinessId: { in: businessIds } },
        select: { id: true, userId: true }
      })

      const userIds = demoEmployees.map(e => e.userId).filter(id => id !== null)

      // Delete business memberships
      if (userIds.length > 0) {
        await prisma.businessMemberships.deleteMany({
          where: { userId: { in: userIds } }
        })
        console.log('      ✓ Deleted business memberships')
      }

      // Delete employees
      await prisma.employees.deleteMany({
        where: { primaryBusinessId: { in: businessIds } }
      })
      console.log('      ✓ Deleted employees')

      // Delete users
      if (userIds.length > 0) {
        await prisma.users.deleteMany({
          where: { id: { in: userIds } }
        })
        console.log('      ✓ Deleted users')
      }

      // Note: Other data will be cleaned up by cascade deletes
      // or overwritten by the seeding scripts

      console.log('   ✅ Cleanup complete\n')
    }

    // ═══════════════════════════════════════════════════════════
    // Step 4: Restore from Template using Seeding Scripts
    // ═══════════════════════════════════════════════════════════
    console.log('🌱 Restoring demo data from seeding scripts...\n')
    console.log('   (This is faster and more reliable than direct DB import)\n')

    // Run master seeding script
    console.log('   Running master seeding script...')
    try {
      execSync('node scripts/seed-all-demo-data.js', {
        stdio: 'inherit',
        cwd: process.cwd()
      })
      console.log('\n   ✅ Demo data restored successfully\n')
    } catch (error) {
      throw new Error(`Failed to restore demo data: ${error.message}`)
    }

    // ═══════════════════════════════════════════════════════════
    // Success Summary
    // ═══════════════════════════════════════════════════════════
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)

    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║       ✅ DEMO DATA RESTORED SUCCESSFULLY!                  ║')
    console.log('╚════════════════════════════════════════════════════════════╝')
    console.log('')
    console.log(`⏱️  Total Duration: ${duration}s`)
    console.log('')
    console.log('📝 Next Steps:')
    console.log('   1. Start the dev server: npm run dev')
    console.log('   2. Login with demo credentials (DEMO-TEST-CREDENTIALS.md)')
    console.log('   3. Verify all features are working')
    console.log('')
    console.log('💡 Tip: You can now test with fresh demo data!')
    console.log('')

  } catch (error) {
    console.error('\n❌ Error restoring demo template:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
restoreDemoTemplate()
  .then(() => {
    console.log('✨ Restoration completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Restoration failed:', error)
    process.exit(1)
  })
