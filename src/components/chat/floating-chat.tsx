'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { io, Socket } from 'socket.io-client'
import { setChatBadge } from '@/lib/chat-badge'

interface Recipient { id: string; name: string }

interface Message {
  id: string
  roomId: string | null
  userId: string
  userName: string
  userPhotoUrl?: string | null
  userInitials?: string
  message: string
  createdAt: string
  deletedAt: string | null
  parentId: string | null
  replyScope: string | null
  replyCount: number
  recipients: Recipient[]
}

interface UserOption { id: string; name: string; online?: boolean }

// MBM-301 — a persistent DM/group conversation, distinct from the single
// General/Team room (which stays represented by activeRoomId === null).
interface RoomSummary {
  id: string
  type: 'direct' | 'group'
  name: string
  participants: { id: string; name: string }[]
  lastMessage: { text: string; at: string; isOwn: boolean } | null
  unreadCount: number
}

const PANEL_W = 360
const PANEL_H = 500
// Composer grows with the message up to ~5 lines, then scrolls internally
// rather than keep shrinking the message list above it.
const MAX_INPUT_HEIGHT = 120
const LAST_OPENED_KEY = 'chat_last_opened_at'

// Colour palette for other users — deterministic from userId so every client sees the same colours
const PALETTE = [
  { avatar: 'bg-rose-500',    name: 'text-rose-600 dark:text-rose-400',    border: 'border-l-rose-400'    },
  { avatar: 'bg-amber-500',   name: 'text-amber-600 dark:text-amber-400',   border: 'border-l-amber-400'   },
  { avatar: 'bg-emerald-500', name: 'text-emerald-600 dark:text-emerald-400', border: 'border-l-emerald-400' },
  { avatar: 'bg-cyan-600',    name: 'text-cyan-600 dark:text-cyan-400',     border: 'border-l-cyan-400'    },
  { avatar: 'bg-violet-500',  name: 'text-violet-600 dark:text-violet-400', border: 'border-l-violet-400'  },
  { avatar: 'bg-pink-500',    name: 'text-pink-600 dark:text-pink-400',     border: 'border-l-pink-400'    },
  { avatar: 'bg-orange-500',  name: 'text-orange-600 dark:text-orange-400', border: 'border-l-orange-400'  },
  { avatar: 'bg-teal-600',    name: 'text-teal-600 dark:text-teal-400',     border: 'border-l-teal-400'    },
]

function getUserColor(userId: string) {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i)
    hash |= 0
  }
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

