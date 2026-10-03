import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { emitToRoom, emitToUsers } from '@/lib/customer-display/socket-server'
import { emitNotification } from '@/lib/notifications/notification-emitter'
import { getGeneralRoom } from '@/lib/chat/rooms'

/** Shape a raw DB message into the API payload */
function shapeMessage(m: any, replyCount = 0) {
  const emp = m.users?.employees
  const firstName: string = emp?.firstName ?? ''
  const lastName: string = emp?.lastName ?? ''
  const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || (m.users?.name ?? '?').charAt(0).toUpperCase()
  return {
    id: m.id,
    roomId: m.roomId ?? null,
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

/** GET /api/chat/messages?roomId=... — fetch last 100 messages visible to the current user. Omit roomId for the General/Team room (default, unchanged). */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const requestedRoomId = request.nextUrl.searchParams.get('roomId')
    const generalRoom = await getGeneralRoom()
    const isGeneral = !requestedRoomId || requestedRoomId === generalRoom.id

    if (isGeneral) {
      // Prune messages older than 7 days (fire-and-forget) — only the
      // General feed accumulates unbounded broadcast traffic like this.
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      prisma.chatMessages.deleteMany({ where: { roomId: generalRoom.id, createdAt: { lt: cutoff } } }).catch(() => {})

      // Fetch top-level messages (no parentId) the current user can see:
      //  - message has no recipients (public), OR
      //  - user is the sender, OR
      //  - user is listed as a recipient
      const messages = await prisma.chatMessages.findMany({
        where: {
          roomId: generalRoom.id,
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
    }

    // DM/group room — membership itself is the audience, so every top-level
    // message in the room is visible to every participant, no recipient
    // filtering needed.
    const membership = await prisma.chatParticipants.findFirst({
      where: { roomId: requestedRoomId, userId: user.id },
    })
    if (!membership) return NextResponse.json({ error: 'Not a participant of this conversation' }, { status: 403 })

    const messages = await prisma.chatMessages.findMany({
      where: { roomId: requestedRoomId, parentId: null },
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
    const requestedRoomId: string | null = typeof body?.roomId === 'string' ? body.roomId : null

    const generalRoom = await getGeneralRoom()
    const isGeneral = !requestedRoomId || requestedRoomId === generalRoom.id

    if (!isGeneral) {
      // DM/group room — membership is the audience, so there's no per-message
      // recipient set to compute; a reply just threads under parentId with
      // no OWNER/ALL distinction (everyone in the room already sees it all).
      const participants = await prisma.chatParticipants.findMany({ where: { roomId: requestedRoomId } })
      const participantIds = participants.map(p => p.userId).filter((id): id is string => !!id)
      if (!participantIds.includes(user.id)) {
        return NextResponse.json({ error: 'Not a participant of this conversation' }, { status: 403 })
      }
      if (parentId) {
        const parent = await prisma.chatMessages.findUnique({ where: { id: parentId } })
        if (!parent || parent.roomId !== requestedRoomId) {
          return NextResponse.json({ error: 'Parent message not found' }, { status: 404 })
        }
      }

      const created = await prisma.chatMessages.create({
        data: { roomId: requestedRoomId, userId: user.id, message, parentId },
        include: { users: { select: { name: true, employees: { select: { firstName: true, lastName: true, profilePhotoUrl: true } } } } },
      })

      const payload = shapeMessage(created, 0)
      try { emitToUsers(participantIds, 'chat:message', payload) } catch { /* non-critical */ }
      try {
        const recipientsOnly = participantIds.filter(id => id !== user.id)
        if (recipientsOnly.length > 0) {
          await emitNotification({
            userIds: recipientsOnly,
            type: 'CHAT_MESSAGE',
            title: `💬 ${payload.userName}`,
            message: payload.message.length > 80 ? payload.message.slice(0, 80) + '…' : payload.message,
            linkUrl: '/chat',
          })
        }
      } catch { /* non-critical */ }

      return NextResponse.json(payload, { status: 201 })
    }

    const room = generalRoom

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
      if (!parent || parent.roomId !== room.id) {
        // Guards against a DM/group thread's id being replied to through the
        // General path, which would otherwise create an 'ALL'-scope reply
        // (broadcast to everyone) referencing a private conversation.
        return NextResponse.json({ error: 'Parent message not found' }, { status: 404 })
      }

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

