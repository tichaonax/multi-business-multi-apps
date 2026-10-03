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
