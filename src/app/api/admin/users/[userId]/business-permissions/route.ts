import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { BusinessPermissions } from '@/types/permissions'
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils'

interface BusinessPermissionUpdateRequest {
  businessId: string
  permissions: Partial<BusinessPermissions>
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
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
    const existingMembership = await prisma.businessMembership.findUnique({
      where: {
        userId_businessId: {
          userId,
          businessId
        }
      },
      include: {
        business: {
          select: { name: true }
        },
        permissionTemplate: {
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

    const updatedMembership = await prisma.businessMembership.update({
      where: {
        userId_businessId: {
          userId,
          businessId
        }
      },
      data: {
        permissions: sanitizedPermissions as any,
        lastAccessedAt: new Date()
      },
      include: {
        business: {
          select: { name: true }
        },
        permissionTemplate: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Permissions updated for ${updatedMembership.business?.name || existingMembership.businessId}` + (warning ? ` — ${warning}` : ''),
      membership: updatedMembership,
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