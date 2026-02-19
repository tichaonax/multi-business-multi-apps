import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/expense-account/[accountId]/grants
 * List all access grants for this account (admin only)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

    const { accountId } = await params

    const grants = await prisma.expenseAccountGrants.findMany({
      where: { expenseAccountId: accountId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        grantor: { select: { id: true, name: true } },
      },
      orderBy: { grantedAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: grants.map((g: any) => ({
        id: g.id,
        userId: g.userId,
        userName: g.user.name,
        userEmail: g.user.email,
        permissionLevel: g.permissionLevel,
        grantedAt: g.grantedAt.toISOString(),
        grantedByName: g.grantor.name,
      })),
    })
  } catch (error) {
    console.error('Error fetching grants:', error)
    return NextResponse.json({ error: 'Failed to fetch grants' }, { status: 500 })
  }
}

/**
 * POST /api/expense-account/[accountId]/grants
 * Add an access grant (admin only)
 * Body: { userId: string, permissionLevel: 'VIEW' | 'FULL' }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

    const { accountId } = await params
    const body = await request.json()
    const { userId, permissionLevel = 'FULL' } = body

    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    if (!['VIEW', 'FULL'].includes(permissionLevel)) {
      return NextResponse.json({ error: 'permissionLevel must be VIEW or FULL' }, { status: 400 })
    }

    // Check account exists
    const account = await prisma.expenseAccounts.findUnique({
      where: { id: accountId },
      select: { id: true },
    })
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

    // Check target user exists
    const targetUser = await prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    })
    if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Upsert — update permission level if grant already exists
    const grant = await prisma.expenseAccountGrants.upsert({
      where: { expenseAccountId_userId: { expenseAccountId: accountId, userId } },
      create: { expenseAccountId: accountId, userId, grantedBy: user.id, permissionLevel },
      update: { permissionLevel, grantedBy: user.id, grantedAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: grant.id,
        userId: grant.userId,
        userName: targetUser.name,
        userEmail: targetUser.email,
        permissionLevel: grant.permissionLevel,
        grantedAt: grant.grantedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Error creating grant:', error)
    return NextResponse.json({ error: 'Failed to create grant' }, { status: 500 })
  }
}

/**
 * DELETE /api/expense-account/[accountId]/grants?userId=xxx
 * Revoke an access grant (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

    const { accountId } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) return NextResponse.json({ error: 'userId query param required' }, { status: 400 })

    await prisma.expenseAccountGrants.delete({
      where: { expenseAccountId_userId: { expenseAccountId: accountId, userId } },
    })

    return NextResponse.json({ success: true, message: 'Grant revoked' })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Grant not found' }, { status: 404 })
    }
    console.error('Error revoking grant:', error)
    return NextResponse.json({ error: 'Failed to revoke grant' }, { status: 500 })
  }
}
