require('dotenv').config({ path: '.env.local' })

const { PrismaClient } = require('@prisma/client')
const https = require('https')
const crypto = require('crypto')

const prisma = new PrismaClient()

// Disable SSL certificate validation for R710
const agent = new https.Agent({
  rejectUnauthorized: false
})

// Decrypt function (inline implementation)
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

async function checkR710DeviceWLANs() {
  try {
    console.log('🔍 Checking R710 Device for WLANs...\n')

    // Get all R710 devices
    const devices = await prisma.r710DeviceRegistry.findMany({
      include: {
        r710_wlans: {
          select: {
            id: true,
            ssid: true,
            wlanId: true
          }
        }
      }
    })

    if (devices.length === 0) {
      console.log('❌ No R710 devices found in database!')
      return
    }

    console.log(`📊 Found ${devices.length} R710 device(s)\n`)

    for (const device of devices) {
      console.log(`\n${'='.repeat(80)}`)
      console.log(`Device: ${device.ipAddress}`)
      console.log(`Description: ${device.description || 'N/A'}`)
      console.log(`Status: ${device.connectionStatus}`)
      console.log(`Database WLANs: ${device.r710_wlans.length}`)
      console.log(`${'='.repeat(80)}\n`)

      // Decrypt password
      let adminPassword
      try {
        adminPassword = decrypt(device.encryptedAdminPassword)
      } catch (error) {
        console.error(`❌ Failed to decrypt password: ${error.message}`)
        continue
      }

      // Step 1: Login to get session
      console.log('Step 1: Logging in to R710 device...')
      const loginUrl = `https://${device.ipAddress}/admin/login.jsp`
      const loginParams = new URLSearchParams({
        username: device.adminUsername,
        password: adminPassword,
        ok: 'Log In'
      })

      try {
        // Create custom fetch with disabled SSL verification
        const customFetch = async (url, options = {}) => {
          return fetch(url, {
            ...options,
            // Disable SSL verification by setting NODE_TLS_REJECT_UNAUTHORIZED
            signal: options.signal
          })
        }

        // Temporarily disable SSL verification
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

        const loginResponse = await fetch(loginUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0'
          },
          body: loginParams.toString(),
          redirect: 'manual'
        })

        console.log(`Login response status: ${loginResponse.status}`)
        console.log(`Login response headers:`)
        for (const [key, value] of loginResponse.headers.entries()) {
          console.log(`  ${key}: ${value}`)
        }

        const setCookie = loginResponse.headers.get('set-cookie')
        if (!setCookie) {
          console.log('❌ No session cookie received from login')
          console.log(`Full response:`)
          const responseText = await loginResponse.text()
          console.log(responseText.substring(0, 500))
          continue
        }

        console.log(`Set-Cookie header: ${setCookie}`)

        // Try both JSESSIONID and -ejs-session- cookie names
        let sessionMatch = setCookie.match(/JSESSIONID=([^;]+)/)
        if (!sessionMatch) {
          sessionMatch = setCookie.match(/-ejs-session-=([^;]+)/)
        }

        if (!sessionMatch) {
          console.log('❌ Could not extract session ID from cookie')
          console.log(`Cookie value: ${setCookie}`)
          continue
        }

        const sessionId = sessionMatch[1]
        console.log(`✅ Login successful, Session ID: ${sessionId.substring(0, 20)}...`)

        // Determine cookie name for subsequent requests
        const cookieName = setCookie.includes('JSESSIONID') ? 'JSESSIONID' : '-ejs-session-'
        console.log(`Using cookie name: ${cookieName}`)

        // Get CSRF token from login response
        const csrfToken = loginResponse.headers.get('http_x_csrf_token')
        console.log(`CSRF Token: ${csrfToken}`)

        // Step 2: Fetch WLANs from device using correct endpoint
        console.log('\nStep 2: Fetching WLANs from R710 device...')
        const wlansUrl = `https://${device.ipAddress}/admin/_conf.jsp`

        // Generate timestamp and random number for updater
        const timestamp = Date.now()
        const random = Math.floor(Math.random() * 1000000)

        // XML request body to list all WLANs
        const xmlRequest = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='wlansvc-list.${timestamp}.${random}' comp='wlansvc-list'/>`

        console.log(`Request body: ${xmlRequest}`)

        const wlansResponse = await fetch(wlansUrl, {
          method: 'POST',
          headers: {
            'Cookie': `${cookieName}=${sessionId}`,
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-CSRF-Token': csrfToken,
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0'
          },
          body: xmlRequest
        })

        const wlansText = await wlansResponse.text()

        console.log('\n' + '='.repeat(80))
        console.log('RAW R710 WLAN RESPONSE:')
        console.log('='.repeat(80))
        console.log(wlansText)
        console.log('='.repeat(80))

        // Try to parse the response
        console.log('\nAttempting to parse response...')

        // R710 returns XML-like format
        if (wlansText.includes('<ajax-response>')) {
          console.log('✅ Response is in AJAX XML format')

          // Extract WLAN entries - look for <wlansvc> tags
          const wlanMatches = wlansText.match(/<wlansvc [^>]+>/g)
          if (wlanMatches) {
            console.log(`\n📡 Found ${wlanMatches.length} WLAN(s) on R710 device:\n`)

            wlanMatches.forEach((wlanXml, index) => {
              // Extract key attributes
              const nameMatch = wlanXml.match(/name="([^"]+)"/)
              const ssidMatch = wlanXml.match(/ssid="([^"]+)"/)
              const idMatch = wlanXml.match(/id="([^"]+)"/)
              const usageMatch = wlanXml.match(/usage="([^"]+)"/)
              const isGuestMatch = wlanXml.match(/is-guest="([^"]+)"/)
              const enableFriendlyKeyMatch = wlanXml.match(/enable-friendly-key="([^"]+)"/)
              const guestServiceIdMatch = wlanXml.match(/guestservice-id="([^"]+)"/)
              const descriptionMatch = wlanXml.match(/description="([^"]+)"/)

              console.log(`${'-'.repeat(80)}`)
              console.log(`WLAN #${index + 1}:`)
              console.log(`  Name: ${nameMatch ? nameMatch[1] : 'N/A'}`)
              console.log(`  SSID (WiFi Name): ${ssidMatch ? ssidMatch[1] : 'N/A'}`)
              console.log(`  Description: ${descriptionMatch ? descriptionMatch[1] : 'N/A'}`)
              console.log(`  ID: ${idMatch ? idMatch[1] : 'N/A'}`)
              console.log(`  Usage: ${usageMatch ? usageMatch[1] : 'N/A'}`)
              console.log(`  Is Guest: ${isGuestMatch ? isGuestMatch[1] : 'N/A'}`)
              console.log(`  Guest Service ID: ${guestServiceIdMatch ? guestServiceIdMatch[1] : 'N/A'}`)
              console.log(`  Friendly Key: ${enableFriendlyKeyMatch ? enableFriendlyKeyMatch[1] : 'N/A'}`)
              console.log()
            })
          } else {
            console.log('⚠️  No WLAN items found in XML response')
          }
        } else if (wlansText.includes('{') || wlansText.includes('[')) {
          console.log('✅ Response might be JSON')
          try {
            const jsonData = JSON.parse(wlansText)
            console.log('\nParsed JSON:')
            console.log(JSON.stringify(jsonData, null, 2))
          } catch (e) {
            console.log('⚠️  Failed to parse as JSON:', e.message)
          }
        } else {
          console.log('⚠️  Unknown response format')
        }

        // Compare with database
        console.log('\n' + '-'.repeat(80))
        console.log('DATABASE COMPARISON:')
        console.log('-'.repeat(80))
        console.log(`WLANs in database for this device: ${device.r710_wlans.length}`)
        if (device.r710_wlans.length > 0) {
          device.r710_wlans.forEach((wlan, index) => {
            console.log(`  ${index + 1}. ${wlan.ssid} (ID: ${wlan.wlanId})`)
          })
        }

      } catch (error) {
        console.error(`❌ Error communicating with device: ${error.message}`)
        if (error.cause) {
          console.error(`   Cause: ${error.cause.message}`)
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

checkR710DeviceWLANs()
