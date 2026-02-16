import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { getR710SessionManager } from '@/lib/r710-session-manager'
import { decrypt } from '@/lib/encryption'
import { getServerUser } from '@/lib/get-server-user'

/**
 * POST /api/r710/acl/[id]/assign-wlan
 * Assign R710 MAC ACL to a WLAN
 *
 * Body:
 * - businessId: Business ID (required)
 * - wlanId: WLAN ID to assign ACL to (required)
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    const permissions = getEffectivePermissions(user)
    if (!permissions.isAdmin && !permissions.canManageWifiPortal) {
      return NextResponse.json(
        { error: 'You do not have permission to manage WiFi portal' },
        { status: 403 }
      )
    }

    const { id: aclId } = await context.params
    const body = await request.json()
    const { businessId, wlanId } = body

    if (!businessId || !wlanId) {
      return NextResponse.json(
        { error: 'businessId and wlanId are required' },
        { status: 400 }
      )
    }

    // Get R710 integration for the business
    const integration = await prisma.r710DeviceRegistry.findFirst({
      where: {
        businesses: {
          some: { id: businessId }
        }
      }
    })

    if (!integration) {
      return NextResponse.json(
        { error: 'No R710 integration found for this business' },
        { status: 404 }
      )
    }

    // Decrypt credentials
    const adminPassword = decrypt(integration.adminPasswordEncrypted)

    // Get R710 session
    const sessionManager = getR710SessionManager()
    const result = await sessionManager.withSession(
      {
        ipAddress: integration.ipAddress,
        adminUsername: integration.adminUsername,
        adminPassword
      },
      async (service) => {
        // Get current WLAN configuration
        const wlan = await service.getWlanById(wlanId)
        if (!wlan) {
          throw new Error(`WLAN with ID ${wlanId} not found`)
        }

        // Extract all attributes from the WLAN XML
        const wlanData = wlan as any

        // Build updobj XML payload with acl-id updated
        const updater = `wlansvc-list.${Date.now()}.${Math.random()}`

        // Build the XML payload preserving all existing attributes
        let xmlPayload = `<ajax-request action='updobj' updater='${updater}' comp='wlansvc-list'>`
        xmlPayload += `<wlansvc id='${wlanId}' acl-id='${aclId}'`

        // Add all other required attributes from current WLAN
        const requiredAttrs = [
          'name', 'ssid', 'description', 'usage', 'is-guest', 'authentication', 'encryption',
          'acctsvr-id', 'acct-upd-interval', 'guest-pass', 'en-grace-period-sets', 'grace-period-sets',
          'close-system', 'vlan-id', 'dvlan', 'max-clients-per-radio', 'enable-type', 'do-wmm-ac',
          'devicepolicy-id', 'bgscan', 'balance', 'band-balance', 'do-802-11d', 'wlan_bind',
          'force-dhcp', 'force-dhcp-timeout', 'max-idle-timeout', 'idle-timeout', 'client-isolation',
          'ci-whitelist-id', 'bypass-cna', 'dtim-period', 'directed-mbc', 'client-flow-log',
          'export-client-log', 'wifi6', 'local-bridge', 'enable-friendly-key', 'ofdm-rate-only',
          'bss-minrate', 'tx-rate-config', 'web-auth', 'https-redirection', 'called-station-id-type',
          'option82', 'option82-opt1', 'option82-opt2', 'option82-opt150', 'option82-opt151',
          'dis-dgaf', 'parp', 'authstats', 'sta-info-extraction', 'pool-id', 'dhcpsvr-id',
          'precedence-id', 'role-based-access-ctrl', 'option82-areaName'
        ]

        // Add guest-related attributes if it's a guest WLAN
        if (wlanData['is-guest'] === 'true') {
          requiredAttrs.push('guest-auth', 'self-service', 'self-service-sponsor-approval',
                            'self-service-notification', 'guestservice-id')
        }

        for (const attr of requiredAttrs) {
          const value = wlanData[attr]
          if (value !== undefined && value !== null) {
            const escaped = String(value).replace(/'/g, '&apos;').replace(/"/g, '&quot;')
            xmlPayload += ` ${attr}='${escaped}'`
          }
        }

        xmlPayload += '>'

        // Add sub-elements (QoS, RRM, etc.)
        if (wlanData.queuePriority) {
          xmlPayload += `<queue-priority voice='${wlanData.queuePriority.voice}' video='${wlanData.queuePriority.video}' data='${wlanData.queuePriority.data}' background='${wlanData.queuePriority.background}'/>`
        }

        if (wlanData.qos) {
          xmlPayload += `<qos uplink-preset='${wlanData.qos.uplinkPreset}' downlink-preset='${wlanData.qos.downlinkPreset}' perssid-uplink-preset='${wlanData.qos.perssidUplinkPreset}' perssid-downlink-preset='${wlanData.qos.perssidDownlinkPreset}'/>`
        }

        xmlPayload += `<rrm neighbor-report='enabled'/>`
        xmlPayload += `<smartcast mcast-filter='disabled'/>`
        xmlPayload += `<wlan-schedule value='0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0'/>`
        xmlPayload += `<avp-policy avp-enabled='disabled' avpdeny-id='0'/>`
        xmlPayload += `<urlfiltering-policy urlfiltering-enabled='disabled' urlfiltering-id='0'/>`
        xmlPayload += `<wificalling-policy wificalling-enabled='disabled' profile-id='0'/>`

        xmlPayload += '</wlansvc></ajax-request>'

        // Send update request
        const response = await service['client'].post('/admin/_conf.jsp', xmlPayload, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-CSRF-Token': service['csrfToken'] || '',
            'X-Requested-With': 'XMLHttpRequest',
          },
        })

        // Check response for errors
        const responseData = response.data
        if (responseData.includes('<error')) {
          throw new Error('Failed to assign ACL to WLAN')
        }

        return { success: true }
      }
    )

    return NextResponse.json({
      success: true,
      data: {
        aclId,
        wlanId,
        message: 'ACL successfully assigned to WLAN'
      }
    })
  } catch (error) {
    console.error('Error assigning ACL to WLAN:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to assign ACL to WLAN' },
      { status: 500 }
    )
  }
}
