'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { io, Socket } from 'socket.io-client'
import { setChatBadge } from '@/lib/chat-badge'
import { ChatWindow } from '@/components/chat/chat-window'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { useTypingEmitter, useTypingTracker, formatTypingLabel } from '@/hooks/use-typing-indicator'
import { playChatNotificationSound } from '@/lib/chat-sound'
import {
  type ChatSettings,
  DEFAULT_CHAT_SETTINGS,
  MIN_OPEN_WINDOWS,
  MAX_OPEN_WINDOWS_CAP,
  clampMaxOpenWindows,
  loadChatSettings,
  saveChatSettings,
} from '@/lib/chat-settings'

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
  // MBM-304: action link on a system message (e.g. a license-compliance
  // alert deep-linking into Fleet Management) — null for every normal message.
  linkUrl?: string | null
  createdAt: string
  deletedAt: string | null
  editedAt: string | null
  editCount: number
  parentId: string | null
  replyScope: string | null
  replyCount: number
  recipients: Recipient[]
}

interface UserOption { id: string; name: string; online?: boolean; photoUrl?: string | null }

// MBM-301 — a persistent DM/group conversation, distinct from the single
// General/Team room, which lives in the hub panel itself. DM/group
// conversations instead open as independent satellite ChatWindows (see
// openWindows below) so several can be open side by side.
interface RoomSummary {
  id: string
  type: 'direct' | 'group'
  name: string
  participants: { id: string; name: string; photoUrl: string | null }[]
  lastMessage: { text: string; at: string; isOwn: boolean } | null
  unreadCount: number
}

interface SearchResult {
  roomId: string | null
  roomName: string
  messageId: string
  snippet: string
  createdAt: string
}

const PANEL_W = 360
const PANEL_H = 500
// Composer grows with the message up to ~5 lines, then scrolls internally
// rather than keep shrinking the message list above it.
const MAX_INPUT_HEIGHT = 120
const LAST_OPENED_KEY = 'chat_last_opened_at'
// A message can only be edited by its sender, only while it's still their
// most recent message in the room, and only within this window of sending
// — mirrors EDIT_WINDOW_MS in src/lib/chat/rooms.ts (server-enforced; this
// copy is just for hiding the Edit button once it's clearly expired).
const EDIT_WINDOW_MS = 15 * 60 * 1000

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

// Keeps the conversation list ordered most-recent-first after a LOCAL
// lastMessage update (sending/receiving) — the server already returns it
// sorted, but a plain setRooms(prev => prev.map(...)) preserves array order,
// so without this a just-active conversation wouldn't jump back to the top
// until the next full refetch.
function sortRoomsByRecency(rooms: RoomSummary[]): RoomSummary[] {
  return [...rooms].sort((a, b) => {
    const at = a.lastMessage?.at ?? ''
    const bt = b.lastMessage?.at ?? ''
    return bt.localeCompare(at)
  })
}

