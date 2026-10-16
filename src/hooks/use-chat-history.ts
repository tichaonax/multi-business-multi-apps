'use client'

import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react'
import { isUserPresent, onUserPresent } from '@/lib/chat/user-presence'

/**
 * MBM-315 — sliding-window chat history, shared by DM/group ChatWindows and
 * the hub's Team Chat. Only ~one screen of messages is fetched at a time
 * (GET /api/chat/messages pages of 30, keyset by message id); scrolling near
 * the top fetches older, near the bottom fetches newer. Opens at the first
 * message the user hasn't seen (server-side `firstUnreadId`), or the latest.
 *
 * The caller renders `messages` inside an element given `scrollRef` +
 * `onScroll`, with each top-level message carrying id `chat-msg-<id>`.
 */

export interface HistoryMessage { id: string; createdAt: string; userId: string | null }

type LoadMode =
  | { kind: 'initial' }
  | { kind: 'latest' }
  | { kind: 'around'; id: string }

type PendingScroll =
  | { type: 'bottom' }
  | { type: 'message'; id: string; block: 'start' | 'center' }
  | { type: 'preserve'; prevHeight: number; prevTop: number }

const NEAR_EDGE_PX = 200
// "Seen" is reported at most this often (scrolling through 100 messages
// would otherwise send 100 read updates).
const SEEN_FLUSH_MS = 800

interface Options<M> {
  /** null = General/Team. */
  roomId: string | null
  /** Called when the newest on-screen message that `countsAsSeen` grows —
   * drives the read position (DM/group read receipts, Team Chat marker).
   * Batched (SEEN_FLUSH_MS) and only while the user is actually present
   * (page visible + recent activity, MBM-313); otherwise held until they
   * come back. */
  onSeen?: (msg: M) => void
  countsAsSeen?: (msg: M) => boolean
}

