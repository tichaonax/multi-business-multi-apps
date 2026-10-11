import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getGeneralRoom } from '@/lib/chat/rooms'

/**
 * GET /api/chat/messages/search-in-room?roomId=...&q=... — every matching
 * message within one conversation (unlike /api/chat/search, which collapses
 * to one result per conversation across all of them). Each result carries
 * its calendar month so the client can expand that older-month placeholder
 * before scrolling to it, same bucketing as /api/chat/messages/months.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const q = request.nextUrl.searchParams.get('q')?.trim()
    if (!q || q.length < 2) return NextResponse.json([])

    const requestedRoomId = request.nextUrl.searchParams.get('roomId')
    const generalRoom = await getGeneralRoom()
    const roomId = requestedRoomId || generalRoom.id
    const isGeneral = roomId === generalRoom.id

    if (!isGeneral) {
      const membership = await prisma.chatParticipants.findFirst({ where: { roomId, userId: user.id } })
      if (!membership) return NextResponse.json({ error: 'Not a participant of this conversation' }, { status: 403 })
    }

    const matches = await prisma.chatMessages.findMany({
      where: {
        roomId,
        deletedAt: null,
        message: { contains: q, mode: 'insensitive' },
        ...(isGeneral
          ? {
              OR: [
                { chat_message_recipients: { none: {} } },
                { userId: user.id },
                { chat_message_recipients: { some: { userId: user.id } } },
              ],
              chat_message_dismissals: { none: { userId: user.id } },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, message: true, createdAt: true, parentId: true },
    })

    const results = matches.map(m => ({
      messageId: m.id,
      // A matched reply has no standalone row in the main thread view — the
      // client jumps to and expands its parent instead.
      jumpToId: m.parentId ?? m.id,
      isReply: !!m.parentId,
      month: m.createdAt.toISOString().slice(0, 7),
      snippet: m.message.length > 140 ? `${m.message.slice(0, 140)}…` : m.message,
      createdAt: m.createdAt.toISOString(),
    }))

    return NextResponse.json(results)
  } catch (err) {
    console.error('[GET /api/chat/messages/search-in-room]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
