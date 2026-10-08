import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getOrCreateDirectRoom, createGroupRoom } from '@/lib/chat/rooms'

/** GET /api/chat/rooms — the current user's DM/group conversations, most recent first. */
export async function GET() {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const allParticipantRows = await prisma.chatParticipants.findMany({
      where: { userId: user.id, chat_rooms: { type: { in: ['direct', 'group', 'system'] } } },
      include: {
        chat_rooms: {
          include: {
            chat_participants: {
              include: {
                users: { select: { id: true, name: true, profilePhotoUrl: true } },
              },
            },
          },
        },
      },
    })

    // Defense in depth: one card per room.id, never per ChatParticipants
    // row. A stray duplicate participant row (the exact bug that flooded
    // the chat list with repeated "System Alerts" entries — see
    // dedupe_chat_participants migration) now just gets silently ignored
    // here instead of rendering as a duplicate room.
    const seenRoomIds = new Set<string>()
    const participantRows = allParticipantRows.filter(p => {
      if (!p.roomId || seenRoomIds.has(p.roomId)) return false
      seenRoomIds.add(p.roomId)
      return true
    })

    const rooms = await Promise.all(participantRows.map(async (p) => {
      const room = p.chat_rooms!
      const [lastMessage, unreadCount] = await Promise.all([
        prisma.chatMessages.findFirst({
          where: { roomId: room.id, parentId: null, deletedAt: null },
          orderBy: { createdAt: 'desc' },
          select: { message: true, createdAt: true, userId: true },
        }),
        prisma.chatMessages.count({
          where: {
            roomId: room.id,
            parentId: null,
            deletedAt: null,
            userId: { not: user.id },
            ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}),
          },
        }),
      ])

      const otherParticipants = room.chat_participants
        .filter(pp => pp.userId !== user.id)
        .map(pp => ({ id: pp.users?.id ?? pp.userId, name: pp.users?.name ?? 'Unknown', photoUrl: pp.users?.profilePhotoUrl ?? null }))

      const displayName = room.type === 'direct'
        ? (otherParticipants[0]?.name ?? 'Unknown')
        : (room.name || otherParticipants.map(o => o.name).join(', ') || 'Group')

      return {
        id: room.id,
        type: room.type as 'direct' | 'group' | 'system',
        name: displayName,
        participants: otherParticipants,
        lastMessage: lastMessage
          ? { text: lastMessage.message, at: lastMessage.createdAt.toISOString(), isOwn: lastMessage.userId === user.id }
          : null,
        unreadCount,
      }
    }))

    rooms.sort((a, b) => {
      const at = a.lastMessage?.at ?? ''
      const bt = b.lastMessage?.at ?? ''
      return bt.localeCompare(at)
    })

    return NextResponse.json(rooms)
  } catch (err) {
    console.error('[GET /api/chat/rooms]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/chat/rooms — start/open a conversation.
 * Body: { userIds: string[], name?: string }
 *   - exactly one userId  -> find-or-create the 1:1 direct room with them
 *   - two or more userIds -> create a new named group room
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const userIds: string[] = Array.isArray(body?.userIds)
      ? body.userIds.filter((id: unknown) => typeof id === 'string' && id !== user.id)
      : []
    if (userIds.length === 0) {
      return NextResponse.json({ error: 'userIds is required' }, { status: 400 })
    }

    if (userIds.length === 1) {
      const room = await getOrCreateDirectRoom(user.id, userIds[0])
      return NextResponse.json({ id: room.id, type: 'direct' }, { status: 201 })
    }

    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    if (!name) {
      return NextResponse.json({ error: 'A group name is required' }, { status: 400 })
    }
    const room = await createGroupRoom(user.id, name, userIds)
    return NextResponse.json({ id: room.id, type: 'group' }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/chat/rooms]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