export function useChatHistory<M extends HistoryMessage>({ roomId, onSeen, countsAsSeen }: Options<M>) {
  const [messages, setMessages] = useState<M[]>([])
  const [hasMoreBefore, setHasMoreBefore] = useState(false)
  const [hasMoreAfter, setHasMoreAfter] = useState(false)
  const [firstUnreadId, setFirstUnreadId] = useState<string | null>(null)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [loadingNewer, setLoadingNewer] = useState(false)
  const [loaded, setLoaded] = useState(false)
  // Live messages that arrived while the user was scrolled up / away from
  // the newest page — counted for the "↓ N new messages" button.
  const [newBelowCount, setNewBelowCount] = useState(0)

  const scrollRef = useRef<HTMLDivElement>(null)
  const pendingScrollRef = useRef<PendingScroll | null>(null)
  // Mirrors for async callbacks (fetches resolve after re-renders).
  const messagesRef = useRef<M[]>([])
  const hasMoreBeforeRef = useRef(false)
  const hasMoreAfterRef = useRef(false)
  messagesRef.current = messages
  hasMoreBeforeRef.current = hasMoreBefore
  hasMoreAfterRef.current = hasMoreAfter
  const busyOlderRef = useRef(false)
  const busyNewerRef = useRef(false)
  // Bumped by every full (re)load so a stale in-flight page is discarded.
  const generationRef = useRef(0)
  const lastSeenAtRef = useRef<string>('')
  const onSeenRef = useRef(onSeen)
  const countsAsSeenRef = useRef(countsAsSeen)
  onSeenRef.current = onSeen
  countsAsSeenRef.current = countsAsSeen

  const fetchPage = useCallback(async (qs: string) => {
    const prefix = roomId ? `roomId=${encodeURIComponent(roomId)}&` : ''
    try {
      const r = await fetch(`/api/chat/messages?${prefix}${qs}`, { credentials: 'include' })
      if (!r.ok) return null
      return await r.json() as { messages: M[]; hasMoreBefore: boolean; hasMoreAfter: boolean; firstUnreadId: string | null }
    } catch { return null }
  }, [roomId])

  const isNearBottom = () => {
    const el = scrollRef.current
    return !el || el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_EDGE_PX
  }

  /** Replace the window entirely (open, jump to latest, jump to a message). */
  const load = useCallback(async (mode: LoadMode) => {
    const gen = ++generationRef.current
    const qs = mode.kind === 'latest' ? 'latest=1'
      : mode.kind === 'around' ? `around=${encodeURIComponent(mode.id)}`
      : ''
    const page = await fetchPage(qs)
    if (gen !== generationRef.current || !page) return false
    busyOlderRef.current = false
    busyNewerRef.current = false
    setLoadingOlder(false)
    setLoadingNewer(false)
    setMessages(page.messages)
    setHasMoreBefore(page.hasMoreBefore)
    setHasMoreAfter(page.hasMoreAfter)
    setFirstUnreadId(mode.kind === 'initial' ? page.firstUnreadId : null)
    setNewBelowCount(0)
    setLoaded(true)
    pendingScrollRef.current =
      mode.kind === 'around' ? { type: 'message', id: mode.id, block: 'center' }
      : mode.kind === 'initial' && page.firstUnreadId ? { type: 'message', id: page.firstUnreadId, block: 'start' }
      : { type: 'bottom' }
    return true
  }, [fetchPage])

  const loadOlder = useCallback(async () => {
    const first = messagesRef.current[0]
    if (busyOlderRef.current || !hasMoreBeforeRef.current || !first) return
    busyOlderRef.current = true
    setLoadingOlder(true)
    const gen = generationRef.current
    const page = await fetchPage(`before=${encodeURIComponent(first.id)}`)
    if (gen !== generationRef.current) return
    busyOlderRef.current = false
    setLoadingOlder(false)
    if (!page) return
    // Prepending pushes content down — keep what the user is looking at
    // in place (restored in the layout effect below, before paint).
    const el = scrollRef.current
    if (el) pendingScrollRef.current = { type: 'preserve', prevHeight: el.scrollHeight, prevTop: el.scrollTop }
    setMessages(prev => {
      const ids = new Set(prev.map(m => m.id))
      return [...page.messages.filter(m => !ids.has(m.id)), ...prev]
    })
    setHasMoreBefore(page.hasMoreBefore)
  }, [fetchPage])

  const loadNewer = useCallback(async () => {
    const last = messagesRef.current[messagesRef.current.length - 1]
    if (busyNewerRef.current || !hasMoreAfterRef.current || !last) return
    busyNewerRef.current = true
    setLoadingNewer(true)
    const gen = generationRef.current
    const page = await fetchPage(`after=${encodeURIComponent(last.id)}`)
    if (gen !== generationRef.current) return
    busyNewerRef.current = false
    setLoadingNewer(false)
    if (!page) return
    setMessages(prev => {
      const ids = new Set(prev.map(m => m.id))
      return [...prev, ...page.messages.filter(m => !ids.has(m.id))]
    })
    setHasMoreAfter(page.hasMoreAfter)
    if (!page.hasMoreAfter) setNewBelowCount(0)
  }, [fetchPage])

  // Pending "seen" report — flushed after SEEN_FLUSH_MS, but only while the
  // user is present; otherwise it waits for onUserPresent.
  const pendingSeenRef = useRef<M | null>(null)
  const seenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flushSeen = useCallback(() => {
    seenTimerRef.current = null
    const m = pendingSeenRef.current
    if (!m || !isUserPresent()) return
    pendingSeenRef.current = null
    onSeenRef.current?.(m)
  }, [])
  useEffect(() => onUserPresent(() => {
    if (pendingSeenRef.current && !seenTimerRef.current) flushSeen()
  }), [flushSeen])
  // Closing the window right after reading still counts.
  useEffect(() => () => {
    if (seenTimerRef.current) clearTimeout(seenTimerRef.current)
    if (pendingSeenRef.current && isUserPresent()) onSeenRef.current?.(pendingSeenRef.current)
  }, [])

  // Newest on-screen message that counts as "seen" → onSeen (only when it moves forward).
  const checkSeen = useCallback(() => {
    const el = scrollRef.current
    if (!el || !onSeenRef.current) return
    const box = el.getBoundingClientRect()
    const list = messagesRef.current
    for (let i = list.length - 1; i >= 0; i--) {
      const m = list[i]
      if (countsAsSeenRef.current && !countsAsSeenRef.current(m)) continue
      const node = document.getElementById(`chat-msg-${m.id}`)
      if (!node) continue
      const r = node.getBoundingClientRect()
      if (r.top >= box.bottom) continue // still below the fold
      if (r.bottom <= box.top) break // everything earlier is above the fold too
      if (m.createdAt > lastSeenAtRef.current) {
        lastSeenAtRef.current = m.createdAt
        pendingSeenRef.current = m
        if (!seenTimerRef.current) seenTimerRef.current = setTimeout(flushSeen, SEEN_FLUSH_MS)
      }
      break
    }
  }, [flushSeen])

  const checkEdges = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    if (el.scrollTop < NEAR_EDGE_PX) loadOlder()
    if (el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_EDGE_PX) {
      if (hasMoreAfterRef.current) loadNewer()
      else setNewBelowCount(0)
    }
  }, [loadOlder, loadNewer])

  const frameRef = useRef<number | null>(null)
  const onScroll = useCallback(() => {
    if (frameRef.current !== null) return
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      checkEdges()
      checkSeen()
    })
  }, [checkEdges, checkSeen])
  useEffect(() => () => { if (frameRef.current !== null) cancelAnimationFrame(frameRef.current) }, [])

  // Apply any pending scroll as soon as the content (and container) is
  // rendered — runs every render because the container may mount later
  // than the data arrives (e.g. Team Chat view opening).
  useLayoutEffect(() => {
    const el = scrollRef.current
    const pending = pendingScrollRef.current
    if (!el || !pending) return
    pendingScrollRef.current = null
    if (pending.type === 'preserve') {
      el.scrollTop = pending.prevTop + (el.scrollHeight - pending.prevHeight)
    } else if (pending.type === 'bottom') {
      el.scrollTop = el.scrollHeight
    } else {
      const node = document.getElementById(`chat-msg-${pending.id}`)
      if (!node) { el.scrollTop = el.scrollHeight; return }
      const offset = node.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop
      // 'start' leaves room for the "New messages" divider above it.
      el.scrollTop = pending.block === 'start' ? offset - 32 : offset - el.clientHeight / 2 + node.offsetHeight / 2
    }
    // A page shorter than the window, or landing right at an edge, should
    // keep filling; and whatever is now on screen counts as seen.
    requestAnimationFrame(() => { checkEdges(); checkSeen() })
  })

  /** A message arrived over the socket for this room (top-level only). */
  const receiveLive = useCallback((msg: M, isOwn: boolean) => {
    if (hasMoreAfterRef.current) {
      // The loaded window doesn't reach the newest message — appending here
      // would leave a gap. Just count it; "↓ N new" jumps to the latest.
      if (!isOwn) setNewBelowCount(c => c + 1)
      return
    }
    const follow = isOwn || isNearBottom()
    setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
    if (follow) pendingScrollRef.current = { type: 'bottom' }
    else if (!isOwn) setNewBelowCount(c => c + 1)
  }, [])

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    setNewBelowCount(0)
  }, [])

  /** Newest messages: reload if the window doesn't reach them, else scroll. */
  const jumpToLatest = useCallback(async () => {
    if (hasMoreAfterRef.current) await load({ kind: 'latest' })
    else scrollToBottom()
  }, [load, scrollToBottom])

  /** Make sure a message is loaded (fetching the page around it if not). */
  const ensureLoaded = useCallback(async (id: string) => {
    if (messagesRef.current.some(m => m.id === id)) return true
    return load({ kind: 'around', id })
  }, [load])

  return {
    messages, setMessages,
    hasMoreBefore, hasMoreAfter, loadingOlder, loadingNewer, loaded,
    firstUnreadId, newBelowCount,
    scrollRef, onScroll,
    load, receiveLive, jumpToLatest, ensureLoaded, scrollToBottom,
    isNearBottom,
  }
}
