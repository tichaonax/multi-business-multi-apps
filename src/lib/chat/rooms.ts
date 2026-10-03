/**
 * MBM-301 — conversation rooms (DMs & groups) built on the existing
 * ChatRooms/ChatParticipants tables, which previously only ever backed the
 * single hardcoded "General" broadcast room.
 */

import { prisma } from '@/lib/prisma'

export const GENERAL_ROOM_NAME = 'General'

/** Get or create the single general chat room — unchanged from before MBM-301. */
export async function getGeneralRoom() {
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

/** Find the existing 1:1 room between exactly these two users, or create one. */
export async function getOrCreateDirectRoom(userId: string, otherUserId: string) {
  if (userId === otherUserId) {
    throw new Error('Cannot start a direct conversation with yourself')
  }

  const candidates = await prisma.chatRooms.findMany({
    where: {
      type: 'direct',
      AND: [
        { chat_participants: { some: { userId } } },
        { chat_participants: { some: { userId: otherUserId } } },
      ],
    },
    include: { chat_participants: true },
  })
  // AND-of-some can match a room that also has other members (defensive —
  // direct rooms are only ever created with exactly these two below); only
  // reuse one that is actually just the two of them.
  const exact = candidates.find(r => r.chat_participants.length === 2)
  if (exact) return exact

  return prisma.chatRooms.create({
    data: {
      name: '',
      type: 'direct',
      createdBy: userId,
      chat_participants: { create: [{ userId }, { userId: otherUserId }] },
    },
  })
}

/** Create a new named group room with the creator plus the given members. */
export async function createGroupRoom(creatorId: string, name: string, memberIds: string[]) {
  const allIds = Array.from(new Set([creatorId, ...memberIds]))
  return prisma.chatRooms.create({
    data: {
      name,
      type: 'group',
      createdBy: creatorId,
      chat_participants: { create: allIds.map(userId => ({ userId })) },
    },
  })
}

/** Shape a raw DB message into the API payload — shared by the messages and
 * group-membership routes so a system message (e.g. "added X to the group")
 * comes back in exactly the same shape as a normal one. */
export function shapeMessage(m: any, replyCount = 0) {
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
    // A system message (e.g. membership changes) has no sender — the client
    // renders these as a centered event line instead of a chat bubble.
    isSystem: m.userId === null,
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

/** Posts a system/event message (e.g. "Alice added Bob to the group") into a
 * room and returns the shaped payload, ready to persist history and emit. */
export async function postSystemMessage(roomId: string, text: string) {
  const created = await prisma.chatMessages.create({
    data: { roomId, userId: null, message: text },
  })
  return shapeMessage(created, 0)
}
