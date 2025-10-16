import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin } from '@/lib/permission-utils'

import { randomBytes } from 'crypto';
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
)
 {

    const { userId } = await params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { userId } = await params
    const { reactivatedBy, notes } = await req.json()

    // Check if current user has permission to reactivate users
    if (!isSystemAdmin(session.user)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get the user to be reactivated
    const userToReactivate = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        business_memberships: {
          include: {
            businesses: true
          }
        }
      }
    })

    if (!userToReactivate) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (userToReactivate.isActive) {
      return NextResponse.json({ error: 'User is already active' }, { status: 400 })
    }

    // Reactivate user and their business memberships
    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: {
        isActive: true,
        reactivatedAt: new Date(),
        reactivatedBy,
        reactivationNotes: notes || null,
        // Clear deactivation fields
        deactivatedAt: null,
        deactivatedBy: null,
        deactivationReason: null,
        deactivationNotes: null,
        businessMemberships: {
          updateMany: {
            where: {},
            data: {
              isActive: true,
              updatedAt: new Date()
            }
          }
        }
      },
      include: {
        business_memberships: {
          include: {
            businesses: true
          }
        }
      }
    })

    // Log the reactivation for audit purposes
    await prisma.auditLogs.create({
      data: {
        action: 'USER_REACTIVATED',
        entityType: 'User',
        entityId: userId,
        userId: reactivatedBy,
        details: {
          notes,
          reactivatedUser: {
            id: userToReactivate.id,
            name: userToReactivate.name,
            email: userToReactivate.email
          }
        }
      }
    }).catch(error => {
      console.error('Failed to create audit log:', error)
      // Don't fail the request if audit logging fails
    })

    return NextResponse.json({
      message: 'User reactivated successfully',
      user: updatedUser
    })

  } catch (error) {
    console.error('Error reactivating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}