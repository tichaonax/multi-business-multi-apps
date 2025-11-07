/**
 * Compare Businesses Between Servers
 * Helps identify sync differences
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function compareBusinesses() {
  console.log('🔍 Business Sync Comparison')
  console.log('═══════════════════════════════════════════════════\n')

  try {
    // Get all non-demo businesses from this machine
    const localBusinesses = await prisma.businesses.findMany({
      where: {
        type: { not: 'demo' }
      },
      select: {
        id: true,
        name: true,
        type: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { name: 'asc' }
    })

    console.log(`📊 Non-Demo Businesses on This Machine (Machine B):`)
    console.log(`   Total: ${localBusinesses.length}\n`)

    localBusinesses.forEach((business, index) => {
      console.log(`${index + 1}. ${business.name}`)
      console.log(`   ID: ${business.id}`)
      console.log(`   Type: ${business.type}`)
      console.log(`   Created: ${new Date(business.createdAt).toLocaleString()}`)
      console.log(`   Updated: ${new Date(business.updatedAt).toLocaleString()}`)
      console.log('')
    })

    console.log('═══════════════════════════════════════════════════')
    console.log('📋 Instructions to Compare with Machine A:\n')

    console.log('1. Run this same script on Machine A (DESKTOP-GC8RGAN):')
    console.log('   node scripts/compare-business-sync.js\n')

    console.log('2. Compare the business IDs and names')
    console.log('   - Same ID + Same Name = Synced correctly ✅')
    console.log('   - Different ID + Same Name = Duplicate (not synced) ❌')
    console.log('   - Business exists on A but not B = Not synced ❌\n')

    console.log('3. Look for differences in:')
    console.log('   - Number of businesses')
    console.log('   - Business names')
    console.log('   - Business IDs')
    console.log('   - Created/Updated timestamps\n')

    // Check for HXI Eats specifically
    const hxiEats = localBusinesses.find(b => b.name.includes('HXI Eats'))
    if (hxiEats) {
      console.log('═══════════════════════════════════════════════════')
      console.log('🍽️  HXI Eats Details on Machine B:\n')
      console.log(`   ID: ${hxiEats.id}`)
      console.log(`   Name: ${hxiEats.name}`)
      console.log(`   Type: ${hxiEats.type}`)
      console.log(`   Created: ${new Date(hxiEats.createdAt).toLocaleString()}`)
      console.log(`   Updated: ${new Date(hxiEats.updatedAt).toLocaleString()}\n`)
      console.log('Compare this ID with the one on Machine A.')
      console.log('If IDs match: Sync is working ✅')
      console.log('If IDs differ: You have duplicates ❌\n')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

compareBusinesses()
