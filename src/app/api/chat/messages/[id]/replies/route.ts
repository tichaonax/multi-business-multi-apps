import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/** GET /api/chat/messages/[id]/replies — fetch all replies to a message */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const replies = await prisma.chatMessages.findMany({
      where: {
        parentId: params.id,
        OR: [
          { chat_message_recipients: { none: {} } },
          { userId: user.id },
          { chat_message_recipients: { some: { userId: user.id } } },
        ],
      },
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
