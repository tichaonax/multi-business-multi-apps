/**
 * Cleanup HXI Clothing Orphaned WLAN
 *
 * Remove the "HXI Clothing Guest WiFi" WLAN that was never created on device
 */

require('dotenv').config({ path: '.env.local' })

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function cleanup() {
  try {
    console.log('\n🧹 Cleaning up orphaned "HXI Clothing Guest WiFi" WLAN...\n')

    // Find the orphaned WLAN
    const orphanedWlan = await prisma.r710Wlans.findFirst({
      where: {
        wlanId: 'wlan-1'  // The placeholder ID that was never created on device
      },
      include: {
        businesses: {
          select: { name: true }
        }
      }
    })

    if (!orphanedWlan) {
      console.log('✅ No orphaned WLAN found (already cleaned up)')
      return
    }

    console.log(`Found orphaned WLAN:`)
    console.log(`  SSID: ${orphanedWlan.ssid}`)
    console.log(`  WLAN ID: ${orphanedWlan.wlanId}`)
    console.log(`  Business: ${orphanedWlan.businesses.name}`)
    console.log(`  Created: ${orphanedWlan.createdAt}`)

    console.log(`\n🗑️  Deleting orphaned WLAN...`)

    await prisma.r710Wlans.delete({
      where: { id: orphanedWlan.id }
    })

    console.log(`\n✅ Cleanup complete!`)
    console.log(`\n📋 The "createWlan()" method has been fixed.`)
    console.log(`   You can now test creating a new WLAN integration for HXI Clothing.`)

  } catch (error) {
    console.error('\n❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

cleanup()
