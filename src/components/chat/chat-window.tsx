'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Socket } from 'socket.io-client'

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

interface Member { id: string; name: string; photoUrl: string | null }

interface ChatWindowProps {
  roomId: string
  roomName: string
  roomType: 'direct' | 'group'
  roomPhotoUrl?: string | null
  currentUserId: string
  socket: Socket | null
  onClose: () => void
  rightOffset: number
  onMessageSent: (preview: { text: string; at: string }) => void
}

/**
 * MBM-301 — one independent, self-contained satellite conversation window.
 * Several of these can be open side by side (see openWindows in
 * floating-chat.tsx), each tracking its own messages/composer/threads, so
 * switching between DMs/groups never loses what you were doing in another.
 */
export function ChatWindow({ roomId, roomName, roomType, roomPhotoUrl, currentUserId, socket, onClose, rightOffset, onMessageSent }: ChatWindowProps) {
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
    try {
      const body: any = { message: text, roomId }
      if (replyingTo) body.parentId = replyingTo.id
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
  const toggleMembers = () => {
    if (roomType !== 'group') return
    if (showMembers) { setShowMembers(false); return }
    setShowMembers(true)
    setShowAddMember(false)
    setLoadingMembers(true)
    fetch(`/api/chat/rooms/${roomId}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then((data: { createdBy: string | null; participants: Member[] } | null) => {
        if (!data) return
        setCreatedBy(data.createdBy)
        setMembers(data.participants)
      })
      .catch(() => {})
      .finally(() => setLoadingMembers(false))
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

  const renderMessage = (msg: Message, isReply = false) => {
    const isOwn = msg.userId === currentUserId
    const color = isOwn ? null : getUserColor(msg.userId)
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
          {!isOwn && (
            <span className={`text-[9px] font-semibold ml-1 mb-0.5 ${color!.name}`}>{msg.userName}</span>
          )}
          <div className={`px-2.5 py-1 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap break-words ${
            msg.deletedAt
              ? 'bg-gray-100 dark:bg-gray-800 text-secondary italic border border-dashed border-gray-300 dark:border-gray-600'
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

  return (
    <div
      style={{ position: 'fixed', right: rightOffset, bottom: 72, width: WINDOW_W, height: WINDOW_H, zIndex: 9990 }}
      className="flex flex-col rounded-2xl shadow-2xl border border-border bg-white dark:bg-gray-900 overflow-hidden"
    >
      <div className="flex items-center justify-between px-3 py-2.5 bg-indigo-600 text-white shrink-0">
        {roomType === 'group' ? (
          <button type="button" onClick={toggleMembers} className="flex items-center gap-1.5 min-w-0 hover:bg-white/10 rounded-lg px-1 -mx-1 py-0.5 transition-colors" title="View group members">
            <span className="text-sm shrink-0">👥</span>
            <span className="font-semibold text-xs truncate">{roomName}</span>
            <svg className="w-3 h-3 shrink-0 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
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
        <button type="button" onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors shrink-0" title="Close">
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

      <div className="border-t border-border bg-white dark:bg-gray-900 px-2.5 py-2.5 shrink-0 space-y-1.5">
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
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder={replyingTo ? `Reply to ${replyingTo.userName}…` : 'Type a message…'}
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
