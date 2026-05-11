/**
 * In-process store for currently online user IDs.
 * Updated by the Socket.io server when users join/leave their personal rooms.
 */

const onlineUsers = new Set<string>()

export function markUserOnline(userId: string): void {
  onlineUsers.add(userId)
}

export function markUserOffline(userId: string): void {
  onlineUsers.delete(userId)
}

export function getOnlineUserIds(): Set<string> {
  return onlineUsers
}
