import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { getR710SessionManager } from '@/lib/r710-session-manager'
import { decrypt } from '@/lib/encryption'
import { getServerUser } from '@/lib/get-server-user'

/**
 * PUT /api/r710/acl/[id]
 * Update an existing R710 MAC ACL list
 *
 * Body:
 * - businessId: Business ID (required)
 * - name: ACL name (required)
 * - description: ACL description (required)
 * - mode: 'deny' (whitelist) or 'allow' (blacklist) (required)
 * - macs: Array of { mac, macComment? } (required)
 */
export async function PUT(
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
    const { businessId, name, description, mode, macs = [] } = body

    if (!businessId || !name || !description || !mode) {
      return NextResponse.json(
        { error: 'businessId, name, description, and mode are required' },
        { status: 400 }
      )
    }

    if (mode !== 'deny' && mode !== 'allow') {
      return NextResponse.json(
        { error: 'mode must be "deny" (whitelist) or "allow" (blacklist)' },
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

    // Update ACL list on R710 device
    const sessionManager = getR710SessionManager()
    const result = await sessionManager.withSession(
      {
        ipAddress: integration.ipAddress,
        adminUsername: integration.adminUsername,
        adminPassword
      },
      async (service) => {
        return await service.updateAclList(aclId, {
          name,
          description,
          mode,
          macs
        })
      }
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update ACL list' },
        { status: 400 }
      )
    }

    // Remove old database entries for this ACL
    await prisma.macAclEntry.deleteMany({
      where: {
        integrationId: aclId,
        integrationSystem: 'R710'
      }
    })

    // Create new database MacAclEntry records for each MAC
    const createdEntries = []
    for (const macEntry of macs) {
      try {
        const entry = await prisma.macAclEntry.create({
          data: {
            macAddress: macEntry.mac.toLowerCase(),
            integrationId: aclId,
            integrationSystem: 'R710',
            listType: mode === 'deny' ? 'WHITELIST' : 'BLACKLIST',
            reason: macEntry.macComment || `Updated in ${name}`,
            businessId,
            createdBy: user.id,
            approvedBy: user.id,
            isActive: true
          }
        })
        createdEntries.push(entry)
      } catch (error) {
        console.error(`Failed to create ACL entry for MAC ${macEntry.mac}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        aclId,
        name,
        description,
        mode,
        macCount: macs.length,
        dbEntriesCreated: createdEntries.length
      }
    })
  } catch (error) {
    console.error('Error updating R710 ACL list:', error)
    return NextResponse.json(
      { error: 'Failed to update ACL list' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/r710/acl/[id]
 * Delete an R710 MAC ACL list
 */
export async function DELETE(
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
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
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

    // Delete ACL list from R710 device
    const sessionManager = getR710SessionManager()
    const result = await sessionManager.withSession(
      {
        ipAddress: integration.ipAddress,
        adminUsername: integration.adminUsername,
        adminPassword
      },
      async (service) => {
        return await service.deleteAclList(aclId)
      }
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to delete ACL list' },
        { status: 400 }
      )
    }

    // Delete database MacAclEntry records
    const deleteResult = await prisma.macAclEntry.deleteMany({
      where: {
        integrationId: aclId,
        integrationSystem: 'R710'
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        aclId,
        dbEntriesDeleted: deleteResult.count
      }
    })
  } catch (error) {
    console.error('Error deleting R710 ACL list:', error)
    return NextResponse.json(
      { error: 'Failed to delete ACL list' },
      { status: 500 }
    )
  }
}
