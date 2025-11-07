/**
 * Compare HXI Eats between machines
 * Checks if the IDs match to determine if they're the same business
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function compareHxiEats() {
  console.log('🔍 Comparing HXI Eats Business Data')
  console.log('═══════════════════════════════════════════════════\n')

  try {
    // Get HXI Eats from this machine (Machine B)
    const hxiEats = await prisma.businesses.findMany({
      where: {
        name: { contains: 'HXI Eats' }
      }
    })

    console.log(`📊 Found ${hxiEats.length} "HXI Eats" business(es) on Machine B:\n`)

    hxiEats.forEach((business, index) => {
      console.log(`${index + 1}. ${business.name}`)
      console.log(`   ID: ${business.id}`)
      console.log(`   Type: ${business.type}`)
      console.log(`   Created: ${new Date(business.createdAt).toLocaleString()}`)
      console.log(`   Updated: ${new Date(business.updatedAt).toLocaleString()}`)
      console.log('')
    })

    console.log('═══════════════════════════════════════════════════')
    console.log('📝 Next Steps:\n')

    console.log('1. Run this same script on Machine A (DESKTOP-GC8RGAN)')
    console.log('   node scripts/compare-hxi-eats.js\n')

    console.log('2. Compare the IDs:\n')
    console.log('   If IDs MATCH:')
    console.log('   ✅ Same business - already synced!')
    console.log('   ✅ Sync is working correctly\n')

    console.log('   If IDs DIFFERENT:')
    console.log('   ❌ Two separate businesses with same name')
    console.log('   ❌ One was created on each machine independently')
    console.log('   ❌ Initial load was never run\n')

    console.log('   If Machine A has one but Machine B shows 0:')
    console.log('   ❌ Business exists only on Machine A')
    console.log('   ❌ Need to run initial load from A → B\n')

    if (hxiEats.length > 0) {
      console.log('═══════════════════════════════════════════════════')
      console.log('🎯 Machine B HXI Eats ID to Compare:\n')
      console.log(`   ${hxiEats[0].id}\n`)
      console.log('If Machine A has the SAME ID, sync is working! ✅')
      console.log('If Machine A has a DIFFERENT ID, you have duplicates! ❌\n')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

compareHxiEats()
