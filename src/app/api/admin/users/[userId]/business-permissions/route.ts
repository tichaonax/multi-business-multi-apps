import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BusinessPermissions } from '@/types/permissions'
import { isSystemAdmin, SessionUser, hasPermission } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'
import { createAuditLog } from '@/lib/audit'

interface BusinessPermissionUpdateRequest {
  businessId: string
  permissions: Partial<BusinessPermissions>
}

/**
 * GET /api/admin/users/[userId]/business-permissions
 *
 * Fetch a user's permissions across all their business memberships.
 * Used for cloning permissions when creating new users.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = user as SessionUser
    const { userId } = await params

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Only system admins or users with canManageBusinessUsers permission can view permissions
    if (!isSystemAdmin(currentUser)) {
      const userMembership = await prisma.businessMemberships.findFirst({
        where: {
          userId: user.id,
          isActive: true,
        },
      })

      if (!userMembership) {
        return NextResponse.json({ error: 'No business access' }, { status: 403 })
      }

      const permissions = userMembership.permissions as any
      if (!permissions.canManageBusinessUsers) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    // Get the target user and their business memberships
    const targetUser = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        business_memberships: {
          where: { isActive: true },
          select: {
            id: true,
            businessId: true,
            role: true,
            permissions: true,
            templateId: true,
            businesses: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
            permission_templates: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Transform for frontend consumption
    const response = {
      userId: targetUser.id,
      userName: targetUser.name,
      userEmail: targetUser.email,
      systemRole: targetUser.role,
      businessPermissions: targetUser.business_memberships.map((membership) => ({
        businessId: membership.businessId,
        businessName: membership.businesses?.name || 'Unknown Business',
        businessType: membership.businesses?.type || 'other',
        role: membership.role,
        permissions: membership.permissions as Partial<BusinessPermissions>,
        templateId: membership.templateId,
        templateName: membership.permission_templates?.name || null,
      })),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching user permissions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user permissions' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { userId } = await params

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Only system admins can update business permissions
    if (!isSystemAdmin(user)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { businessId, permissions }: BusinessPermissionUpdateRequest = await req.json()

    // Validate required fields
    if (!businessId || !permissions) {
      return NextResponse.json(
        { error: 'Business ID and permissions are required' },
        { status: 400 }
      )
    }

    // Check if business membership exists
    const existingMembership = await prisma.businessMemberships.findUnique({
      where: {
        userId_businessId: {
          userId,
          businessId
        }
      },
      include: {
        businesses: {
          select: { name: true }
        },
        permission_templates: {
          select: { id: true, name: true }
        }
      }
    })

    if (!existingMembership) {
      return NextResponse.json(
        { error: 'Business membership not found' },
        { status: 404 }
      )
    }

    // Update the business membership permissions
    // Enforce: canResetExportedPayrollToPreview may only be granted to business-manager or business-owner roles
    const role = existingMembership.role
    const sanitizedPermissions = { ...permissions } as Partial<typeof permissions>
    let warning: string | undefined
    if (sanitizedPermissions.canResetExportedPayrollToPreview) {
      if (!(role === 'business-manager' || role === 'business-owner')) {
        // Strip the flag to prevent non-managers from receiving it
        delete (sanitizedPermissions as any).canResetExportedPayrollToPreview
        warning = 'canResetExportedPayrollToPreview is reserved for manager/owner roles and was removed from the provided permissions'
      }
    }

    console.log('Updating permissions for user:', userId, 'business:', businessId)
    console.log('Sanitized permissions:', sanitizedPermissions)

    const updatedMembership = await prisma.businessMemberships.update({
      where: {
        userId_businessId: {
          userId,
          businessId
        }
      },
      data: {
        permissions: sanitizedPermissions as any,
        lastAccessedAt: new Date()
      }
    })

    const businessName = existingMembership.businesses?.name || existingMembership.businessId
    console.log('Permissions updated successfully for:', businessName)

    // Diff only the keys that actually changed — the full permissions object
    // has 60+ boolean flags, most of which are untouched by any given edit.
    const oldPermissions = (existingMembership.permissions as Record<string, unknown>) || {}
    const changedOld: Record<string, unknown> = {}
    const changedNew: Record<string, unknown> = {}
    for (const [key, newVal] of Object.entries(sanitizedPermissions)) {
      if (oldPermissions[key] !== newVal) {
        changedOld[key] = oldPermissions[key] ?? false
        changedNew[key] = newVal
      }
    }
    if (Object.keys(changedNew).length > 0) {
      await createAuditLog({
        userId: user.id,
        action: 'PERMISSION_CHANGED',
        entityType: 'BusinessMembership',
        entityId: updatedMembership.id,
        oldValues: changedOld,
        newValues: changedNew,
        metadata: { businessId, businessName, targetUserId: userId },
      }).catch(err => console.error('[business-permissions PATCH] audit log error (non-blocking):', err))
    }

    return NextResponse.json({
      success: true,
      message: `Permissions updated for ${businessName}` + (warning ? ` — ${warning}` : ''),
      warning
    })

  } catch (error) {
    console.error('Error updating business permissions:', error)
    return NextResponse.json(
      { error: 'Failed to update business permissions' },
      { status: 500 }
    )
  }
}