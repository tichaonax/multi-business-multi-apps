import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { emitToUser, emitToUsers } from '@/lib/customer-display/socket-server'
import { postSystemMessage } from '@/lib/chat/rooms'

/** DELETE /api/chat/rooms/[roomId]/participants/[userId] — remove a member from a group (creator only). */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string; userId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { roomId, userId } = await params

    const room = await prisma.chatRooms.findUnique({ where: { id: roomId } })
    if (!room) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    if (room.type !== 'group') return NextResponse.json({ error: 'Only group conversations have members to manage' }, { status: 400 })
    if (room.createdBy !== user.id) return NextResponse.json({ error: 'Only the group creator can remove members' }, { status: 403 })
    if (userId === room.createdBy) return NextResponse.json({ error: 'The group creator cannot be removed' }, { status: 400 })

    const removedUser = await prisma.users.findUnique({ where: { id: userId }, select: { name: true } })

    await prisma.chatParticipants.deleteMany({ where: { roomId, userId } })

    // So a removed member's open window closes immediately instead of just
    // silently failing on their next action — membership is what the
    // messages/replies endpoints already gate visibility on.
    try { emitToUser(userId, 'chat:room-removed', { roomId }) } catch { /* non-critical */ }

    // Event message for whoever's left — the removed member no longer has
    // access to the room, so they're deliberately not sent this.
    try {
      const notice = await postSystemMessage(roomId, `${user.name ?? 'Someone'} removed ${removedUser?.name ?? 'a member'} from the group`)
      const remaining = await prisma.chatParticipants.findMany({ where: { roomId } })
      const remainingIds = remaining.map(p => p.userId).filter((id): id is string => !!id)
      emitToUsers(remainingIds, 'chat:message', notice)
    } catch { /* non-critical */ }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/chat/rooms/[roomId]/participants/[userId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
