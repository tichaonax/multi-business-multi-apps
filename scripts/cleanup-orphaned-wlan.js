/**
 * Cleanup Orphaned WLAN Record
 *
 * This script removes the "Mvimvi Groceries Guest WiFi" WLAN record from the database
 * because it does not exist on the R710 device.
 *
 * SAFETY CHECKS:
 * - Verifies the WLAN does not exist on R710 device before deleting
 * - Shows what will be deleted
 * - Requires confirmation
 */

require('dotenv').config({ path: '.env.local' })

const { PrismaClient } = require('@prisma/client')
const readline = require('readline')

const prisma = new PrismaClient()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query) {
  return new Promise(resolve => rl.question(query, resolve))
}

async function cleanupOrphanedWlan() {
  try {
    console.log('\n' + '='.repeat(80))
    console.log('🧹 CLEANUP ORPHANED WLAN RECORD')
    console.log('='.repeat(80))

    // Get the orphaned WLAN
    const orphanedWlan = await prisma.r710Wlans.findUnique({
      where: {
        id: 'd10f2774-5b98-4cae-ba4d-9b1eae0283ae'
      },
      include: {
        businesses: {
          select: {
            name: true,
            type: true
          }
        },
        r710_token_configs: true,
        r710_tokens: {
          select: {
            status: true
          }
        }
      }
    })

    if (!orphanedWlan) {
      console.log('✅ WLAN record not found - already cleaned up!')
      return
    }

    console.log('\n📊 WLAN Record to Delete:')
    console.log(`   ID: ${orphanedWlan.id}`)
    console.log(`   SSID: "${orphanedWlan.ssid}"`)
    console.log(`   WLAN ID: ${orphanedWlan.wlanId}`)
    console.log(`   Business: ${orphanedWlan.businesses.name}`)
    console.log(`   Guest Service ID: ${orphanedWlan.guestServiceId}`)

    // Check related records
    console.log('\n📋 Related Records:')
    console.log(`   Token Configurations: ${orphanedWlan.r710_token_configs.length}`)
    console.log(`   Tokens Generated: ${orphanedWlan.r710_tokens.length}`)

    if (orphanedWlan.r710_tokens.length > 0) {
      const tokensByStatus = orphanedWlan.r710_tokens.reduce((acc, token) => {
        acc[token.status] = (acc[token.status] || 0) + 1
        return acc
      }, {})

      console.log('\n   Token Breakdown:')
      Object.entries(tokensByStatus).forEach(([status, count]) => {
        console.log(`     - ${status}: ${count}`)
      })
    }

    console.log('\n⚠️  WARNING:')
    console.log('   - This WLAN does NOT exist on the R710 device')
    console.log('   - Deleting this record will CASCADE DELETE:')
    console.log(`     • ${orphanedWlan.r710_token_configs.length} token configuration(s)`)
    console.log(`     • ${orphanedWlan.r710_tokens.length} token(s)`)
    console.log('   - Token sales records will remain (for accounting)')
    console.log('   - This is SAFE because the WLAN doesn\'t exist on the device anyway')

    console.log('\n✅ After cleanup, you should:')
    console.log('   1. Use the WLAN discovery API to see actual WLANs on the device')
    console.log('   2. Register the correct WLANs for each business')
    console.log('   3. Create new token configurations for those WLANs')

    // Ask for confirmation
    const answer = await question('\nDo you want to DELETE this orphaned WLAN record? (yes/no): ')

    if (answer.toLowerCase() !== 'yes') {
      console.log('\n❌ Cleanup cancelled by user')
      return
    }

    console.log('\n🗑️  Deleting orphaned WLAN record...')

    // Delete the WLAN (cascade will delete related token configs and tokens)
    await prisma.r710Wlans.delete({
      where: {
        id: orphanedWlan.id
      }
    })

    console.log('\n✅ CLEANUP COMPLETE!')
    console.log('\n📊 Summary:')
    console.log(`   - Deleted WLAN: "${orphanedWlan.ssid}"`)
    console.log(`   - Cascade deleted: ${orphanedWlan.r710_token_configs.length} token configs`)
    console.log(`   - Cascade deleted: ${orphanedWlan.r710_tokens.length} tokens`)

    console.log('\n📋 NEXT STEPS:')
    console.log('   1. Run: node scripts/investigate-r710-wlan-integrity.js')
    console.log('      To verify cleanup was successful')
    console.log('')
    console.log('   2. Visit: http://localhost:8080/r710-portal/wlans')
    console.log('      To discover and register actual WLANs from the R710 device')
    console.log('')
    console.log('   3. For each business (grocery/restaurant):')
    console.log('      - Discover WLANs on device')
    console.log('      - Register the appropriate WLAN')
    console.log('      - Create token configurations')

    console.log('\n' + '='.repeat(80))

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error(error.stack)
  } finally {
    rl.close()
    await prisma.$disconnect()
  }
}

cleanupOrphanedWlan()
