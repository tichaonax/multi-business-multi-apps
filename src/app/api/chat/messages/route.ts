import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { emitToRoom, emitToUsers } from '@/lib/customer-display/socket-server'
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

/** Shape a raw DB message into the API payload */
function shapeMessage(m: any, replyCount = 0) {
  const emp = m.users?.employees
  const firstName: string = emp?.firstName ?? ''
  const lastName: string = emp?.lastName ?? ''
  const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || (m.users?.name ?? '?').charAt(0).toUpperCase()
  return {
    id: m.id,
    userId: m.userId,
    userName: m.users?.name ?? 'Unknown',
    userPhotoUrl: emp?.profilePhotoUrl ?? null,
    userInitials: initials,
    message: m.message,
    createdAt: m.createdAt.toISOString(),
    deletedAt: m.deletedAt?.toISOString() ?? null,
    parentId: m.parentId ?? null,
    replyScope: m.replyScope ?? null,
    replyCount,
    recipients: (m.chat_message_recipients ?? []).map((r: any) => ({
      id: r.users?.id ?? r.userId,
      name: r.users?.name ?? 'Unknown',
    })),
  }
}

/** GET /api/chat/messages — fetch last 100 messages visible to the current user */
export async function GET() {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const room = await getGeneralRoom()

    // Prune messages older than 7 days (fire-and-forget)
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    prisma.chatMessages.deleteMany({ where: { roomId: room.id, createdAt: { lt: cutoff } } }).catch(() => {})

    // Fetch top-level messages (no parentId) the current user can see:
    //  - message has no recipients (public), OR
    //  - user is the sender, OR
    //  - user is listed as a recipient
    const messages = await prisma.chatMessages.findMany({
      where: {
        roomId: room.id,
        parentId: null,
        OR: [
          // Public broadcast: no recipient rows exist
          { chat_message_recipients: { none: {} } },
          // Sender always sees their own messages
          { userId: user.id },
          // Explicitly listed as recipient
          { chat_message_recipients: { some: { userId: user.id } } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
      include: {
        users: { select: { name: true, employees: { select: { firstName: true, lastName: true, profilePhotoUrl: true } } } },
        chat_message_recipients: { include: { users: { select: { id: true, name: true } } } },
        replies: { where: { deletedAt: null }, select: { id: true } },
      },
    })

    return NextResponse.json(messages.map(m => shapeMessage(m, m.replies.length)))
  } catch (err) {
    console.error('[GET /api/chat/messages]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** POST /api/chat/messages — send a message (broadcast or targeted) */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const message: string = body?.message?.trim()
    if (!message) return NextResponse.json({ error: 'message is required' }, { status: 400 })

    const recipientIds: string[] = Array.isArray(body?.recipientIds) ? body.recipientIds : []
    const parentId: string | null = body?.parentId ?? null
    const replyScope: 'OWNER' | 'ALL' | null = body?.replyScope ?? null

    const room = await getGeneralRoom()

    // Validate parent when replying
    let resolvedRecipientIds = recipientIds
    if (parentId) {
      if (!replyScope) {
        return NextResponse.json({ error: 'replyScope is required when parentId is set' }, { status: 400 })
      }

      const parent = await prisma.chatMessages.findUnique({
        where: { id: parentId },
        include: { chat_message_recipients: { select: { userId: true } } },
      })
      if (!parent) return NextResponse.json({ error: 'Parent message not found' }, { status: 404 })

      if (replyScope === 'OWNER') {
        // Reply only goes to the thread owner
        resolvedRecipientIds = parent.userId ? [parent.userId] : []
      } else {
        // 'ALL' — inherit the recipient set of the parent thread (empty = everyone)
        resolvedRecipientIds = parent.chat_message_recipients.map(r => r.userId)
      }
    }

    // Create the message
    const created = await prisma.chatMessages.create({
      data: {
        roomId: room.id,
        userId: user.id,
        message,
        parentId,
        replyScope,
      },
      include: { users: { select: { name: true, employees: { select: { firstName: true, lastName: true, profilePhotoUrl: true } } } } },
    })

    // Persist recipient rows if targeted
    if (resolvedRecipientIds.length > 0) {
      await prisma.chatMessageRecipients.createMany({
        data: resolvedRecipientIds.map(uid => ({ messageId: created.id, userId: uid })),
        skipDuplicates: true,
      })
    }

    // Reload with recipients for the payload
    const full = await prisma.chatMessages.findUnique({
      where: { id: created.id },
      include: {
        users: { select: { name: true, employees: { select: { firstName: true, lastName: true, profilePhotoUrl: true } } } },
        chat_message_recipients: { include: { users: { select: { id: true, name: true } } } },
      },
    })

    const payload = shapeMessage(full, 0)
    const isTargeted = resolvedRecipientIds.length > 0

    if (isTargeted) {
      // Emit only to sender + recipients via personal rooms
      const involvedIds = Array.from(new Set([user.id, ...resolvedRecipientIds]))
      try { emitToUsers(involvedIds, 'chat:message', payload) } catch { /* non-critical */ }

      try {
        const recipientsOnly = resolvedRecipientIds.filter(id => id !== user.id)
        if (recipientsOnly.length > 0) {
          await emitNotification({
            userIds: recipientsOnly,
            type: 'CHAT_MESSAGE',
            title: `💬 ${payload.userName} (private)`,
            message: payload.message.length > 80 ? payload.message.slice(0, 80) + '…' : payload.message,
            linkUrl: '/chat',
          })
        }
      } catch { /* non-critical */ }
    } else {
      // Broadcast to all clients in the general room
      try { emitToRoom('chat:general', 'chat:message', payload) } catch { /* non-critical */ }

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
    }

    return NextResponse.json(payload, { status: 201 })
  } catch (err) {
    console.error('[POST /api/chat/messages]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

