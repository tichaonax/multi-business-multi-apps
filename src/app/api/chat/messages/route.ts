import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { emitToRoom, emitToUsers } from '@/lib/customer-display/socket-server'
import { emitNotification } from '@/lib/notifications/notification-emitter'
import { getGeneralRoom, shapeMessage } from '@/lib/chat/rooms'

// MBM-315 — history is loaded ~one screen at a time (sliding window) instead
// of "the whole last 30 days". Keyset paging on (createdAt, id): stable while
// new messages arrive, and served by the (roomId, createdAt) index.
const PAGE_SIZE = 30
const CONTEXT_BEFORE_UNREAD = 5
const MESSAGE_INCLUDE = {
  users: { select: { name: true, firstName: true, lastName: true, profilePhotoUrl: true } },
  chat_message_recipients: { include: { users: { select: { id: true, name: true } } } },
  chat_attachments: { select: { id: true, fileName: true, mimeType: true, size: true } },
} as const

type Cursor = { id: string; createdAt: Date }
const olderThan = (c: Cursor) => ({ OR: [{ createdAt: { lt: c.createdAt } }, { createdAt: c.createdAt, id: { lt: c.id } }] })
const newerThan = (c: Cursor) => ({ OR: [{ createdAt: { gt: c.createdAt } }, { createdAt: c.createdAt, id: { gt: c.id } }] })

/** Up to `n` visible messages strictly older than `c` (or the newest `n` when
 * `c` is null), returned oldest-first, plus whether more exist beyond them. */
async function pageOlder(base: any, c: Cursor | null, n: number) {
  const rows = await prisma.chatMessages.findMany({
    where: c ? { AND: [base, olderThan(c)] } : base,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: n + 1,
    include: MESSAGE_INCLUDE,
  })
  return { rows: rows.slice(0, n).reverse(), hasMore: rows.length > n }
}

/** Up to `n` visible messages strictly newer than `c`, oldest-first. */
async function pageNewer(base: any, c: Cursor, n: number) {
  const rows = await prisma.chatMessages.findMany({
    where: { AND: [base, newerThan(c)] },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: n + 1,
    include: MESSAGE_INCLUDE,
  })
  return { rows: rows.slice(0, n), hasMore: rows.length > n }
}

/** A window centred on `anchor`: `before` older messages, the anchor, then up
 * to PAGE_SIZE - before - 1 newer ones. */
async function pageAround(base: any, anchor: Cursor, before: number) {
  const [older, newer] = await Promise.all([
    pageOlder(base, anchor, before),
    pageNewer(base, anchor, PAGE_SIZE - before - 1),
  ])
  return { rows: [...older.rows, anchor, ...newer.rows], hasMoreBefore: older.hasMore, hasMoreAfter: newer.hasMore }
}

