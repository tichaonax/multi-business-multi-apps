import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getGeneralRoom, DEFAULT_HISTORY_WINDOW_MS } from '@/lib/chat/rooms'

/** GET /api/chat/messages/months?roomId=... — calendar months older than the
 * default 30-day history window that have messages in this room, newest
 * first, each with a count. Powers the collapsed "older messages" date
 * placeholders the client expands on demand. */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const requestedRoomId = request.nextUrl.searchParams.get('roomId')
    const generalRoom = await getGeneralRoom()
    const roomId = requestedRoomId || generalRoom.id
    const isGeneral = roomId === generalRoom.id

    // General prunes anything older than 7 days, well inside the 30-day
    // window, so there's never anything older to page through.
    if (isGeneral) return NextResponse.json([])

    const membership = await prisma.chatParticipants.findFirst({ where: { roomId, userId: user.id } })
    if (!membership) return NextResponse.json({ error: 'Not a participant of this conversation' }, { status: 403 })

    const cutoff = new Date(Date.now() - DEFAULT_HISTORY_WINDOW_MS)
    const rows = await prisma.$queryRaw<Array<{ month: string; count: number }>>`
      SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') as month, COUNT(*)::int as count
      FROM chat_messages
      WHERE "roomId" = ${roomId}
        AND "parentId" IS NULL
        AND "deletedAt" IS NULL
        AND "createdAt" < ${cutoff}
      GROUP BY month
      ORDER BY month DESC
    `
    return NextResponse.json(rows)
  } catch (err) {
    console.error('[GET /api/chat/messages/months]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
