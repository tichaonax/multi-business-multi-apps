'use client'

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { io, Socket } from 'socket.io-client'
import { useToastContext } from '@/components/ui/toast'

export interface AppNotification {
  id: string
  type: string
  title: string
  message: string
  linkUrl?: string | null
  isRead: boolean
  createdAt: string
}

interface NotificationContextValue {
  notifications: AppNotification[]
  unreadCount: number
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  refresh: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  markRead: async () => {},
  markAllRead: async () => {},
  refresh: async () => {},
})

export function useNotifications() {
  return useContext(NotificationContext)
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const toast = useToastContext()
  const pathname = usePathname()
  const socketRef = useRef<Socket | null>(null)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const userId = (session?.user as any)?.id as string | undefined
  // Mirrors ConditionalGlobalHeader's own gating — the bell/panel this feeds
  // is already hidden here, but the provider itself wasn't: a stale/leftover
  // session cookie can briefly make useSession() report 'authenticated' with
  // a previous user's identity while sitting on the login screen (e.g. right
  // after a forced-logout redirect, before the cookie is fully cleared), and
  // the socket handler's toast.push() renders on top of the login form
  // regardless — toasts aren't route-gated the way the header is.
  const isAuthPage = !!pathname?.startsWith('/auth')

  const refresh = useCallback(async () => {
    if (!userId || isAuthPage) return
    try {
      const res = await fetch('/api/notifications', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications ?? [])
        setUnreadCount(data.unreadCount ?? 0)
      }
    } catch {
      // silently fail
    }
  }, [userId, isAuthPage])

  // Load notifications on auth + poll every 30s as socket fallback
  useEffect(() => {
    if (status === 'authenticated' && userId && !isAuthPage) {
      refresh()
      const interval = setInterval(refresh, 30000)
      return () => clearInterval(interval)
    } else if (status === 'unauthenticated' || isAuthPage) {
      setNotifications([])
      setUnreadCount(0)
    }
  }, [status, userId, isAuthPage, refresh])

  // Socket.io connection
  useEffect(() => {
    if (status !== 'authenticated' || !userId || isAuthPage) return

    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('join-notification-room', { userId })
    })

    socket.on('notification:new', (payload: Omit<AppNotification, 'isRead'>) => {
      // Add to local list and bump unread count
      setNotifications(prev => [{ ...payload, isRead: false }, ...prev].slice(0, 30))
      setUnreadCount(prev => prev + 1)

      // Dispatch the existing event so pending-actions hooks re-fetch
      window.dispatchEvent(new CustomEvent('pending-actions:refresh'))

      // Show toast
      toast.push(`${payload.title}: ${payload.message}`, { type: 'info' })
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [status, userId, isAuthPage]) // eslint-disable-line react-hooks/exhaustive-deps

  const markRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PUT', credentials: 'include' })
    } catch { /* non-critical */ }
  }, [])

  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    setUnreadCount(0)
    try {
      await fetch('/api/notifications/read-all', { method: 'PUT', credentials: 'include' })
    } catch { /* non-critical */ }
  }, [])

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markRead, markAllRead, refresh }}>
      {children}
    </NotificationContext.Provider>
  )
}
