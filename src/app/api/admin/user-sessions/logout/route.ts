import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getSessionScope, filterManageableUsers, usersInScopeWhere } from '@/lib/user-session-access'
import { endSessions } from '@/lib/user-sessions'
import { emitToRoom } from '@/lib/customer-display/socket-server'
import { createAuditLog } from '@/lib/audit'

/**
 * MBM-351 — POST /api/admin/user-sessions/logout
 * Body: { sessionIds?: string[], userIds?: string[], everyone?: boolean, message?: string, delaySeconds?: number }
 *
 * Signs out the chosen sessions (or every session of the chosen users, or
 * everyone the caller may manage), after `delaySeconds` (0–600). Each screen
 * gets the message and countdown at once over its socket; the server refuses
 * the session once the time is up. Never signs out the caller.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const scope = getSessionScope(user)
    if (!scope) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json().catch(() => ({}))
    const sessionIds: string[] = Array.isArray(body.sessionIds) ? body.sessionIds.filter((x: any) => typeof x === 'string') : []
    const userIds: string[] = Array.isArray(body.userIds) ? body.userIds.filter((x: any) => typeof x === 'string') : []
    const everyone = body.everyone === true
    const message = typeof body.message === 'string' && body.message.trim() ? body.message.trim().slice(0, 500) : null
    const delaySeconds = Math.min(Math.max(Number(body.delaySeconds) || 0, 0), 600)
    if (!everyone && sessionIds.length === 0 && userIds.length === 0) {
      return NextResponse.json({ error: 'Choose who to sign out' }, { status: 400 })
    }

    const now = new Date()
    const live = await prisma.userSessions.findMany({
      where: {
        AND: [
          { OR: [{ endedAt: null }, { endedAt: { gt: now } }] },
          { user: usersInScopeWhere(scope) },
          ...(everyone ? [] : [{
            OR: [
              ...(sessionIds.length ? [{ id: { in: sessionIds } }] : []),
              ...(userIds.length ? [{ userId: { in: userIds } }] : []),
            ],
          }]),
        ],
      },
      select: { id: true, userId: true },
    })
    const allowedUsers = new Set(await filterManageableUsers(user, scope, live.map(s => s.userId)))
    const targets = live.filter(s => allowedUsers.has(s.userId)).map(s => s.id)

    const ended = await endSessions(targets, { reason: 'FORCED', endedBy: user.id, message, delaySeconds })
    for (const s of ended) {
      try {
        emitToRoom(`session:${s.id}`, 'session:force-logout', {
          sessionId: s.id, endsAt: s.endsAt.toISOString(), message, byName: user.name, reason: 'FORCED',
        })
      } catch { /* socket server not running — the screen's 30 s check picks it up */ }
    }

    const affectedUsers = [...new Set(ended.map(s => s.userId))]
    await createAuditLog({
      userId: user.id,
      action: 'USER_SESSIONS_SIGNED_OUT',
      entityType: 'User',
      entityId: affectedUsers.length === 1 ? affectedUsers[0] : 'multiple',
      metadata: {
        scope: everyone ? 'everyone' : userIds.length ? 'users' : 'sessions',
        sessionCount: ended.length,
        userIds: affectedUsers,
        message,
        delaySeconds,
      },
    })

    return NextResponse.json({ success: true, signedOut: ended.length, users: affectedUsers.length })
  } catch (error) {
    console.error('[admin/user-sessions/logout] Error:', error)
    return NextResponse.json({ error: 'Failed to sign out' }, { status: 500 })
  }
}
