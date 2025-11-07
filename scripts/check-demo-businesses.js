/**
 * Check Demo Business Identification
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkDemoBusinesses() {
  console.log('🔍 Checking Demo Business Identification')
  console.log('═══════════════════════════════════════════════════\n')

  try {
    // Check for demo businesses by type field
    const demoByType = await prisma.businesses.count({
      where: { type: 'demo' }
    })

    // Get all businesses
    const all = await prisma.businesses.findMany({
      select: { id: true, name: true, type: true }
    })

    // Check for demo businesses by ID pattern
    const demoById = all.filter(b =>
      b.id.includes('-demo') ||
      b.id.includes('demo-') ||
      b.name.includes('[Demo]')
    )

    console.log('📊 Demo Business Count:')
    console.log(`   By type='demo': ${demoByType}`)
    console.log(`   By ID/name pattern: ${demoById.length}`)
    console.log(`   Total businesses: ${all.length}`)
    console.log('')

    if (demoById.length > 0) {
      console.log('📋 Demo Businesses Found:')
      demoById.forEach((b, i) => {
        console.log(`   ${i + 1}. ${b.name}`)
        console.log(`      Type: ${b.type}`)
        console.log(`      ID: ${b.id}`)
        console.log('')
      })
    }

    console.log('═══════════════════════════════════════════════════')
    console.log('🛡️  Current Demo Filtering Methods:\n')

    console.log('1. ID Pattern Filtering (change-tracker.ts):')
    console.log('   - Checks if ID contains "-demo-business"')
    console.log('   - Checks if ID ends with "-demo"')
    console.log('   - Checks if ID starts with "demo-"')
    console.log('')

    console.log('2. Type Field Filtering (initial-load):')
    console.log('   - Excludes where type = "demo"')
    console.log('')

    console.log('📝 Recommendation:')
    if (demoByType > 0 && demoById.length > demoByType) {
      console.log('   ⚠️  Some demo businesses have type != "demo"')
      console.log('   Need BOTH ID pattern AND type field filtering')
    } else if (demoByType === demoById.length) {
      console.log('   ✅ All demo businesses have type = "demo"')
      console.log('   Type field filtering is sufficient')
    }
    console.log('')

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkDemoBusinesses()
