'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { Socket } from 'socket.io-client'
import { useTypingEmitter, useTypingTracker, formatTypingLabel } from '@/hooks/use-typing-indicator'
import { getUserColor, parseComplianceDigest, ComplianceDigestSections, formatAlertTimestamp } from '@/components/vehicles/license-compliance-digest'
import { AttachButton, PendingAttachmentsRow, ChatAttachmentsGroup, uploadChatAttachment, useChatFileDrop, DropOverlay, MAX_ATTACHMENTS_PER_MESSAGE, isOversizedVideo, type ChatAttachmentMeta } from '@/components/chat/chat-attachments'
import { VideoTrimModal } from '@/components/chat/video-trim-modal'
import { useConfirm } from '@/components/ui/confirm-modal'
import { useToastContext } from '@/components/ui/toast'
import { useChatHistory } from '@/hooks/use-chat-history'

interface Recipient { id: string; name: string }

interface InRoomSearchResult {
  messageId: string
  jumpToId: string
  isReply: boolean
  snippet: string
  createdAt: string
}

interface Message {
  id: string
  roomId: string | null
  userId: string | null
  userName: string
  userPhotoUrl?: string | null
  userInitials?: string
  // A system/event message (e.g. "X added Y to the group") has no sender.
  isSystem?: boolean
  linkUrl?: string | null
  message: string
  createdAt: string
  deletedAt: string | null
  editedAt: string | null
  editCount: number
  parentId: string | null
  replyCount: number
  recipients: Recipient[]
  attachments?: ChatAttachmentMeta[]
}

const WINDOW_W = 300
const WINDOW_H = 420
const MAX_INPUT_HEIGHT = 100
// Mirrors EDIT_WINDOW_MS in src/lib/chat/rooms.ts (server-enforced; this
// copy is just for hiding the Edit button once it's clearly expired).
const EDIT_WINDOW_MS = 15 * 60 * 1000

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// WhatsApp-style read receipt: a single grey check for "sent" (we have no
// separate delivered signal to distinguish from sent — the message exists
// in the DB and reached the room, that's as far as our data goes), a
// double green check once every other participant's lastReadAt has caught
// up to this message (see isReadByAllOthers above).
function ReadReceiptTick({ read }: { read: boolean }) {
  return (
    <svg
      viewBox="0 0 16 10"
      className={`w-3 h-2.5 shrink-0 ${read ? 'text-emerald-500' : 'text-gray-400 dark:text-gray-500'}`}
      fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
      aria-label={read ? 'Read' : 'Sent'}
    >
      <path d="M1 5.5 L4.5 9 L10 1.5" />
      {read && <path d="M6 5.5 L9.5 9 L15 1.5" />}
    </svg>
  )
}

