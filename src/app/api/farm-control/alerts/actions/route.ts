import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { emitToUser } from '@/lib/customer-display/socket-server'
import { buildWhere, readFilter } from '@/lib/farm-control/alert-filter'
import { setBellCount } from '@/lib/farm-control/alert-store'

/**
 * MBM-340 — POST /api/farm-control/alerts/actions
 * { action: seen|dismiss|undismiss|later|unlater, ids: [...] } for chosen alerts, or
 * { action, filter: {...} } for every alert matching the panel's filter
 * (Mark n seen / Dismiss n, alert list guide §3.6). Only the person's own
 * alerts. Updates the bell's count row and the person's open pages.
 */
const ACTIONS = ['seen', 'dismiss', 'undismiss', 'later', 'unlater'] as const
type Action = typeof ACTIONS[number]

export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const action = body.action as Action
  if (!ACTIONS.includes(action)) return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

  let where
  if (Array.isArray(body.ids)) {
    const ids = body.ids.map(String).slice(0, 500)
    where = { userId: user.id, id: { in: ids } }
  } else if (body.filter && typeof body.filter === 'object') {
    // Every match of the New list's filter (not only the rows shown): Mark seen
    // takes the new ones; Dismiss everything still in the list (new or seen)
    const f = readFilter(body.filter)
    where = action === 'dismiss'
      ? { AND: [buildWhere(user.id, f, { ignoreView: true }).where, { dismissedAt: null }] }
      : buildWhere(user.id, { ...f, view: 'new', since: undefined }).where
  } else {
    return NextResponse.json({ error: 'ids or filter needed' }, { status: 400 })
  }

  const now = new Date()
  const data =
    action === 'seen' ? { seenAt: now }
    : action === 'dismiss' ? { dismissedAt: now, seenAt: now }
    : action === 'undismiss' ? { dismissedAt: null }
    : action === 'later' ? { laterAt: now }
    : { laterAt: null }
  // Seen keeps the first time it was seen
  const r = await prisma.farmCameraAlerts.updateMany({ where: action === 'seen' ? { AND: [where, { seenAt: null }] } : where, data })

  const count = await setBellCount(user.id)
  emitToUser(user.id, 'farm-alert', { kind: 'count', count })
  return NextResponse.json({ success: true, data: { changed: r.count, newCount: count } })
}
