import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getSessionScope, filterManageableUsers, usersInScopeWhere } from '@/lib/user-session-access'
import { closeExpiredSessions } from '@/lib/user-sessions'

/**
 * MBM-351 — GET /api/admin/user-sessions?view=active|suspended|history|users
 *
 *  active:    sessions signed in now (including ones counting down to a sign-out)
 *  suspended: suspended users
 *  history:   the last 200 sessions that ended
 *
 * Limited to the users the caller may manage (see user-session-access.ts);
 * each row says whether the caller can act on it (`canManage`).
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const scope = getSessionScope(user)
    if (!scope) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const view = request.nextUrl.searchParams.get('view') || 'active'
    const userWhere = usersInScopeWhere(scope)
    const now = new Date()

    const userSelect = {
      id: true, name: true, email: true, role: true,
      business_memberships: {
        where: { isActive: true },
        select: { role: true, businesses: { select: { id: true, name: true } } },
      },
    } as const
    const businessesOf = (u: { business_memberships: { role: string; businesses: { id: string; name: string } }[] }) =>
      u.business_memberships
        .filter(m => scope.isAdmin || scope.businessIds.includes(m.businesses.id))
        .map(m => ({ id: m.businesses.id, name: m.businesses.name, role: m.role }))

    // Users the caller may suspend (for "Suspend a user…" on the Suspended tab)
    if (view === 'users') {
      const users = await prisma.users.findMany({
        where: { ...userWhere, isSuspended: false, isActive: true },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
      })
      const manageable = new Set(await filterManageableUsers(user, scope, users.map(u => u.id), { forSuspend: true }))
      return NextResponse.json({ success: true, users: users.filter(u => manageable.has(u.id)) })
    }

    if (view === 'suspended') {
      const users = await prisma.users.findMany({
        where: { ...userWhere, isSuspended: true },
        select: { ...userSelect, suspendedAt: true, suspendedBy: true, suspensionReason: true },
        orderBy: { suspendedAt: 'desc' },
      })
      const byIds = [...new Set(users.map(u => u.suspendedBy).filter(Boolean) as string[])]
      const byUsers = await prisma.users.findMany({ where: { id: { in: byIds } }, select: { id: true, name: true } })
      const byName = new Map(byUsers.map(b => [b.id, b.name]))
      const manageable = new Set(await filterManageableUsers(user, scope, users.map(u => u.id), { forSuspend: true }))
      return NextResponse.json({
        success: true,
        users: users.map(u => ({
          id: u.id, name: u.name, email: u.email, role: u.role,
          businesses: businessesOf(u),
          suspendedAt: u.suspendedAt, suspensionReason: u.suspensionReason,
          suspendedByName: u.suspendedBy ? byName.get(u.suspendedBy) ?? null : null,
          canManage: manageable.has(u.id),
        })),
      })
    }

    await closeExpiredSessions()

    const sessions = await prisma.userSessions.findMany({
      where: view === 'history'
        ? { endedAt: { lte: now }, user: userWhere }
        : { OR: [{ endedAt: null }, { endedAt: { gt: now } }], user: userWhere },
      include: { user: { select: userSelect } },
      orderBy: view === 'history' ? { endedAt: 'desc' } : { loginAt: 'desc' },
      take: view === 'history' ? 200 : 1000,
    })
    const enderIds = [...new Set(sessions.map(s => s.endedBy).filter(Boolean) as string[])]
    const enders = await prisma.users.findMany({ where: { id: { in: enderIds } }, select: { id: true, name: true } })
    const enderName = new Map(enders.map(e => [e.id, e.name]))
    const manageable = new Set(await filterManageableUsers(user, scope, sessions.map(s => s.userId)))
    const mySessionId = (request.headers.get('x-mbm-session-id') || '').slice(0, 200)

    return NextResponse.json({
      success: true,
      sessions: sessions.map(s => ({
        id: s.id,
        user: { id: s.user.id, name: s.user.name, email: s.user.email, role: s.user.role },
        businesses: businessesOf(s.user),
        loginAt: s.loginAt,
        lastSeenAt: s.lastSeenAt,
        ipAddress: s.ipAddress,
        deviceLabel: s.deviceLabel,
        hostname: s.hostname,
        endedAt: s.endedAt,
        endReason: s.endReason,
        endMessage: s.endMessage,
        endedByName: s.endedBy ? enderName.get(s.endedBy) ?? null : null,
        isMe: s.userId === user.id,
        isThisSession: !!mySessionId && s.id === mySessionId,
        canManage: manageable.has(s.userId),
      })),
    })
  } catch (error) {
    console.error('[admin/user-sessions] Error:', error)
    return NextResponse.json({ error: 'Failed to load sessions' }, { status: 500 })
  }
}
