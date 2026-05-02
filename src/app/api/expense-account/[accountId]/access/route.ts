import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { accountId } = await params
    const permissions = getEffectivePermissions(user)

    if (!permissions.canAccessExpenseAccount && user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins or managers can view access records' }, { status: 403 })
    }

    const accesses = await prisma.expenseAccountUserAccess.findMany({
      where: { accountId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        grantor: { select: { id: true, name: true } },
      },
      orderBy: { grantedAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: accesses })
  } catch (error) {
    console.error('Error fetching access records:', error)
    return NextResponse.json({ error: 'Failed to fetch access records' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { accountId } = await params
    const permissions = getEffectivePermissions(user)

    if (!permissions.canAccessExpenseAccount && user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins or managers can grant access' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, canCreateRequests = true, canViewOwnOnly = true, canViewBalance = false, notes } = body

    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

    // Upsert: if a record already exists (possibly revoked), reactivate it
    const existing = await prisma.expenseAccountUserAccess.findUnique({
      where: { accountId_userId: { accountId, userId } },
    })

    let accessRecord
    if (existing) {
      accessRecord = await prisma.expenseAccountUserAccess.update({
        where: { accountId_userId: { accountId, userId } },
        data: {
          canCreateRequests,
          canViewOwnOnly,
          canViewBalance,
          isActive: true,
          revokedAt: null,
          grantedBy: user.id,
          grantedAt: new Date(),
          notes: notes?.trim() || null,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          grantor: { select: { id: true, name: true } },
        },
      })
    } else {
      accessRecord = await prisma.expenseAccountUserAccess.create({
        data: {
          accountId,
          userId,
          canCreateRequests,
          canViewOwnOnly,
          canViewBalance,
          grantedBy: user.id,
          notes: notes?.trim() || null,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          grantor: { select: { id: true, name: true } },
        },
      })
    }

    return NextResponse.json({ success: true, data: accessRecord }, { status: 201 })
  } catch (error) {
    console.error('Error granting access:', error)
    return NextResponse.json({ error: 'Failed to grant access' }, { status: 500 })
  }
}
