/**
 * ESP32 Connected Clients Sync Service
 *
 * Syncs connected clients from ESP32 portal to database
 * CRITICAL: Uses batching with max 20 items per request (ESP32 limitation)
 */

import { prisma } from '@/lib/prisma'
import { trackDeviceConnection } from '@/lib/device-tracking-middleware'

const ESP32_BATCH_SIZE = 20 // CRITICAL: ESP32 will crash if exceeded
const SYNC_DELAY_MS = 500 // Delay between batches

interface ESP32Config {
  apiUrl: string
  apiKey: string
}

interface ESP32TokenInfo {
  token: string
  businessId: string
  status: string
  created: number
  first_use?: number
  duration_minutes: number
  expires_at?: number
  bandwidth_used_down_mb?: number
  bandwidth_used_up_mb?: number
  device_count?: number
  hostname?: string
  device_type?: string
  devices?: Array<{
    mac: string
    online: boolean
    current_ip?: string
  }>
}

/**
 * Get ESP32 portal configuration
 * For now, we'll need to add this to PortalIntegrations
 */
async function getESP32Config(businessId?: string): Promise<ESP32Config | null> {
  // TODO: Get from PortalIntegrations table
  // For now, return null if no business specified
  if (!businessId) return null

  const integration = await prisma.portalIntegrations.findUnique({
    where: { businessId }
  })

  if (!integration || !integration.apiUrl || !integration.apiKey) {
    return null
  }

  return {
    apiUrl: integration.apiUrl,
    apiKey: integration.apiKey
  }
}

/**
 * Fetch all active tokens from ESP32 with pagination
 * CRITICAL: Uses batching with max 20 items per page
 */
async function fetchActiveTokens(config: ESP32Config): Promise<ESP32TokenInfo[]> {
  const allTokens: ESP32TokenInfo[] = []
  let offset = 0
  let hasMore = true

  while (hasMore) {
    try {
      const url = `${config.apiUrl}/api/tokens/list?` + new URLSearchParams({
        api_key: config.apiKey,
        status: 'active',
        offset: offset.toString(),
        limit: ESP32_BATCH_SIZE.toString() // Max 20 per request
      })

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.error(`ESP32 API error: ${response.status} ${response.statusText}`)
        break
      }

      const data = await response.json()

      if (!data.success) {
        console.error('ESP32 API returned error:', data)
        break
      }

      const tokens = data.tokens || []
      allTokens.push(...tokens)

      hasMore = data.has_more === true
      offset += ESP32_BATCH_SIZE

      // Add delay between batches to avoid overwhelming ESP32
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, SYNC_DELAY_MS))
      }

    } catch (error) {
      console.error('Error fetching active tokens from ESP32:', error)
      break
    }
  }

  return allTokens
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
export async function syncESP32ConnectedClients(businessId: string): Promise<{
  success: boolean
  clientsChecked: number
  clientsUpdated: number
  clientsRemoved: number
  error?: string
}> {
  try {
    console.log(`[ESP32 Sync] Starting sync for business ${businessId}`)

    const config = await getESP32Config(businessId)
    if (!config) {
      return {
        success: false,
        clientsChecked: 0,
        clientsUpdated: 0,
        clientsRemoved: 0,
        error: 'ESP32 portal not configured for this business'
      }
    }

    // Fetch all active tokens from ESP32
    const activeTokens = await fetchActiveTokens(config)
    console.log(`[ESP32 Sync] Found ${activeTokens.length} active tokens`)

    let clientsUpdated = 0
    const currentMacs = new Set<string>()

    // Process each active token
    for (const tokenInfo of activeTokens) {
      // Find matching database token
      const dbToken = await prisma.wifiTokens.findUnique({
        where: { token: tokenInfo.token }
      })

      if (!dbToken) {
        console.warn(`[ESP32 Sync] Token ${tokenInfo.token} not found in database`)
        continue
      }

      // Process each connected device
      const devices = tokenInfo.devices || []
      for (const device of devices) {
        if (!device.online) continue

        const normalizedMac = normalizeMacAddress(device.mac)
        currentMacs.add(normalizedMac)

        // Track device connection using middleware
        await trackDeviceConnection({
          macAddress: normalizedMac,
          ipAddress: device.current_ip,
          hostname: tokenInfo.hostname,
          deviceType: tokenInfo.device_type,
          system: 'ESP32',
          businessId,
          tokenId: dbToken.id
        })

        // Upsert connected client
        await prisma.eSP32ConnectedClients.upsert({
          where: {
            wifiTokenId_macAddress: {
              wifiTokenId: dbToken.id,
              macAddress: normalizedMac
            }
          },
          create: {
            wifiTokenId: dbToken.id,
            businessId,
            macAddress: normalizedMac,
            ipAddress: device.current_ip,
            hostname: tokenInfo.hostname,
            deviceType: tokenInfo.device_type,
            connectedAt: tokenInfo.first_use
              ? new Date(tokenInfo.first_use * 1000)
              : new Date(),
            isOnline: true,
            bandwidthUsedDown: tokenInfo.bandwidth_used_down_mb || 0,
            bandwidthUsedUp: tokenInfo.bandwidth_used_up_mb || 0,
            lastSyncedAt: new Date()
          },
          update: {
            ipAddress: device.current_ip,
            hostname: tokenInfo.hostname || undefined,
            deviceType: tokenInfo.device_type || undefined,
            isOnline: true,
            bandwidthUsedDown: tokenInfo.bandwidth_used_down_mb || 0,
            bandwidthUsedUp: tokenInfo.bandwidth_used_up_mb || 0,
            lastSyncedAt: new Date()
          }
        })

        clientsUpdated++
      }
    }

    // Mark offline clients that are no longer in the active list
    const offlineResult = await prisma.eSP32ConnectedClients.updateMany({
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

    console.log(`[ESP32 Sync] Updated ${clientsUpdated} clients, marked ${offlineResult.count} as offline`)

    return {
      success: true,
      clientsChecked: activeTokens.reduce((sum, t) => sum + (t.device_count || 0), 0),
      clientsUpdated,
      clientsRemoved: offlineResult.count,
    }
  } catch (error) {
    console.error('[ESP32 Sync] Error:', error)
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
 * Sync connected clients for all businesses with ESP32 integration
 */
export async function syncAllESP32ConnectedClients(): Promise<{
  totalBusinesses: number
  successCount: number
  failureCount: number
}> {
  console.log('[ESP32 Sync] Starting sync for all businesses')

  // Get all businesses with ESP32 WiFi integration enabled
  const businesses = await prisma.businesses.findMany({
    where: {
      wifiIntegrationEnabled: true,
      isActive: true
    },
    select: { id: true, name: true }
  })

  let successCount = 0
  let failureCount = 0

  for (const business of businesses) {
    const result = await syncESP32ConnectedClients(business.id)
    if (result.success) {
      successCount++
    } else {
      failureCount++
    }

    // Small delay between businesses
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log(`[ESP32 Sync] Completed: ${successCount} succeeded, ${failureCount} failed`)

  return {
    totalBusinesses: businesses.length,
    successCount,
    failureCount
  }
}
