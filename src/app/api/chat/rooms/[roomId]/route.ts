import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/** GET /api/chat/rooms/[roomId] — full detail (all participants + creator) for the members panel. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { roomId } = await params

    const membership = await prisma.chatParticipants.findFirst({ where: { roomId, userId: user.id } })
    if (!membership) return NextResponse.json({ error: 'Not a participant of this conversation' }, { status: 403 })

    const room = await prisma.chatRooms.findUnique({
      where: { id: roomId },
      include: {
        chat_participants: {
          include: { users: { select: { id: true, name: true, profilePhotoUrl: true } } },
        },
      },
    })
    if (!room) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })

    return NextResponse.json({
      id: room.id,
      type: room.type,
      name: room.name,
      createdBy: room.createdBy,
      participants: room.chat_participants.map(p => ({
        id: p.users?.id ?? p.userId,
        name: p.users?.name ?? 'Unknown',
        photoUrl: p.users?.profilePhotoUrl ?? null,
        // Read-receipt ticks (chat-window.tsx) compare each of MY sent
        // messages' createdAt against every other participant's lastReadAt.
        lastReadAt: p.lastReadAt,
      })),
    })
  } catch (err) {
    console.error('[GET /api/chat/rooms/[roomId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
