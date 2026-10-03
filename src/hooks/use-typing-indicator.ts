'use client'

import { useRef, useCallback, useEffect, useState } from 'react'
import type { Socket } from 'socket.io-client'

export interface TypingUser { userId: string; userName: string }

const TYPING_EMIT_THROTTLE_MS = 2000 // don't re-announce "typing" more often than this
const TYPING_STOP_IDLE_MS = 3000     // auto-announce "stopped" after this long with no keystrokes
const TYPING_EXPIRE_MS = 4000        // receiver-side fallback if a stop-typing signal is missed

/**
 * Sender side — call notifyTyping() from the composer's onChange, and
 * notifyStopTyping() right after a successful send (or when the draft is
 * cleared). Internally throttled so every keystroke doesn't hit the socket.
 */
export function useTypingEmitter(
  socket: Socket | null,
  roomId: string | null,
  currentUserId: string | undefined,
  currentUserName: string | null | undefined,
  participantIds?: string[], // other participants to relay to — required for a DM/group, unused for General
) {
  const lastEmitRef = useRef(0)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTypingRef = useRef(false)

  const notifyStopTyping = useCallback(() => {
    if (idleTimerRef.current) { clearTimeout(idleTimerRef.current); idleTimerRef.current = null }
    if (!isTypingRef.current || !socket || !currentUserId) { isTypingRef.current = false; return }
    isTypingRef.current = false
    socket.emit('chat:stop-typing', { roomId, userId: currentUserId, participantIds })
  }, [socket, roomId, currentUserId, participantIds])

  const notifyTyping = useCallback(() => {
    if (!socket || !currentUserId) return
    const now = Date.now()
    if (!isTypingRef.current || now - lastEmitRef.current > TYPING_EMIT_THROTTLE_MS) {
      isTypingRef.current = true
      lastEmitRef.current = now
      socket.emit('chat:typing', { roomId, userId: currentUserId, userName: currentUserName || 'Someone', participantIds })
    }
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(notifyStopTyping, TYPING_STOP_IDLE_MS)
  }, [socket, roomId, currentUserId, currentUserName, participantIds, notifyStopTyping])

  // Best-effort — if the socket was never connected this is a silent no-op,
  // left to the receiver-side expiry timer to clean up instead.
  useEffect(() => () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    if (isTypingRef.current && socket && currentUserId) {
      socket.emit('chat:stop-typing', { roomId, userId: currentUserId, participantIds })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { notifyTyping, notifyStopTyping }
}

/**
 * Receiver side — tracks who's typing, per room ('general' key for Team
 * Chat), with an auto-expiry fallback in case a stop-typing signal from the
 * sender is missed (tab closed, connection drop, etc).
 */
export function useTypingTracker(socket: Socket | null, currentUserId: string | undefined) {
  const [typingByRoom, setTypingByRoom] = useState<Record<string, TypingUser[]>>({})
  const expireTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    if (!socket) return
    const keyOf = (roomId: string | null) => roomId ?? 'general'

    const onTyping = (data: { roomId: string | null; userId: string; userName: string }) => {
      if (data.userId === currentUserId) return
      const key = keyOf(data.roomId)
      const timerKey = `${key}:${data.userId}`
      setTypingByRoom(prev => {
        const existing = prev[key] ?? []
        if (existing.some(u => u.userId === data.userId)) return prev
        return { ...prev, [key]: [...existing, { userId: data.userId, userName: data.userName }] }
      })
      if (expireTimers.current[timerKey]) clearTimeout(expireTimers.current[timerKey])
      expireTimers.current[timerKey] = setTimeout(() => {
        setTypingByRoom(prev => ({ ...prev, [key]: (prev[key] ?? []).filter(u => u.userId !== data.userId) }))
        delete expireTimers.current[timerKey]
      }, TYPING_EXPIRE_MS)
    }

    const onStopTyping = (data: { roomId: string | null; userId: string }) => {
      const key = keyOf(data.roomId)
      const timerKey = `${key}:${data.userId}`
      if (expireTimers.current[timerKey]) { clearTimeout(expireTimers.current[timerKey]); delete expireTimers.current[timerKey] }
      setTypingByRoom(prev => ({ ...prev, [key]: (prev[key] ?? []).filter(u => u.userId !== data.userId) }))
    }

    socket.on('chat:typing', onTyping)
    socket.on('chat:stop-typing', onStopTyping)
    return () => {
      socket.off('chat:typing', onTyping)
      socket.off('chat:stop-typing', onStopTyping)
      Object.values(expireTimers.current).forEach(clearTimeout)
      expireTimers.current = {}
    }
  }, [socket, currentUserId])

  return typingByRoom
}

/** Small formatter shared by every surface that shows "who's typing". */
export function formatTypingLabel(users: TypingUser[]): string {
  if (users.length === 0) return ''
  if (users.length === 1) return `${users[0].userName} is typing…`
  if (users.length === 2) return `${users[0].userName} and ${users[1].userName} are typing…`
  return `${users[0].userName} and ${users.length - 1} others are typing…`
}
