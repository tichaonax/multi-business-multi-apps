/**
 * Direct Cleanup of Orphaned WLAN Record
 *
 * Removes the orphaned "Mvimvi Groceries Guest WiFi" WLAN without user confirmation
 */

require('dotenv').config({ path: '.env.local' })

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function cleanupOrphanedWlan() {
  try {
    console.log('\n' + '='.repeat(80))
    console.log('🧹 DIRECT CLEANUP OF ORPHANED WLAN RECORD')
    console.log('='.repeat(80))

    const orphanedWlanId = 'd10f2774-5b98-4cae-ba4d-9b1eae0283ae'

    // Get the orphaned WLAN
    const orphanedWlan = await prisma.r710Wlans.findUnique({
      where: { id: orphanedWlanId },
      include: {
        businesses: {
          select: { name: true, type: true }
        },
        r710_token_configs: true,
        r710_tokens: {
          select: { status: true }
        }
      }
    })

    if (!orphanedWlan) {
      console.log('✅ WLAN record not found - already cleaned up!')
      return
    }

    console.log('\n📊 Deleting WLAN Record:')
    console.log(`   ID: ${orphanedWlan.id}`)
    console.log(`   SSID: "${orphanedWlan.ssid}"`)
    console.log(`   WLAN ID: ${orphanedWlan.wlanId}`)
    console.log(`   Business: ${orphanedWlan.businesses.name}`)

    console.log('\n📋 Related Records to be CASCADE DELETED:')
    console.log(`   Token Configurations: ${orphanedWlan.r710_token_configs.length}`)
    console.log(`   Tokens: ${orphanedWlan.r710_tokens.length}`)

    console.log('\n🗑️  Deleting orphaned WLAN record...')

    // Delete the WLAN (cascade will delete related token configs and tokens)
    await prisma.r710Wlans.delete({
      where: { id: orphanedWlan.id }
    })

    console.log('\n✅ CLEANUP COMPLETE!')
    console.log('\n📊 Summary:')
    console.log(`   - Deleted WLAN: "${orphanedWlan.ssid}"`)
    console.log(`   - Cascade deleted: ${orphanedWlan.r710_token_configs.length} token configs`)
    console.log(`   - Cascade deleted: ${orphanedWlan.r710_tokens.length} tokens`)

    console.log('\n📋 NEXT STEPS:')
    console.log('   1. Navigate to: http://localhost:8080/r710-portal/wlans')
    console.log('   2. Click "Discover WLANs" button')
    console.log('   3. Select R710 device and discover actual WLANs')
    console.log('   4. Register appropriate WLANs for grocery and restaurant businesses')
    console.log('\n' + '='.repeat(80))

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error(error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

cleanupOrphanedWlan()
