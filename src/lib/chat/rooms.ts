/**
 * MBM-301 — conversation rooms (DMs & groups) built on the existing
 * ChatRooms/ChatParticipants tables, which previously only ever backed the
 * single hardcoded "General" broadcast room.
 */

import { prisma } from '@/lib/prisma'

export const GENERAL_ROOM_NAME = 'General'

// A message can only be edited by its sender, only while it's still their
// most recent message in the room, and only within this window of sending.
export const EDIT_WINDOW_MS = 15 * 60 * 1000

// Default history load shows only the last 30 days — anything older sits
// behind a collapsed per-month placeholder the user can expand on demand
// (see /api/chat/messages/months and the ?month= param on the main GET).
export const DEFAULT_HISTORY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

/** Get or create the single general chat room. A startup race here (two
 * near-simultaneous calls both finding nothing, both creating a row) once
 * produced two "General" rows, and findFirst() with no orderBy then
 * returned whichever one Postgres felt like, flipping between them and
 * making the real chat history appear to vanish — see the
 * merge_duplicate_general_rooms migration. orderBy here is defense in
 * depth; the actual fix is the partial unique index that migration adds,
 * which turns a repeat of that race into the P2002 caught below instead of
 * a second row. */
export async function getGeneralRoom() {
  let room = await prisma.chatRooms.findFirst({
    where: { name: GENERAL_ROOM_NAME, type: 'group' },
    orderBy: { createdAt: 'asc' },
  })
  if (!room) {
    try {
      room = await prisma.chatRooms.create({
        data: { name: GENERAL_ROOM_NAME, type: 'group' },
      })
    } catch (err: any) {
      if (err?.code === 'P2002') {
        room = await prisma.chatRooms.findFirst({
          where: { name: GENERAL_ROOM_NAME, type: 'group' },
          orderBy: { createdAt: 'asc' },
        })
      } else {
        throw err
      }
    }
  }
  return room!
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
  // Users.firstName/lastName/profilePhotoUrl are kept in sync with a linked
  // Employee record (if any), so chat reads them straight off Users and
  // never needs to know whether this sender has an Employee record at all.
  const firstName: string = m.users?.firstName ?? ''
  const lastName: string = m.users?.lastName ?? ''
  const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || (m.users?.name ?? '?').charAt(0).toUpperCase()
  return {
    id: m.id,
    roomId: m.roomId ?? null,
    userId: m.userId,
    userName: m.users?.name ?? 'Unknown',
    userPhotoUrl: m.users?.profilePhotoUrl ?? null,
    userInitials: initials,
    // A system message (e.g. membership changes) has no sender — the client
    // renders these as a centered event line instead of a chat bubble.
    isSystem: m.userId === null,
    message: m.message,
    linkUrl: m.linkUrl ?? null,
    createdAt: m.createdAt.toISOString(),
    deletedAt: m.deletedAt?.toISOString() ?? null,
    editedAt: m.editedAt?.toISOString() ?? null,
    editCount: m.editCount ?? 0,
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
 * room and returns the shaped payload, ready to persist history and emit.
 * Optional linkUrl renders as an action link (e.g. a compliance alert
 * deep-linking into Fleet Management) — see shapeMessage.
 *
 * Optional recipientUserIds restricts visibility to exactly those users —
 * same ChatMessageRecipients mechanism a normal "private reply" already
 * uses (see POST /api/chat/messages), reused here so a system broadcast
 * posted into the shared General room isn't visible to everyone in it. The
 * caller is responsible for emitting only to those users (emitToUsers), not
 * emitToRoom, when recipientUserIds is set.
 */
export async function postSystemMessage(roomId: string, text: string, linkUrl?: string, recipientUserIds?: string[]) {
  const created = await prisma.chatMessages.create({
    data: { roomId, userId: null, message: text, linkUrl: linkUrl ?? null },
  })

  if (recipientUserIds && recipientUserIds.length > 0) {
    await prisma.chatMessageRecipients.createMany({
      data: recipientUserIds.map(uid => ({ messageId: created.id, userId: uid })),
      skipDuplicates: true,
    })
    const full = await prisma.chatMessages.findUnique({
      where: { id: created.id },
      include: { chat_message_recipients: { include: { users: { select: { id: true, name: true } } } } },
    })
    return shapeMessage(full, 0)
  }

  return shapeMessage(created, 0)
}
