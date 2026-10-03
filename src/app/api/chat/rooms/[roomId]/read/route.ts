import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/** POST /api/chat/rooms/[roomId]/read — clears this user's unread badge for the room. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { roomId } = await params
    await prisma.chatParticipants.updateMany({
      where: { roomId, userId: user.id },
      data: { lastReadAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[POST /api/chat/rooms/[roomId]/read]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
