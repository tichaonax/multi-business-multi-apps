import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'

/**
 * GET /api/admin/petty-cash-permissions
 * Returns all users with their petty_cash.request and petty_cash.approve permission status.
 * Admin only.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user || !isSystemAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const SYSTEM_PERMS = ['petty_cash.request', 'petty_cash.approve', 'cash_allocation.approve']

    // Get permission IDs
    const permissions = await prisma.permissions.findMany({
      where: { name: { in: SYSTEM_PERMS } },
    })
    const permMap: Record<string, string> = {}
    permissions.forEach((p: any) => { permMap[p.name] = p.id })

    // Get all users
    const users = await prisma.users.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    })

    // Get all granted system user permissions
    const granted = await prisma.userPermissions.findMany({
      where: {
        granted: true,
        permission: { name: { in: SYSTEM_PERMS } },
      },
      include: { permission: true },
    })

    const grantedSet = new Set(granted.map((g: any) => `${g.userId}:${g.permission.name}`))

    const result = users.map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      canRequest: grantedSet.has(`${u.id}:petty_cash.request`),
      canApprove: grantedSet.has(`${u.id}:petty_cash.approve`),
      canApproveCashAllocation: grantedSet.has(`${u.id}:cash_allocation.approve`),
    }))

    return NextResponse.json({ users: result, permMap })
  } catch (err) {
    console.error('[petty-cash-permissions GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/petty-cash-permissions
 * Grant or revoke a petty cash permission for a user.
 * Body: { userId, permissionName, grant: boolean }
 * Admin only.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user || !isSystemAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, permissionName, grant } = body

    if (!userId || !permissionName || typeof grant !== 'boolean') {
      return NextResponse.json({ error: 'userId, permissionName, and grant (boolean) are required' }, { status: 400 })
    }

    if (!['petty_cash.request', 'petty_cash.approve', 'cash_allocation.approve'].includes(permissionName)) {
      return NextResponse.json({ error: 'Invalid permission name' }, { status: 400 })
    }

    const permission = await prisma.permissions.findFirst({ where: { name: permissionName } })
    if (!permission) {
      return NextResponse.json({ error: 'Permission not found in DB' }, { status: 404 })
    }

    if (grant) {
      // Upsert — grant the permission
      await prisma.userPermissions.upsert({
        where: { userId_permissionId: { userId, permissionId: permission.id } },
        create: { userId, permissionId: permission.id, granted: true, grantedBy: user.id },
        update: { granted: true, grantedBy: user.id },
      })
    } else {
      // Revoke — delete the record if it exists
      await prisma.userPermissions.deleteMany({
        where: { userId, permissionId: permission.id },
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[petty-cash-permissions POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
