const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkWlans() {
  try {
    console.log('🔍 Checking R710 WLANs...\n')

    const wlans = await prisma.r710Wlans.findMany({
      include: {
        businesses: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        device_registry: {
          select: {
            id: true,
            ipAddress: true,
            description: true
          }
        },
        r710_token_configs: {
          select: {
            id: true,
            name: true,
            basePrice: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`📊 Total WLANs: ${wlans.length}\n`)

    if (wlans.length === 0) {
      console.log('⚠️  No WLANs found in database!')
      return
    }

    wlans.forEach((wlan, index) => {
      console.log(`WLAN #${index + 1}:`)
      console.log(`  ID: ${wlan.id}`)
      console.log(`  SSID (WiFi Name): ${wlan.ssid}`)
      console.log(`  Business: ${wlan.businesses.name} (${wlan.businesses.type})`)
      console.log(`  Device IP: ${wlan.device_registry.ipAddress}`)
      console.log(`  WLAN ID: ${wlan.wlanId}`)
      console.log(`  Guest Service ID: ${wlan.guestServiceId}`)
      console.log(`  Title: ${wlan.title}`)
      console.log(`  Valid Days: ${wlan.validDays}`)
      console.log(`  Friendly Key: ${wlan.enableFriendlyKey ? '✅ Enabled' : '❌ Disabled'}`)
      console.log(`  Active: ${wlan.isActive ? '✅ YES' : '❌ NO'}`)
      console.log(`  Token Packages: ${wlan.r710_token_configs.length}`)
      if (wlan.r710_token_configs.length > 0) {
        wlan.r710_token_configs.forEach(pkg => {
          console.log(`    - ${pkg.name}: $${pkg.basePrice}`)
        })
      }
      console.log(`  Created: ${wlan.createdAt}`)
      console.log(`  Updated: ${wlan.updatedAt}`)
      console.log()
    })

    console.log('\n📈 Summary:')
    console.log(`   Total WLANs: ${wlans.length}`)
    console.log(`   Active WLANs: ${wlans.filter(w => w.isActive).length}`)
    console.log(`   Businesses:`)
    const businessCounts = {}
    wlans.forEach(w => {
      if (!businessCounts[w.businesses.name]) {
        businessCounts[w.businesses.name] = 0
      }
      businessCounts[w.businesses.name]++
    })
    Object.entries(businessCounts).forEach(([name, count]) => {
      console.log(`     - ${name}: ${count} WLAN(s)`)
    })

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkWlans()
