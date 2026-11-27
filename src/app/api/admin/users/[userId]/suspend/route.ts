import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getSessionScope, filterManageableUsers } from '@/lib/user-session-access'
import { endSessions, forgetUser } from '@/lib/user-sessions'
import { emitToRoom } from '@/lib/customer-display/socket-server'
import { createAuditLog } from '@/lib/audit'

/**
 * MBM-351 — suspend a user (POST) or lift the suspension (DELETE).
 *
 * POST body: { reason: string, message?: string }
 * Suspending signs the user out of every workstation at once and blocks
 * sign-in (src/lib/auth.ts) until a manager/admin lifts it. Kept separate from
 * deactivation, so lifting it restores the user exactly as they were.
 */
type Ctx = { params: Promise<{ userId: string }> }

async function authorise(userId: string) {
  const actor = await getServerUser()
  if (!actor) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const scope = getSessionScope(actor)
  if (!scope) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  const allowed = await filterManageableUsers(actor, scope, [userId], { forSuspend: true })
  if (!allowed.includes(userId)) {
    return { error: NextResponse.json({ error: 'You cannot suspend this user' }, { status: 403 }) }
  }
  return { actor }
}

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const { userId } = await params
    const auth = await authorise(userId)
    if ('error' in auth) return auth.error
    const actor = auth.actor

    const body = await request.json().catch(() => ({}))
    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : ''
    const message = typeof body.message === 'string' && body.message.trim() ? body.message.trim().slice(0, 500) : null
    if (!reason) return NextResponse.json({ error: 'A reason is required' }, { status: 400 })

    const target = await prisma.users.update({
      where: { id: userId },
      data: { isSuspended: true, suspendedAt: new Date(), suspendedBy: actor.id, suspensionReason: reason },
      select: { id: true, name: true },
    })

    const open = await prisma.userSessions.findMany({
      where: { userId, OR: [{ endedAt: null }, { endedAt: { gt: new Date() } }] },
      select: { id: true },
    })
    const ended = await endSessions(open.map(s => s.id), { reason: 'SUSPENDED', endedBy: actor.id, message, delaySeconds: 0 })
    forgetUser(open.map(s => s.id))
    for (const s of ended) {
      try {
        emitToRoom(`session:${s.id}`, 'session:force-logout', {
          sessionId: s.id, endsAt: s.endsAt.toISOString(), message, byName: actor.name, reason: 'SUSPENDED',
        })
      } catch { /* socket down — the server already refuses the session */ }
    }

    await createAuditLog({
      userId: actor.id,
      action: 'USER_SUSPENDED',
      entityType: 'User',
      entityId: userId,
      newValues: { isSuspended: true, suspensionReason: reason },
      metadata: { userName: target.name, message, sessionsSignedOut: ended.length },
    })

    return NextResponse.json({ success: true, signedOut: ended.length })
  } catch (error) {
    console.error('[admin/users/suspend] Error:', error)
    return NextResponse.json({ error: 'Failed to suspend user' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  try {
    const { userId } = await params
    const auth = await authorise(userId)
    if ('error' in auth) return auth.error
    const actor = auth.actor

    const before = await prisma.users.findUnique({ where: { id: userId }, select: { name: true, isSuspended: true, suspensionReason: true } })
    if (!before?.isSuspended) return NextResponse.json({ error: 'This user is not suspended' }, { status: 400 })

    await prisma.users.update({
      where: { id: userId },
      data: { isSuspended: false, suspendedAt: null, suspendedBy: null, suspensionReason: null },
    })

    await createAuditLog({
      userId: actor.id,
      action: 'USER_SUSPENSION_LIFTED',
      entityType: 'User',
      entityId: userId,
      oldValues: { isSuspended: true, suspensionReason: before.suspensionReason },
      newValues: { isSuspended: false },
      metadata: { userName: before.name },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin/users/suspend] Error:', error)
    return NextResponse.json({ error: 'Failed to lift suspension' }, { status: 500 })
  }
}
