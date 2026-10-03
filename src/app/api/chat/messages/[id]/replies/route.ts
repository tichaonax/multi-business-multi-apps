import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getGeneralRoom } from '@/lib/chat/rooms'

/** GET /api/chat/messages/[id]/replies — fetch all replies to a message */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const parent = await prisma.chatMessages.findUnique({ where: { id: params.id }, select: { roomId: true } })
    if (!parent) return NextResponse.json({ error: 'Parent message not found' }, { status: 404 })

    const generalRoom = await getGeneralRoom()
    const isGeneral = !parent.roomId || parent.roomId === generalRoom.id

    // DM/group thread — membership (not per-reply recipients, which don't
    // exist for room-scoped messages) is what gates visibility here.
    if (!isGeneral) {
      const membership = await prisma.chatParticipants.findFirst({
        where: { roomId: parent.roomId, userId: user.id },
      })
      if (!membership) return NextResponse.json({ error: 'Not a participant of this conversation' }, { status: 403 })
    }

    const replies = await prisma.chatMessages.findMany({
      where: isGeneral
        ? {
            parentId: params.id,
            OR: [
              { chat_message_recipients: { none: {} } },
              { userId: user.id },
              { chat_message_recipients: { some: { userId: user.id } } },
            ],
          }
        : { parentId: params.id },
      orderBy: { createdAt: 'asc' },
      include: {
        users: { select: { name: true, employees: { select: { firstName: true, lastName: true, profilePhotoUrl: true } } } },
        chat_message_recipients: { include: { users: { select: { id: true, name: true } } } },
      },
    })

    const shaped = replies.map(m => {
      const emp = (m.users as any)?.employees
      const firstName: string = emp?.firstName ?? ''
      const lastName: string = emp?.lastName ?? ''
      const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || ((m.users as any)?.name ?? '?').charAt(0).toUpperCase()
      return {
        id: m.id,
        roomId: m.roomId ?? null,
        userId: m.userId,
        userName: (m.users as any)?.name ?? 'Unknown',
        userPhotoUrl: (emp?.profilePhotoUrl ?? null) as string | null,
        userInitials: initials,
        message: m.message,
        createdAt: m.createdAt.toISOString(),
        deletedAt: m.deletedAt?.toISOString() ?? null,
        parentId: m.parentId ?? null,
        replyScope: m.replyScope ?? null,
        replyCount: 0,
        recipients: m.chat_message_recipients.map((r: any) => ({
          id: r.users?.id ?? r.userId,
          name: r.users?.name ?? 'Unknown',
        })),
      }
    })

    return NextResponse.json(shaped)
  } catch (err) {
    console.error('[GET /api/chat/messages/[id]/replies]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