// Day divider label — same format as Team Chat's (floating-chat.tsx); the
// year only appears for dates outside the current year.
function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString([], {
    weekday: 'short', month: 'short', day: 'numeric',
    ...(d.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' as const } : {}),
  })
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

interface Member { id: string; name: string; photoUrl: string | null; lastReadAt?: string | null }

interface ChatWindowProps {
  roomId: string
  roomName: string
  roomType: 'direct' | 'group' | 'system'
  roomPhotoUrl?: string | null
  currentUserId: string
  currentUserName?: string | null
  isAdmin?: boolean
  socket: Socket | null
  onClose: () => void
  rightOffset: number
  isMobile?: boolean
  // Lifted to the parent (floating-chat.tsx) so a dragged position survives
  // this component unmounting/remounting when the hub is minimized/restored.
  customPosition: { right: number; bottom: number } | null
  onPositionChange: (pos: { right: number; bottom: number }) => void
  onMessageSent: (preview: { text: string; at: string }) => void
  // Set when this window was opened from a cross-conversation search result
  // (floating-chat.tsx) — jumped to once on mount, then cleared via
  // onJumpHandled so re-renders/re-opens don't re-trigger it.
  initialJumpTarget?: InRoomSearchResult | null
  onJumpHandled?: () => void
}

/**
 * MBM-301 — one independent, self-contained satellite conversation window.
 * Several of these can be open side by side (see openWindows in
 * floating-chat.tsx), each tracking its own messages/composer/threads, so
 * switching between DMs/groups never loses what you were doing in another.
 */
export function ChatWindow({ roomId, roomName, roomType, roomPhotoUrl, currentUserId, currentUserName, isAdmin = false, socket, onClose, rightOffset, isMobile = false, customPosition, onPositionChange, onMessageSent, initialJumpTarget, onJumpHandled }: ChatWindowProps) {
  const confirmModal = useConfirm()
  const toast = useToastContext()
  // Read receipts only up to the newest message actually on screen
  // (MBM-315), and only while a human is actually here (MBM-313) — both
  // handled by the hook's onSeen, which also batches the updates.
  const postRead = useCallback((upTo: string) => {
    fetch(`/api/chat/rooms/${roomId}/read`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upTo }),
    }).catch(() => {})
  }, [roomId])

  // MBM-315 — sliding window: ~30 messages at a time, opening at the first
  // unseen one, more fetched on scroll (see use-chat-history.ts).
  const history = useChatHistory<Message>({
    roomId,
    onSeen: m => postRead(m.createdAt),
    countsAsSeen: m => m.userId !== currentUserId,
  })
  const { messages, setMessages } = history
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [replyingTo, setReplyingTo] = useState<{ id: string; userName: string } | null>(null)
  const [expandedThreads, setExpandedThreads] = useState<Record<string, Message[]>>({})
  const [loadingThreads, setLoadingThreads] = useState<Record<string, boolean>>({})
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null)
  // Rich system alerts (e.g. each vehicle compliance digest) default
  // collapsed to a one-line summary — a room can accumulate many of these
  // over time, and showing every one fully expanded floods the window the
  // same way duplicate rooms flooded the chat list.
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set())

  // Attachments mid-compose — each uploads immediately on pick/drop (see
  // AttachButton / useChatFileDrop below), then all are claimed together by
  // sendMessage() when the message actually goes out. Uploads run
  // independently per file so one bad file (wrong type, too large) doesn't
  // block the rest; uploadingNames tracks filenames still in flight so the
  // composer can show them as pending chips.
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachmentMeta[]>([])
  const [uploadingNames, setUploadingNames] = useState<string[]>([])
  // Oversized videos (>25MB) don't upload straight away — they queue here
  // for VideoTrimModal, one at a time, instead of being rejected outright.
  const [trimQueue, setTrimQueue] = useState<File[]>([])

  const startUpload = (file: File) => {
    setUploadingNames(prev => [...prev, file.name])
    uploadChatAttachment(file)
      .then(attachment => setPendingAttachments(prev => [...prev, attachment]))
      .catch(err => alert(err instanceof Error ? err.message : 'Upload failed'))
      .finally(() => setUploadingNames(prev => prev.filter(n => n !== file.name)))
  }

  const handleFilesSelected = (files: File[]) => {
    const room = MAX_ATTACHMENTS_PER_MESSAGE - pendingAttachments.length - uploadingNames.length - trimQueue.length
    if (room <= 0) { alert(`You can attach up to ${MAX_ATTACHMENTS_PER_MESSAGE} files per message`); return }
    const accepted = files.slice(0, room)
    const toTrim = accepted.filter(isOversizedVideo)
    const toUpload = accepted.filter(f => !isOversizedVideo(f))
    if (toTrim.length > 0) setTrimQueue(prev => [...prev, ...toTrim])
    toUpload.forEach(startUpload)
  }
  const { isDraggingFiles, dropZoneProps } = useChatFileDrop(handleFilesSelected)

  // Editing own last message
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  // Ticks every 30s so the Edit button disappears on its own once the
  // 15-minute window lapses, without needing a new message to re-render.
  const [editClockTick, setEditClockTick] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setEditClockTick(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  // In-conversation search — every match within this room (unlike the hub's
  // cross-conversation search, which collapses to one result per room).
  const [showSearch, setShowSearch] = useState(false)
  const [inRoomSearch, setInRoomSearch] = useState('')
  const [inRoomResults, setInRoomResults] = useState<InRoomSearchResult[]>([])
  const [searchingInRoom, setSearchingInRoom] = useState(false)
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null)

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

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollToBottom = history.scrollToBottom

  // Jump to a search result: load the page around it if it isn't already
  // in the window (or its parent, for a reply — then expand that thread),
  // then scroll to and briefly highlight the actual message element.
  const jumpToResult = async (result: InRoomSearchResult) => {
    await history.ensureLoaded(result.jumpToId)
    if (result.isReply) {
      const replies: Message[] = await fetch(`/api/chat/messages/${result.jumpToId}/replies`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : [])
        .catch(() => [])
      setExpandedThreads(prev => ({ ...prev, [result.jumpToId]: replies }))
    }
    setTimeout(() => {
      document.getElementById(`chat-msg-${result.messageId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setHighlightedMsgId(result.messageId)
      setTimeout(() => setHighlightedMsgId(null), 2000)
    }, 150)
  }

  // Load history on mount — at the first unseen message, or straight at a
  // cross-conversation search result (floating-chat.tsx) if opened from one.
  // Also re-runs when an ALREADY-open window is handed a new search target;
  // clearing the target afterwards (onJumpHandled) must not reload.
  const didInitialLoadRef = useRef(false)
  useEffect(() => {
    const target = initialJumpTarget
    if (!target) {
      if (!didInitialLoadRef.current) {
        didInitialLoadRef.current = true
        history.load({ kind: 'initial' })
      }
      return
    }
    didInitialLoadRef.current = true
    jumpToResult(target).then(() => onJumpHandled?.())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, initialJumpTarget])

  // Debounced in-conversation search — every match in this room, not just
  // the latest one (unlike the hub's cross-conversation search).
  useEffect(() => {
    const q = inRoomSearch.trim()
    if (q.length < 2) { setInRoomResults([]); setSearchingInRoom(false); return }
    setSearchingInRoom(true)
    const t = setTimeout(() => {
      fetch(`/api/chat/messages/search-in-room?roomId=${encodeURIComponent(roomId)}&q=${encodeURIComponent(q)}`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : [])
        .then((data: InRoomSearchResult[]) => setInRoomResults(data))
        .catch(() => setInRoomResults([]))
        .finally(() => setSearchingInRoom(false))
    }, 300)
    return () => clearTimeout(t)
  }, [inRoomSearch, roomId])

  const jumpToMessage = async (result: InRoomSearchResult) => {
    setShowSearch(false)
    await jumpToResult(result)
  }

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
        if (msg.userId !== currentUserId && history.isNearBottom()) setTimeout(scrollToBottom, 100)
        return
      }
      // Appends (and follows) only if the window already reaches the newest
      // message; otherwise counted for "↓ N new". Read receipts follow from
      // what's actually on screen (onSeen), not from arrival.
      history.receiveLive(msg, msg.userId === currentUserId)
    }
    const onDeleted = ({ id }: { id: string }) => {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, deletedAt: new Date().toISOString() } : m))
    }
    const onEdited = (msg: { id: string; message: string; editedAt: string | null; editCount: number }) => {
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, message: msg.message, editedAt: msg.editedAt, editCount: msg.editCount } : m))
    }
    // Admin hard-delete (MBM-309) — the message is actually gone, so it's
    // spliced out entirely (a no-op filter for any window the message
    // doesn't belong to, since this shared socket reaches every open
    // window regardless of room).
    const onRemoved = ({ id }: { id: string }) => {
      setMessages(prev => prev.filter(m => m.id !== id))
      setExpandedThreads(prev => {
        const next: typeof prev = {}
        for (const [parentId, replies] of Object.entries(prev)) next[parentId] = replies.filter(r => r.id !== id)
        return next
      })
    }
    const onRoomCleared = ({ roomId: clearedRoomId }: { roomId: string }) => {
      if (clearedRoomId === roomId) {
        setMessages([])
        setExpandedThreads({})
      }
    }
    socket.on('chat:message', onMessage)
    socket.on('chat:message:deleted', onDeleted)
    socket.on('chat:message:edited', onEdited)
    socket.on('chat:message:removed', onRemoved)
    socket.on('chat:room:cleared', onRoomCleared)
    return () => {
      socket.off('chat:message', onMessage)
      socket.off('chat:message:deleted', onDeleted)
      socket.off('chat:message:edited', onEdited)
      socket.off('chat:message:removed', onRemoved)
      socket.off('chat:room:cleared', onRoomCleared)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if ((!text && pendingAttachments.length === 0) || sending || uploadingNames.length > 0) return
    setSending(true)
    setNewMessage('')
    const attachmentsToSend = pendingAttachments
    setPendingAttachments([])
    notifyStopTyping()
    try {
      const body: any = { message: text, roomId }
      if (replyingTo) body.parentId = replyingTo.id
      if (mentionedUsers.length > 0) body.mentionIds = mentionedUsers.map(u => u.id)
      if (attachmentsToSend.length > 0) body.attachmentIds = attachmentsToSend.map(a => a.id)
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { setNewMessage(text); setPendingAttachments(attachmentsToSend); return }
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
        if (history.hasMoreAfter) {
          await history.jumpToLatest()
        } else {
          history.receiveLive(saved, true)
        }
        onMessageSent({ text: saved.message, at: saved.createdAt })
      }
      setReplyingTo(null)
      setMentionedUsers([])
    } catch {
      setNewMessage(text)
      setPendingAttachments(attachmentsToSend)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  // Deleting a system message (e.g. a System Alerts digest) is a per-user
  // dismissal server-side (see /api/chat/messages/[id]) — it only hides it
  // for this user, so it's removed from local state entirely rather than
  // marked deletedAt (which would be a shared "deleted for everyone" look,
  // wrong for a message other admins/cashiers can still see). An owned
  // message deleted normally keeps the existing shared placeholder behavior.
  const deleteMessage = async (id: string, isSystemMessage = false) => {
    try {
      await fetch(`/api/chat/messages/${id}`, { method: 'DELETE', credentials: 'include' })
      if (isSystemMessage) {
        setMessages(prev => prev.filter(m => m.id !== id))
      } else {
        setMessages(prev => prev.map(m => m.id === id ? { ...m, deletedAt: new Date().toISOString() } : m))
      }
    } catch { /* non-critical */ }
  }

  // Admin-only (MBM-309) — bulk-clears every message in this System Alerts
  // room, a genuine removal for everyone (not a per-user dismissal).
  const clearingChatRef = useRef(false)
  const clearSystemChat = async () => {
    if (clearingChatRef.current) return
    const ok = await confirmModal({
      title: 'Clear System Alerts',
      description: 'Permanently delete every alert in System Alerts for everyone? This cannot be undone.',
      confirmText: 'Delete All',
    })
    if (!ok) return
    clearingChatRef.current = true
    try {
      const res = await fetch(`/api/chat/rooms/${roomId}/messages`, { method: 'DELETE', credentials: 'include' })
      if (res.ok) {
        setMessages([])
        setExpandedThreads({})
      } else {
        const json = await res.json().catch(() => ({}))
        toast.error(json?.error || 'Failed to clear System Alerts')
      }
    } catch {
      toast.error('Failed to clear System Alerts')
    } finally {
      clearingChatRef.current = false
    }
  }

  const startEdit = (msg: Message) => {
    setEditingMsgId(msg.id)
    setEditText(msg.message)
    setEditError(null)
  }

  const cancelEdit = () => {
    setEditingMsgId(null)
    setEditText('')
    setEditError(null)
  }

  const saveEdit = async (id: string) => {
    const text = editText.trim()
    if (!text) return
    setEditError(null)
    try {
      const res = await fetch(`/api/chat/messages/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setEditError(data?.error || 'Failed to save edit')
        return
      }
      const saved: Message = await res.json()
      setMessages(prev => prev.map(m => m.id === id ? { ...m, message: saved.message, editedAt: saved.editedAt, editCount: saved.editCount } : m))
      setEditingMsgId(null)
      setEditText('')
    } catch {
      setEditError('Failed to save edit')
    }
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

  // Prefetch silently: for a group this has the @-mention picker's member
  // list ready the instant someone starts typing "@"; for a direct room
  // it's the only way to get the other participant's lastReadAt for the
  // read-receipt ticks below (system rooms have no sender, nothing to mark
  // read, so skip those).
  useEffect(() => {
    if (roomType === 'group' || roomType === 'direct') loadMembers(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomType, roomId])

  // Updated locally the instant our own `/read` POST resolves (optimistic —
  // don't wait for the other side's socket round trip to reflect reading
  // our own messages isn't relevant anyway, it's THEIR lastReadAt we show),
  // and whenever the other participant(s) read via the 'chat:read' socket
  // event below.
  useEffect(() => {
    const onRead = (data: { roomId: string; userId: string; readAt: string }) => {
      if (data.roomId !== roomId) return
      setMembers(prev => prev.map(m => m.id === data.userId ? { ...m, lastReadAt: data.readAt } : m))
    }
    socket?.on('chat:read', onRead)
    return () => { socket?.off('chat:read', onRead) }
  }, [socket, roomId])

  // Read-receipt helper — true once every OTHER participant's lastReadAt is
  // at or after this message's createdAt. Group rooms only show the tick
  // once the WHOLE group has read it (same convention most chat apps use —
  // a partial "read by some" state isn't worth the extra UI here).
  const isReadByAllOthers = (createdAt: string) => {
    const others = members.filter(m => m.id !== currentUserId)
    if (others.length === 0) return false
    const createdAtMs = new Date(createdAt).getTime()
    return others.every(m => m.lastReadAt && new Date(m.lastReadAt).getTime() >= createdAtMs)
  }

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
      // Multi-line alerts (e.g. the vehicle license compliance digest) get a
      // readable card instead of the compact one-line pill used for simple
      // membership-change events — mirrors the hub's own rich-alert styling.
      const isRichAlert = !!msg.linkUrl || msg.message.includes('\n')
      if (isRichAlert) {
        const isExpanded = expandedAlerts.has(msg.id)
        const lines = msg.message.split('\n')
        const summaryLine = lines[0] || msg.message
        const itemCount = lines.filter(l => l.trim().startsWith('•')).length
        return (
          <div key={msg.id} id={`chat-msg-${msg.id}`} className="flex justify-center mb-2 px-1">
            <div className={`max-w-full w-full bg-amber-50 dark:bg-amber-900/20 border rounded-xl overflow-hidden transition-shadow ${highlightedMsgId === msg.id ? 'border-indigo-400 ring-2 ring-indigo-400' : 'border-amber-200 dark:border-amber-700'}`}>
              <div className="flex flex-col gap-0.5 px-3 py-2">
                <button
                  type="button"
                  onClick={() => setExpandedAlerts(prev => {
                    const next = new Set(prev)
                    if (next.has(msg.id)) next.delete(msg.id); else next.add(msg.id)
                    return next
                  })}
                  className="w-full flex items-center gap-1.5 text-left"
                >
                  <svg className={`w-3 h-3 shrink-0 text-amber-600 dark:text-amber-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="min-w-0 flex-1 text-[11px] font-medium text-amber-900 dark:text-amber-200 truncate">{summaryLine}</span>
                  {itemCount > 0 && (
                    <span className="shrink-0 text-[9px] font-bold bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded-full">
                      {itemCount}
                    </span>
                  )}
                </button>
                {/* Delete lives on its own row with the timestamp — the
                    title row above has no spare width to safely fit it
                    without risking an overlap on a long/narrow title. */}
                <div className="flex items-center justify-between pl-[18px]">
                  <button
                    type="button"
                    onClick={() => setExpandedAlerts(prev => {
                      const next = new Set(prev)
                      if (next.has(msg.id)) next.delete(msg.id); else next.add(msg.id)
                      return next
                    })}
                    className="text-[9px] text-amber-600/80 dark:text-amber-400/70 text-left hover:underline"
                  >
                    {formatAlertTimestamp(msg.createdAt)}
                  </button>
                  <button
                    type="button"
                    title={isAdmin ? 'Delete this alert for everyone (admin)' : 'Delete this alert (only for you)'}
                    onClick={() => deleteMessage(msg.id, true)}
                    className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-amber-500 hover:text-white hover:bg-red-500 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div className="px-3 pb-2">
                  <ComplianceDigestSections message={msg.message} />
                  {msg.linkUrl && (
                    <a href={msg.linkUrl} className="inline-block mt-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:underline">
                      Open in Fleet Management →
                    </a>
                  )}
                  <p className="text-[9px] text-amber-500 dark:text-amber-500 mt-1">{formatTime(msg.createdAt)} · System · Read-only</p>
                </div>
              )}
            </div>
          </div>
        )
      }
      return (
        <div key={msg.id} id={`chat-msg-${msg.id}`} className="flex items-center justify-center my-2 gap-1.5 group">
          <span className={`text-[10px] text-secondary bg-gray-100 dark:bg-gray-800 rounded-full px-2.5 py-1 text-center transition-shadow ${highlightedMsgId === msg.id ? 'ring-2 ring-indigo-400' : ''}`}>
            🔔 {msg.message}
          </span>
          {isAdmin && roomType === 'system' && (
            <button type="button" onClick={() => deleteMessage(msg.id, true)} title="Delete for everyone (admin)" className="opacity-0 group-hover:opacity-100 text-[10px] text-red-400 hover:text-red-600 transition-opacity">
              ✕
            </button>
          )}
        </div>
      )
    }

    const isOwn = msg.userId === currentUserId
    const color = isOwn ? null : getUserColor(msg.userId ?? msg.id)
    const isFlagged = msg.recipients.length > 0
    const myLatestId = [...messages].reverse().find(m => m.userId === currentUserId)?.id
    const isLatestOwn = isOwn && msg.id === myLatestId && !isReply
    const isHovered = hoveredMsgId === msg.id
    const isEditing = editingMsgId === msg.id
    const withinEditWindow = editClockTick - new Date(msg.createdAt).getTime() < EDIT_WINDOW_MS
    const canEdit = isLatestOwn && !msg.deletedAt && withinEditWindow

    const isHighlighted = highlightedMsgId === msg.id

    return (
      <div
        key={msg.id}
        id={`chat-msg-${msg.id}`}
        className={`flex gap-2 mb-2 group rounded-lg transition-shadow ${isOwn ? 'flex-row-reverse' : ''} ${isHighlighted ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-950' : ''}`}
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
          {isEditing ? (
            <div className="w-full">
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(msg.id) }
                  if (e.key === 'Escape') cancelEdit()
                }}
                autoFocus
                rows={2}
                className="w-full px-2 py-1 rounded-lg text-xs border border-indigo-400 dark:border-indigo-500 bg-white dark:bg-gray-800 text-primary resize-none"
              />
              <div className="flex items-center gap-2 mt-1">
                <button type="button" onClick={() => saveEdit(msg.id)} className="text-[10px] font-medium text-indigo-600 hover:text-indigo-800">Save</button>
                <button type="button" onClick={cancelEdit} className="text-[10px] font-medium text-secondary hover:text-primary">Cancel</button>
                {editError && <span className="text-[10px] text-red-500">{editError}</span>}
              </div>
            </div>
          ) : (
            <>
              {(msg.deletedAt || msg.message) && (
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
              )}
              {!msg.deletedAt && <ChatAttachmentsGroup attachments={msg.attachments ?? []} />}
            </>
          )}
          {!isEditing && (
          <div className="flex items-center gap-2 mt-0.5 mx-1">
            <span className="text-[9px] text-secondary flex items-center gap-0.5">
              {formatTime(msg.createdAt)}
              {msg.editedAt && !msg.deletedAt && (
                <span className="italic"> (edited{msg.editCount > 1 ? ` ${msg.editCount}x` : ''})</span>
              )}
              {isOwn && !msg.deletedAt && <ReadReceiptTick read={isReadByAllOthers(msg.createdAt)} />}
            </span>
            {!msg.deletedAt && !isReply && isHovered && (
              <button type="button" onClick={() => { setReplyingTo({ id: msg.id, userName: msg.userName }); inputRef.current?.focus() }}
                className="text-[10px] text-indigo-500 hover:text-indigo-700 font-medium">↩ Reply</button>
            )}
            {canEdit && (
              <button type="button" onClick={() => startEdit(msg)} className="text-[10px] text-indigo-400 hover:text-indigo-600 font-medium">✎ Edit</button>
            )}
            {isLatestOwn && !msg.deletedAt && (
              <button type="button" onClick={() => deleteMessage(msg.id)} className="text-[10px] text-red-400 hover:text-red-600 font-medium">Delete</button>
            )}
          </div>
          )}
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
      className="relative flex flex-col rounded-2xl shadow-2xl border border-border bg-white dark:bg-gray-900 overflow-hidden"
      {...(roomType === 'system' ? {} : dropZoneProps)}
    >
      {isDraggingFiles && roomType !== 'system' && <DropOverlay />}
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
        ) : roomType === 'system' ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center bg-white/20 text-[10px]">🔔</span>
            <span className="font-semibold text-xs truncate">{roomName}</span>
            <span className="text-[9px] text-white/70 shrink-0">· Read-only</span>
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
        <div className="flex items-center gap-0.5 shrink-0">
          {roomType !== 'system' && (
            <button
              type="button"
              onMouseDown={e => e.stopPropagation()}
              onClick={() => setShowSearch(v => !v)}
              className={`w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors ${showSearch ? 'bg-white/20' : ''}`}
              title="Search this conversation"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          )}
          {roomType === 'system' && isAdmin && (
            <button
              type="button"
              onMouseDown={e => e.stopPropagation()}
              onClick={clearSystemChat}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
              title="Clear System Alerts (admin — deletes every alert for everyone)"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          <button type="button" onMouseDown={e => e.stopPropagation()} onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors" title="Close">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {showSearch && (
        <div className="border-b border-border bg-white dark:bg-gray-900 px-2.5 py-2 shrink-0">
          <div className="relative">
            <input
              type="text"
              autoFocus
              value={inRoomSearch}
              onChange={e => setInRoomSearch(e.target.value)}
              placeholder="Search this conversation…"
              className="w-full text-xs px-2.5 py-1.5 pr-6 rounded-lg border border-border bg-gray-50 dark:bg-gray-800 text-primary focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            {inRoomSearch && (
              <button type="button" onClick={() => setInRoomSearch('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-secondary hover:text-primary leading-none">×</button>
            )}
          </div>
          {inRoomSearch.trim().length >= 2 && (
            <div className="mt-1.5 max-h-40 overflow-y-auto space-y-1">
              {searchingInRoom ? (
                <p className="text-[10px] text-secondary px-1">Searching…</p>
              ) : inRoomResults.length === 0 ? (
                <p className="text-[10px] text-secondary px-1">No matches</p>
              ) : (
                inRoomResults.map(r => (
                  <button
                    key={r.messageId}
                    type="button"
                    onClick={() => jumpToMessage(r)}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-[10px]"
                  >
                    <span className="text-secondary">{formatTime(r.createdAt)}{r.isReply ? ' · reply' : ''}</span>
                    <p className="text-primary truncate">{r.snippet}</p>
                  </button>
                ))
              )}
            </div>
          )}
          {inRoomSearch.trim().length >= 2 && (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('chat:open-search', { detail: { query: inRoomSearch.trim() } }))}
              className="mt-1.5 text-[10px] text-indigo-500 hover:text-indigo-700 font-medium px-1"
            >
              🔎 Search all conversations for &ldquo;{inRoomSearch.trim()}&rdquo;
            </button>
          )}
        </div>
      )}

      <div className="relative flex-1 min-h-0 flex flex-col">
      <div ref={history.scrollRef} onScroll={history.onScroll} className="flex-1 overflow-y-auto px-2.5 py-2.5 bg-gray-50 dark:bg-gray-950">
        {history.loaded && messages.length === 0 && !history.hasMoreBefore && (
          <p className="text-center text-xs text-secondary mt-6">No messages yet. Say hello!</p>
        )}
        {history.loadingOlder && <p className="text-center text-[10px] text-secondary py-1">Loading earlier messages…</p>}
        {messages.map((msg, i) => (
          <div key={msg.id}>
            {(i === 0 || formatDate(messages[i - 1].createdAt) !== formatDate(msg.createdAt)) && (
              <div className="flex items-center gap-2 my-1.5">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[9px] text-secondary font-medium">{formatDate(msg.createdAt)}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}
            {msg.id === history.firstUnreadId && (
              <div className="flex items-center gap-2 my-1.5">
                <div className="flex-1 h-px bg-rose-300 dark:bg-rose-700" />
                <span className="text-[9px] text-rose-600 dark:text-rose-400 font-semibold uppercase tracking-wide">New messages</span>
                <div className="flex-1 h-px bg-rose-300 dark:bg-rose-700" />
              </div>
            )}
            {renderMessage(msg)}
          </div>
        ))}
        {history.loadingNewer && <p className="text-center text-[10px] text-secondary py-1">Loading newer messages…</p>}
        {(history.hasMoreAfter || history.newBelowCount > 0) && (
          <div className="sticky bottom-0 flex justify-end pointer-events-none">
            <button
              type="button"
              onClick={() => history.jumpToLatest()}
              className="pointer-events-auto text-[10px] font-medium px-2.5 py-1 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg"
            >
              ↓ {history.newBelowCount > 0 ? `${history.newBelowCount} new message${history.newBelowCount === 1 ? '' : 's'}` : 'Latest'}
            </button>
          </div>
        )}
      </div>

      {roomType === 'system' ? (
        <div className="border-t border-border bg-gray-50 dark:bg-gray-900 px-2.5 py-2 shrink-0 text-center">
          <p className="text-[10px] text-secondary">🔒 Read-only system channel — nobody can reply here</p>
        </div>
      ) : (
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
        <PendingAttachmentsRow attachments={pendingAttachments} uploadingNames={uploadingNames} onRemove={id => setPendingAttachments(prev => prev.filter(a => a.id !== id))} />
        <div className="flex items-end gap-1.5">
          <AttachButton onFilesSelected={handleFilesSelected} disabled={sending} />
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
            disabled={sending || uploadingNames.length > 0 || (!newMessage.trim() && pendingAttachments.length === 0)}
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
      )}

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

      {trimQueue[0] && (
        <VideoTrimModal
          file={trimQueue[0]}
          onCancel={() => setTrimQueue(prev => prev.slice(1))}
          onTrimmed={(trimmedFile) => { setTrimQueue(prev => prev.slice(1)); startUpload(trimmedFile) }}
        />
      )}
    </div>
  )
}
