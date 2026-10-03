import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { emitToUser, emitToUsers } from '@/lib/customer-display/socket-server'
import { postSystemMessage } from '@/lib/chat/rooms'

/** POST /api/chat/rooms/[roomId]/participants — add a member to a group (creator only). Body: { userId }. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { roomId } = await params
    const body = await request.json()
    const userId = typeof body?.userId === 'string' ? body.userId : null
    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

    const room = await prisma.chatRooms.findUnique({ where: { id: roomId } })
    if (!room) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    if (room.type !== 'group') return NextResponse.json({ error: 'Only group conversations have members to manage' }, { status: 400 })
    if (room.createdBy !== user.id) return NextResponse.json({ error: 'Only the group creator can add members' }, { status: 403 })

    const existing = await prisma.chatParticipants.findFirst({ where: { roomId, userId } })
    if (existing) return NextResponse.json({ success: true }) // already a member — no-op

    const newMember = await prisma.users.findUnique({ where: { id: userId }, select: { name: true } })

    await prisma.chatParticipants.create({ data: { roomId, userId } })

    // So they see the group immediately rather than waiting for a refresh.
    try { emitToUser(userId, 'chat:room-added', { roomId }) } catch { /* non-critical */ }

    // Welcome/event message in the group's own history — visible to the new
    // member the moment they open it (full history, not just from here on),
    // and live for anyone with the window already open.
    try {
      const welcome = await postSystemMessage(roomId, `${user.name ?? 'Someone'} added ${newMember?.name ?? 'a new member'} to the group`)
      const allParticipants = await prisma.chatParticipants.findMany({ where: { roomId } })
      const allIds = allParticipants.map(p => p.userId).filter((id): id is string => !!id)
      emitToUsers(allIds, 'chat:message', welcome)
    } catch { /* non-critical */ }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[POST /api/chat/rooms/[roomId]/participants]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
