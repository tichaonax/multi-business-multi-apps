/**
 * Device Tracking Middleware
 *
 * Tracks device connections and updates the unified device registry
 * when tokens are used across ESP32 and R710 systems
 */

import { prisma } from '@/lib/prisma'

export type SystemType = 'ESP32' | 'R710'

export interface DeviceConnectionInfo {
  macAddress: string
  ipAddress?: string | null
  hostname?: string | null
  deviceType?: string | null
  system: SystemType
  businessId: string
  tokenId?: string // WiFi token ID (ESP32) or R710 token ID (R710)
  wlanName?: string // R710 only
  sessionId?: string // Optional session tracking
}

/**
 * Normalize MAC address to standard format (lowercase with colons)
 */
function normalizeMacAddress(mac: string): string {
  const clean = mac.toLowerCase().replace(/[^a-f0-9]/g, '')
  return clean.match(/.{1,2}/g)?.join(':') || clean
}

/**
 * Track device connection when a token is used
 *
 * This function:
 * 1. Updates or creates a DeviceRegistry entry
 * 2. Creates a DeviceConnectionHistory record
 * 3. Updates system-specific connection counters
 *
 * @returns Device registry ID
 */
export async function trackDeviceConnection(
  connectionInfo: DeviceConnectionInfo
): Promise<string> {
  const normalizedMac = normalizeMacAddress(connectionInfo.macAddress)
  const now = new Date()

  console.log(`[DeviceTracking] Tracking ${connectionInfo.system} connection:`, {
    mac: normalizedMac,
    business: connectionInfo.businessId,
    system: connectionInfo.system
  })

  // Upsert device registry
  const device = await prisma.deviceRegistry.upsert({
    where: { macAddress: normalizedMac },
    create: {
      macAddress: normalizedMac,
      hostname: connectionInfo.hostname,
      deviceType: connectionInfo.deviceType,
      firstSeenAt: now,
      firstSeenSystem: connectionInfo.system,
      firstSeenBusinessId: connectionInfo.businessId,
      lastSeenAt: now,
      lastSeenSystem: connectionInfo.system,
      lastSeenBusinessId: connectionInfo.businessId,
      totalConnections: 1,
      esp32Connections: connectionInfo.system === 'ESP32' ? 1 : 0,
      r710Connections: connectionInfo.system === 'R710' ? 1 : 0
    },
    update: {
      hostname: connectionInfo.hostname || undefined,
      deviceType: connectionInfo.deviceType || undefined,
      lastSeenAt: now,
      lastSeenSystem: connectionInfo.system,
      lastSeenBusinessId: connectionInfo.businessId,
      totalConnections: { increment: 1 },
      esp32Connections:
        connectionInfo.system === 'ESP32' ? { increment: 1 } : undefined,
      r710Connections:
        connectionInfo.system === 'R710' ? { increment: 1 } : undefined
    }
  })

  console.log(`[DeviceTracking] Device registry updated: ${device.id}`)

  // Create connection history entry
  const historyEntry = await prisma.deviceConnectionHistory.create({
    data: {
      deviceRegistryId: device.id,
      businessId: connectionInfo.businessId,
      system: connectionInfo.system,
      ipAddress: connectionInfo.ipAddress,
      hostname: connectionInfo.hostname,
      deviceType: connectionInfo.deviceType,
      connectedAt: now,
      wlanName: connectionInfo.wlanName,
      sessionId: connectionInfo.sessionId
    }
  })

  console.log(`[DeviceTracking] Connection history created: ${historyEntry.id}`)

  return device.id
}

/**
 * Track device disconnection
 *
 * Updates the connection history entry with disconnection time
 *
 * @param macAddress - Device MAC address
 * @param sessionId - Optional session ID to identify specific connection
 */
export async function trackDeviceDisconnection(
  macAddress: string,
  sessionId?: string
): Promise<void> {
  const normalizedMac = normalizeMacAddress(macAddress)
  const now = new Date()

  console.log(`[DeviceTracking] Tracking disconnection:`, {
    mac: normalizedMac,
    sessionId
  })

  // Find the device
  const device = await prisma.deviceRegistry.findUnique({
    where: { macAddress: normalizedMac }
  })

  if (!device) {
    console.warn(`[DeviceTracking] Device not found for MAC: ${normalizedMac}`)
    return
  }

  // Update the most recent connection history entry
  const whereClause: any = {
    deviceRegistryId: device.id,
    disconnectedAt: null
  }

  if (sessionId) {
    whereClause.sessionId = sessionId
  }

  const updated = await prisma.deviceConnectionHistory.updateMany({
    where: whereClause,
    data: {
      disconnectedAt: now
    }
  })

  console.log(`[DeviceTracking] Updated ${updated.count} connection history entries`)
}

/**
 * Get device connection statistics
 *
 * @param macAddress - Device MAC address
 */
export async function getDeviceStats(macAddress: string): Promise<{
  device: any
  totalConnections: number
  esp32Connections: number
  r710Connections: number
  recentConnections: any[]
} | null> {
  const normalizedMac = normalizeMacAddress(macAddress)

  const device = await prisma.deviceRegistry.findUnique({
    where: { macAddress: normalizedMac },
    include: {
      firstSeenBusiness: {
        select: { id: true, businessName: true, type: true }
      },
      lastSeenBusiness: {
        select: { id: true, businessName: true, type: true }
      },
      connectionHistory: {
        orderBy: { connectedAt: 'desc' },
        take: 10,
        include: {
          business: {
            select: { id: true, businessName: true, type: true }
          }
        }
      }
    }
  })

  if (!device) {
    return null
  }

  return {
    device: {
      ...device,
      createdAt: device.createdAt.toISOString(),
      updatedAt: device.updatedAt.toISOString(),
      firstSeenAt: device.firstSeenAt.toISOString(),
      lastSeenAt: device.lastSeenAt.toISOString(),
      connectionHistory: device.connectionHistory.map((h) => ({
        ...h,
        connectedAt: h.connectedAt.toISOString(),
        disconnectedAt: h.disconnectedAt?.toISOString(),
        createdAt: h.createdAt.toISOString()
      }))
    },
    totalConnections: device.totalConnections,
    esp32Connections: device.esp32Connections,
    r710Connections: device.r710Connections,
    recentConnections: device.connectionHistory.map((h) => ({
      ...h,
      connectedAt: h.connectedAt.toISOString(),
      disconnectedAt: h.disconnectedAt?.toISOString(),
      createdAt: h.createdAt.toISOString()
    }))
  }
}

/**
 * Batch track multiple device connections (for sync operations)
 *
 * This is more efficient than calling trackDeviceConnection multiple times
 * when syncing large numbers of connected clients
 *
 * @param connections - Array of connection info
 */
export async function trackDeviceConnectionsBatch(
  connections: DeviceConnectionInfo[]
): Promise<void> {
  console.log(`[DeviceTracking] Batch tracking ${connections.length} connections`)

  for (const connection of connections) {
    try {
      await trackDeviceConnection(connection)
    } catch (error) {
      console.error(`[DeviceTracking] Error tracking connection:`, error)
      // Continue processing other connections
    }
  }

  console.log(`[DeviceTracking] Batch tracking complete`)
}
