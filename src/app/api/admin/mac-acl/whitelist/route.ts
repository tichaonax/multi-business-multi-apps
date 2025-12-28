import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { getR710SessionManager } from '@/lib/r710-session-manager'
import { decrypt } from '@/lib/encryption'

/**
 * POST /api/admin/mac-acl/whitelist
 * Whitelist a MAC address across all WiFi systems (ESP32 and R710)
 *
 * Body:
 * - mac: MAC address to whitelist (required)
 * - note: Note about VIP access (required)
 * - businessId: Business ID (optional, for tracking)
 * - systems: Array of systems to whitelist on ['ESP32', 'R710'] (default: both)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions (admin only for cross-system whitelisting)
    const permissions = getEffectivePermissions(session.user)
    if (!permissions.isAdmin) {
      return NextResponse.json(
        { error: 'Only administrators can whitelist MACs across all systems' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { mac, note, businessId, systems = ['ESP32', 'R710'] } = body

    if (!mac || !note) {
      return NextResponse.json(
        { error: 'MAC address and note are required' },
        { status: 400 }
      )
    }

    const normalizedMac = mac.toUpperCase().replace(/[:-]/g, ':')
    const results: any = {
      esp32: { success: false, message: 'Not attempted' },
      r710: { success: false, message: 'Not attempted' }
    }

    // Whitelist on ESP32 systems
    if (systems.includes('ESP32')) {
      try {
        // Get all ESP32 portal integrations
        const esp32Integrations = await prisma.portalIntegrations.findMany({
          where: businessId ? { businessId } : undefined
        })

        for (const integration of esp32Integrations) {
          if (!integration.apiUrl || !integration.apiKey) continue

          // Create database ACL entry
          await prisma.macAclEntry.create({
            data: {
              macAddress: normalizedMac.toLowerCase(),
              integrationId: integration.id,
              integrationSystem: 'ESP32',
              listType: 'WHITELIST',
              reason: note,
              businessId: businessId || integration.businessId,
              createdBy: session.user.id,
              approvedBy: session.user.id,
              isActive: true,
              expiresAt: null // VIP access never expires
            }
          })
        }

        results.esp32 = {
          success: true,
          message: `Whitelisted on ${esp32Integrations.length} ESP32 device(s)`
        }
      } catch (error) {
        console.error('Error whitelisting MAC on ESP32:', error)
        results.esp32 = {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }

    // Whitelist on R710 systems
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

          // Get or create a "VIP Devices" ACL list
          await sessionManager.withSession(
            {
              ipAddress: device.ipAddress,
              adminUsername: device.adminUsername,
              adminPassword
            },
            async (service) => {
              // List existing ACLs
              const aclLists = await service.listAclLists()
              let vipAcl = aclLists.find(
                (acl) => acl.name === 'VIP Devices' && acl.defaultMode === 'deny'
              )

              if (!vipAcl) {
                // Create "VIP Devices" ACL
                const createResult = await service.createAclList({
                  name: 'VIP Devices',
                  description: 'VIP devices with priority access',
                  mode: 'deny', // whitelist mode
                  macs: [{ mac: normalizedMac, macComment: note }]
                })

                if (createResult.success && createResult.aclId) {
                  // Create database entry
                  await prisma.macAclEntry.create({
                    data: {
                      macAddress: normalizedMac.toLowerCase(),
                      integrationId: createResult.aclId,
                      integrationSystem: 'R710',
                      listType: 'WHITELIST',
                      reason: note,
                      businessId: businessId || device.businesses[0]?.id,
                      createdBy: session.user.id,
                      approvedBy: session.user.id,
                      isActive: true,
                      expiresAt: null
                    }
                  })
                }
              } else {
                // Update existing ACL to add the MAC
                const updatedMacs = [
                  ...vipAcl.acceptMacs,
                  { mac: normalizedMac, macComment: note }
                ]

                await service.updateAclList(vipAcl.id, {
                  name: 'VIP Devices',
                  description: 'VIP devices with priority access',
                  mode: 'deny',
                  macs: updatedMacs
                })

                // Create database entry
                await prisma.macAclEntry.create({
                  data: {
                    macAddress: normalizedMac.toLowerCase(),
                    integrationId: vipAcl.id,
                    integrationSystem: 'R710',
                    listType: 'WHITELIST',
                    reason: note,
                    businessId: businessId || device.businesses[0]?.id,
                    createdBy: session.user.id,
                    approvedBy: session.user.id,
                    isActive: true,
                    expiresAt: null
                  }
                })
              }
            }
          )
        }

        results.r710 = {
          success: true,
          message: `Whitelisted on ${r710Devices.length} R710 device(s)`
        }
      } catch (error) {
        console.error('Error whitelisting MAC on R710:', error)
        results.r710 = {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }

    // Update device registry with VIP tag
    try {
      await prisma.deviceRegistry.update({
        where: { macAddress: normalizedMac.toLowerCase() },
        data: {
          tags: {
            push: 'VIP'
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
        note,
        systems: results
      }
    })
  } catch (error) {
    console.error('Error whitelisting MAC across systems:', error)
    return NextResponse.json(
      { error: 'Failed to whitelist MAC address' },
      { status: 500 }
    )
  }
}
