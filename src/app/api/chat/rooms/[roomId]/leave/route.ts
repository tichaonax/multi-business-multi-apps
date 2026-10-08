import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * DELETE /api/chat/rooms/[roomId]/leave — removes the current user's own
 * participation in a room, for them only (the room and its history are
 * untouched for everyone else still in it). Scoped to 'system' rooms for
 * now (e.g. "System Alerts") — a read-only broadcast has no creator to ask
 * permission from, so any participant can remove it from their own list at
 * will. If it's still their recipient list next time a digest fires (see
 * getOrCreateSystemAlertsRoom), they're simply re-added then — this isn't
 * a permanent opt-out, just "clear it from my list for now".
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { roomId } = await params
    const room = await prisma.chatRooms.findUnique({ where: { id: roomId }, select: { type: true } })
    if (!room) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    if (room.type !== 'system') {
      return NextResponse.json({ error: 'Only read-only system channels can be removed this way' }, { status: 400 })
    }

    await prisma.chatParticipants.deleteMany({ where: { roomId, userId: user.id } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/chat/rooms/[roomId]/leave]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
