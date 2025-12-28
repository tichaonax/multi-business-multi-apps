require('dotenv').config({ path: '.env.local' })

const { PrismaClient } = require('@prisma/client')
const https = require('https')
const crypto = require('crypto')

const prisma = new PrismaClient()

// Temporarily disable SSL verification
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

// Decrypt function
function decrypt(encryptedText) {
  const ALGORITHM = 'aes-256-cbc'
  const encryptionKey = process.env.ENCRYPTION_KEY

  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }

  const key = Buffer.from(encryptionKey, 'hex')
  const parts = encryptedText.split(':')

  if (parts.length !== 2) {
    throw new Error('Invalid encrypted text format')
  }

  const iv = Buffer.from(parts[0], 'hex')
  const encryptedData = parts[1]

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

async function investigateWLANIntegrity() {
  try {
    console.log('\n' + '='.repeat(100))
    console.log('🔍 R710 WLAN INTEGRITY INVESTIGATION')
    console.log('='.repeat(100))

    // STEP 1: Get all businesses with R710 integration
    console.log('\n📊 STEP 1: Checking businesses with R710 integrations...\n')

    const integrations = await prisma.r710BusinessIntegrations.findMany({
      include: {
        businesses: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        device_registry: true
      }
    })

    console.log(`Found ${integrations.length} business(es) with R710 integration:\n`)

    for (const integration of integrations) {
      console.log(`  - ${integration.businesses.name} (${integration.businesses.type})`)
      console.log(`    Device: ${integration.device_registry.ipAddress}`)
      console.log(`    Status: ${integration.device_registry.connectionStatus}`)
    }

    // STEP 2: Check database WLANs for each business
    console.log('\n' + '-'.repeat(100))
    console.log('📊 STEP 2: Checking database WLAN records...\n')

    const allDbWlans = await prisma.r710Wlans.findMany({
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
            ipAddress: true
          }
        },
        r710_token_configs: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    console.log(`Total WLANs in database: ${allDbWlans.length}\n`)

    const wlansByBusiness = {}
    allDbWlans.forEach(wlan => {
      const businessId = wlan.businessId
      if (!wlansByBusiness[businessId]) {
        wlansByBusiness[businessId] = []
      }
      wlansByBusiness[businessId].push(wlan)
    })

    for (const [businessId, wlans] of Object.entries(wlansByBusiness)) {
      const business = wlans[0].businesses
      console.log(`Business: ${business.name} (${business.type})`)
      console.log(`  Database WLANs: ${wlans.length}`)
      wlans.forEach((wlan, index) => {
        console.log(`    ${index + 1}. SSID: "${wlan.ssid}"`)
        console.log(`       - ID in DB: ${wlan.id}`)
        console.log(`       - WLAN ID: ${wlan.wlanId}`)
        console.log(`       - Guest Service ID: ${wlan.guestServiceId}`)
        console.log(`       - Token Packages: ${wlan.r710_token_configs.length}`)
      })
      console.log()
    }

    // STEP 3: Query R710 device to see what actually exists
    console.log('-'.repeat(100))
    console.log('📊 STEP 3: Querying R710 device for actual WLANs...\n')

    const device = integrations[0]?.device_registry
    if (!device) {
      console.log('❌ No R710 device found!')
      return
    }

    const adminPassword = decrypt(device.encryptedAdminPassword)

    // Login to R710
    console.log(`Connecting to R710 device at ${device.ipAddress}...`)

    const loginUrl = `https://${device.ipAddress}/admin/login.jsp`
    const loginParams = new URLSearchParams({
      username: device.adminUsername,
      password: adminPassword,
      ok: 'Log In'
    })

    const loginResponse = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0'
      },
      body: loginParams.toString(),
      redirect: 'manual'
    })

    const setCookie = loginResponse.headers.get('set-cookie')
    const sessionMatch = setCookie?.match(/-ejs-session-=([^;]+)/)
    if (!sessionMatch) {
      console.log('❌ Failed to get session from R710')
      return
    }

    const sessionId = sessionMatch[1]
    const csrfToken = loginResponse.headers.get('http_x_csrf_token')
    console.log('✅ Connected to R710 device\n')

    // Query WLANs from device
    const wlansUrl = `https://${device.ipAddress}/admin/_conf.jsp`
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000000)
    const xmlRequest = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='wlansvc-list.${timestamp}.${random}' comp='wlansvc-list'/>`

    const wlansResponse = await fetch(wlansUrl, {
      method: 'POST',
      headers: {
        'Cookie': `-ejs-session-=${sessionId}`,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-CSRF-Token': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0'
      },
      body: xmlRequest
    })

    const wlansText = await wlansResponse.text()
    const wlanMatches = wlansText.match(/<wlansvc [^>]+>/g) || []

    const r710Wlans = wlanMatches.map(wlanXml => {
      const getName = (attr) => wlanXml.match(new RegExp(`${attr}="([^"]+)"`))?.[1] || 'N/A'
      return {
        name: getName('name'),
        ssid: getName('ssid'),
        id: getName('id'),
        usage: getName('usage'),
        isGuest: getName('is-guest'),
        guestServiceId: getName('guestservice-id'),
        enableFriendlyKey: getName('enable-friendly-key')
      }
    })

    console.log(`Total WLANs on R710 device: ${r710Wlans.length}\n`)

    r710Wlans.forEach((wlan, index) => {
      console.log(`  ${index + 1}. ${wlan.ssid}`)
      console.log(`     - ID: ${wlan.id}`)
      console.log(`     - Usage: ${wlan.usage} (Guest: ${wlan.isGuest})`)
      console.log(`     - Guest Service ID: ${wlan.guestServiceId}`)
      console.log(`     - Friendly Key: ${wlan.enableFriendlyKey}`)
    })

    // STEP 4: Check token generation - what WLAN is used?
    console.log('\n' + '-'.repeat(100))
    console.log('📊 STEP 4: Checking token generation configuration...\n')

    for (const integration of integrations) {
      const business = integration.businesses
      console.log(`Business: ${business.name}`)

      // Get WLAN that would be used for token generation
      const wlanForTokens = await prisma.r710Wlans.findFirst({
        where: {
          businessId: business.id,
          deviceRegistryId: integration.deviceRegistryId
        },
        select: {
          id: true,
          ssid: true,
          wlanId: true,
          guestServiceId: true
        }
      })

      if (wlanForTokens) {
        console.log(`  ✅ WLAN configured in database:`)
        console.log(`     - SSID: "${wlanForTokens.ssid}"`)
        console.log(`     - WLAN ID: ${wlanForTokens.wlanId}`)

        // Check if this WLAN exists on R710 device
        const existsOnDevice = r710Wlans.find(w =>
          w.ssid === wlanForTokens.ssid ||
          w.id === wlanForTokens.wlanId
        )

        if (existsOnDevice) {
          console.log(`     ✅ EXISTS on R710 device`)
        } else {
          console.log(`     ❌ DOES NOT EXIST on R710 device`)
          console.log(`     ⚠️  CRITICAL: Tokens cannot be generated!`)
        }
      } else {
        console.log(`  ❌ No WLAN configured in database`)
        console.log(`     ⚠️  Tokens CANNOT be generated for this business`)
      }

      // Check recent token generation attempts
      const recentTokens = await prisma.r710Tokens.findMany({
        where: { businessId: business.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          status: true,
          createdAt: true,
          r710_wlans: {
            select: {
              ssid: true
            }
          }
        }
      })

      if (recentTokens.length > 0) {
        console.log(`  Recent tokens (last 5):`)
        recentTokens.forEach(token => {
          console.log(`    - ${token.status} | WLAN: ${token.r710_wlans?.ssid || 'N/A'} | ${token.createdAt}`)
        })
      } else {
        console.log(`  No tokens generated yet`)
      }

      console.log()
    }

    // STEP 5: CRITICAL FINDINGS SUMMARY
    console.log('='.repeat(100))
    console.log('🚨 CRITICAL FINDINGS SUMMARY')
    console.log('='.repeat(100))

    const dbWlanSSIDs = allDbWlans.map(w => w.ssid)
    const r710WlanSSIDs = r710Wlans.map(w => w.ssid)

    const onlyInDb = dbWlanSSIDs.filter(ssid => !r710WlanSSIDs.includes(ssid))
    const onlyOnDevice = r710WlanSSIDs.filter(ssid => !dbWlanSSIDs.includes(ssid))
    const inBoth = dbWlanSSIDs.filter(ssid => r710WlanSSIDs.includes(ssid))

    console.log(`\n1. WLANs in DATABASE but NOT on R710 device (${onlyInDb.length}):`)
    onlyInDb.forEach(ssid => {
      console.log(`   ❌ "${ssid}" - ORPHANED RECORD - Cannot generate tokens!`)
    })

    console.log(`\n2. WLANs on R710 DEVICE but NOT in database (${onlyOnDevice.length}):`)
    onlyOnDevice.forEach(ssid => {
      console.log(`   ⚠️  "${ssid}" - Not registered in system - Cannot be used for token sales`)
    })

    console.log(`\n3. WLANs in BOTH database and device (${inBoth.length}):`)
    inBoth.forEach(ssid => {
      console.log(`   ✅ "${ssid}" - VALID - Can generate tokens`)
    })

    console.log('\n' + '='.repeat(100))
    console.log('📋 RECOMMENDATIONS')
    console.log('='.repeat(100))

    if (onlyInDb.length > 0) {
      console.log('\n1. DELETE orphaned database WLANs:')
      onlyInDb.forEach(ssid => {
        const wlan = allDbWlans.find(w => w.ssid === ssid)
        console.log(`   - DELETE database record for "${ssid}" (ID: ${wlan.id})`)
      })
    }

    if (onlyOnDevice.length > 0) {
      console.log('\n2. REGISTER device WLANs that should be used:')
      onlyOnDevice.forEach(ssid => {
        const wlan = r710Wlans.find(w => w.ssid === ssid)
        console.log(`   - CREATE database record for "${ssid}" (WLAN ID: ${wlan.id}, Guest Service: ${wlan.guestServiceId})`)
      })
    }

    console.log('\n3. VALIDATION PROCESS:')
    console.log('   - Before registering ANY WLAN in database, query R710 device to verify it exists')
    console.log('   - Use POST /admin/_conf.jsp with action=\'getconf\' to list WLANs')
    console.log('   - Match by SSID or WLAN ID')
    console.log('   - Only create database record if WLAN exists on device')

    console.log('\n' + '='.repeat(100))

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

investigateWLANIntegrity()
