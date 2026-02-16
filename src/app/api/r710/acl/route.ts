import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { getR710SessionManager } from '@/lib/r710-session-manager'
import { decrypt } from '@/lib/encryption'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/r710/acl
 * List all R710 MAC ACL lists
 *
 * Query params:
 * - businessId: Filter by business (optional)
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    // Get R710 integration for the business
    const integration = await prisma.r710DeviceRegistry.findFirst({
      where: businessId ? {
        businesses: {
          some: { id: businessId }
        }
      } : undefined,
      include: {
        businesses: true
      }
    })

    if (!integration) {
      return NextResponse.json(
        { error: 'No R710 integration found' },
        { status: 404 }
      )
    }

    // Decrypt credentials
    const adminPassword = decrypt(integration.adminPasswordEncrypted)

    // Get R710 session and fetch ACL lists
    const sessionManager = getR710SessionManager()
    const aclLists = await sessionManager.withSession(
      {
        ipAddress: integration.ipAddress,
        adminUsername: integration.adminUsername,
        adminPassword
      },
      async (service) => {
        return await service.listAclLists()
      }
    )

    // Get database ACL entries for these lists
    const dbEntries = await prisma.macAclEntry.findMany({
      where: {
        integrationSystem: 'R710',
        businessId: businessId || undefined
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Map database entries by MAC address
    const dbEntriesMap = new Map(
      dbEntries.map((e) => [e.macAddress.toLowerCase(), e])
    )

    // Merge R710 data with database entries
    const enrichedAclLists = aclLists.map((acl) => {
      const denyMacs = acl.denyMacs.map((mac) => {
        const dbEntry = dbEntriesMap.get(mac.mac.toLowerCase())
        return {
          ...mac,
          businessId: dbEntry?.businessId,
          createdBy: dbEntry?.creator,
          createdAt: dbEntry?.createdAt
        }
      })

      const acceptMacs = acl.acceptMacs.map((mac) => {
        const dbEntry = dbEntriesMap.get(mac.mac.toLowerCase())
        return {
          ...mac,
          businessId: dbEntry?.businessId,
          createdBy: dbEntry?.creator,
          createdAt: dbEntry?.createdAt
        }
      })

      return {
        ...acl,
        denyMacs,
        acceptMacs,
        ipAddress: integration.ipAddress
      }
    })

    return NextResponse.json({
      success: true,
      data: enrichedAclLists
    })
  } catch (error) {
    console.error('Error fetching R710 ACL lists:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ACL lists' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/r710/acl
 * Create a new R710 MAC ACL list
 *
 * Body:
 * - businessId: Business ID (required)
 * - name: ACL name (required)
 * - description: ACL description (required)
 * - mode: 'deny' (whitelist) or 'allow' (blacklist) (required)
 * - macs: Array of { mac, macComment? } (optional)
 */
export async function POST(request: NextRequest) {
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

    // Create ACL list on R710 device
    const sessionManager = getR710SessionManager()
    const result = await sessionManager.withSession(
      {
        ipAddress: integration.ipAddress,
        adminUsername: integration.adminUsername,
        adminPassword
      },
      async (service) => {
        return await service.createAclList({
          name,
          description,
          mode,
          macs
        })
      }
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create ACL list' },
        { status: 400 }
      )
    }

    // Create database MacAclEntry records for each MAC
    const createdEntries = []
    for (const macEntry of macs) {
      try {
        const entry = await prisma.macAclEntry.create({
          data: {
            macAddress: macEntry.mac.toLowerCase(),
            integrationId: result.aclId!,
            integrationSystem: 'R710',
            listType: mode === 'deny' ? 'WHITELIST' : 'BLACKLIST',
            reason: macEntry.macComment || `Added to ${name}`,
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
        aclId: result.aclId,
        name,
        description,
        mode,
        macCount: macs.length,
        dbEntriesCreated: createdEntries.length
      }
    })
  } catch (error) {
    console.error('Error creating R710 ACL list:', error)
    return NextResponse.json(
      { error: 'Failed to create ACL list' },
      { status: 500 }
    )
  }
}
