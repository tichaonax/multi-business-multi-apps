import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; accessId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { accountId, accessId } = await params
    const permissions = getEffectivePermissions(user)

    if (!permissions.canAccessExpenseAccount && user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins or managers can update access records' }, { status: 403 })
    }

    const existing = await prisma.expenseAccountUserAccess.findFirst({
      where: { id: accessId, accountId },
    })
    if (!existing) return NextResponse.json({ error: 'Access record not found' }, { status: 404 })

    const body = await request.json()
    const { canCreateRequests, canViewOwnOnly, canViewBalance, notes } = body

    const updated = await prisma.expenseAccountUserAccess.update({
      where: { id: accessId },
      data: {
        ...(canCreateRequests !== undefined ? { canCreateRequests } : {}),
        ...(canViewOwnOnly !== undefined ? { canViewOwnOnly } : {}),
        ...(canViewBalance !== undefined ? { canViewBalance } : {}),
        ...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        grantor: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error updating access record:', error)
    return NextResponse.json({ error: 'Failed to update access record' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ accountId: string; accessId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { accountId, accessId } = await params
    const permissions = getEffectivePermissions(user)

    if (!permissions.canAccessExpenseAccount && user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins or managers can revoke access' }, { status: 403 })
    }

    const existing = await prisma.expenseAccountUserAccess.findFirst({
      where: { id: accessId, accountId },
    })
    if (!existing) return NextResponse.json({ error: 'Access record not found' }, { status: 404 })

    const updated = await prisma.expenseAccountUserAccess.update({
      where: { id: accessId },
      data: { isActive: false, revokedAt: new Date() },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error revoking access:', error)
    return NextResponse.json({ error: 'Failed to revoke access' }, { status: 500 })
  }
}
