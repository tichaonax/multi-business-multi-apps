/**
 * R710 Connected Clients Sync Service
 *
 * Syncs connected clients from R710 devices to database
 * Note: Unlike ESP32, R710 has NO batch size limitations
 */

import { prisma } from '@/lib/prisma'
import { getR710SessionManager } from '@/lib/r710-session-manager'
import { decrypt } from '@/lib/encryption'
import { trackDeviceConnection } from '@/lib/device-tracking-middleware'

interface R710TokenWithClient {
  id: string
  username: string
  password: string
  wlan: string
  status: string
  active: boolean
  expired: boolean
  connectedMac: string | null
  startTime: Date | null
}

/**
 * Normalize MAC address to standard format (lowercase with colons)
 */
function normalizeMacAddress(mac: string): string {
  const clean = mac.toLowerCase().replace(/[^a-f0-9]/g, '')
  return clean.match(/.{1,2}/g)?.join(':') || clean
}

// Note: Device registry updates now handled by device-tracking-middleware

/**
 * Sync connected clients for a single business
 */
export async function syncR710ConnectedClients(businessId: string): Promise<{
  success: boolean
  clientsChecked: number
  clientsUpdated: number
  clientsRemoved: number
  error?: string
}> {
  try {
    console.log(`[R710 Sync] Starting sync for business ${businessId}`)

    // Get R710 integration for this business
    const integration = await prisma.r710BusinessIntegrations.findFirst({
      where: {
        businessId,
        isActive: true
      },
      include: {
        device_registry: true
      }
    })

    if (!integration) {
      return {
        success: false,
        clientsChecked: 0,
        clientsUpdated: 0,
        clientsRemoved: 0,
        error: 'R710 integration not found for this business'
      }
    }

    const device = integration.device_registry

    // Check if device is accessible
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    const isAccessible =
      device.connectionStatus === 'CONNECTED' &&
      device.lastHealthCheck &&
      device.lastHealthCheck >= fiveMinutesAgo

    if (!isAccessible) {
      return {
        success: false,
        clientsChecked: 0,
        clientsUpdated: 0,
        clientsRemoved: 0,
        error: `Device ${device.ipAddress} not accessible (status: ${device.connectionStatus})`
      }
    }

    // Get R710 session
    const sessionManager = getR710SessionManager()
    const adminPassword = decrypt(device.encryptedAdminPassword)

    const r710Service = await sessionManager.getSession({
      ipAddress: device.ipAddress,
      adminUsername: device.adminUsername,
      adminPassword
    })

    // Query all tokens from R710
    const r710Tokens = await r710Service.queryAllTokens()
    console.log(`[R710 Sync] Found ${r710Tokens.length} total tokens on device`)

    // Filter to only active tokens with connected MACs
    const activeTokensWithClients = r710Tokens.filter(
      (token) => token.active && token.connectedMac
    ) as R710TokenWithClient[]

    console.log(`[R710 Sync] Found ${activeTokensWithClients.length} active tokens with connected clients`)

    let clientsUpdated = 0
    const currentMacs = new Set<string>()

    // Get all R710 tokens for this business from database
    const dbTokens = await prisma.r710Tokens.findMany({
      where: { businessId },
      select: { id: true, username: true }
    })

    const dbTokenMap = new Map(dbTokens.map((t) => [t.username, t.id]))

    // Process each active token with connected client
    for (const tokenInfo of activeTokensWithClients) {
      // Find matching database token
      const dbTokenId = dbTokenMap.get(tokenInfo.username)

      if (!dbTokenId) {
        console.warn(`[R710 Sync] Token ${tokenInfo.username} not found in database`)
        continue
      }

      const normalizedMac = normalizeMacAddress(tokenInfo.connectedMac)
      currentMacs.add(normalizedMac)

      // Track device connection using middleware
      await trackDeviceConnection({
        macAddress: normalizedMac,
        hostname: undefined,
        deviceType: undefined,
        system: 'R710',
        businessId,
        tokenId: dbTokenId,
        wlanName: tokenInfo.wlan
      })

      // Upsert connected client record
      await prisma.r710ConnectedClients.upsert({
        where: {
          r710TokenId_macAddress: {
            r710TokenId: dbTokenId,
            macAddress: normalizedMac
          }
        },
        create: {
          r710TokenId: dbTokenId,
          businessId,
          macAddress: normalizedMac,
          wlanName: tokenInfo.wlan,
          connectedAt: tokenInfo.startTime || new Date(),
          isOnline: true,
          lastSyncedAt: new Date()
        },
        update: {
          isOnline: true,
          lastSyncedAt: new Date()
        }
      })

      clientsUpdated++
    }

    // Mark offline clients that are no longer in the active list
    const offlineResult = await prisma.r710ConnectedClients.updateMany({
      where: {
        businessId,
        isOnline: true,
        NOT: {
          macAddress: { in: Array.from(currentMacs) }
        }
      },
      data: {
        isOnline: false,
        lastSyncedAt: new Date()
      }
    })

    console.log(`[R710 Sync] Updated ${clientsUpdated} clients, marked ${offlineResult.count} as offline`)

    return {
      success: true,
      clientsChecked: activeTokensWithClients.length,
      clientsUpdated,
      clientsRemoved: offlineResult.count
    }
  } catch (error) {
    console.error('[R710 Sync] Error:', error)
    return {
      success: false,
      clientsChecked: 0,
      clientsUpdated: 0,
      clientsRemoved: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Sync connected clients for all businesses with R710 integration
 */
export async function syncAllR710ConnectedClients(): Promise<{
  totalBusinesses: number
  successCount: number
  failureCount: number
}> {
  console.log('[R710 Sync] Starting sync for all businesses')

  // Get all active R710 integrations
  const integrations = await prisma.r710BusinessIntegrations.findMany({
    where: {
      isActive: true
    },
    select: {
      businessId: true,
      businesses: {
        select: { id: true, businessName: true }
      }
    }
  })

  let successCount = 0
  let failureCount = 0

  for (const integration of integrations) {
    const result = await syncR710ConnectedClients(integration.businessId)
    if (result.success) {
      successCount++
    } else {
      failureCount++
    }

    // Small delay between businesses
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  console.log(`[R710 Sync] Completed: ${successCount} succeeded, ${failureCount} failed`)

  return {
    totalBusinesses: integrations.length,
    successCount,
    failureCount
  }
}
