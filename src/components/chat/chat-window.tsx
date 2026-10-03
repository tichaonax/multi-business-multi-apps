'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { Socket } from 'socket.io-client'
import { useTypingEmitter, useTypingTracker, formatTypingLabel } from '@/hooks/use-typing-indicator'

interface Recipient { id: string; name: string }

interface Message {
  id: string
  roomId: string | null
  userId: string | null
  userName: string
  userPhotoUrl?: string | null
  userInitials?: string
  // A system/event message (e.g. "X added Y to the group") has no sender.
  isSystem?: boolean
  message: string
  createdAt: string
  deletedAt: string | null
  parentId: string | null
  replyCount: number
  recipients: Recipient[]
}

const WINDOW_W = 300
const WINDOW_H = 420
const MAX_INPUT_HEIGHT = 100

// Same deterministic per-user colour palette as the hub panel, duplicated
// here rather than shared so this window has no import dependency on it.
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

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Each open satellite window gets its own header colour (deterministic from
// roomId, so a given conversation always looks the same) — distinct from
// the hub's indigo, so several open at once are easy to tell apart at a glance.
const WINDOW_THEMES = [
  'bg-blue-600',
  'bg-emerald-600',
  'bg-rose-600',
  'bg-amber-600',
  'bg-fuchsia-600',
  'bg-cyan-600',
  'bg-lime-600',
  'bg-orange-600',
]
function getWindowTheme(roomId: string) {
  let hash = 0
  for (let i = 0; i < roomId.length; i++) {
    hash = ((hash << 5) - hash) + roomId.charCodeAt(i)
    hash |= 0
  }
  return WINDOW_THEMES[Math.abs(hash) % WINDOW_THEMES.length]
}

interface Member { id: string; name: string; photoUrl: string | null }

interface ChatWindowProps {
  roomId: string
  roomName: string
  roomType: 'direct' | 'group'
  roomPhotoUrl?: string | null
  currentUserId: string
  currentUserName?: string | null
  socket: Socket | null
  onClose: () => void
  rightOffset: number
  isMobile?: boolean
  // Lifted to the parent (floating-chat.tsx) so a dragged position survives
  // this component unmounting/remounting when the hub is minimized/restored.
  customPosition: { right: number; bottom: number } | null
  onPositionChange: (pos: { right: number; bottom: number }) => void
  onMessageSent: (preview: { text: string; at: string }) => void
}

/**
 * MBM-301 — one independent, self-contained satellite conversation window.
 * Several of these can be open side by side (see openWindows in
 * floating-chat.tsx), each tracking its own messages/composer/threads, so
 * switching between DMs/groups never loses what you were doing in another.
 */
export function ChatWindow({ roomId, roomName, roomType, roomPhotoUrl, currentUserId, currentUserName, socket, onClose, rightOffset, isMobile = false, customPosition, onPositionChange, onMessageSent }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [replyingTo, setReplyingTo] = useState<{ id: string; userName: string } | null>(null)
  const [expandedThreads, setExpandedThreads] = useState<Record<string, Message[]>>({})
  const [loadingThreads, setLoadingThreads] = useState<Record<string, boolean>>({})
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null)

  // Group membership panel — who's in it, and (creator only) add/remove
  const [showMembers, setShowMembers] = useState(false)
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [createdBy, setCreatedBy] = useState<string | null>(null)
  const [showAddMember, setShowAddMember] = useState(false)
  const [addMemberSearch, setAddMemberSearch] = useState('')
  const [addMemberCandidates, setAddMemberCandidates] = useState<Member[]>([])
  const [addingMemberId, setAddingMemberId] = useState<string | null>(null)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)

  // @-mention "flag as important" — typing "@" to start a message opens a
  // picker of other group members (self excluded); up to 2 can be flagged.
  const [mentionedUsers, setMentionedUsers] = useState<Member[]>([])
  const [showMentionPicker, setShowMentionPicker] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')

  // Draggable — unlike the (fixed) hub, satellite windows can be moved out
  // of the way. Stored as an ABSOLUTE right/bottom position (not an offset
  // from the cascade slot): rightOffset is recomputed by the parent every
  // time a window opens/closes (it depends on this window's index among
  // openWindows), so an offset-from-cascade would silently "jump" a window
  // the moment a sibling window opened or closed. Once the user has dragged
  // a window, it ignores rightOffset entirely and stays exactly where they
  // put it, regardless of how many other windows open or close afterward.
  const dragRef = useRef<{ startMouseX: number; startMouseY: number; startRight: number; startBottom: number } | null>(null)

  const onHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    const startRight = customPosition ? customPosition.right : rightOffset
    const startBottom = customPosition ? customPosition.bottom : 72
    dragRef.current = { startMouseX: e.clientX, startMouseY: e.clientY, startRight, startBottom }
    e.preventDefault()
  }, [customPosition, rightOffset])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const { startMouseX, startMouseY, startRight, startBottom } = dragRef.current
      const newRight = startRight - (e.clientX - startMouseX)
      const newBottom = startBottom - (e.clientY - startMouseY)
      onPositionChange({ right: newRight, bottom: newBottom })
    }
    const onMouseUp = () => { dragRef.current = null }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [onPositionChange])

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Load history + mark read on mount
  useEffect(() => {
    fetch(`/api/chat/messages?roomId=${encodeURIComponent(roomId)}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then((data: Message[]) => { setMessages(data || []); setTimeout(scrollToBottom, 50) })
      .catch(() => {})
    fetch(`/api/chat/rooms/${roomId}/read`, { method: 'POST', credentials: 'include' }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId])

  // This window's own slice of the shared socket connection
  useEffect(() => {
    if (!socket) return
    const onMessage = (msg: Message) => {
      if (msg.roomId !== roomId) return
      if (msg.parentId) {
        setExpandedThreads(prev => {
          if (prev[msg.parentId!]) {
            if (prev[msg.parentId!].some(m => m.id === msg.id)) return prev
            return { ...prev, [msg.parentId!]: [...prev[msg.parentId!], msg] }
          }
          if (msg.userId !== currentUserId) return { ...prev, [msg.parentId!]: [msg] }
          return prev
        })
        setMessages(prev => prev.map(m => m.id === msg.parentId ? { ...m, replyCount: m.replyCount + 1 } : m))
        if (msg.userId !== currentUserId) setTimeout(scrollToBottom, 100)
        return
      }
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
      setTimeout(scrollToBottom, 50)
      if (msg.userId !== currentUserId) {
        fetch(`/api/chat/rooms/${roomId}/read`, { method: 'POST', credentials: 'include' }).catch(() => {})
      }
    }
    const onDeleted = ({ id }: { id: string }) => {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, deletedAt: new Date().toISOString() } : m))
    }
    socket.on('chat:message', onMessage)
    socket.on('chat:message:deleted', onDeleted)
    return () => {
      socket.off('chat:message', onMessage)
      socket.off('chat:message:deleted', onDeleted)
    }
  }, [socket, roomId, currentUserId, scrollToBottom])

  // Auto-grow composer, same behaviour as the hub's
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT)}px`
  }, [newMessage])

  const sendMessage = async () => {
    const text = newMessage.trim()
    if (!text || sending) return
    setSending(true)
    setNewMessage('')
    notifyStopTyping()
    try {
      const body: any = { message: text, roomId }
      if (replyingTo) body.parentId = replyingTo.id
      if (mentionedUsers.length > 0) body.mentionIds = mentionedUsers.map(u => u.id)
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { setNewMessage(text); return }
      const saved: Message = await res.json()
      if (saved.parentId) {
        setExpandedThreads(prev => {
          const existing = prev[saved.parentId!] ?? []
          if (existing.some(m => m.id === saved.id)) return prev
          return { ...prev, [saved.parentId!]: [...existing, saved] }
        })
        setMessages(prev => prev.map(m => m.id === saved.parentId ? { ...m, replyCount: m.replyCount + 1 } : m))
        setTimeout(scrollToBottom, 100)
      } else {
        setMessages(prev => prev.some(m => m.id === saved.id) ? prev : [...prev, saved])
        setTimeout(scrollToBottom, 50)
        onMessageSent({ text: saved.message, at: saved.createdAt })
      }
      setReplyingTo(null)
      setMentionedUsers([])
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
      setMessages(prev => prev.map(m => m.id === id ? { ...m, deletedAt: new Date().toISOString() } : m))
    } catch { /* non-critical */ }
  }

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

  // ── Group members ─────────────────────────────────────────────────────
  const loadMembers = useCallback((showLoading: boolean) => {
    if (showLoading) setLoadingMembers(true)
    return fetch(`/api/chat/rooms/${roomId}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then((data: { createdBy: string | null; participants: Member[] } | null) => {
        if (!data) return
        setCreatedBy(data.createdBy)
        setMembers(data.participants)
      })
      .catch(() => {})
      .finally(() => { if (showLoading) setLoadingMembers(false) })
  }, [roomId])

  // Prefetch silently so the @-mention picker (below) has the member list
  // ready the instant someone starts typing "@", not only once they open
  // the members panel.
  useEffect(() => {
    if (roomType === 'group') loadMembers(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomType, roomId])

  const toggleMembers = () => {
    if (roomType !== 'group') return
    if (showMembers) { setShowMembers(false); return }
    setShowMembers(true)
    setShowAddMember(false)
    loadMembers(true)
  }

  const isCreator = createdBy !== null && createdBy === currentUserId

  const openAddMember = () => {
    setShowAddMember(true)
    fetch('/api/users', { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then((data: Member[]) => setAddMemberCandidates(data))
      .catch(() => {})
  }

  const addMember = async (userId: string) => {
    setAddingMemberId(userId)
    try {
      const res = await fetch(`/api/chat/rooms/${roomId}/participants`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (res.ok) {
        const added = addMemberCandidates.find(u => u.id === userId)
        if (added) setMembers(prev => prev.some(m => m.id === userId) ? prev : [...prev, added])
      }
    } catch { /* non-critical */ } finally {
      setAddingMemberId(null)
    }
  }

  const removeMember = async (userId: string) => {
    setRemovingMemberId(userId)
    try {
      const res = await fetch(`/api/chat/rooms/${roomId}/participants/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) setMembers(prev => prev.filter(m => m.id !== userId))
    } catch { /* non-critical */ } finally {
      setRemovingMemberId(null)
    }
  }

  const filteredAddCandidates = addMemberCandidates.filter(u =>
    !members.some(m => m.id === u.id) &&
    (!addMemberSearch.trim() || u.name.toLowerCase().includes(addMemberSearch.trim().toLowerCase()))
  )

  const typingByRoom = useTypingTracker(socket, currentUserId)
  const typingUsers = typingByRoom[roomId] ?? []
  const { notifyTyping, notifyStopTyping } = useTypingEmitter(socket, roomId, currentUserId, currentUserName)

  const mentionCandidates = members.filter(m =>
    m.id !== currentUserId &&
    !mentionedUsers.some(u => u.id === m.id) &&
    (!mentionFilter || m.name.toLowerCase().includes(mentionFilter.toLowerCase()))
  )

  const handleComposerChange = (val: string) => {
    setNewMessage(val)
    if (val.trim()) notifyTyping(); else notifyStopTyping()
    if (roomType === 'group' && mentionedUsers.length < 2 && val.startsWith('@')) {
      setMentionFilter(val.slice(1))
      setShowMentionPicker(true)
    } else {
      setShowMentionPicker(false)
    }
  }

  const selectMention = (m: Member) => {
    setMentionedUsers(prev => [...prev, m])
    setNewMessage('')
    setShowMentionPicker(false)
    setMentionFilter('')
    inputRef.current?.focus()
  }

  // Who's actually engaging — other participants ordered by whoever sent
  // the most recent message first (derived straight from history, so a new
  // message naturally bumps its sender back to the front). Self and system
  // messages never appear; someone who's joined but never spoken doesn't
  // show here either — only reachable via the full member list.
  const { recentSenderIds, senderInfoById } = useMemo(() => {
    const seen = new Set<string>()
    const order: string[] = []
    const info = new Map<string, { name: string; photoUrl: string | null; initials: string }>()
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]
      if (!m.userId || m.userId === currentUserId || m.isSystem) continue
      if (!seen.has(m.userId)) {
        seen.add(m.userId)
        order.push(m.userId)
        info.set(m.userId, { name: m.userName, photoUrl: m.userPhotoUrl ?? null, initials: m.userInitials || m.userName.charAt(0).toUpperCase() })
      }
    }
    return { recentSenderIds: order, senderInfoById: info }
  }, [messages, currentUserId])

  const VISIBLE_PARTICIPANT_ICONS = 3
  const visibleSenderIds = recentSenderIds.slice(0, VISIBLE_PARTICIPANT_ICONS)
  const overflowSenderCount = recentSenderIds.length - visibleSenderIds.length

  const renderMessage = (msg: Message, isReply = false) => {
    if (msg.isSystem) {
      return (
        <div key={msg.id} className="flex items-center justify-center my-2">
          <span className="text-[10px] text-secondary bg-gray-100 dark:bg-gray-800 rounded-full px-2.5 py-1 text-center">
            🔔 {msg.message}
          </span>
        </div>
      )
    }

    const isOwn = msg.userId === currentUserId
    const color = isOwn ? null : getUserColor(msg.userId ?? msg.id)
    const isFlagged = msg.recipients.length > 0
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
        <div className={`w-6 h-6 rounded-full shrink-0 relative flex items-center justify-center text-[9px] font-bold text-white ${isOwn ? 'bg-indigo-500' : color!.avatar}`}>
          {msg.userInitials || msg.userName.charAt(0).toUpperCase()}
          {msg.userPhotoUrl && (
            <img src={msg.userPhotoUrl} alt={msg.userName} className="absolute inset-0 w-full h-full object-cover rounded-full"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
          )}
        </div>
        <div className={`max-w-[78%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
          <div className={`flex items-center gap-1.5 mb-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
            {!isOwn && (
              <span className={`text-[9px] font-semibold ml-1 ${color!.name}`}>{msg.userName}</span>
            )}
            {isFlagged && (
              <span
                className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700"
                title={`Flagged important for: ${msg.recipients.map(r => r.name).join(', ')}`}
              >
                🚩 Important
              </span>
            )}
          </div>
          <div className={`px-2.5 py-1 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap break-words ${
            msg.deletedAt
              ? 'bg-gray-100 dark:bg-gray-800 text-secondary italic border border-dashed border-gray-300 dark:border-gray-600'
              : isFlagged
                ? `${isOwn ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-primary'} border-2 border-amber-400 dark:border-amber-500 ${isOwn ? 'rounded-tr-sm' : 'rounded-tl-sm'} shadow-sm`
                : isOwn
                  ? 'bg-indigo-600 text-white rounded-tr-sm'
                  : `bg-white dark:bg-gray-800 text-primary border border-border border-l-4 ${color!.border} rounded-tl-sm shadow-sm`
          }`}>
            {msg.deletedAt ? '🚫 This message was deleted' : msg.message}
          </div>
          <div className="flex items-center gap-2 mt-0.5 mx-1">
            <span className="text-[9px] text-secondary">{formatTime(msg.createdAt)}</span>
            {!msg.deletedAt && !isReply && isHovered && (
              <button type="button" onClick={() => { setReplyingTo({ id: msg.id, userName: msg.userName }); inputRef.current?.focus() }}
                className="text-[10px] text-indigo-500 hover:text-indigo-700 font-medium">↩ Reply</button>
            )}
            {isLatestOwn && !msg.deletedAt && (
              <button type="button" onClick={() => deleteMessage(msg.id)} className="text-[10px] text-red-400 hover:text-red-600 font-medium">Delete</button>
            )}
          </div>
          {!isReply && msg.replyCount > 0 && !msg.deletedAt && (
            <button type="button" onClick={() => toggleThread(msg.id)} className="mt-0.5 mx-1 text-[10px] text-indigo-500 hover:text-indigo-700 font-medium">
              {expandedThreads[msg.id] ? '▲ Hide replies' : `▼ ${msg.replyCount} ${msg.replyCount === 1 ? 'reply' : 'replies'}`}
              {loadingThreads[msg.id] && <span className="text-secondary"> loading…</span>}
            </button>
          )}
          {!isReply && expandedThreads[msg.id] && (
            <div className="mt-1 pl-2 border-l-2 border-indigo-200 dark:border-indigo-700 space-y-1 w-full">
              {expandedThreads[msg.id].map(r => renderMessage(r, true))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Mobile is always capped to a single open window (see floating-chat.tsx),
  // so there's nothing to cascade — fill most of the screen instead of the
  // fixed-width desktop box, and skip dragging (nowhere useful to put it).
  const windowStyle: React.CSSProperties = isMobile
    ? { position: 'fixed', left: 12, right: 12, bottom: 12, height: '70vh', zIndex: 9990 }
    : {
        position: 'fixed',
        right: customPosition ? customPosition.right : rightOffset,
        bottom: customPosition ? customPosition.bottom : 72,
        width: WINDOW_W,
        height: WINDOW_H,
        zIndex: 9990,
      }

  return (
    <div
      style={windowStyle}
      className="flex flex-col rounded-2xl shadow-2xl border border-border bg-white dark:bg-gray-900 overflow-hidden"
    >
      <div
        onMouseDown={isMobile ? undefined : onHeaderMouseDown}
        className={`flex items-center justify-between px-3 py-2.5 text-white shrink-0 select-none ${isMobile ? '' : 'cursor-grab active:cursor-grabbing'} ${getWindowTheme(roomId)}`}
      >
        {roomType === 'group' ? (
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <button type="button" onMouseDown={e => e.stopPropagation()} onClick={toggleMembers} className="flex items-center gap-1.5 min-w-0 hover:bg-white/10 rounded-lg px-1 -mx-1 py-0.5 transition-colors shrink-0" title="View group members">
              <span className="text-sm shrink-0">👥</span>
              <span className="font-semibold text-xs truncate">{roomName}</span>
              <svg className="w-3 h-3 shrink-0 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {/* Who's actively chatting — most recent sender first */}
            {recentSenderIds.length > 0 && (
              <button
                type="button"
                onMouseDown={e => e.stopPropagation()}
                onClick={toggleMembers}
                className="flex items-center shrink-0 ml-0.5"
                title="Recently active — click to view all members"
              >
                {visibleSenderIds.map((id, i) => {
                  const info = senderInfoById.get(id)
                  if (!info) return null
                  return (
                    <span
                      key={id}
                      style={{ marginLeft: i === 0 ? 0 : -6, zIndex: VISIBLE_PARTICIPANT_ICONS - i }}
                      className={`w-5 h-5 rounded-full relative overflow-hidden flex items-center justify-center text-white text-[8px] font-bold border border-white/40 ${getUserColor(id).avatar}`}
                    >
                      {info.initials}
                      {info.photoUrl && (
                        <img src={info.photoUrl} alt={info.name} className="absolute inset-0 w-full h-full object-cover"
                          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                      )}
                    </span>
                  )
                })}
                {overflowSenderCount > 0 && (
                  <span
                    style={{ marginLeft: -6 }}
                    className="w-5 h-5 rounded-full relative flex items-center justify-center text-white text-[8px] font-bold border border-white/40 bg-black/30"
                  >
                    +{overflowSenderCount}
                  </span>
                )}
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-5 h-5 rounded-full shrink-0 relative overflow-hidden flex items-center justify-center bg-white/20 text-[10px] font-bold">
              {roomName.charAt(0).toUpperCase()}
              {roomPhotoUrl && (
                <img src={roomPhotoUrl} alt={roomName} className="absolute inset-0 w-full h-full object-cover"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
              )}
            </span>
            <span className="font-semibold text-xs truncate">{roomName}</span>
          </div>
        )}
        <button type="button" onMouseDown={e => e.stopPropagation()} onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors shrink-0" title="Close">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="relative flex-1 min-h-0 flex flex-col">
      <div className="flex-1 overflow-y-auto px-2.5 py-2.5 bg-gray-50 dark:bg-gray-950">
        {messages.length === 0 && (
          <p className="text-center text-xs text-secondary mt-6">No messages yet. Say hello!</p>
        )}
        {messages.map(msg => renderMessage(msg))}
        <div ref={bottomRef} />
      </div>

      <div className="relative border-t border-border bg-white dark:bg-gray-900 px-2.5 py-2.5 shrink-0 space-y-1.5">
        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <p className="text-[10px] text-secondary italic -mb-1">{formatTypingLabel(typingUsers)}</p>
        )}
        {/* @-mention picker — opens when the message starts with "@" */}
        {showMentionPicker && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMentionPicker(false)} />
            <div className="absolute bottom-full left-2.5 right-2.5 mb-1 z-20 bg-white dark:bg-gray-800 border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
              <p className="text-[10px] text-secondary px-2.5 pt-1.5 pb-1">Flag as important for (max 2)</p>
              {mentionCandidates.length === 0 ? (
                <p className="text-[11px] text-secondary px-2.5 pb-2">No matching member</p>
              ) : mentionCandidates.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => selectMention(m)}
                  className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <span className={`w-5 h-5 rounded-full shrink-0 relative overflow-hidden flex items-center justify-center text-white text-[9px] font-bold ${getUserColor(m.id).avatar}`}>
                    {m.name.charAt(0).toUpperCase()}
                    {m.photoUrl && (
                      <img src={m.photoUrl} alt={m.name} className="absolute inset-0 w-full h-full object-cover"
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                    )}
                  </span>
                  <span className="truncate text-primary">{m.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {mentionedUsers.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium shrink-0">🚩 Flag for:</span>
            {mentionedUsers.map(u => (
              <span key={u.id} className="flex items-center gap-1 text-[11px] bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-700">
                {u.name}
                <button type="button" onClick={() => setMentionedUsers(prev => prev.filter(x => x.id !== u.id))} className="hover:text-red-500">✕</button>
              </span>
            ))}
          </div>
        )}
        {replyingTo && (
          <div className="flex items-center gap-2 text-[11px] bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-700 rounded-lg px-2.5 py-1">
            <span className="text-indigo-600 dark:text-indigo-400 flex-1 truncate">↩ Replying to <strong>{replyingTo.userName}</strong></span>
            <button type="button" onClick={() => setReplyingTo(null)} className="text-secondary hover:text-primary" title="Cancel reply">✕</button>
          </div>
        )}
        <div className="flex items-end gap-1.5">
          <textarea
            ref={inputRef}
            rows={1}
            autoComplete="off"
            value={newMessage}
            onChange={e => handleComposerChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder={replyingTo ? `Reply to ${replyingTo.userName}…` : roomType === 'group' ? 'Type a message… ("@" to flag someone)' : 'Type a message…'}
            className="flex-1 px-3 py-1.5 rounded-2xl border border-border bg-gray-50 dark:bg-gray-800 resize-none leading-snug
              text-primary text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            style={{ maxHeight: MAX_INPUT_HEIGHT, overflowY: 'auto' }}
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={sending || !newMessage.trim()}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-700
              disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors shrink-0"
            title="Send"
          >
            <svg className="w-3.5 h-3.5 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>

      {/* Group members panel */}
      {showMembers && (
        <div className="absolute inset-0 z-20 flex flex-col bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
            <span className="font-semibold text-xs text-primary">Group members</span>
            <button type="button" onClick={() => setShowMembers(false)} className="text-secondary hover:text-primary text-base leading-none" title="Close">×</button>
          </div>
          <div className="flex-1 overflow-y-auto px-1 py-1">
            {loadingMembers ? (
              <p className="text-center text-xs text-secondary mt-4">Loading…</p>
            ) : members.map(m => (
              <div key={m.id} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg">
                <span className={`w-6 h-6 rounded-full shrink-0 relative overflow-hidden flex items-center justify-center text-white text-[10px] font-bold ${getUserColor(m.id).avatar}`}>
                  {m.name.charAt(0).toUpperCase()}
                  {m.photoUrl && (
                    <img src={m.photoUrl} alt={m.name} className="absolute inset-0 w-full h-full object-cover"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                  )}
                </span>
                <span className="truncate flex-1 text-xs text-primary">
                  {m.name}{m.id === currentUserId ? ' (you)' : ''}{m.id === createdBy ? ' · creator' : ''}
                </span>
                {isCreator && m.id !== createdBy && (
                  <button
                    type="button"
                    onClick={() => removeMember(m.id)}
                    disabled={removingMemberId === m.id}
                    className="text-[10px] text-red-500 hover:text-red-700 font-medium shrink-0 disabled:opacity-50"
                  >
                    {removingMemberId === m.id ? '…' : 'Remove'}
                  </button>
                )}
              </div>
            ))}
          </div>
          {isCreator && (
            <div className="border-t border-border shrink-0">
              {showAddMember ? (
                <div className="flex flex-col max-h-48">
                  <div className="px-2 pt-2">
                    <input
                      type="text"
                      autoFocus
                      value={addMemberSearch}
                      onChange={e => setAddMemberSearch(e.target.value)}
                      placeholder="Search people…"
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-border bg-gray-50 dark:bg-gray-800 text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto px-1 py-1">
                    {filteredAddCandidates.length === 0 ? (
                      <p className="text-center text-[11px] text-secondary mt-2">No one to add</p>
                    ) : filteredAddCandidates.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => addMember(u.id)}
                        disabled={addingMemberId === u.id}
                        className="w-full text-left px-2 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg flex items-center gap-2 disabled:opacity-50"
                      >
                        <span className="truncate flex-1 text-primary">{u.name}</span>
                        <span className="text-indigo-600 text-[10px] shrink-0">{addingMemberId === u.id ? 'Adding…' : '+ Add'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <button type="button" onClick={openAddMember} className="w-full text-center text-xs text-indigo-600 hover:text-indigo-700 font-medium py-2">
                  + Add member
                </button>
              )}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  )
}