export function FloatingChat() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const currentUserId = (session?.user as any)?.id as string | undefined

  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [connected, setConnected] = useState(false)
  const [unread, setUnread] = useState(0)
  const [unreadDirect, setUnreadDirect] = useState(0)

  // Threading
  const [replyingTo, setReplyingTo] = useState<{ id: string; userName: string } | null>(null)
  const [replyScope, setReplyScope] = useState<'OWNER' | 'ALL'>('ALL')
  const [allUsers, setAllUsers] = useState<UserOption[]>([])
  const [expandedThreads, setExpandedThreads] = useState<Record<string, Message[]>>({})
  const [loadingThreads, setLoadingThreads] = useState<Record<string, boolean>>({})
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null)
  const [showOnlineTooltip, setShowOnlineTooltip] = useState(false)

  // MBM-301 — persistent conversations (DMs/groups) alongside General/Team.
  // activeRoomId === null means "General/Team" — today's only conversation.
  const [view, setView] = useState<'list' | 'conversation'>('conversation')
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null)
  const [rooms, setRooms] = useState<RoomSummary[]>([])
  const [loadingRooms, setLoadingRooms] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [newChatSearch, setNewChatSearch] = useState('')
  const [newChatSelectedIds, setNewChatSelectedIds] = useState<string[]>([])
  const [newChatGroupName, setNewChatGroupName] = useState('')
  const [creatingRoom, setCreatingRoom] = useState(false)

  // Drag offset from the CSS bottom-right anchor (right: 24, bottom: 72)
  const [drag, setDrag] = useState({ dx: 0, dy: 0 })
  const dragRef = useRef<{ startMouseX: number; startMouseY: number; startDx: number; startDy: number } | null>(null)

  const socketRef = useRef<Socket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const isOpenRef = useRef(isOpen)
  useEffect(() => { isOpenRef.current = isOpen }, [isOpen])
  // The socket message handler below is registered once (on connect) — these
  // mirror fast-changing state into refs so it always reads the CURRENT
  // active room/view instead of whatever was current when it was registered.
  const activeRoomIdRef = useRef<string | null>(null)
  useEffect(() => { activeRoomIdRef.current = activeRoomId }, [activeRoomId])
  const viewRef = useRef<'list' | 'conversation'>(view)
  useEffect(() => { viewRef.current = view }, [view])
  // Resolved once from the server so incoming socket messages can tell a
  // General/Team message apart from a DM/group one by roomId alone.
  const generalRoomIdRef = useRef<string | null>(null)
  // Auto-open timer: tracks the scheduled auto-close so we can cancel it on manual open
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelAutoClose = () => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current)
      autoCloseTimerRef.current = null
    }
  }

  // Manual open: clear unread, record last-opened time, cancel any pending auto-close
  const openManually = useCallback(() => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current)
      autoCloseTimerRef.current = null
    }
    setUnread(0)
    setUnreadDirect(0)
    localStorage.setItem(LAST_OPENED_KEY, new Date().toISOString())
    setIsOpen(true)
  }, [])

  // Cancel auto-close on unmount
  useEffect(() => () => cancelAutoClose(), [])

  // Broadcast badge counts so GlobalHeader's mobile chat toggle (right after
  // the hamburger — see MBM-299 responsive follow-up) can mirror them
  // without duplicating the socket/unread-tracking logic.
  useEffect(() => {
    const roomsUnread = rooms.reduce((sum, r) => sum + r.unreadCount, 0)
    setChatBadge({ unread, unreadDirect: unreadDirect + roomsUnread, onlineCount: allUsers.filter(u => u.online).length })
  }, [unread, unreadDirect, allUsers, rooms])


  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // MBM-301 — fetch a room's message history (null = General/Team).
  const loadMessages = useCallback((roomId: string | null) => {
    const qs = roomId ? `?roomId=${encodeURIComponent(roomId)}` : ''
    return fetch(`/api/chat/messages${qs}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .catch(() => [])
  }, [])

  // MBM-301 — fetch the current user's DM/group conversation list.
  const loadRooms = useCallback(() => {
    if (status !== 'authenticated') return Promise.resolve([] as RoomSummary[])
    setLoadingRooms(true)
    return fetch('/api/chat/rooms', { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then((data: RoomSummary[]) => { setRooms(data); return data })
      .catch(() => [] as RoomSummary[])
      .finally(() => setLoadingRooms(false))
  }, [status])

  // MBM-301 — switch the panel into a conversation (null = General/Team),
  // loading its history and clearing its unread badge.
  const switchRoom = useCallback((roomId: string | null) => {
    setActiveRoomId(roomId)
    setView('conversation')
    setExpandedThreads({})
    setReplyingTo(null)
    setReplyScope('ALL')
    loadMessages(roomId).then((data: Message[]) => { setMessages(data || []); setTimeout(scrollToBottom, 50) })
    if (roomId) {
      setRooms(prev => prev.map(r => r.id === roomId ? { ...r, unreadCount: 0 } : r))
      fetch(`/api/chat/rooms/${roomId}/read`, { method: 'POST', credentials: 'include' }).catch(() => {})
    } else {
      setUnread(0)
      setUnreadDirect(0)
    }
  }, [loadMessages, scrollToBottom])

  // Fetch message history and seed unread counts from messages received since last open
  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/chat/rooms/general', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then((data: { id: string } | null) => { if (data) generalRoomIdRef.current = data.id })
      .catch(() => {})
    fetch('/api/chat/messages', { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then((data: Message[]) => {
        setMessages(data)
        setTimeout(scrollToBottom, 50)
        const since = new Date(localStorage.getItem(LAST_OPENED_KEY) ?? 0)
        const fresh = data.filter(m => m.userId !== currentUserId && !m.deletedAt && new Date(m.createdAt) > since)
        setUnreadDirect(fresh.filter(m => m.recipients.some(r => r.id === currentUserId)).length)
        setUnread(fresh.filter(m => m.recipients.length === 0).length)
      })
      .catch(() => {})
    loadRooms()
  }, [status, scrollToBottom, loadRooms])

  // Socket.io connection
  useEffect(() => {
    if (status !== 'authenticated') return

    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('join-chat-room')
      // Join personal room so direct messages and notifications reach this user
      if (currentUserId) socket.emit('join-notification-room', { userId: currentUserId })
      // Load users and request online snapshot so presence is available before picker opens
      fetch('/api/users', { credentials: 'include' })
        .then(r => r.ok ? r.json() : [])
        .then((data: any[]) => {
          setAllUsers(prev => {
            // Only set if still empty (don't overwrite if picker already populated it)
            if (prev.length > 0) return prev
            return data.filter((u: any) => u.id !== (session?.user as any)?.id)
          })
          socket.emit('chat:get-online-users')
        })
        .catch(() => {})
    })
    socket.on('disconnect', () => setConnected(false))

    socket.on('chat:message', (msg: Message) => {
      // null roomId only happens for messages predating roomId being added
      // to the payload — treat those as General too.
      const isGeneralMsg = !msg.roomId || msg.roomId === generalRoomIdRef.current
      const targetRoomId = isGeneralMsg ? null : msg.roomId
      const isActiveRoom = viewRef.current === 'conversation' && activeRoomIdRef.current === targetRoomId

      if (msg.parentId) {
        // In General, a thread reply is only "for me" if I'm a listed
        // recipient (today's behaviour). In a DM/group, every member is
        // always the audience, so it's "for me" whenever that room is open.
        const isDirectedAtMe = msg.userId !== currentUserId && (
          isGeneralMsg
            ? (msg.recipients.length > 0 && msg.recipients.some(r => r.id === currentUserId))
            : isActiveRoom
        )

        setExpandedThreads(prev => {
          if (prev[msg.parentId!]) {
            // Thread already open — append the reply
            const already = prev[msg.parentId!].some(m => m.id === msg.id)
            if (already) return prev
            return { ...prev, [msg.parentId!]: [...prev[msg.parentId!], msg] }
          }
          // Auto-expand thread when a targeted reply arrives for me
          if (isDirectedAtMe) return { ...prev, [msg.parentId!]: [msg] }
          return prev
        })
        setMessages(prev => prev.map(m =>
          m.id === msg.parentId ? { ...m, replyCount: m.replyCount + 1 } : m
        ))
        if (isDirectedAtMe) {
          setTimeout(scrollToBottom, 100)
          if (!isOpenRef.current) {
            if (isGeneralMsg) setUnreadDirect(u => u + 1)
            cancelAutoClose()
            setIsOpen(true)
            autoCloseTimerRef.current = setTimeout(() => {
              autoCloseTimerRef.current = null
              setIsOpen(false)
            }, 5000)
          }
        }
        return
      }

      // Top-level message
      if (isActiveRoom) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev
          return [...prev, msg]
        })
        setTimeout(scrollToBottom, 50)
      } else if (!isGeneralMsg) {
        // Not looking at this room right now — keep its list preview fresh.
        setRooms(prev => {
          const idx = prev.findIndex(r => r.id === targetRoomId)
          if (idx === -1) return prev // unknown (brand-new) room — refetched below
          const next = [...prev]
          next[idx] = { ...next[idx], lastMessage: { text: msg.message, at: msg.createdAt, isOwn: msg.userId === currentUserId } }
          return next
        })
      }

      if (msg.userId === currentUserId) return // never badge our own message

      if (!isOpenRef.current) {
        cancelAutoClose()
        if (isGeneralMsg) {
          const isDirect = msg.recipients.length > 0 && msg.recipients.some(r => r.id === currentUserId)
          if (isDirect) setUnreadDirect(u => u + 1); else setUnread(u => u + 1)
        } else {
          // Auto-open straight into the conversation this message belongs to.
          switchRoom(targetRoomId)
          loadRooms() // backfills a brand-new conversation into the list
        }
        setIsOpen(true)
        autoCloseTimerRef.current = setTimeout(() => {
          autoCloseTimerRef.current = null
          setIsOpen(false)
        }, 5000)
      } else if (!isActiveRoom) {
        // Panel is open but on a different conversation (or the list) — just badge it.
        if (isGeneralMsg) {
          const isDirect = msg.recipients.length > 0 && msg.recipients.some(r => r.id === currentUserId)
          if (isDirect) setUnreadDirect(u => u + 1); else setUnread(u => u + 1)
        } else {
          setRooms(prev => {
            if (prev.some(r => r.id === targetRoomId)) {
              return prev.map(r => r.id === targetRoomId ? { ...r, unreadCount: r.unreadCount + 1 } : r)
            }
            loadRooms() // brand-new conversation — not in the list yet
            return prev
          })
        }
      }
    })

    socket.on('chat:message:deleted', ({ id }: { id: string }) => {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, deletedAt: new Date().toISOString() } : m))
    })

    // Presence events — live updates when users come online/offline
    socket.on('user:online', ({ userId }: { userId: string }) => {
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, online: true } : u))
    })
    socket.on('user:offline', ({ userId }: { userId: string }) => {
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, online: false } : u))
    })
    // Snapshot of currently online users (server reads its own room membership)
    socket.on('chat:online-users', ({ onlineIds }: { onlineIds: string[] }) => {
      const onlineSet = new Set(onlineIds)
      setAllUsers(prev => prev.map(u => ({ ...u, online: onlineSet.has(u.id) })))
    })

    return () => { socket.disconnect(); socketRef.current = null }
  }, [status, scrollToBottom, switchRoom, loadRooms])

  // Re-fetch history and scroll whenever panel opens (auto or manual)
  useEffect(() => {
    if (isOpen) {
      loadRooms()
      if (view === 'conversation') {
        loadMessages(activeRoomId).then((data: Message[]) => { setMessages(data || []); setTimeout(scrollToBottom, 50) })
      }
      fetch('/api/notifications/read-all?type=CHAT_MESSAGE', { method: 'PUT', credentials: 'include' }).catch(() => {})
      setTimeout(() => { scrollToBottom(); inputRef.current?.focus() }, 100)
    }
    // Only re-run on open/close — intentionally not on every room/view change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, scrollToBottom])

  // Grow the composer upward as the user types past one line, instead of
  // scrolling the text sideways — capped so a long paste still leaves room
  // for the message list above it.
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT)}px`
  }, [newMessage])

  // Listen for sidebar "chat:open" event
  useEffect(() => {
    window.addEventListener('chat:open', openManually)
    return () => window.removeEventListener('chat:open', openManually)
  }, []) // openManually is stable (useCallback with no deps)

  // ── Drag ──────────────────────────────────────────────────────────────────
  const onHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = { startMouseX: e.clientX, startMouseY: e.clientY, startDx: drag.dx, startDy: drag.dy }
    e.preventDefault()
  }, [drag])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const { startMouseX, startMouseY, startDx, startDy } = dragRef.current
      // Moving mouse right → panel moves right → right anchor decreases → dx decreases
      const newDx = startDx - (e.clientX - startMouseX)
      // Moving mouse down → panel moves down → bottom anchor decreases → dy decreases
      const newDy = startDy - (e.clientY - startMouseY)
      setDrag({ dx: newDx, dy: newDy })
    }
    const onMouseUp = () => { dragRef.current = null }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  // ── Load all users when the "New chat" picker opens ──────────────────────
  useEffect(() => {
    if (!showNewChat || !currentUserId) return
    fetch('/api/users', { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => {
        setAllUsers(data.filter((u: any) => u.id !== currentUserId))
        // Ask socket server for live room membership to get accurate online status
        socketRef.current?.emit('chat:get-online-users')
      })
      .catch(() => {})
  }, [showNewChat, currentUserId])

  const toggleNewChatUser = (userId: string) => {
    setNewChatSelectedIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId])
  }

  const closeNewChat = () => {
    setShowNewChat(false)
    setNewChatSearch('')
    setNewChatSelectedIds([])
    setNewChatGroupName('')
  }

  // MBM-301 — find-or-create a DM (one person) or create a group (2+, named)
  const startNewChat = async () => {
    if (newChatSelectedIds.length === 0 || creatingRoom) return
    if (newChatSelectedIds.length > 1 && !newChatGroupName.trim()) return
    setCreatingRoom(true)
    try {
      const body: any = { userIds: newChatSelectedIds }
      if (newChatSelectedIds.length > 1) body.name = newChatGroupName.trim()
      const res = await fetch('/api/chat/rooms', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) return
      const created: { id: string } = await res.json()
      closeNewChat()
      await loadRooms()
      switchRoom(created.id)
    } catch { /* non-critical */ } finally {
      setCreatingRoom(false)
    }
  }

  const cancelReply = () => {
    setReplyingTo(null)
    setReplyScope('ALL')
  }

  // ── Load thread replies ────────────────────────────────────────────────────
  const toggleThread = async (msgId: string) => {
    if (expandedThreads[msgId]) {
      setExpandedThreads(prev => { const n = { ...prev }; delete n[msgId]; return n })
      return
    }
    setLoadingThreads(prev => ({ ...prev, [msgId]: true }))
    try {
      const res = await fetch(`/api/chat/messages/${msgId}/replies`, { credentials: 'include' })
      if (res.ok) {
        const replies: Message[] = await res.json()
        setExpandedThreads(prev => ({ ...prev, [msgId]: replies }))
      }
    } catch { /* non-critical */ } finally {
      setLoadingThreads(prev => ({ ...prev, [msgId]: false }))
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  const sendMessage = async () => {
    const text = newMessage.trim()
    if (!text || sending) return
    setSending(true)
    setNewMessage('')
    try {
      const body: any = { message: text }
      if (activeRoomId) body.roomId = activeRoomId
      if (replyingTo) {
        body.parentId = replyingTo.id
        // DM/group rooms have no OWNER/ALL distinction — every member already sees everything.
        if (!activeRoomId) body.replyScope = replyScope
      }
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        setNewMessage(text)
        return
      }
      if (res.ok) {
        const saved: Message = await res.json()
        if (saved.parentId) {
          // Add reply to thread and auto-expand it so the user sees their reply immediately
          setExpandedThreads(prev => {
            const existing = prev[saved.parentId!] ?? []
            if (existing.some(m => m.id === saved.id)) return prev
            return { ...prev, [saved.parentId!]: [...existing, saved] }
          })
          setMessages(prev => prev.map(m =>
            m.id === saved.parentId ? { ...m, replyCount: m.replyCount + 1 } : m
          ))
          setTimeout(scrollToBottom, 100)
        } else {
          setMessages(prev => prev.some(m => m.id === saved.id) ? prev : [...prev, saved])
          setTimeout(scrollToBottom, 50)
          if (activeRoomId) {
            setRooms(prev => prev.map(r => r.id === activeRoomId
              ? { ...r, lastMessage: { text: saved.message, at: saved.createdAt, isOwn: true } }
              : r))
          }
        }
      }
      setReplyingTo(null)
      setReplyScope('ALL')
    } catch {
      setNewMessage(text)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const deleteMessage = async (id: string) => {
    try {
      await fetch(`/api/chat/messages/${id}`, { method: 'DELETE', credentials: 'include' })
      // Optimistically mark as deleted; socket event will sync other clients
      setMessages(prev => prev.map(m => m.id === id ? { ...m, deletedAt: new Date().toISOString() } : m))
    } catch { /* non-critical */ }
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })

  type GroupedMessages = { date: string; msgs: Message[] }[]
  const grouped = messages.reduce<GroupedMessages>((acc, msg) => {
    const d = formatDate(msg.createdAt)
    const last = acc[acc.length - 1]
    if (last && last.date === d) last.msgs.push(msg)
    else acc.push({ date: d, msgs: [msg] })
    return acc
  }, [])

  /** Render a single message bubble (used for both top-level and thread replies) */
  const renderMessage = (msg: Message, isReply = false) => {
    const isOwn = msg.userId === currentUserId
    const color = isOwn ? null : getUserColor(msg.userId)
    const isPrivate = msg.recipients.length > 0
    const myLatestId = [...messages].reverse().find(m => m.userId === currentUserId)?.id
    const isLatestOwn = isOwn && msg.id === myLatestId && !isReply
    const isHovered = hoveredMsgId === msg.id

    return (
      <div
        key={msg.id}
        className={`flex gap-2 mb-2 group ${isOwn ? 'flex-row-reverse' : ''}`}
        onMouseEnter={() => setHoveredMsgId(msg.id)}
        onMouseLeave={() => setHoveredMsgId(null)}
      >
        <div className={`w-7 h-7 rounded-full shrink-0 relative flex items-center justify-center text-[10px] font-bold text-white ${
          isOwn ? 'bg-indigo-500' : color!.avatar
        }`}>
          {msg.userInitials || msg.userName.charAt(0).toUpperCase()}
          {msg.userPhotoUrl && (
            <img
              src={msg.userPhotoUrl}
              alt={msg.userName}
              className="absolute inset-0 w-full h-full object-cover rounded-full"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
          )}
        </div>
        <div className={`max-w-[75%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
          <div className={`flex items-center gap-1.5 mb-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
            {!isOwn && (
              <span className={`text-[10px] font-semibold ml-1 ${color!.name}`}>{msg.userName}</span>
            )}
            {isPrivate && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700">
                🔒 Private
              </span>
            )}
          </div>
          <div className={`px-3 py-1.5 rounded-2xl text-xs leading-relaxed ${
            msg.deletedAt
              ? 'bg-gray-100 dark:bg-gray-800 text-secondary italic border border-dashed border-gray-300 dark:border-gray-600'
              : isOwn
                ? 'bg-indigo-600 text-white rounded-tr-sm'
                : `bg-white dark:bg-gray-800 text-primary border border-border border-l-4 ${color!.border} rounded-tl-sm shadow-sm`
          }`}>
            {msg.deletedAt ? '🚫 This message was deleted' : msg.message}
          </div>
          <div className="flex items-center gap-2 mt-1 mx-1">
            <span className="text-[10px] text-secondary">{formatTime(msg.createdAt)}</span>
            {/* Reply button — shows on hover, not for deleted or already-reply messages */}
            {!msg.deletedAt && !isReply && isHovered && (
              <button
                type="button"
                onClick={() => { setReplyingTo({ id: msg.id, userName: msg.userName }); setReplyScope(isPrivate ? 'OWNER' : 'ALL'); inputRef.current?.focus() }}
                className="flex items-center gap-1 text-[11px] text-indigo-500 hover:text-indigo-700 transition-colors font-medium"
                title="Reply in thread"
              >
                ↩ Reply
              </button>
            )}
            {isLatestOwn && !msg.deletedAt && (
              <button
                type="button"
                onClick={() => deleteMessage(msg.id)}
                className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600 transition-colors font-medium"
                title="Delete message"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            )}
          </div>
          {/* Thread toggle */}
          {!isReply && msg.replyCount > 0 && !msg.deletedAt && (
            <button
              type="button"
              onClick={() => toggleThread(msg.id)}
              className="mt-1 mx-1 text-[11px] text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-1"
            >
              {expandedThreads[msg.id] ? '▲ Hide replies' : `▼ ${msg.replyCount} ${msg.replyCount === 1 ? 'reply' : 'replies'}`}
              {loadingThreads[msg.id] && <span className="text-secondary"> loading…</span>}
            </button>
          )}
          {/* Thread replies */}
          {!isReply && expandedThreads[msg.id] && (
            <div className="mt-1.5 pl-3 border-l-2 border-indigo-200 dark:border-indigo-700 space-y-1 w-full">
              {expandedThreads[msg.id].map(r => renderMessage(r, true))}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (pathname?.startsWith('/customer-display')) return null
  if (status !== 'authenticated') return null

  const activeRoom = activeRoomId ? rooms.find(r => r.id === activeRoomId) : null
  const roomsUnreadTotal = rooms.reduce((sum, r) => sum + r.unreadCount, 0)
  const filteredNewChatUsers = allUsers.filter(u =>
    !newChatSearch.trim() || u.name.toLowerCase().includes(newChatSearch.trim().toLowerCase())
  )

  // ── Minimized bubble ───────────────────────────────────────────────────────
  if (!isOpen) {
    const onlineNow = allUsers.filter(u => u.online)
    const onlineCount = onlineNow.length
    return (
      <div className="hidden lg:block fixed bottom-28 right-2 z-[9998]">
        {/* Hover tooltip: who's online */}
        {showOnlineTooltip && onlineCount > 0 && (
          <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-gray-800 border border-border rounded-xl shadow-lg p-3 w-48 pointer-events-none">
            <p className="text-[10px] font-semibold text-secondary uppercase tracking-wide mb-2">Online now</p>
            {onlineNow.slice(0, 8).map(u => (
              <div key={u.id} className="flex items-center gap-2 py-0.5">
                <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                <span className="text-xs text-gray-800 dark:text-gray-200 truncate">{u.name}</span>
              </div>
            ))}
            {onlineCount > 8 && (
              <p className="text-[10px] text-secondary mt-1">+{onlineCount - 8} more</p>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={openManually}
          onMouseEnter={() => setShowOnlineTooltip(true)}
          onMouseLeave={() => setShowOnlineTooltip(false)}
          className={`relative w-14 h-14 rounded-full text-white shadow-xl flex items-center justify-center transition-colors ${
            (unreadDirect + roomsUnreadTotal) > 0
              ? 'bg-rose-600 hover:bg-rose-700 animate-pulse'
              : unread > 0
                ? 'bg-amber-500 hover:bg-amber-600'
                : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
          title={(unreadDirect + roomsUnreadTotal) > 0 ? 'Direct message!' : unread > 0 ? 'New messages' : 'Team Chat'}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {/* Direct message badge — top-left, rose (General private + DM/group unread) */}
          {(unreadDirect + roomsUnreadTotal) > 0 && (
            <span className="absolute -top-1 -left-1 min-w-[20px] h-5 bg-white text-rose-600 text-[10px] font-bold rounded-full flex items-center justify-center leading-none px-1 border-2 border-rose-600 shadow">
              @{(unreadDirect + roomsUnreadTotal) > 9 ? '9+' : unreadDirect + roomsUnreadTotal}
            </span>
          )}
          {/* General unread badge — top-right, red */}
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
          {/* Online count — bottom-right */}
          {onlineCount > 0 && (
            <span className="absolute -bottom-1 -right-1 min-w-[18px] h-[18px] bg-green-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none px-1 border-2 border-white dark:border-gray-900">
              {onlineCount}
            </span>
          )}
        </button>
      </div>
    )
  }

  // ── Full panel ─────────────────────────────────────────────────────────────
  return (
    <div
      style={{ position: 'fixed', right: 24 + drag.dx, bottom: 72 + drag.dy, width: PANEL_W, height: PANEL_H, zIndex: 9999 }}
      className="flex flex-col rounded-2xl shadow-2xl border border-border bg-white dark:bg-gray-900 overflow-hidden"
    >
      {/* Draggable header */}
      <div
        onMouseDown={onHeaderMouseDown}
        className="flex items-center justify-between px-4 py-3 bg-indigo-600 text-white cursor-grab active:cursor-grabbing select-none shrink-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          {view === 'conversation' && (
            <button
              type="button"
              onMouseDown={e => e.stopPropagation()}
              onClick={() => setView('list')}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors shrink-0"
              title="All conversations"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="font-semibold text-sm truncate">
            {view === 'list' ? 'Chats' : activeRoom ? activeRoom.name : 'Team Chat'}
          </span>
          {view === 'conversation' && (
            <span className={`w-2 h-2 rounded-full shrink-0 ${connected ? 'bg-green-400' : 'bg-gray-400'}`} title={connected ? 'Live' : 'Connecting…'} />
          )}
          {view === 'conversation' && !activeRoomId && (
            <span
              className="text-[10px] text-white/70 font-medium cursor-default shrink-0"
              title={allUsers.filter(u => u.online).length === 0 ? 'No one else is online' : `${allUsers.filter(u => u.online).length} user(s) online`}
            >
              {allUsers.filter(u => u.online).length} online
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {view === 'list' && (
            <button
              type="button"
              onMouseDown={e => e.stopPropagation()}
              onClick={() => setShowNewChat(true)}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
              title="New chat"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
          <button
            type="button"
            onMouseDown={e => e.stopPropagation()}
            onClick={() => { cancelAutoClose(); setIsOpen(false) }}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
            title="Minimise"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <div className="relative flex-1 min-h-0">
          {/* Conversation list */}
          <div className="h-full overflow-y-auto px-2 py-2 bg-gray-50 dark:bg-gray-950">
            {/* Team — pinned, always present */}
            <button
              type="button"
              onClick={() => switchRoom(null)}
              className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm text-primary truncate">Team Chat</div>
                <div className="text-xs text-secondary truncate">{allUsers.filter(u => u.online).length} online</div>
              </div>
              {(unread + unreadDirect) > 0 && (
                <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {(unread + unreadDirect) > 9 ? '9+' : unread + unreadDirect}
                </span>
              )}
            </button>

            {loadingRooms && rooms.length === 0 && (
              <p className="text-center text-xs text-secondary mt-6">Loading…</p>
            )}
            {!loadingRooms && rooms.length === 0 && (
              <p className="text-center text-xs text-secondary mt-6 px-4">No conversations yet — tap + to start one.</p>
            )}
            {rooms.map(room => (
              <button
                key={room.id}
                type="button"
                onClick={() => switchRoom(room.id)}
                className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-colors text-left"
              >
                <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white text-sm font-bold ${
                  room.type === 'group' ? 'bg-violet-500' : getUserColor(room.participants[0]?.id ?? room.id).avatar
                }`}>
                  {room.type === 'group' ? '👥' : room.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-primary truncate">{room.name}</span>
                    {room.lastMessage && <span className="text-[10px] text-secondary shrink-0">{formatTime(room.lastMessage.at)}</span>}
                  </div>
                  <div className="text-xs text-secondary truncate">
                    {room.lastMessage ? `${room.lastMessage.isOwn ? 'You: ' : ''}${room.lastMessage.text}` : 'No messages yet'}
                  </div>
                </div>
                {room.unreadCount > 0 && (
                  <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {room.unreadCount > 9 ? '9+' : room.unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* New chat overlay */}
          {showNewChat && (
            <div className="absolute inset-0 z-30 flex flex-col bg-white dark:bg-gray-900">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                <span className="font-semibold text-sm text-primary">New chat</span>
                <button type="button" onClick={closeNewChat} className="text-secondary hover:text-primary text-lg leading-none" title="Close">×</button>
              </div>
              <div className="px-4 pt-3 shrink-0">
                <input
                  type="text"
                  autoFocus
                  value={newChatSearch}
                  onChange={e => setNewChatSearch(e.target.value)}
                  placeholder="Search people…"
                  className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-gray-50 dark:bg-gray-800 text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {newChatSelectedIds.length > 0 && (
                <div className="px-4 pt-2 flex flex-wrap gap-1 shrink-0">
                  {newChatSelectedIds.map(id => {
                    const u = allUsers.find(u => u.id === id)
                    return (
                      <span key={id} className="flex items-center gap-1 text-[11px] bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-700">
                        {u?.name ?? '…'}
                        <button type="button" onClick={() => toggleNewChatUser(id)} className="hover:text-red-500">✕</button>
                      </span>
                    )
                  })}
                </div>
              )}
              <div className="flex-1 overflow-y-auto px-2 py-2">
                {filteredNewChatUsers.length === 0 ? (
                  <p className="text-center text-xs text-secondary mt-4">{allUsers.length === 0 ? 'Loading…' : 'No users found'}</p>
                ) : filteredNewChatUsers.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleNewChatUser(u.id)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg flex items-center gap-2"
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${u.online ? 'bg-green-400' : 'bg-gray-400'}`} />
                    <span className="truncate flex-1 text-primary">{u.name}</span>
                    {newChatSelectedIds.includes(u.id) && <span className="text-indigo-600 shrink-0">✓</span>}
                  </button>
                ))}
              </div>
              {newChatSelectedIds.length > 1 && (
                <div className="px-4 pt-1 shrink-0">
                  <input
                    type="text"
                    value={newChatGroupName}
                    onChange={e => setNewChatGroupName(e.target.value)}
                    placeholder="Group name"
                    className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-gray-50 dark:bg-gray-800 text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
              <div className="p-4 shrink-0">
                <button
                  type="button"
                  onClick={startNewChat}
                  disabled={creatingRoom || newChatSelectedIds.length === 0 || (newChatSelectedIds.length > 1 && !newChatGroupName.trim())}
                  className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium transition-colors"
                >
                  {creatingRoom ? 'Starting…' : newChatSelectedIds.length > 1 ? 'Create Group' : 'Start Chat'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
      <>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 bg-gray-50 dark:bg-gray-950">
        {messages.length === 0 && (
          <p className="text-center text-xs text-secondary mt-8">No messages yet. Say hello!</p>
        )}
        {grouped.map(({ date, msgs }) => (
          <div key={date}>
            <div className="flex items-center gap-2 my-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] text-secondary font-medium">{date}</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            {msgs.map(msg => renderMessage(msg))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-white dark:bg-gray-900 px-3 py-3 shrink-0 space-y-2">
        {/* Reply-to banner */}
        {replyingTo && (
          <div className="flex items-center gap-2 text-xs bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-700 rounded-lg px-3 py-1.5">
            <span className="text-indigo-600 dark:text-indigo-400 flex-1 truncate">
              ↩ Replying to <strong>{replyingTo.userName}</strong>
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {/* OWNER/ALL only applies in General — a DM/group's whole
                  membership is already the audience for every reply. */}
              {!activeRoomId && (
                <>
                  <button
                    type="button"
                    onClick={() => setReplyScope('OWNER')}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors ${replyScope === 'OWNER' ? 'bg-indigo-600 text-white border-indigo-600' : 'text-indigo-600 border-indigo-300 hover:bg-indigo-50'}`}
                  >
                    Reply to sender
                  </button>
                  <button
                    type="button"
                    onClick={() => setReplyScope('ALL')}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors ${replyScope === 'ALL' ? 'bg-indigo-600 text-white border-indigo-600' : 'text-indigo-600 border-indigo-300 hover:bg-indigo-50'}`}
                  >
                    Reply to all
                  </button>
                </>
              )}
              <button type="button" onClick={cancelReply} className="text-secondary hover:text-primary ml-1" title="Cancel reply">✕</button>
            </div>
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            autoComplete="off"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder={replyingTo ? `Reply to ${replyingTo.userName}…` : 'Type a message…'}
            className="flex-1 px-4 py-2 rounded-2xl border border-border bg-gray-50 dark:bg-gray-800 resize-none leading-snug
              text-primary text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            style={{ maxHeight: MAX_INPUT_HEIGHT, overflowY: 'auto' }}
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={sending || !newMessage.trim()}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-700
              disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors shrink-0"
            title="Send"
          >
            <svg className="w-4 h-4 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
      </>
      )}
    </div>
  )
}
