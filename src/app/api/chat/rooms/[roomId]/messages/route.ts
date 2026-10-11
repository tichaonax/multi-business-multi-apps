import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { emitToRoom, emitToUsers } from '@/lib/customer-display/socket-server'
import { getGeneralRoom } from '@/lib/chat/rooms'

/**
 * DELETE /api/chat/rooms/[roomId]/messages — admin-only bulk clear of every
 * message in a room, a genuine removal (hard delete, cascading to
 * attachments/recipients/dismissals) rather than the per-message soft-delete
 * placeholder, for the same "keep it clean" reason single admin deletes use
 * one (see DELETE /api/chat/messages/[id]).
 *
 * Deliberately restricted to General (Team Chat) and System Alerts — the
 * two broadcast/shared channels — never a Direct Message or Group, so this
 * can't be used to wipe someone else's private conversation history.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'admin') return NextResponse.json({ error: 'Only admins can clear a chat' }, { status: 403 })

    const { roomId } = await params
    const room = await prisma.chatRooms.findUnique({ where: { id: roomId }, select: { id: true, type: true } })
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

    const generalRoom = await getGeneralRoom()
    const isGeneral = room.id === generalRoom.id
    if (!isGeneral && room.type !== 'system') {
      return NextResponse.json({ error: 'Only Team Chat or System Alerts can be bulk-cleared' }, { status: 403 })
    }

    const { count } = await prisma.chatMessages.deleteMany({ where: { roomId } })

    try {
      if (isGeneral) {
        emitToRoom('chat:general', 'chat:room:cleared', { roomId })
      } else {
        const participants = await prisma.chatParticipants.findMany({ where: { roomId } })
        const participantIds = participants.map(p => p.userId).filter((id): id is string => !!id)
        emitToUsers(participantIds, 'chat:room:cleared', { roomId })
      }
    } catch { /* non-critical */ }

    return NextResponse.json({ success: true, count })
  } catch (err) {
    console.error('[DELETE /api/chat/rooms/[roomId]/messages]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