/** GET /api/chat/messages?roomId=… — one page of top-level messages visible
 * to the current user. Omit roomId for the General/Team room. Paging params
 * (at most one):
 *   (none)               page starting at the first unseen message (5 earlier
 *                        for context), or the newest page if nothing is unseen.
 *                        "Unseen" = after this user's read position:
 *                        ChatParticipants.lastReadAt (DM/group) or
 *                        Users.teamChatLastReadAt (General/Team).
 *   before=<messageId>   the page older than that message
 *   after=<messageId>    the page newer than that message
 *   around=<messageId>   a page centred on that message (search jump)
 *   latest=1             the newest page
 *   countsOnly=1         Team Chat badge seeding — just `unseenCounts`, no messages
 * → { messages, hasMoreBefore, hasMoreAfter, firstUnreadId, unseenCounts? }
 *   unseenCounts = { direct, broadcast } — General only. */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const params = request.nextUrl.searchParams
    const requestedRoomId = params.get('roomId')
    const generalRoom = await getGeneralRoom()
    const isGeneral = !requestedRoomId || requestedRoomId === generalRoom.id
    const roomId = isGeneral ? generalRoom.id : requestedRoomId!

    let base: any
    let lastReadAt: Date | null = null
    if (isGeneral) {
      // No auto-prune here (MBM-318) — Team Chat keeps its full history so
      // users can scroll back; the sliding window only loads a page at a time.

      // Top-level messages the current user can see:
      //  - message has no recipients (public), OR
      //  - user is the sender, OR
      //  - user is listed as a recipient
      base = {
        roomId,
        parentId: null,
        OR: [
          { chat_message_recipients: { none: {} } },
          { userId: user.id },
          { chat_message_recipients: { some: { userId: user.id } } },
        ],
        // "Delete for me" on a system message (see chat_message_dismissals)
        // — hides it only for the user who dismissed it.
        chat_message_dismissals: { none: { userId: user.id } },
      }
      const me = await prisma.users.findUnique({ where: { id: user.id }, select: { teamChatLastReadAt: true } })
      lastReadAt = me?.teamChatLastReadAt ?? null
    } else {
      // DM/group room — membership itself is the audience, so every
      // top-level message in the room is visible to every participant.
      const membership = await prisma.chatParticipants.findFirst({ where: { roomId, userId: user.id } })
      if (!membership) return NextResponse.json({ error: 'Not a participant of this conversation' }, { status: 403 })
      lastReadAt = membership.lastReadAt

      // Read-only system channels (e.g. "System Alerts") auto-expire after
      // 30 days (fire-and-forget). Team Chat is never pruned (MBM-318).
      prisma.chatRooms.findUnique({ where: { id: roomId }, select: { type: true } }).then(r => {
        if (r?.type !== 'system') return
        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        return prisma.chatMessages.deleteMany({ where: { roomId, createdAt: { lt: cutoff } } })
      }).catch(() => {})

      base = { roomId, parentId: null, chat_message_dismissals: { none: { userId: user.id } } }
    }

    // The hub's Team Chat unread badges (private-to-me vs. broadcast) are
    // counted here — the client only ever holds a page of history.
    let unseenCounts: { direct: number; broadcast: number } | undefined
    if (isGeneral) {
      const unseen = { AND: [base, lastReadAt ? { createdAt: { gt: lastReadAt } } : {}, { deletedAt: null }, { OR: [{ userId: null }, { userId: { not: user.id } }] }] }
      const [direct, broadcast] = await Promise.all([
        prisma.chatMessages.count({ where: { AND: [unseen, { chat_message_recipients: { some: { userId: user.id } } }] } }),
        prisma.chatMessages.count({ where: { AND: [unseen, { chat_message_recipients: { none: {} } }] } }),
      ])
      unseenCounts = { direct, broadcast }
    }
    if (params.get('countsOnly')) return NextResponse.json({ unseenCounts: unseenCounts ?? { direct: 0, broadcast: 0 } })

    // A cursor message must itself be visible to this user (same filters).
    const findVisible = (id: string) => prisma.chatMessages.findFirst({ where: { AND: [base, { id }] }, include: MESSAGE_INCLUDE })

    let rows: any[] = []
    let hasMoreBefore = false
    let hasMoreAfter = false
    let firstUnreadId: string | null = null

    const before = params.get('before')
    const after = params.get('after')
    const around = params.get('around')

    if (before || after || around) {
      const cursor = await findVisible((before || after || around)!)
      if (!cursor) return NextResponse.json({ error: 'Message not found' }, { status: 404 })
      if (before) {
        const p = await pageOlder(base, cursor, PAGE_SIZE)
        rows = p.rows; hasMoreBefore = p.hasMore; hasMoreAfter = true
      } else if (after) {
        const p = await pageNewer(base, cursor, PAGE_SIZE)
        rows = p.rows; hasMoreAfter = p.hasMore; hasMoreBefore = true
      } else {
        ;({ rows, hasMoreBefore, hasMoreAfter } = await pageAround(base, cursor, Math.floor(PAGE_SIZE / 2)))
      }
    } else {
      // Initial open: start at the oldest message this user hasn't seen
      // (someone else's or a system message — never their own). `latest=1`
      // skips straight to the newest page.
      const firstUnread = params.get('latest') ? null : await prisma.chatMessages.findFirst({
        where: {
          AND: [
            base,
            lastReadAt ? { createdAt: { gt: lastReadAt } } : {},
            { OR: [{ userId: null }, { userId: { not: user.id } }] },
          ],
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        include: MESSAGE_INCLUDE,
      })
      if (firstUnread) {
        firstUnreadId = firstUnread.id
        ;({ rows, hasMoreBefore, hasMoreAfter } = await pageAround(base, firstUnread, CONTEXT_BEFORE_UNREAD))
      } else {
        const p = await pageOlder(base, null, PAGE_SIZE)
        rows = p.rows; hasMoreBefore = p.hasMore
      }
    }

    // Reply counts for just this page, in one query.
    const replyCounts = rows.length === 0 ? [] : await prisma.chatMessages.groupBy({
      by: ['parentId'],
      where: { parentId: { in: rows.map(r => r.id) }, deletedAt: null },
      _count: { _all: true },
    })
    const replyCountById = new Map(replyCounts.map(r => [r.parentId as string, r._count._all]))

    return NextResponse.json({
      messages: rows.map(m => shapeMessage(m, replyCountById.get(m.id) ?? 0)),
      hasMoreBefore,
      hasMoreAfter,
      firstUnreadId,
      unseenCounts,
    })
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
    const message: string = body?.message?.trim() ?? ''
    // MBM-307 — an attachment-only message (no caption typed) is valid; a
    // genuinely empty send (no text, no files) is not. One message can
    // carry several files (drag-and-drop / multi-select), capped so a
    // single send can't claim an unbounded number of uploads.
    const MAX_ATTACHMENTS_PER_MESSAGE = 10
    const attachmentIds: string[] = Array.isArray(body?.attachmentIds)
      ? body.attachmentIds.filter((id: unknown): id is string => typeof id === 'string').slice(0, MAX_ATTACHMENTS_PER_MESSAGE)
      : []
    if (!message && attachmentIds.length === 0) return NextResponse.json({ error: 'message is required' }, { status: 400 })

    // Validated once up front, before either send path, so a stale/foreign/
    // already-claimed attachment id is rejected with a clear error instead
    // of the message silently sending with some of its files missing.
    if (attachmentIds.length > 0) {
      const atts = await prisma.chatAttachments.findMany({
        where: { id: { in: attachmentIds } },
        select: { id: true, uploadedBy: true, messageId: true },
      })
      const byId = new Map(atts.map(a => [a.id, a]))
      const invalid = attachmentIds.find(id => {
        const a = byId.get(id)
        return !a || a.uploadedBy !== user.id || a.messageId !== null
      })
      if (invalid) {
        return NextResponse.json({ error: 'One or more attachments could not be found or were already sent' }, { status: 400 })
      }
    }
    const attachmentSelect = { select: { id: true, fileName: true, mimeType: true, size: true } } as const

    const recipientIds: string[] = Array.isArray(body?.recipientIds) ? body.recipientIds : []
    const parentId: string | null = body?.parentId ?? null
    const replyScope: 'OWNER' | 'ALL' | null = body?.replyScope ?? null
    const requestedRoomId: string | null = typeof body?.roomId === 'string' ? body.roomId : null
    // @-flagged "important" recipients (group chats) — max 2, see chat-window.tsx
    const requestedMentionIds: string[] = Array.isArray(body?.mentionIds)
      ? body.mentionIds.filter((id: unknown) => typeof id === 'string')
      : []

    const generalRoom = await getGeneralRoom()
    const isGeneral = !requestedRoomId || requestedRoomId === generalRoom.id

    if (!isGeneral) {
      // DM/group room — membership is the audience, so there's no per-message
      // recipient set to compute; a reply just threads under parentId with
      // no OWNER/ALL distinction (everyone in the room already sees it all).
      const room = await prisma.chatRooms.findUnique({ where: { id: requestedRoomId! }, select: { type: true } })
      if (room?.type === 'system') {
        // e.g. the vehicle license compliance "System Alerts" room — nobody
        // replies to a system broadcast, including admins who are members.
        return NextResponse.json({ error: 'This is a read-only system channel' }, { status: 403 })
      }
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
      // Only current participants other than the sender can be flagged, capped at 2.
      const mentionIds = requestedMentionIds
        .filter(id => id !== user.id && participantIds.includes(id))
        .slice(0, 2)

      const created = await prisma.chatMessages.create({
        data: { roomId: requestedRoomId, userId: user.id, message, parentId },
        include: { users: { select: { name: true, firstName: true, lastName: true, profilePhotoUrl: true } } },
      })

      if (mentionIds.length > 0) {
        await prisma.chatMessageRecipients.createMany({
          data: mentionIds.map(uid => ({ messageId: created.id, userId: uid })),
          skipDuplicates: true,
        })
      }
      if (attachmentIds.length > 0) {
        await prisma.chatAttachments.updateMany({ where: { id: { in: attachmentIds } }, data: { messageId: created.id } })
      }

      const full = (mentionIds.length > 0 || attachmentIds.length > 0)
        ? await prisma.chatMessages.findUnique({
            where: { id: created.id },
            include: {
              users: { select: { name: true, firstName: true, lastName: true, profilePhotoUrl: true } },
              chat_message_recipients: { include: { users: { select: { id: true, name: true } } } },
              chat_attachments: attachmentSelect,
            },
          })
        : created

      const payload = shapeMessage(full, 0)
      try { emitToUsers(participantIds, 'chat:message', payload) } catch { /* non-critical */ }
      try {
        const recipientsOnly = participantIds.filter(id => id !== user.id)
        const flaggedSet = new Set(mentionIds)
        const flagged = recipientsOnly.filter(id => flaggedSet.has(id))
        const everyoneElse = recipientsOnly.filter(id => !flaggedSet.has(id))
        const snippet = payload.message.length > 80 ? payload.message.slice(0, 80) + '…' : payload.message
        if (flagged.length > 0) {
          await emitNotification({
            userIds: flagged,
            type: 'CHAT_MESSAGE',
            title: `🚩 Important — ${payload.userName}`,
            message: snippet,
            linkUrl: '/chat',
          })
        }
        if (everyoneElse.length > 0) {
          await emitNotification({
            userIds: everyoneElse,
            type: 'CHAT_MESSAGE',
            title: `💬 ${payload.userName}`,
            message: snippet,
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
      include: { users: { select: { name: true, firstName: true, lastName: true, profilePhotoUrl: true } } },
    })

    // Persist recipient rows if targeted
    if (resolvedRecipientIds.length > 0) {
      await prisma.chatMessageRecipients.createMany({
        data: resolvedRecipientIds.map(uid => ({ messageId: created.id, userId: uid })),
        skipDuplicates: true,
      })
    }
    if (attachmentIds.length > 0) {
      await prisma.chatAttachments.updateMany({ where: { id: { in: attachmentIds } }, data: { messageId: created.id } })
    }

    // Reload with recipients for the payload
    const full = await prisma.chatMessages.findUnique({
      where: { id: created.id },
      include: {
        users: { select: { name: true, firstName: true, lastName: true, profilePhotoUrl: true } },
        chat_message_recipients: { include: { users: { select: { id: true, name: true } } } },
        chat_attachments: attachmentSelect,
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

