import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { emitToUsers } from '@/lib/customer-display/socket-server'

/** POST /api/chat/rooms/[roomId]/read — clears this user's unread badge for the room. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { roomId } = await params
    const readAt = new Date()
    const { count } = await prisma.chatParticipants.updateMany({
      where: { roomId, userId: user.id },
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
