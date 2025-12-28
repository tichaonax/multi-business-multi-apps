/**
 * Verify WLAN Integrity
 *
 * Check what WLANs exist in database vs R710 device
 */

require('dotenv').config({ path: '.env.local' })

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function verifyWlanIntegrity() {
  try {
    console.log('\n' + '='.repeat(80))
    console.log('🔍 WLAN INTEGRITY CHECK')
    console.log('='.repeat(80))

    // Get all WLANs from database
    const dbWlans = await prisma.r710Wlans.findMany({
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

    console.log('\n📊 WLANs in DATABASE:')
    console.log(`Total: ${dbWlans.length}`)

    dbWlans.forEach((wlan, i) => {
      console.log(`\n${i + 1}. ${wlan.ssid}`)
      console.log(`   Database ID: ${wlan.id}`)
      console.log(`   WLAN ID: ${wlan.wlanId}`)
      console.log(`   Business: ${wlan.businesses.name}`)
      console.log(`   Device: ${wlan.device_registry.ipAddress}`)
      console.log(`   Guest Service ID: ${wlan.guestServiceId}`)
      console.log(`   Created: ${wlan.createdAt}`)
    })

    // Now query R710 device
    console.log('\n' + '-'.repeat(80))
    console.log('📡 Querying R710 device...')

    const device = await prisma.r710DeviceRegistry.findFirst({
      where: { isActive: true }
    })

    if (!device) {
      console.log('❌ No active device found')
      return
    }

    console.log(`Device: ${device.ipAddress}`)

    // Import decrypt and make R710 API call
    const https = require('https')
    const crypto = require('crypto')

    // Decrypt function (inline since we can't import from TS)
    const decrypt = (encryptedData) => {
      const algorithm = 'aes-256-cbc'
      const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex')
      const [ivHex, encrypted] = encryptedData.split(':')
      const iv = Buffer.from(ivHex, 'hex')
      const decipher = crypto.createDecipheriv(algorithm, key, iv)
      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      return decrypted
    }

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

    const adminPassword = decrypt(device.encryptedAdminPassword)

    // Login
    const loginUrl = `https://${device.ipAddress}/admin/login.jsp`
    const loginParams = new URLSearchParams({
      username: device.adminUsername,
      password: adminPassword,
      ok: 'Log In'
    })

    const loginResponse = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: loginParams.toString(),
      redirect: 'manual'
    })

    const setCookie = loginResponse.headers.get('set-cookie')
    if (!setCookie) {
      console.log('❌ Login failed - no session cookie')
      return
    }

    const sessionMatch = setCookie.match(/-ejs-session-=([^;]+)/)
    if (!sessionMatch) {
      console.log('❌ Login failed - invalid session cookie')
      return
    }

    const sessionId = sessionMatch[1]
    const csrfToken = loginResponse.headers.get('http_x_csrf_token') || ''

    console.log('✅ Logged in to R710 device')

    // Query WLANs
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 15)

    const wlansUrl = `https://${device.ipAddress}/admin/_conf.jsp`
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

    // Parse WLANs from XML
    const wlanMatches = wlansText.matchAll(/<object\s+name="wlansvc-list"[^>]*>([\s\S]*?)<\/object>/g)
    const r710Wlans = []

    for (const match of wlanMatches) {
      const wlanXml = match[1]

      const getAttribute = (name) => {
        const attrMatch = wlanXml.match(new RegExp(`<attribute\\s+name="${name}"[^>]*>(.*?)</attribute>`))
        return attrMatch ? attrMatch[1] : null
      }

      const wlanId = getAttribute('id')
      const ssid = getAttribute('ssid')
      const guestServiceId = getAttribute('guestservice-id')
      const usage = getAttribute('usage')

      if (ssid) {
        r710Wlans.push({
          wlanId,
          ssid,
          guestServiceId,
          usage
        })
      }
    }

    console.log(`\n📡 WLANs on R710 DEVICE:`)
    console.log(`Total: ${r710Wlans.length}`)

    r710Wlans.forEach((wlan, i) => {
      console.log(`\n${i + 1}. ${wlan.ssid}`)
      console.log(`   WLAN ID: ${wlan.wlanId}`)
      console.log(`   Guest Service ID: ${wlan.guestServiceId}`)
      console.log(`   Usage: ${wlan.usage}`)
    })

    // Compare
    console.log('\n' + '='.repeat(80))
    console.log('🔍 COMPARISON:')
    console.log('='.repeat(80))

    const dbSsids = dbWlans.map(w => w.ssid)
    const r710Ssids = r710Wlans.map(w => w.ssid)

    const onlyInDb = dbSsids.filter(ssid => !r710Ssids.includes(ssid))
    const onlyOnDevice = r710Ssids.filter(ssid => !dbSsids.includes(ssid))
    const inBoth = dbSsids.filter(ssid => r710Ssids.includes(ssid))

    console.log(`\n✅ WLANs in BOTH database and device (${inBoth.length}):`)
    inBoth.forEach(ssid => console.log(`   - "${ssid}"`))

    console.log(`\n⚠️  WLANs in DATABASE but NOT on device (${onlyInDb.length}):`)
    onlyInDb.forEach(ssid => console.log(`   - "${ssid}" ❌ ORPHANED`))

    console.log(`\n📡 WLANs on DEVICE but NOT in database (${onlyOnDevice.length}):`)
    onlyOnDevice.forEach(ssid => console.log(`   - "${ssid}" ⚠️  UNREGISTERED`))

    console.log('\n' + '='.repeat(80))

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error(error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

verifyWlanIntegrity()
