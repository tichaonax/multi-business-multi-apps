import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions, isSystemAdmin } from '@/lib/permission-utils'
import { getR710SessionManager } from '@/lib/r710-session-manager'
import { decrypt } from '@/lib/encryption'

/**
 * GET /api/r710/connected-clients/sync
 * Sync connected clients from R710 devices to database
 *
 * This endpoint:
 * 1. Queries all active R710 devices
 * 2. Fetches connected clients from each device
 * 3. Upserts client data to R710ConnectedClients table
 * 4. Returns sync results
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    const permissions = getEffectivePermissions(session.user)
    if (!isSystemAdmin(session.user) && !permissions.canManageWifiPortal) {
      return NextResponse.json(
        { error: 'You do not have permission to sync connected clients' },
        { status: 403 }
      )
    }

    console.log('[R710 Sync] Starting connected clients sync...')

    // Get all R710 devices that are connected
    const devices = await prisma.r710DeviceRegistry.findMany({
      where: {
        connectionStatus: 'CONNECTED'
      },
      include: {
        wlans: {
          where: {
            isActive: true
          },
          select: {
            id: true,
            wlanId: true,
            ssid: true,
            businessId: true,
            business: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
          }
        }
      }
    })

    console.log(`[R710 Sync] Found ${devices.length} connected R710 devices`)

    if (devices.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No connected R710 devices found',
        synced: 0,
        devices: 0
      })
    }

    const sessionManager = getR710SessionManager()
    let totalClientssynced = 0
    const deviceResults: Array<{
      deviceId: string;
      ipAddress: string;
      clientsFound: number;
      clientsSynced: number;
      error?: string;
    }> = []

    for (const device of devices) {
      try {
        console.log(`[R710 Sync] Syncing clients from device ${device.ipAddress}...`)

        // Decrypt password and get session
        const adminPassword = decrypt(device.encryptedAdminPassword)
        const r710Service = await sessionManager.getSession({
          ipAddress: device.ipAddress,
          adminUsername: device.adminUsername,
          adminPassword
        })

        // Query connected clients from device
        const clientsResult = await r710Service.getConnectedClients()

        if (!clientsResult.success) {
          console.error(`[R710 Sync] Failed to get clients from ${device.ipAddress}:`, clientsResult.error)
          deviceResults.push({
            deviceId: device.id,
            ipAddress: device.ipAddress,
            clientsFound: 0,
            clientsSynced: 0,
            error: clientsResult.error
          })
          continue
        }

        const clients = clientsResult.clients
        console.log(`[R710 Sync] Found ${clients.length} clients on ${device.ipAddress}`)

        let syncedCount = 0

        for (const client of clients) {
          // Find the matching WLAN in our database
          const wlan = device.wlans.find(w => w.wlanId === client.wlanId || w.ssid === client.ssid)

          if (!wlan) {
            console.log(`[R710 Sync] Skipping client ${client.macAddress} - WLAN "${client.ssid}" (ID: ${client.wlanId}) not registered in database`)
            continue
          }

          // Upsert connected client to database
          await prisma.r710ConnectedClients.upsert({
            where: {
              deviceRegistryId_macAddress: {
                deviceRegistryId: device.id,
                macAddress: client.macAddress
              }
            },
            update: {
              ipAddress: client.ipAddress,
              hostname: client.hostname,
              deviceType: client.deviceType,
              signalStrength: client.signalStrength,
              radioBand: client.radioBand,
              channel: client.channel,
              rxBytes: client.rxBytes,
              txBytes: client.txBytes,
              rxPackets: client.rxPackets,
              txPackets: client.txPackets,
              lastSyncedAt: new Date(),
              updatedAt: new Date()
            },
            create: {
              deviceRegistryId: device.id,
              wlanId: wlan.id,
              businessId: wlan.businessId,
              macAddress: client.macAddress,
              ipAddress: client.ipAddress,
              hostname: client.hostname,
              deviceType: client.deviceType,
              tokenUsername: client.username,
              connectedAt: client.connectedAt,
              signalStrength: client.signalStrength,
              radioBand: client.radioBand,
              channel: client.channel,
              rxBytes: client.rxBytes,
              txBytes: client.txBytes,
              rxPackets: client.rxPackets,
              txPackets: client.txPackets,
              lastSyncedAt: new Date()
            }
          })

          syncedCount++
          totalClientssynced++
        }

        console.log(`[R710 Sync] Synced ${syncedCount} clients from ${device.ipAddress}`)

        deviceResults.push({
          deviceId: device.id,
          ipAddress: device.ipAddress,
          clientsFound: clients.length,
          clientsSynced: syncedCount
        })
      } catch (error) {
        console.error(`[R710 Sync] Error syncing clients from ${device.ipAddress}:`, error)
        deviceResults.push({
          deviceId: device.id,
          ipAddress: device.ipAddress,
          clientsFound: 0,
          clientsSynced: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    console.log(`[R710 Sync] Sync complete: ${totalClientssynced} clients synced from ${devices.length} devices`)

    return NextResponse.json({
      success: true,
      message: `Synced ${totalClientssynced} clients from ${devices.length} devices`,
      synced: totalClientssynced,
      devices: devices.length,
      results: deviceResults
    })
  } catch (error) {
    console.error('[R710 Sync] Error syncing connected clients:', error)
    return NextResponse.json(
      { error: 'Failed to sync connected clients', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
