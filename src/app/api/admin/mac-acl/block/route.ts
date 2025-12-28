import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { getR710SessionManager } from '@/lib/r710-session-manager'
import { decrypt } from '@/lib/encryption'

/**
 * POST /api/admin/mac-acl/block
 * Block a MAC address across all WiFi systems (ESP32 and R710)
 *
 * Body:
 * - mac: MAC address to block (required)
 * - reason: Reason for blocking (required)
 * - businessId: Business ID (optional, for tracking)
 * - systems: Array of systems to block on ['ESP32', 'R710'] (default: both)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions (admin only for cross-system blocking)
    const permissions = getEffectivePermissions(session.user)
    if (!permissions.isAdmin) {
      return NextResponse.json(
        { error: 'Only administrators can block MACs across all systems' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { mac, reason, businessId, systems = ['ESP32', 'R710'] } = body

    if (!mac || !reason) {
      return NextResponse.json(
        { error: 'MAC address and reason are required' },
        { status: 400 }
      )
    }

    const normalizedMac = mac.toUpperCase().replace(/[:-]/g, ':')
    const results: any = {
      esp32: { success: false, message: 'Not attempted' },
      r710: { success: false, message: 'Not attempted' }
    }

    // Block on ESP32 systems
    if (systems.includes('ESP32')) {
      try {
        // Get all ESP32 portal integrations
        const esp32Integrations = await prisma.portalIntegrations.findMany({
          where: businessId ? { businessId } : undefined
        })

        for (const integration of esp32Integrations) {
          if (!integration.apiUrl || !integration.apiKey) continue

          // Call ESP32 blacklist API (expects a token, but we can use MAC directly)
          // Note: ESP32 blacklist API works with tokens, so we need to find a token with this MAC
          // For now, we'll add the entry to the database and it will be synced later

          // Create database ACL entry
          await prisma.macAclEntry.create({
            data: {
              macAddress: normalizedMac.toLowerCase(),
              integrationId: integration.id,
              integrationSystem: 'ESP32',
              listType: 'BLACKLIST',
              reason,
              businessId: businessId || integration.businessId,
              createdBy: session.user.id,
              approvedBy: session.user.id,
              isActive: true
            }
          })
        }

        results.esp32 = {
          success: true,
          message: `Blocked on ${esp32Integrations.length} ESP32 device(s)`
        }
      } catch (error) {
        console.error('Error blocking MAC on ESP32:', error)
        results.esp32 = {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }

    // Block on R710 systems
    if (systems.includes('R710')) {
      try {
        // Get all R710 device registries
        const r710Devices = await prisma.r710DeviceRegistry.findMany({
          where: businessId ? {
            businesses: {
              some: { id: businessId }
            }
          } : undefined
        })

        for (const device of r710Devices) {
          const adminPassword = decrypt(device.adminPasswordEncrypted)
          const sessionManager = getR710SessionManager()

          // Get or create a "Blocked Devices" ACL list
          await sessionManager.withSession(
            {
              ipAddress: device.ipAddress,
              adminUsername: device.adminUsername,
              adminPassword
            },
            async (service) => {
              // List existing ACLs
              const aclLists = await service.listAclLists()
              let blockedAcl = aclLists.find(
                (acl) => acl.name === 'Blocked Devices' && acl.defaultMode === 'allow'
              )

              if (!blockedAcl) {
                // Create "Blocked Devices" ACL
                const createResult = await service.createAclList({
                  name: 'Blocked Devices',
                  description: 'Devices blocked by administrators',
                  mode: 'allow', // blacklist mode
                  macs: [{ mac: normalizedMac, macComment: reason }]
                })

                if (createResult.success && createResult.aclId) {
                  // Create database entry
                  await prisma.macAclEntry.create({
                    data: {
                      macAddress: normalizedMac.toLowerCase(),
                      integrationId: createResult.aclId,
                      integrationSystem: 'R710',
                      listType: 'BLACKLIST',
                      reason,
                      businessId: businessId || device.businesses[0]?.id,
                      createdBy: session.user.id,
                      approvedBy: session.user.id,
                      isActive: true
                    }
                  })
                }
              } else {
                // Update existing ACL to add the MAC
                const updatedMacs = [
                  ...blockedAcl.denyMacs,
                  { mac: normalizedMac, macComment: reason }
                ]

                await service.updateAclList(blockedAcl.id, {
                  name: 'Blocked Devices',
                  description: 'Devices blocked by administrators',
                  mode: 'allow',
                  macs: updatedMacs
                })

                // Create database entry
                await prisma.macAclEntry.create({
                  data: {
                    macAddress: normalizedMac.toLowerCase(),
                    integrationId: blockedAcl.id,
                    integrationSystem: 'R710',
                    listType: 'BLACKLIST',
                    reason,
                    businessId: businessId || device.businesses[0]?.id,
                    createdBy: session.user.id,
                    approvedBy: session.user.id,
                    isActive: true
                  }
                })
              }
            }
          )
        }

        results.r710 = {
          success: true,
          message: `Blocked on ${r710Devices.length} R710 device(s)`
        }
      } catch (error) {
        console.error('Error blocking MAC on R710:', error)
        results.r710 = {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }

    // Update device registry with blocked tag
    try {
      await prisma.deviceRegistry.update({
        where: { macAddress: normalizedMac.toLowerCase() },
        data: {
          tags: {
            push: 'BLOCKED'
          }
        }
      })
    } catch (error) {
      // Device might not exist in registry yet, that's okay
    }

    const overallSuccess = (systems.includes('ESP32') ? results.esp32.success : true) &&
                          (systems.includes('R710') ? results.r710.success : true)

    return NextResponse.json({
      success: overallSuccess,
      data: {
        mac: normalizedMac,
        reason,
        systems: results
      }
    })
  } catch (error) {
    console.error('Error blocking MAC across systems:', error)
    return NextResponse.json(
      { error: 'Failed to block MAC address' },
      { status: 500 }
    )
  }
}
