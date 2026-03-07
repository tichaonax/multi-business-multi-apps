import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'

/**
 * GET /api/petty-cash/my-permissions
 * Returns { canRequest: boolean, canApprove: boolean } for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (isSystemAdmin(user)) {
      return NextResponse.json({ canRequest: true, canApprove: true })
    }

    const perms = await prisma.userPermissions.findMany({
      where: {
        userId: user.id,
        granted: true,
        permission: { name: { in: ['petty_cash.request', 'petty_cash.approve'] } },
      },
      include: { permission: true },
    })

    const names = perms.map((p: any) => p.permission.name)
    return NextResponse.json({
      canRequest: names.includes('petty_cash.request'),
      canApprove: names.includes('petty_cash.approve'),
    })
  } catch (err) {
    console.error('[my-permissions GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
