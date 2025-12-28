/**
 * Debug R710 WLAN Query
 *
 * Get raw XML response to debug WLAN parsing
 */

require('dotenv').config({ path: '.env.local' })

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const fs = require('fs')

async function debugR710Wlans() {
  try {
    console.log('\n🔍 Debugging R710 WLAN Query...\n')

    const device = await prisma.r710DeviceRegistry.findFirst({
      where: { isActive: true }
    })

    if (!device) {
      console.log('❌ No active device found')
      return
    }

    const crypto = require('crypto')

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

    console.log(`Logging in to ${device.ipAddress}...`)

    const loginResponse = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: loginParams.toString(),
      redirect: 'manual'
    })

    const setCookie = loginResponse.headers.get('set-cookie')
    const sessionMatch = setCookie?.match(/-ejs-session-=([^;]+)/)
    const sessionId = sessionMatch?.[1]
    const csrfToken = loginResponse.headers.get('http_x_csrf_token') || ''

    if (!sessionId) {
      console.log('❌ Login failed')
      return
    }

    console.log('✅ Logged in')
    console.log(`Session ID: ${sessionId.substring(0, 20)}...`)
    console.log(`CSRF Token: ${csrfToken}\n`)

    // Query WLANs
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 15)

    const wlansUrl = `https://${device.ipAddress}/admin/_conf.jsp`
    const xmlRequest = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='wlansvc-list.${timestamp}.${random}' comp='wlansvc-list'/>`

    console.log('Querying WLANs...')
    console.log(`Request: ${xmlRequest}\n`)

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

    console.log('Response received:')
    console.log(`Status: ${wlansResponse.status}`)
    console.log(`Content-Type: ${wlansResponse.headers.get('content-type')}`)
    console.log(`Length: ${wlansText.length} characters\n`)

    // Save raw response
    fs.writeFileSync('r710-wlan-response.xml', wlansText)
    console.log('✅ Raw response saved to r710-wlan-response.xml\n')

    // Show first 2000 characters
    console.log('First 2000 characters of response:')
    console.log('='.repeat(80))
    console.log(wlansText.substring(0, 2000))
    console.log('='.repeat(80))

    // Try to parse
    const wlanMatches = wlansText.matchAll(/<object\s+name="wlansvc-list"[^>]*>([\s\S]*?)<\/object>/g)
    const matchesArray = Array.from(wlanMatches)

    console.log(`\n📊 Parsing results:`)
    console.log(`Found ${matchesArray.length} <object name="wlansvc-list"> matches\n`)

    if (matchesArray.length === 0) {
      console.log('⚠️  No WLAN objects found in response')
      console.log('Trying alternative patterns...\n')

      // Try alternative patterns
      const altPattern1 = wlansText.matchAll(/<object[^>]*>([\s\S]*?)<\/object>/g)
      const alt1 = Array.from(altPattern1)
      console.log(`Pattern 1: <object> - Found ${alt1.length} matches`)

      const altPattern2 = wlansText.matchAll(/<wlan[^>]*>([\s\S]*?)<\/wlan>/g)
      const alt2 = Array.from(altPattern2)
      console.log(`Pattern 2: <wlan> - Found ${alt2.length} matches`)

      // Check if it's an error response
      if (wlansText.includes('error') || wlansText.includes('Error')) {
        console.log('\n⚠️  Response may contain an error')
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error(error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

debugR710Wlans()
