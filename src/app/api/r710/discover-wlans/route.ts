/**
 * R710 WLAN Discovery API
 *
 * Queries the actual R710 device to discover available WLANs
 * This is used during WLAN registration to ensure we only register WLANs that actually exist
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin } from '@/lib/permission-utils'
import { decrypt } from '@/lib/encryption'

// Disable SSL verification for R710 communication
const originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED

interface DiscoveredWLAN {
  name: string
  ssid: string
  wlanId: string
  description: string
  usage: string
  isGuest: boolean
  guestServiceId: string
  enableFriendlyKey: boolean
  isActive: boolean
  registeredInDatabase: boolean
  databaseId?: string
}

/**
 * GET /api/r710/discover-wlans?deviceId={deviceId}
 *
 * Queries the R710 device to list all available WLANs
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can discover WLANs
    if (!isSystemAdmin(session.user)) {
      return NextResponse.json(
        { error: 'Only system administrators can discover WLANs' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('deviceId')

    if (!deviceId) {
      return NextResponse.json(
        { error: 'deviceId parameter required' },
        { status: 400 }
      )
    }

    // Get device
    const device = await prisma.r710DeviceRegistry.findUnique({
      where: { id: deviceId }
    })

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    console.log(`[R710 Discovery] Discovering WLANs on device ${device.ipAddress}...`)

    // Decrypt password
    const adminPassword = decrypt(device.encryptedAdminPassword)

    // Temporarily disable SSL verification
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

    try {
      // Step 1: Login to R710
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

      // Extract session cookie
      const setCookie = loginResponse.headers.get('set-cookie')
      if (!setCookie) {
        throw new Error('No session cookie received from R710 device')
      }

      const sessionMatch = setCookie.match(/-ejs-session-=([^;]+)/)
      if (!sessionMatch) {
        throw new Error('Failed to extract session ID from cookie')
      }

      const sessionId = sessionMatch[1]
      const csrfToken = loginResponse.headers.get('http_x_csrf_token')

      console.log('[R710 Discovery] Login successful')

      // Step 2: Query WLANs from device
      const wlansUrl = `https://${device.ipAddress}/admin/_conf.jsp`
      const timestamp = Date.now()
      const random = Math.floor(Math.random() * 1000000)
      const xmlRequest = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='wlansvc-list.${timestamp}.${random}' comp='wlansvc-list'/>`

      const wlansResponse = await fetch(wlansUrl, {
        method: 'POST',
        headers: {
          'Cookie': `-ejs-session-=${sessionId}`,
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-CSRF-Token': csrfToken || '',
          'X-Requested-With': 'XMLHttpRequest',
          'User-Agent': 'Mozilla/5.0'
        },
        body: xmlRequest
      })

      const wlansText = await wlansResponse.text()

      // Parse WLANs from XML response
      const wlanMatches = wlansText.match(/<wlansvc [^>]+>/g) || []

      const discoveredWlans: DiscoveredWLAN[] = []

      for (const wlanXml of wlanMatches) {
        const getAttribute = (attr: string) => {
          const match = wlanXml.match(new RegExp(`${attr}="([^"]+)"`))
          return match ? match[1] : ''
        }

        const wlanId = getAttribute('id')
        const ssid = getAttribute('ssid')
        const usage = getAttribute('usage')
        const isGuest = getAttribute('is-guest') === 'true'

        // Check if this WLAN is already registered in database
        const dbWlan = await prisma.r710Wlans.findFirst({
          where: {
            OR: [
              { wlanId: wlanId },
              { ssid: ssid }
            ],
            deviceRegistryId: deviceId
          }
        })

        discoveredWlans.push({
          name: getAttribute('name'),
          ssid: ssid,
          wlanId: wlanId,
          description: getAttribute('description'),
          usage: usage,
          isGuest: isGuest,
          guestServiceId: getAttribute('guestservice-id'),
          enableFriendlyKey: getAttribute('enable-friendly-key') === 'true',
          isActive: getAttribute('enable-type') === '0',
          registeredInDatabase: !!dbWlan,
          databaseId: dbWlan?.id
        })
      }

      // Update device health check
      await prisma.r710DeviceRegistry.update({
        where: { id: deviceId },
        data: {
          connectionStatus: 'CONNECTED',
          lastHealthCheck: new Date(),
          lastConnectedAt: new Date(),
          lastError: null
        }
      })

      console.log(`[R710 Discovery] Found ${discoveredWlans.length} WLANs on device`)

      return NextResponse.json({
        success: true,
        device: {
          id: device.id,
          ipAddress: device.ipAddress,
          description: device.description
        },
        wlans: discoveredWlans,
        totalWlans: discoveredWlans.length,
        guestWlans: discoveredWlans.filter(w => w.isGuest).length,
        registeredWlans: discoveredWlans.filter(w => w.registeredInDatabase).length,
        unregisteredWlans: discoveredWlans.filter(w => !w.registeredInDatabase).length
      })

    } finally {
      // Restore SSL verification setting
      if (originalRejectUnauthorized !== undefined) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalRejectUnauthorized
      } else {
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
      }
    }

  } catch (error) {
    console.error('[R710 Discovery] Error:', error)

    // Restore SSL verification on error
    if (originalRejectUnauthorized !== undefined) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalRejectUnauthorized
    } else {
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to discover WLANs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
