import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { emitToRoom, emitToUsers } from '@/lib/customer-display/socket-server'
import { getGeneralRoom, shapeMessage, EDIT_WINDOW_MS } from '@/lib/chat/rooms'

/** PATCH /api/chat/messages/[id] — edit own message. Only the sender's most
 * recent message in the room, and only within EDIT_WINDOW_MS of sending. */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const newText: string = body?.message?.trim()
    if (!newText) return NextResponse.json({ error: 'message is required' }, { status: 400 })

    const message = await prisma.chatMessages.findUnique({ where: { id: params.id } })
    if (!message) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (message.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (message.deletedAt) return NextResponse.json({ error: 'Cannot edit a deleted message' }, { status: 400 })

    // Only the sender's most recent (non-deleted) TOP-LEVEL message in this
    // room is editable — thread replies are excluded from "latest" the same
    // way the client excludes them from myLatestId (they never appear in
    // the main message list), so a reply here always fails this check.
    const latest = await prisma.chatMessages.findFirst({
      where: { roomId: message.roomId, userId: user.id, deletedAt: null, parentId: null },
      orderBy: { createdAt: 'desc' },
    })
    if (!latest || latest.id !== message.id) {
      return NextResponse.json({ error: 'Only your most recent message can be edited' }, { status: 403 })
    }

    if (Date.now() - message.createdAt.getTime() > EDIT_WINDOW_MS) {
      return NextResponse.json({ error: 'Edit window has expired (15 minutes)' }, { status: 403 })
    }

    const updated = await prisma.chatMessages.update({
      where: { id: params.id },
      data: { message: newText, editedAt: new Date(), editCount: { increment: 1 } },
      include: {
        users: { select: { name: true, firstName: true, lastName: true, profilePhotoUrl: true } },
        chat_message_recipients: { include: { users: { select: { id: true, name: true } } } },
        // Without this, editing a message's text would make its attachment
        // disappear client-side — shapeMessage reads m.chat_attachments, and
        // an unincluded relation comes back undefined, not "unchanged".
        chat_attachments: { select: { id: true, fileName: true, mimeType: true, size: true } },
      },
    })

    const payload = shapeMessage(updated, 0)

    // Broadcast to the same audience the original send used.
    try {
      if (message.roomId) {
        const generalRoom = await getGeneralRoom()
        if (message.roomId === generalRoom.id) {
          if (payload.recipients.length > 0) {
            const involvedIds = Array.from(new Set([user.id, ...payload.recipients.map((r: { id: string }) => r.id)]))
            emitToUsers(involvedIds, 'chat:message:edited', payload)
          } else {
            emitToRoom('chat:general', 'chat:message:edited', payload)
          }
        } else {
          const participants = await prisma.chatParticipants.findMany({ where: { roomId: message.roomId } })
          const participantIds = participants.map(p => p.userId).filter((id): id is string => !!id)
          emitToUsers(participantIds, 'chat:message:edited', payload)
        }
      }
    } catch { /* non-critical */ }

    return NextResponse.json(payload)
  } catch (err) {
    console.error('[PATCH /api/chat/messages/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** DELETE /api/chat/messages/[id] — delete a message. Normally only the
 * sender can soft-delete their own message, and it disappears (shows a
 * "deleted" placeholder) for everyone in the room — that's correct for a
 * message someone actually owns and sent.
 *
 * A system message (userId: null) has no sender and no single owner — it's
 * a shared broadcast every participant of a 'system' room (e.g. "System
 * Alerts") sees. For a regular user, deleting one only clears it for them
 * (a row in chat_message_dismissals), never for every other admin/cashier
 * still in the room.
 *
 * In Team Chat (General) and System Alerts specifically, admins get a real,
 * room-wide delete instead of either restriction above — a genuine removal
 * (the row is actually deleted, not soft-deleted with a placeholder),
 * broadcast as chat:message:removed so it's fully gone for everyone, not
 * left as a "this message was deleted" bubble cluttering a channel an
 * admin is specifically trying to keep clean. This does NOT extend to a
 * Direct Message or Group — an admin deleting there still only follows the
 * regular own-message rules above, same as anyone else; this is message
 * hygiene for the two broadcast/shared channels, not general moderation
 * power over other people's private conversations. */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const isAdmin = user.role === 'admin'

    const message = await prisma.chatMessages.findUnique({ where: { id: params.id } })
    if (!message) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (isAdmin) {
      // Deliberately restricted to the two broadcast/shared channels (same
      // boundary the bulk-clear route uses) — an admin can keep Team Chat
      // and System Alerts clean, but this is not a general moderation power
      // over other people's private Direct Messages or Groups.
      const generalRoom = await getGeneralRoom()
      const isGeneral = message.roomId === generalRoom.id
      let isSystemRoom = false
      if (!isGeneral && message.roomId) {
        const room = await prisma.chatRooms.findUnique({ where: { id: message.roomId }, select: { type: true } })
        isSystemRoom = room?.type === 'system'
      }
      if (isGeneral || isSystemRoom) {
        await prisma.chatMessages.delete({ where: { id: params.id } })
        try {
          if (isGeneral) {
            emitToRoom('chat:general', 'chat:message:removed', { id: params.id })
          } else if (message.roomId) {
            const participants = await prisma.chatParticipants.findMany({ where: { roomId: message.roomId } })
            const participantIds = participants.map(p => p.userId).filter((id): id is string => !!id)
            emitToUsers(participantIds, 'chat:message:removed', { id: params.id })
          }
        } catch { /* non-critical */ }
        return NextResponse.json({ success: true })
      }
      // Falls through to the regular rules below for a DM/Group message.
    }

    if (message.userId === null) {
      const room = await prisma.chatRooms.findUnique({ where: { id: message.roomId! }, select: { type: true } })
      if (room?.type !== 'system') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      const membership = await prisma.chatParticipants.findFirst({ where: { roomId: message.roomId!, userId: user.id } })
      if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

      await prisma.chatMessageDismissals.upsert({
        where: { messageId_userId: { messageId: params.id, userId: user.id } },
        create: { messageId: params.id, userId: user.id },
        update: {},
      })
      return NextResponse.json({ success: true })
    }

    if (message.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.chatMessages.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    })

    // Notify the right audience — General broadcasts room-wide, everything
    // else (DMs/groups) only to its own participants.
    try {
      const generalRoom = await getGeneralRoom()
      if (message.roomId === generalRoom.id) {
        emitToRoom('chat:general', 'chat:message:deleted', { id: params.id })
      } else if (message.roomId) {
        const participants = await prisma.chatParticipants.findMany({ where: { roomId: message.roomId } })
        const participantIds = participants.map(p => p.userId).filter((id): id is string => !!id)
        emitToUsers(participantIds, 'chat:message:deleted', { id: params.id })
      }
    } catch { /* non-critical */ }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/chat/messages/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
