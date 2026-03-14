'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { io, Socket } from 'socket.io-client'

interface Message {
  id: string
  userId: string
  userName: string
  message: string
  createdAt: string
  deletedAt: string | null
}

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

  // Drag offset from the CSS bottom-right anchor (right: 24, bottom: 72)
  // dx positive = moved left, dy positive = moved up
  const [drag, setDrag] = useState({ dx: 0, dy: 0 })
  const dragRef = useRef<{ startMouseX: number; startMouseY: number; startDx: number; startDy: number } | null>(null)

  const socketRef = useRef<Socket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isOpenRef = useRef(isOpen)
  useEffect(() => { isOpenRef.current = isOpen }, [isOpen])


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
    })
    socket.on('disconnect', () => setConnected(false))

    socket.on('chat:message', (msg: Message) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      setTimeout(scrollToBottom, 50)
      if (!isOpenRef.current) setUnread(u => u + 1)
    })

    socket.on('chat:message:deleted', ({ id }: { id: string }) => {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, deletedAt: new Date().toISOString() } : m))
    })

    return () => { socket.disconnect(); socketRef.current = null }
  }, [status, scrollToBottom])

  // Clear unread and scroll when opened
  useEffect(() => {
    if (isOpen) {
      setUnread(0)
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

  // ── Helpers ────────────────────────────────────────────────────────────────
  const sendMessage = async () => {
    const text = newMessage.trim()
    if (!text || sending) return
    setSending(true)
    setNewMessage('')
    try {
      await fetch('/api/chat/messages', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })
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

  if (status !== 'authenticated') return null

  // ── Minimized bubble ───────────────────────────────────────────────────────
  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-6 z-[9998] w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl flex items-center justify-center transition-colors"
        title="Team Chat"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
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
        </div>
        <button
          type="button"
          onMouseDown={e => e.stopPropagation()}
          onClick={() => setIsOpen(false)}
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
        {grouped.map(({ date, msgs }) => {
          // Find the id of the current user's most recent message in the full list
          const myLatestId = [...messages].reverse().find(m => m.userId === currentUserId)?.id
          return (
            <div key={date}>
              <div className="flex items-center gap-2 my-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-secondary font-medium">{date}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              {msgs.map(msg => {
                const isOwn = msg.userId === currentUserId
                const color = isOwn ? null : getUserColor(msg.userId)
                const isLatestOwn = isOwn && msg.id === myLatestId
                return (
                  <div key={msg.id} className={`flex gap-2 mb-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 text-white ${
                      isOwn ? 'bg-indigo-500' : color!.avatar
                    }`}>
                      {msg.userName.charAt(0).toUpperCase()}
                    </div>
                    <div className={`max-w-[75%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                      {!isOwn && (
                        <span className={`text-[10px] font-semibold mb-0.5 ml-1 ${color!.name}`}>
                          {msg.userName}
                        </span>
                      )}
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
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-white dark:bg-gray-900 px-3 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Type a message…"
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
