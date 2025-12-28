import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { getR710SessionManager } from '@/lib/r710-session-manager'
import { decrypt } from '@/lib/encryption'

/**
 * DELETE /api/admin/mac-acl/[mac]
 * Remove a MAC address from all ACLs across all WiFi systems
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ mac: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions (admin only for cross-system removal)
    const permissions = getEffectivePermissions(session.user)
    if (!permissions.isAdmin) {
      return NextResponse.json(
        { error: 'Only administrators can remove MACs from all systems' },
        { status: 403 }
      )
    }

    const { mac } = await context.params
    const normalizedMac = mac.toUpperCase().replace(/[:-]/g, ':')

    const results: any = {
      esp32: { success: false, message: 'Not attempted', removed: 0 },
      r710: { success: false, message: 'Not attempted', removed: 0 },
      database: { success: false, message: 'Not attempted', removed: 0 }
    }

    // Get all ACL entries for this MAC
    const aclEntries = await prisma.macAclEntry.findMany({
      where: {
        macAddress: normalizedMac.toLowerCase()
      }
    })

    // Remove from ESP32 systems
    const esp32Entries = aclEntries.filter((e) => e.integrationSystem === 'ESP32')
    if (esp32Entries.length > 0) {
      try {
        for (const entry of esp32Entries) {
          const integration = await prisma.portalIntegrations.findUnique({
            where: { id: entry.integrationId }
          })

          if (!integration?.apiUrl || !integration?.apiKey) continue

          // Call ESP32 remove API
          const formData = new URLSearchParams({
            api_key: integration.apiKey,
            mac: normalizedMac,
            list: 'both'
          })

          await fetch(`${integration.apiUrl}/api/mac/remove`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
          })
        }

        results.esp32 = {
          success: true,
          message: `Removed from ${esp32Entries.length} ESP32 device(s)`,
          removed: esp32Entries.length
        }
      } catch (error) {
        console.error('Error removing MAC from ESP32:', error)
        results.esp32 = {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error',
          removed: 0
        }
      }
    } else {
      results.esp32 = {
        success: true,
        message: 'No ESP32 entries found',
        removed: 0
      }
    }

    // Remove from R710 systems
    const r710Entries = aclEntries.filter((e) => e.integrationSystem === 'R710')
    if (r710Entries.length > 0) {
      try {
        // Group by integration ID (ACL list ID)
        const entriesByAcl = new Map<string, typeof r710Entries>()
        for (const entry of r710Entries) {
          const existing = entriesByAcl.get(entry.integrationId) || []
          existing.push(entry)
          entriesByAcl.set(entry.integrationId, existing)
        }

        for (const [aclId, entries] of entriesByAcl) {
          const businessId = entries[0].businessId
          if (!businessId) continue

          // Get R710 device
          const device = await prisma.r710DeviceRegistry.findFirst({
            where: {
              businesses: {
                some: { id: businessId }
              }
            }
          })

          if (!device) continue

          const adminPassword = decrypt(device.adminPasswordEncrypted)
          const sessionManager = getR710SessionManager()

          await sessionManager.withSession(
            {
              ipAddress: device.ipAddress,
              adminUsername: device.adminUsername,
              adminPassword
            },
            async (service) => {
              // Get current ACL
              const aclLists = await service.listAclLists()
              const acl = aclLists.find((a) => a.id === aclId)

              if (!acl) return

              // Remove the MAC from both deny and accept lists
              const updatedDenyMacs = acl.denyMacs.filter(
                (m) => m.mac !== normalizedMac
              )
              const updatedAcceptMacs = acl.acceptMacs.filter(
                (m) => m.mac !== normalizedMac
              )

              // Update ACL
              await service.updateAclList(aclId, {
                name: acl.name,
                description: acl.description,
                mode: acl.defaultMode === 'deny' ? 'deny' : 'allow',
                macs: acl.defaultMode === 'deny' ? updatedAcceptMacs : updatedDenyMacs
              })
            }
          )
        }

        results.r710 = {
          success: true,
          message: `Removed from ${r710Entries.length} R710 ACL(s)`,
          removed: r710Entries.length
        }
      } catch (error) {
        console.error('Error removing MAC from R710:', error)
        results.r710 = {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error',
          removed: 0
        }
      }
    } else {
      results.r710 = {
        success: true,
        message: 'No R710 entries found',
        removed: 0
      }
    }

    // Remove from database
    try {
      const deleteResult = await prisma.macAclEntry.deleteMany({
        where: {
          macAddress: normalizedMac.toLowerCase()
        }
      })

      results.database = {
        success: true,
        message: `Removed ${deleteResult.count} database entry(ies)`,
        removed: deleteResult.count
      }
    } catch (error) {
      console.error('Error removing MAC from database:', error)
      results.database = {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        removed: 0
      }
    }

    // Remove tags from device registry
    try {
      await prisma.deviceRegistry.update({
        where: { macAddress: normalizedMac.toLowerCase() },
        data: {
          tags: []
        }
      })
    } catch (error) {
      // Device might not exist in registry, that's okay
    }

    const overallSuccess = results.esp32.success && results.r710.success && results.database.success

    return NextResponse.json({
      success: overallSuccess,
      data: {
        mac: normalizedMac,
        results
      }
    })
  } catch (error) {
    console.error('Error removing MAC from all ACLs:', error)
    return NextResponse.json(
      { error: 'Failed to remove MAC from all ACLs' },
      { status: 500 }
    )
  }
}
