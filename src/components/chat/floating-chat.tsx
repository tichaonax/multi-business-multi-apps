'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { io, Socket } from 'socket.io-client'

interface Recipient { id: string; name: string }

interface Message {
  id: string
  userId: string
  userName: string
  message: string
  createdAt: string
  deletedAt: string | null
  parentId: string | null
  replyScope: string | null
  replyCount: number
  recipients: Recipient[]
}

interface UserOption { id: string; name: string; online?: boolean }

const PANEL_W = 360
const PANEL_H = 500

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
  const currentUserId = (session?.user as any)?.id as string | undefined

  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [connected, setConnected] = useState(false)
  const [unread, setUnread] = useState(0)
  const [unreadDirect, setUnreadDirect] = useState(0)

  // Targeted messaging state
  const [replyingTo, setReplyingTo] = useState<{ id: string; userName: string } | null>(null)
  const [replyScope, setReplyScope] = useState<'OWNER' | 'ALL'>('ALL')
  const [recipientIds, setRecipientIds] = useState<string[]>([])
  const [recipientNames, setRecipientNames] = useState<string[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [userOptions, setUserOptions] = useState<UserOption[]>([])
  const [allUsers, setAllUsers] = useState<UserOption[]>([])
  const [showUserSearch, setShowUserSearch] = useState(false)
  const [expandedThreads, setExpandedThreads] = useState<Record<string, Message[]>>({})
  const [loadingThreads, setLoadingThreads] = useState<Record<string, boolean>>({})
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null)
  const [showOnlineTooltip, setShowOnlineTooltip] = useState(false)

  // Drag offset from the CSS bottom-right anchor (right: 24, bottom: 72)
  const [drag, setDrag] = useState({ dx: 0, dy: 0 })
  const dragRef = useRef<{ startMouseX: number; startMouseY: number; startDx: number; startDy: number } | null>(null)

  const socketRef = useRef<Socket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isOpenRef = useRef(isOpen)
  useEffect(() => { isOpenRef.current = isOpen }, [isOpen])
  // Auto-open timer: tracks the scheduled auto-close so we can cancel it on manual open
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelAutoClose = () => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current)
      autoCloseTimerRef.current = null
    }
  }

  // Cancel auto-close on unmount
  useEffect(() => () => cancelAutoClose(), [])


  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Fetch message history
  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/chat/messages', { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then((data: Message[]) => { setMessages(data); setTimeout(scrollToBottom, 50) })
      .catch(() => {})
  }, [status, scrollToBottom])

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
      if (msg.parentId) {
        // It's a reply — update the thread if it's expanded or increment replyCount
        setExpandedThreads(prev => {
          if (prev[msg.parentId!]) {
            const already = prev[msg.parentId!].some(m => m.id === msg.id)
            if (already) return prev
            return { ...prev, [msg.parentId!]: [...prev[msg.parentId!], msg] }
          }
          return prev
        })
        setMessages(prev => prev.map(m =>
          m.id === msg.parentId ? { ...m, replyCount: m.replyCount + 1 } : m
        ))
        return
      }
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      setTimeout(scrollToBottom, 50)
      if (!isOpenRef.current) {
        const isDirect = msg.userId !== currentUserId &&
          msg.recipients.length > 0 &&
          msg.recipients.some(r => r.id === currentUserId)
        if (isDirect) {
          setUnreadDirect(u => u + 1)
        } else {
          setUnread(u => u + 1)
        }
        cancelAutoClose()
        setIsOpen(true)
        autoCloseTimerRef.current = setTimeout(() => {
          autoCloseTimerRef.current = null
          setIsOpen(false)
        }, 5000)
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
  }, [status, scrollToBottom])

  // Clear unread, mark DB notifications as read, and scroll when opened
  useEffect(() => {
    if (isOpen) {
      setUnread(0)
      setUnreadDirect(0)
      fetch('/api/notifications/read-all?type=CHAT_MESSAGE', { method: 'PUT', credentials: 'include' }).catch(() => {})
      setTimeout(() => { scrollToBottom(); inputRef.current?.focus() }, 100)
    }
  }, [isOpen, scrollToBottom])

  // Listen for sidebar "chat:open" event
  useEffect(() => {
    const handler = () => setIsOpen(true)
    window.addEventListener('chat:open', handler)
    return () => window.removeEventListener('chat:open', handler)
  }, [])

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

  // ── Load all users when picker opens ─────────────────────────────────────
  useEffect(() => {
    if (!showUserSearch || !currentUserId) return
    fetch('/api/users', { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => {
        setAllUsers(data.filter((u: any) => u.id !== currentUserId))
        // Ask socket server for live room membership to get accurate online status
        socketRef.current?.emit('chat:get-online-users')
      })
      .catch(() => {})
  }, [showUserSearch, currentUserId])

  // ── Filter displayed options from the full list ───────────────────────────
  useEffect(() => {
    const q = userSearch.trim().toLowerCase()
    setUserOptions(
      allUsers.filter(u => !q || u.name.toLowerCase().includes(q))
    )
  }, [userSearch, allUsers])

  const addRecipient = (user: UserOption) => {
    if (!recipientIds.includes(user.id)) {
      setRecipientIds(p => [...p, user.id])
      setRecipientNames(p => [...p, user.name])
    }
    setUserSearch('')
    setUserOptions([])
    setShowUserSearch(false)
  }

  const removeRecipient = (id: string) => {
    const idx = recipientIds.indexOf(id)
    setRecipientIds(p => p.filter((_, i) => i !== idx))
    setRecipientNames(p => p.filter((_, i) => i !== idx))
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
      if (recipientIds.length > 0) body.recipientIds = recipientIds
      if (replyingTo) { body.parentId = replyingTo.id; body.replyScope = replyScope }
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const saved: Message = await res.json()
        if (saved.parentId) {
          // Add reply to thread if expanded, bump replyCount
          setExpandedThreads(prev => {
            if (prev[saved.parentId!]) {
              const already = prev[saved.parentId!].some(m => m.id === saved.id)
              return already ? prev : { ...prev, [saved.parentId!]: [...prev[saved.parentId!], saved] }
            }
            return prev
          })
          setMessages(prev => prev.map(m =>
            m.id === saved.parentId ? { ...m, replyCount: m.replyCount + 1 } : m
          ))
        } else {
          setMessages(prev => prev.some(m => m.id === saved.id) ? prev : [...prev, saved])
          setTimeout(scrollToBottom, 50)
        }
      }
      setReplyingTo(null)
      setReplyScope('ALL')
      setRecipientIds([])
      setRecipientNames([])
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
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 text-white ${
          isOwn ? 'bg-indigo-500' : color!.avatar
        }`}>
          {msg.userName.charAt(0).toUpperCase()}
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
                onClick={() => { setReplyingTo({ id: msg.id, userName: msg.userName }); setReplyScope('ALL'); inputRef.current?.focus() }}
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

  if (status !== 'authenticated') return null

  // ── Minimized bubble ───────────────────────────────────────────────────────
  if (!isOpen) {
    const onlineNow = allUsers.filter(u => u.online)
    const onlineCount = onlineNow.length
    return (
      <div className="fixed bottom-20 right-6 z-[9998]">
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
          onClick={() => { cancelAutoClose(); setIsOpen(true) }}
          onMouseEnter={() => setShowOnlineTooltip(true)}
          onMouseLeave={() => setShowOnlineTooltip(false)}
          className={`relative w-14 h-14 rounded-full text-white shadow-xl flex items-center justify-center transition-colors ${
            unreadDirect > 0
              ? 'bg-rose-600 hover:bg-rose-700 animate-pulse'
              : unread > 0
                ? 'bg-amber-500 hover:bg-amber-600'
                : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
          title={unreadDirect > 0 ? 'Direct message!' : unread > 0 ? 'New messages' : 'Team Chat'}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {/* Direct message badge — top-left, rose */}
          {unreadDirect > 0 && (
            <span className="absolute -top-1 -left-1 min-w-[20px] h-5 bg-white text-rose-600 text-[10px] font-bold rounded-full flex items-center justify-center leading-none px-1 border-2 border-rose-600 shadow">
              @{unreadDirect > 9 ? '9+' : unreadDirect}
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
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="font-semibold text-sm">Team Chat</span>
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-400'}`} title={connected ? 'Live' : 'Connecting…'} />
          <span
            className="text-[10px] text-white/70 font-medium cursor-default"
            title={allUsers.filter(u => u.online).length === 0 ? 'No one else is online' : `${allUsers.filter(u => u.online).length} user(s) online`}
          >
            {allUsers.filter(u => u.online).length} online
          </span>
        </div>
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
              <button type="button" onClick={cancelReply} className="text-secondary hover:text-primary ml-1" title="Cancel reply">✕</button>
            </div>
          </div>
        )}

        {/* Recipient chips */}
        {!replyingTo && (
          <div className="flex flex-wrap items-center gap-1">
            {recipientIds.map((id, i) => (
              <span key={id} className="flex items-center gap-1 text-[11px] bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-700">
                {recipientNames[i]}
                <button type="button" onClick={() => removeRecipient(id)} className="hover:text-red-500">✕</button>
              </span>
            ))}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUserSearch(s => !s)}
                className="text-[11px] text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-0.5"
                title="Add recipient (make private)"
              >
                @ Add
              </button>
              {showUserSearch && (
                <>
                  {/* Overlay for click-away */}
                  <div
                    className="fixed inset-0 z-10"
                    style={{ background: 'transparent' }}
                    onClick={() => setShowUserSearch(false)}
                  />
                  <div className="absolute bottom-full left-0 mb-1 z-20 bg-white dark:bg-gray-800 border border-border rounded-lg shadow-lg w-56">
                    <div className="flex items-center justify-between px-3 pt-2 pb-1">
                      <input
                        type="text"
                        autoFocus
                        value={userSearch}
                        onChange={e => setUserSearch(e.target.value)}
                        placeholder="Filter people…"
                        className="w-full text-xs bg-transparent focus:outline-none border-b border-border"
                        style={{ marginRight: 8 }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowUserSearch(false)}
                        className="ml-1 text-secondary hover:text-red-500 text-lg font-bold"
                        tabIndex={-1}
                        title="Close"
                      >
                        ×
                      </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {userOptions.length === 0 ? (
                        <p className="text-[11px] text-secondary px-3 py-2">
                          {allUsers.length === 0 ? 'Loading…' : 'No users found'}
                        </p>
                      ) : userOptions.map(u => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => addRecipient(u)}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                          <span className={`w-2 h-2 rounded-full shrink-0 ${u.online ? 'bg-green-400' : 'bg-gray-400'}`} />
                          <span className="truncate">{u.name}</span>
                          {u.online && <span className="ml-auto text-[10px] text-green-500 shrink-0">online</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            {recipientIds.length > 0 && (
              <button type="button" onClick={() => { setRecipientIds([]); setRecipientNames([]) }} className="text-[11px] text-secondary hover:text-red-500">
                Clear
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder={replyingTo ? `Reply to ${replyingTo.userName}…` : recipientIds.length > 0 ? `Private message…` : 'Type a message…'}
            className="flex-1 px-4 py-2 rounded-full border border-border bg-gray-50 dark:bg-gray-800
              text-primary text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
    </div>
  )
}
