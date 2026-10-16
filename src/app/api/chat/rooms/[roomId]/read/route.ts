import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { emitToUsers } from '@/lib/customer-display/socket-server'
import { getGeneralRoom } from '@/lib/chat/rooms'

/** POST /api/chat/rooms/[roomId]/read — marks the room read for this user.
 * Optional body `{ upTo: ISO }` (MBM-315): read only up to that message time
 * — the newest message actually scrolled into view — instead of "now".
 * lastReadAt only ever moves forward. For General (Team Chat), which has no
 * ChatParticipants rows, the position lives on Users.teamChatLastReadAt and
 * no read receipt is broadcast (Team Chat shows no ticks). */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { roomId } = await params
    const body = await request.json().catch(() => null)
    const now = new Date()
    const upTo = typeof body?.upTo === 'string' && !isNaN(Date.parse(body.upTo)) ? new Date(body.upTo) : null
    const readAt = upTo && upTo < now ? upTo : now

    const generalRoom = await getGeneralRoom()
    if (roomId === generalRoom.id) {
      await prisma.users.updateMany({
        where: { id: user.id, OR: [{ teamChatLastReadAt: null }, { teamChatLastReadAt: { lt: readAt } }] },
        data: { teamChatLastReadAt: readAt },
      })
      return NextResponse.json({ success: true })
    }

    const { count } = await prisma.chatParticipants.updateMany({
      where: { roomId, userId: user.id, OR: [{ lastReadAt: null }, { lastReadAt: { lt: readAt } }] },
      data: { lastReadAt: readAt },
    })

    // Live read-receipt ticks: tell everyone else in the room right away
    // rather than making their open ChatWindow wait for its own next poll
    // (there isn't one — messages already arrive over this same socket).
    // Only worth the query when this actually updated something — a
    // non-participant or already-at-now read fires `count: 0`.
    if (count > 0) {
      const others = await prisma.chatParticipants.findMany({
        where: { roomId, userId: { not: user.id } },
        select: { userId: true },
      })
      const otherIds = others.map(o => o.userId).filter((id): id is string => !!id)
      if (otherIds.length > 0) {
        try { emitToUsers(otherIds, 'chat:read', { roomId, userId: user.id, readAt: readAt.toISOString() }) } catch { /* non-critical */ }
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[POST /api/chat/rooms/[roomId]/read]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
