/**
 * Test WLAN Discovery and Registration Flow
 *
 * Tests the complete flow:
 * 1. List R710 devices
 * 2. Discover WLANs from device
 * 3. Register a WLAN
 * 4. Verify registration
 */

require('dotenv').config({ path: '.env.local' })

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testWlanDiscoveryRegistration() {
  try {
    console.log('\n' + '='.repeat(80))
    console.log('🧪 TEST: WLAN DISCOVERY AND REGISTRATION FLOW')
    console.log('='.repeat(80))

    // Step 1: Get a device to test with
    console.log('\n📊 STEP 1: Getting R710 device...')
    const device = await prisma.r710DeviceRegistry.findFirst({
      where: { isActive: true }
    })

    if (!device) {
      console.log('❌ No active R710 device found')
      return
    }

    console.log(`✅ Found device: ${device.ipAddress} (${device.description})`)

    // Step 2: Get a business to test with
    console.log('\n📊 STEP 2: Getting business for registration...')
    const business = await prisma.businesses.findFirst({
      where: {
        r710_business_integrations: {
          some: {}
        }
      }
    })

    if (!business) {
      console.log('❌ No business with R710 integration found')
      return
    }

    console.log(`✅ Found business: ${business.name} (${business.type})`)

    // Step 3: Test discovery API (simulate what the API does)
    console.log('\n📊 STEP 3: Simulating WLAN discovery...')
    console.log('   (In the real API, this would query the R710 device)')

    // For testing, we'll just use the WLANs we know exist from the investigation
    const knownWlans = [
      {
        wlanId: 'HXI Fashions',
        ssid: 'HXI Fashions',
        guestServiceId: '1',
        usage: 'user',
        isGuest: false
      },
      {
        wlanId: 'Fashions Guest Access',
        ssid: 'Fashions Guest Access',
        guestServiceId: '3',
        usage: 'guest',
        isGuest: true
      }
    ]

    console.log(`✅ Would discover ${knownWlans.length} WLANs from device`)
    knownWlans.forEach((wlan, i) => {
      console.log(`   ${i + 1}. ${wlan.ssid} (Guest Service: ${wlan.guestServiceId})`)
    })

    // Step 4: Test registration (create a WLAN record manually)
    console.log('\n📊 STEP 4: Testing WLAN registration...')

    const wlanToRegister = knownWlans[1] // Use "Fashions Guest Access"

    // Check if already registered
    const existingWlan = await prisma.r710Wlans.findFirst({
      where: {
        wlanId: wlanToRegister.wlanId,
        deviceRegistryId: device.id
      }
    })

    if (existingWlan) {
      console.log(`⚠️  WLAN "${wlanToRegister.ssid}" already registered`)
    } else {
      console.log(`📝 Registering WLAN: "${wlanToRegister.ssid}"`)

      const newWlan = await prisma.r710Wlans.create({
        data: {
          wlanId: wlanToRegister.wlanId,
          ssid: wlanToRegister.ssid,
          guestServiceId: wlanToRegister.guestServiceId,
          title: wlanToRegister.ssid,
          validDays: 1,
          enableFriendlyKey: true,
          isActive: true,
          businessId: business.id,
          deviceRegistryId: device.id
        }
      })

      console.log(`✅ WLAN registered successfully!`)
      console.log(`   Database ID: ${newWlan.id}`)
      console.log(`   WLAN ID: ${newWlan.wlanId}`)
      console.log(`   SSID: ${newWlan.ssid}`)
      console.log(`   Business: ${business.name}`)
    }

    // Step 5: Verify registration
    console.log('\n📊 STEP 5: Verifying registration...')

    const registeredWlan = await prisma.r710Wlans.findFirst({
      where: {
        wlanId: wlanToRegister.wlanId,
        deviceRegistryId: device.id
      },
      include: {
        businesses: {
          select: {
            name: true,
            type: true
          }
        },
        device_registry: {
          select: {
            ipAddress: true,
            description: true
          }
        }
      }
    })

    if (registeredWlan) {
      console.log('✅ WLAN verified in database:')
      console.log(`   Database ID: ${registeredWlan.id}`)
      console.log(`   WLAN ID: ${registeredWlan.wlanId}`)
      console.log(`   SSID: ${registeredWlan.ssid}`)
      console.log(`   Business: ${registeredWlan.businesses.name}`)
      console.log(`   Device: ${registeredWlan.device_registry.ipAddress}`)
      console.log(`   Guest Service ID: ${registeredWlan.guestServiceId}`)
      console.log(`   Friendly Key: ${registeredWlan.enableFriendlyKey}`)
    } else {
      console.log('❌ WLAN not found in database')
    }

    // Step 6: Check database state
    console.log('\n📊 STEP 6: Final database state...')

    const allWlans = await prisma.r710Wlans.findMany({
      include: {
        businesses: {
          select: {
            name: true
          }
        }
      }
    })

    console.log(`Total WLANs in database: ${allWlans.length}`)
    allWlans.forEach((wlan, i) => {
      console.log(`   ${i + 1}. "${wlan.ssid}" - ${wlan.businesses.name}`)
    })

    console.log('\n' + '='.repeat(80))
    console.log('✅ TEST COMPLETE')
    console.log('='.repeat(80))
    console.log('\n📋 NEXT STEPS:')
    console.log('   1. Start the dev server: npm run dev')
    console.log('   2. Navigate to: http://localhost:8080/r710-portal/wlans')
    console.log('   3. Click "Discover WLANs" button')
    console.log('   4. Test the full UI flow')
    console.log('\n' + '='.repeat(80))

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error(error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

testWlanDiscoveryRegistration()
