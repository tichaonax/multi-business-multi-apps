import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { emitToRoom, emitToUsers } from '@/lib/customer-display/socket-server'
import { getGeneralRoom, REACTION_SELECT, shapeReactions } from '@/lib/chat/rooms'

/** POST /api/chat/messages/[id]/reactions { emoji } — MBM-328: toggle the
 * signed-in user's emoji reaction on a message (adds it, or removes it if
 * they already reacted with that emoji). Broadcasts the message's new
 * reaction list as chat:message:reactions to everyone who can see it — the
 * same audience an edit goes to. Reactions never create notifications. */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const emoji: string = typeof body?.emoji === 'string' ? body.emoji.trim() : ''
    // An emoji, not text: short, and no letters/digits (keycap/flag emojis are
    // several code points, so allow up to 16 UTF-16 units).
    if (!emoji || emoji.length > 16 || /[A-Za-z0-9\s]/.test(emoji)) {
      return NextResponse.json({ error: 'A single emoji is required' }, { status: 400 })
    }

    const message = await prisma.chatMessages.findUnique({
      where: { id: params.id },
      select: { id: true, roomId: true, parentId: true, userId: true, deletedAt: true, chat_message_recipients: { select: { userId: true } } },
    })
    if (!message) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (message.deletedAt) return NextResponse.json({ error: 'Cannot react to a deleted message' }, { status: 400 })

    // Same visibility rules as reading the message: Team Chat is open to all,
    // except a flagged message, which only its sender and flagged users see;
    // any other room needs membership.
    const generalRoom = await getGeneralRoom()
    const isGeneral = !message.roomId || message.roomId === generalRoom.id
    const recipientIds = message.chat_message_recipients.map(r => r.userId)
    let audience: string[] | null = null // null = everyone in Team Chat
    if (isGeneral) {
      if (recipientIds.length > 0) {
        audience = Array.from(new Set([message.userId, ...recipientIds].filter((id): id is string => !!id)))
        if (!audience.includes(user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else {
      const participants = await prisma.chatParticipants.findMany({ where: { roomId: message.roomId! }, select: { userId: true } })
      audience = participants.map(p => p.userId).filter((id): id is string => !!id)
      if (!audience.includes(user.id)) return NextResponse.json({ error: 'Not a participant of this conversation' }, { status: 403 })
    }

    const key = { messageId_userId_emoji: { messageId: message.id, userId: user.id, emoji } }
    const existing = await prisma.chatMessageReactions.findUnique({ where: key, select: { id: true } })
    if (existing) {
      // deleteMany: a fast double-click must not 500 on an already-removed row
      await prisma.chatMessageReactions.deleteMany({ where: { messageId: message.id, userId: user.id, emoji } })
    } else {
      await prisma.chatMessageReactions.upsert({ where: key, create: { messageId: message.id, userId: user.id, emoji }, update: {} })
    }

    const rows = await prisma.chatMessageReactions.findMany({ where: { messageId: message.id }, ...REACTION_SELECT })
    const payload = { id: message.id, roomId: message.roomId, parentId: message.parentId, reactions: shapeReactions(rows) }

    try {
      if (audience) emitToUsers(audience, 'chat:message:reactions', payload)
      else emitToRoom('chat:general', 'chat:message:reactions', payload)
    } catch { /* non-critical */ }

    return NextResponse.json(payload)
  } catch (err) {
    console.error('[POST /api/chat/messages/[id]/reactions]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
