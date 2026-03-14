import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { emitToRoom } from '@/lib/customer-display/socket-server'
import { emitNotification } from '@/lib/notifications/notification-emitter'

const GENERAL_ROOM_NAME = 'General'

/** Get or create the single general chat room */
async function getGeneralRoom() {
  let room = await prisma.chatRooms.findFirst({
    where: { name: GENERAL_ROOM_NAME, type: 'group' },
  })
  if (!room) {
    room = await prisma.chatRooms.create({
      data: { name: GENERAL_ROOM_NAME, type: 'group' },
    })
  }
  return room
}

/** GET /api/chat/messages — fetch last 100 messages (prunes >7 days old) */
export async function GET() {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const room = await getGeneralRoom()

    // Prune messages older than 7 days (fire-and-forget)
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    prisma.chatMessages.deleteMany({ where: { roomId: room.id, createdAt: { lt: cutoff } } }).catch(() => {})

    const messages = await prisma.chatMessages.findMany({
      where: { roomId: room.id },
      orderBy: { createdAt: 'asc' },
      take: 100,
      include: { users: { select: { name: true } } },
    })

    return NextResponse.json(
      messages.map(m => ({
        id: m.id,
        userId: m.userId,
        userName: m.users?.name ?? 'Unknown',
        message: m.message,
        createdAt: m.createdAt.toISOString(),
        deletedAt: m.deletedAt?.toISOString() ?? null,
      }))
    )
  } catch (err) {
    console.error('[GET /api/chat/messages]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** POST /api/chat/messages — send a message */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const message: string = body?.message?.trim()
    if (!message) return NextResponse.json({ error: 'message is required' }, { status: 400 })

    const room = await getGeneralRoom()

    const created = await prisma.chatMessages.create({
      data: { roomId: room.id, userId: user.id, message },
      include: { users: { select: { name: true } } },
    })

    const payload = {
      id: created.id,
      userId: created.userId,
      userName: created.users?.name ?? 'Unknown',
      message: created.message,
      createdAt: created.createdAt.toISOString(),
    }

    // Push to all connected chat clients in real time (non-blocking)
    try { emitToRoom('chat:general', 'chat:message', payload) } catch { /* non-critical */ }

    // Notify all other users via bell so they know there's a new message even if chat is closed
    try {
      const otherUsers = await prisma.users.findMany({
        where: { id: { not: user.id }, isActive: true },
        select: { id: true },
      })
      if (otherUsers.length > 0) {
        await emitNotification({
          userIds: otherUsers.map(u => u.id),
          type: 'CHAT_MESSAGE',
          title: `💬 ${payload.userName}`,
          message: payload.message.length > 80 ? payload.message.slice(0, 80) + '…' : payload.message,
          linkUrl: '/chat',
        })
      }
    } catch { /* non-critical */ }

    return NextResponse.json(payload, { status: 201 })
  } catch (err) {
    console.error('[POST /api/chat/messages]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