export function FloatingChat() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  // Mirrors notification-provider.tsx's isAuthPage guard — `status` from
  // useSession() can still read 'authenticated' on an /auth page (a
  // lingering session cookie while switching accounts, a session that
  // hasn't finished invalidating after logout, etc.), so relying on status
  // alone let the chat bubble/panel render over the sign-in form.
  const isAuthPage = !!pathname?.startsWith('/auth')
  const currentUserId = (session?.user as any)?.id as string | undefined
  const currentUserName = (session?.user as any)?.name as string | undefined
  // Cascading satellite windows only make sense with room to cascade into —
  // mobile is capped to a single open conversation regardless of the
  // maxOpenWindows preference (that setting is desktop-only in effect).
  const isMobile = useIsMobile()

  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [connected, setConnected] = useState(false)
  const [unread, setUnread] = useState(0)
  const [unreadDirect, setUnreadDirect] = useState(0)
  // Snapshot of LAST_OPENED_KEY taken the moment the panel is opened, BEFORE
  // it gets overwritten to "now" — without this, the unread badge resets to
  // 0 the instant you open the panel with no trace of which message was
  // actually new, so there was nothing left to visually flag. Cleared again
  // on minimise so the next open takes a fresh snapshot.
  const [unreadSinceSnapshot, setUnreadSinceSnapshot] = useState<string | null>(null)

  // Threading
  const [replyingTo, setReplyingTo] = useState<{ id: string; userName: string } | null>(null)
  const [replyScope, setReplyScope] = useState<'OWNER' | 'ALL'>('ALL')
  const [allUsers, setAllUsers] = useState<UserOption[]>([])
  const [expandedThreads, setExpandedThreads] = useState<Record<string, Message[]>>({})
  const [loadingThreads, setLoadingThreads] = useState<Record<string, boolean>>({})
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null)
  const [showOnlineTooltip, setShowOnlineTooltip] = useState(false)

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

  // Older-than-30-days history — collapsed behind per-month placeholders the
  // user expands on demand; resets (re-collapses) every time the panel is
  // reopened, since loadMessages(null) always refetches just the last 30 days.
  const [olderMonths, setOlderMonths] = useState<{ month: string; count: number }[]>([])
  const [loadedMonths, setLoadedMonths] = useState<Set<string>>(new Set())
  const [loadingMonth, setLoadingMonth] = useState<string | null>(null)

  // MBM-301 — the hub panel itself only ever shows the conversation list or
  // Team/General. Every DM/group opens as its own satellite ChatWindow
  // (openWindows, a list of room ids) rendered alongside the hub, so several
  // can be open — and told apart — at once instead of replacing each other.
  const [view, setView] = useState<'list' | 'team'>(DEFAULT_CHAT_SETTINGS.defaultView)
  const [rooms, setRooms] = useState<RoomSummary[]>([])
  const [openWindows, setOpenWindows] = useState<string[]>([])
  // Lifted up from ChatWindow (not kept as that component's own local state)
  // so a manually-dragged position survives minimizing and restoring the
  // hub — ChatWindow instances unmount while the hub is minimized (see the
  // `if (!isOpen)` early return below), which would otherwise wipe it.
  const [windowPositions, setWindowPositions] = useState<Record<string, { right: number; bottom: number }>>({})
  const [loadingRooms, setLoadingRooms] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [newChatSearch, setNewChatSearch] = useState('')
  const [newChatSelectedIds, setNewChatSelectedIds] = useState<string[]>([])
  const [newChatGroupName, setNewChatGroupName] = useState('')
  const [creatingRoom, setCreatingRoom] = useState(false)
  const [showOnlineList, setShowOnlineList] = useState(false)

  // Conversation-list search — instant by room name, debounced by message content
  const [listSearch, setListSearch] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)

  // Personal chat preferences — notification sound, max open satellite windows
  const [chatSettings, setChatSettings] = useState<ChatSettings>(DEFAULT_CHAT_SETTINGS)
  const [showChatSettings, setShowChatSettings] = useState(false)

  // The hub stays put (right: 24, bottom: 72) — it's the one fixed anchor;
  // satellite ChatWindows are the ones that can be dragged out of the way.
  const socketRef = useRef<Socket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const isOpenRef = useRef(isOpen)
  useEffect(() => { isOpenRef.current = isOpen }, [isOpen])
  // The socket message handler below is registered once (on connect) — these
  // mirror fast-changing state into refs so it always reads the CURRENT
  // view/open-windows instead of whatever was current when it was registered.
  const viewRef = useRef<'list' | 'team'>(view)
  useEffect(() => { viewRef.current = view }, [view])
  const openWindowsRef = useRef<string[]>([])
  useEffect(() => { openWindowsRef.current = openWindows }, [openWindows])
  // So the eviction-on-open-overflow logic can read each room's last-message
  // time without needing `rooms` in openConversationWindow's own deps.
  const roomsRef = useRef<RoomSummary[]>([])
  useEffect(() => { roomsRef.current = rooms }, [rooms])
  // Read inside the socket handler (sound) and openConversationWindow (max
  // window cap) without either needing chatSettings in their own deps.
  const chatSettingsRef = useRef<ChatSettings>(DEFAULT_CHAT_SETTINGS)
  useEffect(() => { chatSettingsRef.current = chatSettings }, [chatSettings])
  const isMobileRef = useRef(false)
  useEffect(() => { isMobileRef.current = isMobile }, [isMobile])
  // Resolved once from the server so incoming socket messages can tell a
  // General/Team message apart from a DM/group one by roomId alone.
  const generalRoomIdRef = useRef<string | null>(null)
  // Typing indicators — tracks everyone currently typing, keyed by room
  // ('general' for Team Chat), for both the conversation list rows and
  // Team Chat's own view. Each DM/group ChatWindow tracks its own room
  // independently. The emitter below is for the hub's own Team Chat composer.
  const typingByRoom = useTypingTracker(socketRef.current, currentUserId)
  const { notifyTyping: notifyTeamTyping, notifyStopTyping: notifyTeamStopTyping } =
    useTypingEmitter(socketRef.current, null, currentUserId, currentUserName)
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
    // Capture what "new" meant for this session before clearing it, so the
    // Team Chat message list can show a divider at the first message that
    // arrived since last time — see unreadSinceSnapshot above.
    setUnreadSinceSnapshot(localStorage.getItem(LAST_OPENED_KEY))
    setUnread(0)
    setUnreadDirect(0)
    localStorage.setItem(LAST_OPENED_KEY, new Date().toISOString())
    setView(chatSettingsRef.current.defaultView)
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

  // MBM-301 follow-up — list calendar months older than the default 30-day
  // window that have messages, for the collapsed "older messages" placeholders.
  const loadOlderMonths = useCallback((roomId: string | null) => {
    setLoadedMonths(new Set())
    const qs = roomId ? `?roomId=${encodeURIComponent(roomId)}` : ''
    fetch(`/api/chat/messages/months${qs}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then((data: { month: string; count: number }[]) => setOlderMonths(data || []))
      .catch(() => setOlderMonths([]))
  }, [])

  // Expand one older-month placeholder — fetches that month's messages and
  // merges them into the already-loaded list.
  const expandMonth = async (month: string) => {
    setLoadingMonth(month)
    try {
      const data: Message[] = await fetch(`/api/chat/messages?month=${month}`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : [])
      setMessages(prev => [...data, ...prev].sort((a, b) => a.createdAt.localeCompare(b.createdAt)))
      setLoadedMonths(prev => new Set(prev).add(month))
      setTimeout(scrollToBottom, 50)
    } catch { /* non-critical */ } finally {
      setLoadingMonth(null)
    }
  }

  // MBM-301 — fetch the current user's DM/group conversation list.
  const loadRooms = useCallback(() => {
    if (status !== 'authenticated' || isAuthPage) return Promise.resolve([] as RoomSummary[])
    setLoadingRooms(true)
    return fetch('/api/chat/rooms', { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then((data: RoomSummary[]) => { setRooms(data); return data })
      .catch(() => [] as RoomSummary[])
      .finally(() => setLoadingRooms(false))
  }, [status])

  // Open (or re-focus) a DM/group as its own satellite window, clearing its
  // unread badge. Re-opening an already-open one just brings it to front.
  // Capped by the user's own maxOpenWindows setting (see chat-settings.ts).
  const openConversationWindow = useCallback((roomId: string) => {
    setOpenWindows(prev => {
      const without = prev.filter(id => id !== roomId)
      let next = [...without, roomId]
      const effectiveMax = isMobileRef.current ? 1 : chatSettingsRef.current.maxOpenWindows

      // Evict by oldest last-received message among the OTHER open windows
      // (never the one just opened) — an empty/no-message conversation
      // counts as the oldest possible, since '' sorts before any ISO date.
      // Looped so dropping straight to mobile's cap of 1 from several open
      // desktop windows closes all of them in one go, not just one.
      while (next.length > effectiveMax) {
        const candidates = next.filter(id => id !== roomId)
        if (candidates.length === 0) break
        let oldestId = candidates[0]
        let oldestAt = roomsRef.current.find(r => r.id === oldestId)?.lastMessage?.at ?? ''
        for (const id of candidates.slice(1)) {
          const at = roomsRef.current.find(r => r.id === id)?.lastMessage?.at ?? ''
          if (at < oldestAt) { oldestId = id; oldestAt = at }
        }
        next = next.filter(id => id !== oldestId)
      }
      return next
    })
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, unreadCount: 0 } : r))
    fetch(`/api/chat/rooms/${roomId}/read`, { method: 'POST', credentials: 'include' }).catch(() => {})
  }, [])

  const closeConversationWindow = useCallback((roomId: string) => {
    setOpenWindows(prev => prev.filter(id => id !== roomId))
  }, [])

  // Load this user's chat preferences once known, and persist on change.
  // Also seeds the initial view from their default-view preference — guarded
  // so it only ever applies once, not every time this effect happens to
  // re-run, which would otherwise yank the user back if it fired mid-use.
  const appliedInitialViewRef = useRef(false)
  useEffect(() => {
    if (!currentUserId) return
    const loaded = loadChatSettings(currentUserId)
    setChatSettings(loaded)
    if (!appliedInitialViewRef.current) {
      appliedInitialViewRef.current = true
      setView(loaded.defaultView)
    }
  }, [currentUserId])

  useEffect(() => {
    if (!currentUserId) return
    saveChatSettings(currentUserId, chatSettings)
  }, [currentUserId, chatSettings])

  // If the user just lowered their max (or the viewport just became mobile,
  // which always caps at 1) below how many are currently open, trim down
  // immediately rather than waiting for the next one to be opened — same
  // oldest-last-message eviction, repeated until back within budget.
  const effectiveMaxOpenWindows = isMobile ? 1 : chatSettings.maxOpenWindows
  useEffect(() => {
    if (openWindows.length <= effectiveMaxOpenWindows) return
    setOpenWindows(prev => {
      if (prev.length <= effectiveMaxOpenWindows) return prev
      const sorted = [...prev].sort((a, b) => {
        const at = roomsRef.current.find(r => r.id === a)?.lastMessage?.at ?? ''
        const bt = roomsRef.current.find(r => r.id === b)?.lastMessage?.at ?? ''
        return at.localeCompare(bt) // oldest first
      })
      return sorted.slice(sorted.length - effectiveMaxOpenWindows)
    })
  }, [effectiveMaxOpenWindows, openWindows.length])

  // MBM-301 — switch the hub panel to show General/Team (roomId === null),
  // or open a DM/group as a satellite window alongside it (roomId set).
  const switchRoom = useCallback((roomId: string | null) => {
    if (roomId) {
      openConversationWindow(roomId)
      return
    }
    setView('team')
    setExpandedThreads({})
    setReplyingTo(null)
    setReplyScope('ALL')
    loadMessages(null).then((data: Message[]) => { setMessages(data || []); setTimeout(scrollToBottom, 50) })
    loadOlderMonths(null)
    setUnread(0)
    setUnreadDirect(0)
  }, [loadMessages, loadOlderMonths, scrollToBottom, openConversationWindow])

  // Fetch message history and seed unread counts from messages received since last open
  useEffect(() => {
    if (status !== 'authenticated' || isAuthPage) return
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
    loadOlderMonths(null)
    loadRooms()
  }, [status, isAuthPage, scrollToBottom, loadRooms, loadOlderMonths])

  // Socket.io connection
  useEffect(() => {
    if (status !== 'authenticated' || isAuthPage) return

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

      // One chime per incoming message from someone else — regardless of
      // which conversation it's for, since you might be looking at a
      // different one (or the list). Membership-change system messages
      // don't count as "a message received" for this.
      if (msg.userId !== currentUserId && !msg.isSystem && chatSettingsRef.current.soundEnabled) {
        playChatNotificationSound()
      }

      if (!isGeneralMsg) {
        // DM/group messages are owned by their own satellite ChatWindow,
        // which has its own socket listener for its own roomId — the hub
        // only keeps the conversation-list preview/unread fresh and
        // auto-opens a window when the panel was minimized.
        if (!msg.parentId) {
          setRooms(prev => {
            const idx = prev.findIndex(r => r.id === targetRoomId)
            if (idx === -1) return prev // unknown (brand-new) room — backfilled below
            const next = [...prev]
            next[idx] = { ...next[idx], lastMessage: { text: msg.message, at: msg.createdAt, isOwn: msg.userId === currentUserId } }
            return sortRoomsByRecency(next)
          })
        }
        if (msg.userId === currentUserId) return // never badge our own message

        if (!isOpenRef.current) {
          cancelAutoClose()
          switchRoom(targetRoomId) // opens straight into it as a satellite window
          loadRooms()
          setIsOpen(true)
          autoCloseTimerRef.current = setTimeout(() => {
            autoCloseTimerRef.current = null
            setIsOpen(false)
          }, 5000)
        } else if (!openWindowsRef.current.includes(targetRoomId!)) {
          setRooms(prev => {
            if (prev.some(r => r.id === targetRoomId)) {
              return prev.map(r => r.id === targetRoomId ? { ...r, unreadCount: r.unreadCount + 1 } : r)
            }
            loadRooms() // brand-new conversation — not in the list yet
            return prev
          })
        }
        return
      }

      // General/Team — rendered inside the hub itself.
      const isTeamOpen = viewRef.current === 'team'

      if (msg.parentId) {
        const isDirectedAtMe = msg.userId !== currentUserId &&
          msg.recipients.length > 0 && msg.recipients.some(r => r.id === currentUserId)

        setExpandedThreads(prev => {
          if (prev[msg.parentId!]) {
            const already = prev[msg.parentId!].some(m => m.id === msg.id)
            if (already) return prev
            return { ...prev, [msg.parentId!]: [...prev[msg.parentId!], msg] }
          }
          if (isDirectedAtMe) return { ...prev, [msg.parentId!]: [msg] }
          return prev
        })
        setMessages(prev => prev.map(m =>
          m.id === msg.parentId ? { ...m, replyCount: m.replyCount + 1 } : m
        ))
        if (isDirectedAtMe) {
          setTimeout(scrollToBottom, 100)
          if (!isOpenRef.current) {
            setUnreadDirect(u => u + 1)
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

      if (isTeamOpen) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev
          return [...prev, msg]
        })
        setTimeout(scrollToBottom, 50)
      }

      if (msg.userId === currentUserId) return // never badge our own message

      if (!isOpenRef.current) {
        cancelAutoClose()
        const isDirect = msg.recipients.length > 0 && msg.recipients.some(r => r.id === currentUserId)
        if (isDirect) setUnreadDirect(u => u + 1); else setUnread(u => u + 1)
        setIsOpen(true)
        autoCloseTimerRef.current = setTimeout(() => {
          autoCloseTimerRef.current = null
          setIsOpen(false)
        }, 5000)
      } else if (!isTeamOpen) {
        const isDirect = msg.recipients.length > 0 && msg.recipients.some(r => r.id === currentUserId)
        if (isDirect) setUnreadDirect(u => u + 1); else setUnread(u => u + 1)
      }
    })

    socket.on('chat:message:deleted', ({ id }: { id: string }) => {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, deletedAt: new Date().toISOString() } : m))
    })

    socket.on('chat:message:edited', (msg: { id: string; message: string; editedAt: string | null; editCount: number }) => {
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, message: msg.message, editedAt: msg.editedAt, editCount: msg.editCount } : m))
    })

    // Removed from a group — its window (if open) closes and it drops out
    // of the list, same as if it never existed for this user.
    socket.on('chat:room-removed', ({ roomId }: { roomId: string }) => {
      setOpenWindows(prev => prev.filter(id => id !== roomId))
      setRooms(prev => prev.filter(r => r.id !== roomId))
    })

    // Added to a new/existing group — pick it up into the list.
    socket.on('chat:room-added', () => {
      loadRooms()
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
  }, [status, isAuthPage, scrollToBottom, switchRoom, loadRooms])

  // Re-fetch history and scroll whenever panel opens (auto or manual)
  useEffect(() => {
    if (isOpen) {
      loadRooms()
      if (view === 'team') {
        loadMessages(null).then((data: Message[]) => { setMessages(data || []); setTimeout(scrollToBottom, 50) })
        loadOlderMonths(null)
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

  // Debounced message-content search — conversation-name matching is instant
  // (filtered client-side from `rooms`), this covers "find the chat where
  // someone said X" instead.
  useEffect(() => {
    const q = listSearch.trim()
    if (q.length < 2) { setSearchResults([]); setSearching(false); return }
    setSearching(true)
    const t = setTimeout(() => {
      fetch(`/api/chat/search?q=${encodeURIComponent(q)}`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : [])
        .then((data: SearchResult[]) => setSearchResults(data))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false))
    }, 300)
    return () => clearTimeout(t)
  }, [listSearch])


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

  // Quick-start a DM directly from the "N online" list — same find-or-create
  // as startNewChat, without going through the multi-select picker.
  const startDirectChat = async (userId: string) => {
    if (creatingRoom) return
    setCreatingRoom(true)
    try {
      const res = await fetch('/api/chat/rooms', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: [userId] }),
      })
      if (!res.ok) return
      const created: { id: string } = await res.json()
      setShowOnlineList(false)
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

  // ── Helpers ─────────────────────────────────────────────────────────────
  // The hub's own composer is always General/Team now — DM/group rooms send
  // through their own satellite ChatWindow's identical-in-spirit sendMessage.
  const sendMessage = async () => {
    const text = newMessage.trim()
    if (!text || sending) return
    setSending(true)
    setNewMessage('')
    notifyTeamStopTyping()
    try {
      const body: any = { message: text }
      if (replyingTo) {
        body.parentId = replyingTo.id
        body.replyScope = replyScope
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

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })

  // 'YYYY-MM' -> "September 2026"
  const formatMonthLabel = (month: string) => {
    const [y, m] = month.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString([], { month: 'long', year: 'numeric', timeZone: 'UTC' })
  }

  type GroupedMessages = { date: string; msgs: Message[] }[]
  const grouped = messages.reduce<GroupedMessages>((acc, msg) => {
    const d = formatDate(msg.createdAt)
    const last = acc[acc.length - 1]
    if (last && last.date === d) last.msgs.push(msg)
    else acc.push({ date: d, msgs: [msg] })
    return acc
  }, [])

  // The first Team/General message that arrived since this session's open
  // snapshot (see unreadSinceSnapshot) — gets a "New messages" divider so
  // the unread badge's count has something to actually point at, instead of
  // vanishing the instant the panel opens with no trace of what was new.
  // Public broadcasts AND targeted system alerts (e.g. the vehicle license
  // compliance digest — a system message with the admin/manager listed as
  // a recipient) both qualify: excluding isSystem/recipients here used to
  // mean a targeted system broadcast could bump the unread badge but could
  // never actually be pointed at once you opened the panel.
  const firstNewMessageId = unreadSinceSnapshot
    ? messages.find(m =>
        m.userId !== currentUserId &&
        (m.recipients.length === 0 || m.recipients.some(r => r.id === currentUserId)) &&
        new Date(m.createdAt) > new Date(unreadSinceSnapshot)
      )?.id ?? null
    : null

  /** Render a single message bubble (used for both top-level and thread replies) */
  const renderMessage = (msg: Message, isReply = false) => {
    if (msg.isSystem) {
      // MBM-304: a richer broadcast (e.g. a license-compliance digest) gets
      // its own card — multi-line, with an action link — instead of the
      // compact one-line pill used for simple membership-change events.
      // No sender means no Reply/Edit/Delete anywhere below ever shows for
      // these; opening the chat and seeing it here is the acknowledgement,
      // same read-tracking every other message already gets.
      const isRichAlert = !!msg.linkUrl || msg.message.includes('\n')
      if (isRichAlert) {
        return (
          <div key={msg.id} className="flex justify-center mb-2 px-1">
            <div className="max-w-[90%] bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-3 py-2">
              <p className="text-[11px] text-amber-900 dark:text-amber-200 whitespace-pre-wrap leading-relaxed">{msg.message}</p>
              {msg.linkUrl && (
                <a
                  href={msg.linkUrl}
                  onClick={() => setIsOpen(false)}
                  className="inline-block mt-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:underline"
                >
                  Open in Fleet Management →
                </a>
              )}
              <p className="text-[9px] text-amber-500 dark:text-amber-500 mt-1">{formatTime(msg.createdAt)} · System · Read-only</p>
            </div>
          </div>
        )
      }
      return (
        <div key={msg.id} className="flex items-center justify-center mb-2">
          <span className="text-[10px] text-secondary bg-gray-100 dark:bg-gray-800 rounded-full px-2.5 py-1 text-center">
            🔔 {msg.message}
          </span>
        </div>
      )
    }
    const isOwn = msg.userId === currentUserId
    const color = isOwn ? null : getUserColor(msg.userId ?? msg.id)
    const isPrivate = msg.recipients.length > 0
    const myLatestId = [...messages].reverse().find(m => m.userId === currentUserId)?.id
    const isLatestOwn = isOwn && msg.id === myLatestId && !isReply
    const isHovered = hoveredMsgId === msg.id
    const isEditing = editingMsgId === msg.id
    const withinEditWindow = editClockTick - new Date(msg.createdAt).getTime() < EDIT_WINDOW_MS
    const canEdit = isLatestOwn && !msg.deletedAt && withinEditWindow

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
                className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-indigo-400 dark:border-indigo-500 bg-white dark:bg-gray-800 text-primary resize-none"
              />
              <div className="flex items-center gap-2 mt-1">
                <button type="button" onClick={() => saveEdit(msg.id)} className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800">Save</button>
                <button type="button" onClick={cancelEdit} className="text-[11px] font-medium text-secondary hover:text-primary">Cancel</button>
                {editError && <span className="text-[11px] text-red-500">{editError}</span>}
              </div>
            </div>
          ) : (
            <div className={`px-3 py-1.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap break-words ${
              msg.deletedAt
                ? 'bg-gray-100 dark:bg-gray-800 text-secondary italic border border-dashed border-gray-300 dark:border-gray-600'
                : isOwn
                  ? 'bg-indigo-600 text-white rounded-tr-sm'
                  : `bg-white dark:bg-gray-800 text-primary border border-border border-l-4 ${color!.border} rounded-tl-sm shadow-sm`
            }`}>
              {msg.deletedAt ? '🚫 This message was deleted' : msg.message}
            </div>
          )}
          {!isEditing && (
          <div className="flex items-center gap-2 mt-1 mx-1">
            <span className="text-[10px] text-secondary">
              {formatTime(msg.createdAt)}
              {msg.editedAt && !msg.deletedAt && (
                <span className="italic"> (edited{msg.editCount > 1 ? ` ${msg.editCount}x` : ''})</span>
              )}
            </span>
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
            {canEdit && (
              <button
                type="button"
                onClick={() => startEdit(msg)}
                className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-600 transition-colors font-medium"
                title="Edit message (within 15 minutes of sending)"
              >
                ✎ Edit
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
          )}
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
  if (isAuthPage) return null
  if (status !== 'authenticated') return null

  const roomsUnreadTotal = rooms.reduce((sum, r) => sum + r.unreadCount, 0)
  const filteredNewChatUsers = allUsers.filter(u =>
    !newChatSearch.trim() || u.name.toLowerCase().includes(newChatSearch.trim().toLowerCase())
  )

  // Conversation-list search: instant name match + debounced content match
  const nameQuery = listSearch.trim().toLowerCase()
  const teamMatchesName = !nameQuery || 'team chat'.includes(nameQuery)
  const filteredRooms = nameQuery ? rooms.filter(r => r.name.toLowerCase().includes(nameQuery)) : rooms
  const filteredRoomIds = new Set(filteredRooms.map(r => r.id))
  // Don't show a message-content hit for a conversation already listed above by name match.
  const contentOnlyResults = searchResults.filter(r =>
    r.roomId ? !filteredRoomIds.has(r.roomId) : !teamMatchesName
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
  // On mobile there's only room for one window on screen at a time (the
  // satellite is sized to fill most of the screen — see chat-window.tsx) and
  // it sits at a lower z-index than the hub, so without this the hub simply
  // covered it, leaving only a sliver of the composer peeking out underneath
  // with no way to see or reach the actual messages. Hide the hub's panel
  // (not unmount it — its socket/rooms state stays alive) while any
  // satellite is open on mobile; closing it reveals the hub again, showing
  // the conversations list.
  const hideHubOnMobile = isMobile && openWindows.length > 0
  return (
    <>
    <div
      style={{ position: 'fixed', right: 24, bottom: 72, width: PANEL_W, height: PANEL_H, zIndex: 9999, display: hideHubOnMobile ? 'none' : 'flex' }}
      className="flex-col rounded-2xl shadow-2xl border border-border bg-white dark:bg-gray-900 overflow-hidden"
    >
      {/* Header — fixed in place; this is the one window that doesn't move */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-indigo-600 text-white select-none shrink-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          {view === 'team' && (
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
            {view === 'list' ? 'Chats' : 'Team Chat'}
          </span>
          {view === 'team' && (
            <span className={`w-2 h-2 rounded-full shrink-0 ${connected ? 'bg-green-400' : 'bg-gray-400'}`} title={connected ? 'Live' : 'Connecting…'} />
          )}
          {view === 'team' && (
            <div className="relative shrink-0">
              <button
                type="button"
                onMouseDown={e => e.stopPropagation()}
                onClick={() => setShowOnlineList(s => !s)}
                className="text-[10px] text-white/70 hover:text-white font-medium underline decoration-dotted underline-offset-2"
                title="Who's online — click to message someone directly"
              >
                {allUsers.filter(u => u.online).length} online
              </button>
              {showOnlineList && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowOnlineList(false)} />
                  <div className="absolute top-full left-0 mt-1 z-20 bg-white dark:bg-gray-800 border border-border rounded-lg shadow-lg w-48 max-h-56 overflow-y-auto text-left">
                    {allUsers.filter(u => u.online).length === 0 ? (
                      <p className="text-[11px] text-secondary px-3 py-2">No one else is online right now</p>
                    ) : allUsers.filter(u => u.online).map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => startDirectChat(u.id)}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <span className={`w-5 h-5 rounded-full shrink-0 relative overflow-hidden flex items-center justify-center text-white text-[9px] font-bold ${getUserColor(u.id).avatar}`}>
                          {u.name.charAt(0).toUpperCase()}
                          {u.photoUrl && (
                            <img src={u.photoUrl} alt={u.name} className="absolute inset-0 w-full h-full object-cover"
                              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                          )}
                          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400 border border-white dark:border-gray-800" />
                        </span>
                        <span className="truncate text-primary">{u.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onMouseDown={e => e.stopPropagation()}
            onClick={() => setShowNewChat(true)}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
            title="New chat — message a person or group"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            type="button"
            onMouseDown={e => e.stopPropagation()}
            onClick={() => setShowChatSettings(true)}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
            title="Chat settings"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            type="button"
            onMouseDown={e => e.stopPropagation()}
            onClick={() => { cancelAutoClose(); setIsOpen(false); setUnreadSinceSnapshot(null) }}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
            title="Minimise"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
        </div>
      </div>

      <div className="relative flex-1 min-h-0 flex flex-col">
      {view === 'list' ? (
          <div className="h-full overflow-y-auto px-2 py-2 bg-gray-50 dark:bg-gray-950">
            {/* Search — by conversation name instantly, by message content (debounced) */}
            <div className="px-1 pb-2 sticky top-0 bg-gray-50 dark:bg-gray-950 z-10">
              <div className="relative">
                <input
                  type="text"
                  value={listSearch}
                  onChange={e => setListSearch(e.target.value)}
                  placeholder="Search chats or messages…"
                  className="w-full text-sm pl-8 pr-7 py-2 rounded-lg border border-border bg-white dark:bg-gray-800 text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <svg className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                </svg>
                {listSearch && (
                  <button type="button" onClick={() => setListSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary hover:text-primary text-sm" title="Clear">✕</button>
                )}
              </div>
            </div>

            {/* Team — pinned, always present (hidden only while actively searching by name and it doesn't match) */}
            {teamMatchesName && (
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
                  <div className="text-xs truncate text-secondary">
                    {(typingByRoom['general']?.length ?? 0) > 0
                      ? <span className="italic text-indigo-500 dark:text-indigo-400">{formatTypingLabel(typingByRoom['general'])}</span>
                      : `${allUsers.filter(u => u.online).length} online`}
                  </div>
                </div>
                {(unread + unreadDirect) > 0 && (
                  <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {(unread + unreadDirect) > 9 ? '9+' : unread + unreadDirect}
                  </span>
                )}
              </button>
            )}

            {loadingRooms && rooms.length === 0 && (
              <p className="text-center text-xs text-secondary mt-6">Loading…</p>
            )}
            {!loadingRooms && rooms.length === 0 && !listSearch && (
              <p className="text-center text-xs text-secondary mt-6 px-4">No conversations yet — tap + to start one.</p>
            )}
            {filteredRooms.map(room => (
              <button
                key={room.id}
                type="button"
                onClick={() => switchRoom(room.id)}
                className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-colors text-left"
              >
                <div className={`w-10 h-10 rounded-full shrink-0 relative flex items-center justify-center text-white text-sm font-bold overflow-hidden ${
                  room.type === 'group' ? 'bg-violet-500' : getUserColor(room.participants[0]?.id ?? room.id).avatar
                }`}>
                  {room.type === 'group' ? '👥' : room.name.charAt(0).toUpperCase()}
                  {room.type === 'direct' && room.participants[0]?.photoUrl && (
                    <img src={room.participants[0].photoUrl} alt={room.name} className="absolute inset-0 w-full h-full object-cover"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-primary truncate">{room.name}</span>
                    {room.lastMessage && <span className="text-[10px] text-secondary shrink-0">{formatTime(room.lastMessage.at)}</span>}
                  </div>
                  <div className="text-xs truncate text-secondary">
                    {(typingByRoom[room.id]?.length ?? 0) > 0
                      ? <span className="italic text-indigo-500 dark:text-indigo-400">{formatTypingLabel(typingByRoom[room.id])}</span>
                      : room.lastMessage ? `${room.lastMessage.isOwn ? 'You: ' : ''}${room.lastMessage.text}` : 'No messages yet'}
                  </div>
                </div>
                {room.unreadCount > 0 && (
                  <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {room.unreadCount > 9 ? '9+' : room.unreadCount}
                  </span>
                )}
              </button>
            ))}

            {/* Message-content matches — a chat whose name didn't match, but something said in it did */}
            {listSearch.trim().length >= 2 && (
              <>
                <div className="flex items-center gap-2 mt-3 mb-1 px-1">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[10px] text-secondary font-medium uppercase tracking-wide">
                    {searching ? 'Searching messages…' : `Messages (${contentOnlyResults.length})`}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                {!searching && contentOnlyResults.length === 0 && (
                  <p className="text-center text-xs text-secondary py-2 px-4">No messages match "{listSearch.trim()}"</p>
                )}
                {contentOnlyResults.map(result => (
                  <button
                    key={result.messageId}
                    type="button"
                    onClick={() => switchRoom(result.roomId)}
                    className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm">
                      💬
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm text-primary truncate">{result.roomName}</span>
                        <span className="text-[10px] text-secondary shrink-0">{formatTime(result.createdAt)}</span>
                      </div>
                      <div className="text-xs text-secondary truncate">{result.snippet}</div>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
      ) : (
      <>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 bg-gray-50 dark:bg-gray-950">
        {messages.length === 0 && olderMonths.length === 0 && (
          <p className="text-center text-xs text-secondary mt-8">No messages yet. Say hello!</p>
        )}
        {/* Collapsed older-than-30-days history, oldest first — click to load that month's messages */}
        {olderMonths.filter(m => !loadedMonths.has(m.month)).slice().reverse().map(({ month, count }) => (
          <button
            key={month}
            type="button"
            onClick={() => expandMonth(month)}
            disabled={loadingMonth === month}
            className="w-full flex items-center gap-2 my-2 group"
          >
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] text-indigo-500 group-hover:text-indigo-700 font-medium px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
              {loadingMonth === month ? 'Loading…' : `${formatMonthLabel(month)} (${count}) — click to load`}
            </span>
            <div className="flex-1 h-px bg-border" />
          </button>
        ))}
        {grouped.map(({ date, msgs }) => (
          <div key={date}>
            <div className="flex items-center gap-2 my-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] text-secondary font-medium">{date}</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            {msgs.map(msg => (
              <div key={msg.id}>
                {msg.id === firstNewMessageId && (
                  <div className="flex items-center gap-2 my-2">
                    <div className="flex-1 h-px bg-rose-300 dark:bg-rose-700" />
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold uppercase tracking-wide">New messages</span>
                    <div className="flex-1 h-px bg-rose-300 dark:bg-rose-700" />
                  </div>
                )}
                {renderMessage(msg)}
              </div>
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-white dark:bg-gray-900 px-3 py-3 shrink-0 space-y-2">
        {/* Typing indicator */}
        {(typingByRoom['general']?.length ?? 0) > 0 && (
          <p className="text-[11px] text-secondary italic -mb-1">{formatTypingLabel(typingByRoom['general'])}</p>
        )}
        {/* Reply-to banner */}
        {replyingTo && (
          <div className="flex items-center gap-2 text-xs bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-700 rounded-lg px-3 py-1.5">
            <span className="text-indigo-600 dark:text-indigo-400 flex-1 truncate">
              ↩ Replying to <strong>{replyingTo.userName}</strong>
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {/* The hub's own composer is always General/Team — DM/group
                  replies thread inside their own ChatWindow, which has no
                  OWNER/ALL distinction since the whole room is the audience. */}
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

        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            autoComplete="off"
            value={newMessage}
            onChange={e => { setNewMessage(e.target.value); if (e.target.value.trim()) notifyTeamTyping(); else notifyTeamStopTyping() }}
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

      {/* New chat overlay — reachable from either the list or an open conversation */}
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
                <span className={`w-6 h-6 rounded-full shrink-0 relative overflow-hidden flex items-center justify-center text-white text-[10px] font-bold ${getUserColor(u.id).avatar}`}>
                  {u.name.charAt(0).toUpperCase()}
                  {u.photoUrl && (
                    <img src={u.photoUrl} alt={u.name} className="absolute inset-0 w-full h-full object-cover"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                  )}
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-gray-800 ${u.online ? 'bg-green-400' : 'bg-gray-400'}`} />
                </span>
                <span className="truncate flex-1 text-primary">{u.name}</span>
                {u.online && <span className="text-[10px] text-green-500 shrink-0 mr-1">online</span>}
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

      {/* Chat settings overlay — reachable from either the list or an open conversation */}
      {showChatSettings && (
        <div className="absolute inset-0 z-30 flex flex-col bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <span className="font-semibold text-sm text-primary">Chat settings</span>
            <button type="button" onClick={() => setShowChatSettings(false)} className="text-secondary hover:text-primary text-lg leading-none" title="Close">×</button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
            <div>
              <div className="text-sm font-medium text-primary">🏠 Default view</div>
              <div className="text-xs text-secondary mt-0.5 mb-2">What the chat panel opens to</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setChatSettings(prev => ({ ...prev, defaultView: 'list' }))}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    chatSettings.defaultView === 'list'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'text-primary border-border hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  💬 Chats list
                </button>
                <button
                  type="button"
                  onClick={() => setChatSettings(prev => ({ ...prev, defaultView: 'team' }))}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    chatSettings.defaultView === 'team'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'text-primary border-border hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  👥 Team Chat
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-primary">🔊 Notification sound</div>
                <div className="text-xs text-secondary mt-0.5">Play a chime when a new message arrives</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={chatSettings.soundEnabled}
                onClick={() => setChatSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
                className={`relative w-10 h-6 rounded-full shrink-0 transition-colors ${chatSettings.soundEnabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${chatSettings.soundEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>

            <div className={isMobile ? 'opacity-50 pointer-events-none' : ''}>
              <div className="text-sm font-medium text-primary">🪟 Max open chat windows</div>
              <div className="text-xs text-secondary mt-0.5 mb-2">
                {isMobile
                  ? 'Mobile is limited to 1 open conversation at a time — this setting applies on desktop.'
                  : `How many DM/group windows can be open at once (up to ${MAX_OPEN_WINDOWS_CAP}) — opening one more closes whichever's gone longest without a new message.`}
              </div>
              <div className="flex items-center gap-2">
                {Array.from({ length: MAX_OPEN_WINDOWS_CAP - MIN_OPEN_WINDOWS + 1 }, (_, i) => i + MIN_OPEN_WINDOWS).map(n => (
                  <button
                    key={n}
                    type="button"
                    disabled={isMobile}
                    onClick={() => setChatSettings(prev => ({ ...prev, maxOpenWindows: clampMaxOpenWindows(n) }))}
                    className={`w-8 h-8 rounded-lg text-sm font-semibold border transition-colors ${
                      chatSettings.maxOpenWindows === n
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'text-primary border-border hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>

    {/* Satellite windows — one per open DM/group, cascading left of the hub
        so several conversations can be open and told apart at once. Most
        recently opened/focused sits closest to the hub. */}
    {openWindows.map((roomId, i) => {
      const room = rooms.find(r => r.id === roomId)
      if (!room) return null
      const indexFromHub = openWindows.length - 1 - i
      const rightOffset = 24 + PANEL_W + 12 + indexFromHub * (300 + 12)
      return (
        <ChatWindow
          key={roomId}
          roomId={roomId}
          roomName={room.name}
          roomType={room.type}
          roomPhotoUrl={room.type === 'direct' ? room.participants[0]?.photoUrl : null}
          currentUserId={currentUserId || ''}
          currentUserName={currentUserName}
          socket={socketRef.current}
          onClose={() => closeConversationWindow(roomId)}
          rightOffset={rightOffset}
          isMobile={isMobile}
          customPosition={windowPositions[roomId] ?? null}
          onPositionChange={(pos) => setWindowPositions(prev => ({ ...prev, [roomId]: pos }))}
          onMessageSent={(preview) => {
            setRooms(prev => sortRoomsByRecency(prev.map(r => r.id === roomId ? { ...r, lastMessage: { ...preview, isOwn: true } } : r)))
          }}
        />
      )
    })}
    </>
  )
}
