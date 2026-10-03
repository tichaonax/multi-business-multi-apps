import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getGeneralRoom } from '@/lib/chat/rooms'

/**
 * GET /api/chat/search?q=... — search message content across every
 * conversation the user can see (General + their DM/group rooms), collapsed
 * to one (the most recent) match per conversation.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const q = request.nextUrl.searchParams.get('q')?.trim()
    if (!q || q.length < 2) return NextResponse.json([])

    const generalRoom = await getGeneralRoom()
    const myParticipantRows = await prisma.chatParticipants.findMany({
      where: { userId: user.id },
      select: { roomId: true },
    })
    const myRoomIds = myParticipantRows.map(p => p.roomId).filter((id): id is string => !!id)

    const matches = await prisma.chatMessages.findMany({
      where: {
        deletedAt: null,
        message: { contains: q, mode: 'insensitive' },
        OR: [
          {
            roomId: generalRoom.id,
            OR: [
              { chat_message_recipients: { none: {} } },
              { userId: user.id },
              { chat_message_recipients: { some: { userId: user.id } } },
            ],
          },
          ...(myRoomIds.length > 0 ? [{ roomId: { in: myRoomIds } }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: { id: true, roomId: true, message: true, createdAt: true },
    })

    // Collapse to the single most recent match per conversation.
    const byRoom = new Map<string, (typeof matches)[number]>()
    for (const m of matches) {
      const key = m.roomId ?? 'general'
      if (!byRoom.has(key)) byRoom.set(key, m)
    }

    const results = await Promise.all([...byRoom.values()].map(async m => {
      let roomId: string | null = m.roomId
      let roomName = 'Team Chat'
      if (m.roomId && m.roomId !== generalRoom.id) {
        const room = await prisma.chatRooms.findUnique({
          where: { id: m.roomId },
          include: { chat_participants: { include: { users: { select: { id: true, name: true } } } } },
        })
        if (room) {
          const others = room.chat_participants.filter(p => p.userId !== user.id).map(p => p.users?.name ?? 'Unknown')
          roomName = room.type === 'direct' ? (others[0] ?? 'Unknown') : (room.name || others.join(', ') || 'Group')
        }
      } else {
        roomId = null // normalize to the client's General sentinel
      }
      return {
        roomId,
        roomName,
        messageId: m.id,
        snippet: m.message.length > 140 ? `${m.message.slice(0, 140)}…` : m.message,
        createdAt: m.createdAt.toISOString(),
      }
    }))

    results.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return NextResponse.json(results)
  } catch (err) {
    console.error('[GET /api/chat/search]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
