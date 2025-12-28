/**
 * R710 WLAN Registration API
 *
 * Registers a WLAN from the R710 device into our database
 * CRITICAL: Validates that the WLAN actually exists on the device before creating database record
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin } from '@/lib/permission-utils'
import { decrypt } from '@/lib/encryption'

const originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED

/**
 * POST /api/r710/register-wlan
 *
 * Register a WLAN from the R710 device
 *
 * Body:
 * {
 *   businessId: string,
 *   deviceId: string,
 *   wlanId: string,  // The WLAN ID from the device (NOT our database ID)
 *   ssid: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can register WLANs
    if (!isSystemAdmin(session.user)) {
      return NextResponse.json(
        { error: 'Only system administrators can register WLANs' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { businessId, deviceId, wlanId, ssid } = body

    // Validate required fields
    if (!businessId || !deviceId || !wlanId || !ssid) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId, deviceId, wlanId, ssid' },
        { status: 400 }
      )
    }

    // Get business
    const business = await prisma.businesses.findUnique({
      where: { id: businessId }
    })

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Get device
    const device = await prisma.r710DeviceRegistry.findUnique({
      where: { id: deviceId }
    })

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    // Check if WLAN is already registered
    const existingWlan = await prisma.r710Wlans.findFirst({
      where: {
        OR: [
          { wlanId: wlanId, deviceRegistryId: deviceId },
          { ssid: ssid, deviceRegistryId: deviceId }
        ]
      }
    })

    if (existingWlan) {
      return NextResponse.json(
        {
          error: 'WLAN already registered',
          message: `WLAN "${ssid}" is already registered in the database`,
          existingWlanId: existingWlan.id
        },
        { status: 409 }
      )
    }

    console.log(`[R710 Register] Validating WLAN "${ssid}" exists on device ${device.ipAddress}...`)

    // CRITICAL: Verify WLAN exists on R710 device before creating database record
    const adminPassword = decrypt(device.encryptedAdminPassword)

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

    let wlanData: any = null

    try {
      // Login to R710
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
        throw new Error('Failed to connect to R710 device')
      }

      const sessionId = sessionMatch[1]
      const csrfToken = loginResponse.headers.get('http_x_csrf_token')

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
          'X-CSRF-Token': csrfToken || '',
          'X-Requested-With': 'XMLHttpRequest',
          'User-Agent': 'Mozilla/5.0'
        },
        body: xmlRequest
      })

      const wlansText = await wlansResponse.text()

      // Find the specific WLAN in the response
      const wlanMatches = wlansText.match(/<wlansvc [^>]+>/g) || []

      for (const wlanXml of wlanMatches) {
        const getAttribute = (attr: string) => {
          const match = wlanXml.match(new RegExp(`${attr}="([^"]+)"`))
          return match ? match[1] : ''
        }

        const deviceWlanId = getAttribute('id')
        const deviceSsid = getAttribute('ssid')

        // Match by either WLAN ID or SSID
        if (deviceWlanId === wlanId || deviceSsid === ssid) {
          wlanData = {
            wlanId: deviceWlanId,
            ssid: deviceSsid,
            guestServiceId: getAttribute('guestservice-id'),
            title: getAttribute('description') || 'Welcome to Guest WiFi !',
            validDays: 1,  // Default
            enableFriendlyKey: getAttribute('enable-friendly-key') === 'true',
            isActive: getAttribute('enable-type') === '0',
            logoType: 'none'
          }
          break
        }
      }

      if (!wlanData) {
        return NextResponse.json(
          {
            error: 'WLAN not found on device',
            message: `WLAN "${ssid}" (ID: ${wlanId}) does not exist on R710 device ${device.ipAddress}`,
            recommendation: 'The WLAN may have been deleted from the device. Please refresh the WLAN list.'
          },
          { status: 404 }
        )
      }

      console.log(`[R710 Register] ✅ WLAN verified on device`)

    } finally {
      // Restore SSL verification
      if (originalRejectUnauthorized !== undefined) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalRejectUnauthorized
      } else {
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
      }
    }

    // Create database record (WLAN exists on device)
    console.log(`[R710 Register] Creating database record for WLAN "${wlanData.ssid}"...`)

    const newWlan = await prisma.r710Wlans.create({
      data: {
        businessId: businessId,
        deviceRegistryId: deviceId,
        wlanId: wlanData.wlanId,
        ssid: wlanData.ssid,
        guestServiceId: wlanData.guestServiceId,
        title: wlanData.title,
        validDays: wlanData.validDays,
        enableFriendlyKey: wlanData.enableFriendlyKey,
        isActive: wlanData.isActive,
        logoType: wlanData.logoType
      },
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
        }
      }
    })

    console.log(`[R710 Register] ✅ WLAN registered successfully`)

    return NextResponse.json({
      success: true,
      message: `WLAN "${wlanData.ssid}" registered successfully`,
      wlan: {
        id: newWlan.id,
        wlanId: newWlan.wlanId,
        ssid: newWlan.ssid,
        guestServiceId: newWlan.guestServiceId,
        title: newWlan.title,
        validDays: newWlan.validDays,
        enableFriendlyKey: newWlan.enableFriendlyKey,
        isActive: newWlan.isActive,
        business: newWlan.businesses,
        device: newWlan.device_registry,
        createdAt: newWlan.createdAt
      }
    })

  } catch (error) {
    console.error('[R710 Register] Error:', error)

    // Restore SSL verification on error
    if (originalRejectUnauthorized !== undefined) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalRejectUnauthorized
    } else {
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to register WLAN',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
