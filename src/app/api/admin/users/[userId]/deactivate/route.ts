import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin } from '@/lib/permission-utils'

import { randomBytes } from 'crypto';
import { getServerUser } from '@/lib/get-server-user'
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
)
 {

  try {
    const { userId } = await params
    const user = await getServerUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const { reason, notes, deactivatedBy, confirmedEmail, confirmationPhrase } = await req.json()

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json({ error: 'Deactivation reason is required' }, { status: 400 })
    }

    // Check if current user has permission to deactivate users
    if (!isSystemAdmin(user)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get the user to be deactivated
    const userToDeactivate = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        business_memberships: {
          include: {
            businesses: true
          }
        }
      }
    })

    if (!userToDeactivate) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!userToDeactivate.isActive) {
      return NextResponse.json({ error: 'User is already deactivated' }, { status: 400 })
    }

    // Admin accounts get extra safeguards (last-active-admin protection + a
    // typed confirmation), matching what the frontend's admin-deactivation
    // wizard walks through - enforced here too since a client-side-only
    // check is never a real guarantee. Regular (non-admin) users are
    // completely unaffected by any of this - existing single-step flow.
    if (userToDeactivate.role === 'admin') {
      const otherActiveAdmins = await prisma.users.count({
        where: { role: 'admin', isActive: true, id: { not: userId } }
      })
      if (otherActiveAdmins === 0) {
        return NextResponse.json(
          { error: 'Cannot deactivate the last active admin account. Create or reactivate another admin account first.' },
          { status: 409 }
        )
      }

      if (typeof confirmedEmail !== 'string' || confirmedEmail.trim().toLowerCase() !== userToDeactivate.email.toLowerCase()) {
        return NextResponse.json(
          { error: 'Confirmed email does not match the account being deactivated' },
          { status: 400 }
        )
      }

      if (confirmationPhrase !== 'DEACTIVATE ADMIN') {
        return NextResponse.json(
          { error: 'Confirmation phrase does not match' },
          { status: 400 }
        )
      }
    }

    // Deactivate user and their business memberships
    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
        deactivatedBy,
        deactivationReason: reason.trim(),
        deactivationNotes: notes?.trim() || null,
        business_memberships: {
          updateMany: {
            where: {},
            data: {
              isActive: false
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

    // Log the deactivation for audit purposes
    await prisma.auditLogs.create({
      data: {
        action: 'USER_DEACTIVATED',
        entityType: 'User',
        entityId: userId,
        userId: deactivatedBy,
        details: {
          reason: reason.trim(),
          notes: notes?.trim(),
          deactivatedUser: {
            id: userToDeactivate.id,
            name: userToDeactivate.name,
            email: userToDeactivate.email
          }
        }
      }
    }).catch(error => {
      console.error('Failed to create audit log:', error)
      // Don't fail the request if audit logging fails
    })

    return NextResponse.json({
      message: 'User deactivated successfully',
      user: updatedUser
    })

  } catch (error) {
    console.error('Error deactivating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}