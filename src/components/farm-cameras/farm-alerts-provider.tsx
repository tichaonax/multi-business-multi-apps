'use client'

// MBM-340 — the camera alert list's one place of state (plan §2.4).
// - The new count (📹 and the bell's count row), kept live from the socket
//   (`farm-alert`, forwarded by notification-provider as a window event).
// - The panel: closed / open / docked (folded to the bar while the big viewer
//   plays), opened from anywhere with openAlerts(alertId?) — the 📹 button,
//   the bell's count row (`farm-alerts:open` window event), a corner card.
// - Which row plays in the panel and which alert is in the big viewer, so the
//   panel, the bar and the viewer agree on every page.
// The panel keeps its tab, filters and scroll while docked; they're forgotten
// when it closes (alert list guide §3.6).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { FarmAlertPanel } from './farm-alert-panel'
import { FarmAlertViewer } from './farm-alert-viewer'
import { FarmAlertCard } from './farm-alert-card'

export type Trigger = 'motion' | 'sound' | 'both'
export interface Finding { eventId: string; start: string; end: string | null; trigger: Trigger }
export interface FarmAlert {
  id: string
  cameraId: string
  cameraName: string
  siteId: string | null
  siteName: string | null
  trigger: Trigger
  start: string
  end: string | null
  times: number
  lastAt: string
  findings: Finding[]
  hasPicture: boolean
  pictureFromEvent: boolean
  seenAt: string | null
  dismissedAt: string | null
  laterAt: string | null
  updatedAt: string
  allowed?: boolean
  paused?: boolean
}

export type PanelState = 'closed' | 'open' | 'docked'
export interface AlertEvent { kind: 'new' | 'update' | 'count'; alert?: FarmAlert; count: number }

interface FarmAlertsValue {
  newCount: number
  /** The person has ever had a camera alert (the 📹 button shows) */
  ever: boolean
  panel: PanelState
  /** Open the panel, on one alert (and play it in its row) if given */
  openAlerts: (alertId?: string, play?: boolean) => void
  closeAlerts: () => void
  /** Alert to scroll to / highlight when the panel opens */
  focusId: string | null
  /** Play the focused alert in its row once it's listed (a corner card's ▶ Play) */
  focusPlay: boolean
  clearFocusPlay: () => void
  /** The alert in the big viewer, and the time it opened at */
  viewer: { alert: FarmAlert; at: string } | null
  watch: (alert: FarmAlert, at?: string) => void
  closeViewer: () => void
  /** The latest live event (the panel refreshes its rows from it) */
  lastEvent: AlertEvent | null
  setNewCount: (n: number) => void
  /** The alerts the panel last listed, newest first (the bar's ‹ ›) */
  listed: FarmAlert[]
  setListed: (a: FarmAlert[]) => void
}

const Ctx = createContext<FarmAlertsValue | null>(null)
export const useFarmAlerts = () => useContext(Ctx)

/** 5 s before it started (guide §7.12) */
export const atFor = (iso: string) => new Date(Date.parse(iso) - 5_000).toISOString()

export function FarmAlertsProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession()
  const [newCount, setNewCount] = useState(0)
  const [ever, setEver] = useState(false)
  const [panel, setPanel] = useState<PanelState>('closed')
  const [focusId, setFocusId] = useState<string | null>(null)
  const [focusPlay, setFocusPlay] = useState(false)
  const [viewer, setViewer] = useState<{ alert: FarmAlert; at: string } | null>(null)
  const [lastEvent, setLastEvent] = useState<AlertEvent | null>(null)
  const [listed, setListed] = useState<FarmAlert[]>([])
  const viewerRef = useRef(viewer)
  viewerRef.current = viewer

  // The count, once signed in
  useEffect(() => {
    if (status !== 'authenticated') { setNewCount(0); setEver(false); setPanel('closed'); setViewer(null); return }
    fetch('/api/farm-control/alerts?countOnly=1', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d.success) { setNewCount(d.data.newCount); setEver(!!d.data.ever) } })
      .catch(() => {})
  }, [status])

  // Live: new alerts, joins and count changes
  useEffect(() => {
    const on = (e: Event) => {
      const p = (e as CustomEvent).detail as AlertEvent
      if (!p || typeof p !== 'object') return
      if (typeof p.count === 'number') setNewCount(p.count)
      if (p.alert) setEver(true)
      setLastEvent({ ...p })
    }
    window.addEventListener('farm-alert', on)
    return () => window.removeEventListener('farm-alert', on)
  }, [])

  const openAlerts = useCallback((alertId?: string, play = false) => {
    setFocusId(alertId ?? null)
    setFocusPlay(!!alertId && play)
    setPanel('open')
  }, [])
  const clearFocusPlay = useCallback(() => setFocusPlay(false), [])
  const closeAlerts = useCallback(() => {
    // Closing the panel while the big viewer plays leaves the docked bar
    setPanel(viewerRef.current ? 'docked' : 'closed')
  }, [])

  // The bell's count row opens the panel right where the person is
  useEffect(() => {
    const on = () => openAlerts()
    window.addEventListener('farm-alerts:open', on)
    return () => window.removeEventListener('farm-alerts:open', on)
  }, [openAlerts])

  const watch = useCallback((alert: FarmAlert, at?: string) => {
    setViewer({ alert, at: at || atFor(alert.start) })
    setPanel('docked') // the panel folds into the bar so the whole viewer is free
    // Watching counts as seen
    if (!alert.seenAt) {
      fetch('/api/farm-control/alerts/actions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seen', ids: [alert.id] }),
      }).catch(() => {})
    }
  }, [])
  const closeViewer = useCallback(() => {
    setViewer(null)
    setPanel('closed')
  }, [])

  const value = useMemo<FarmAlertsValue>(() => ({
    newCount, ever, panel, openAlerts, closeAlerts, focusId, focusPlay, clearFocusPlay, viewer, watch, closeViewer, lastEvent, setNewCount, listed, setListed,
  }), [newCount, ever, panel, openAlerts, closeAlerts, focusId, focusPlay, clearFocusPlay, viewer, watch, closeViewer, lastEvent, listed])

  return (
    <Ctx.Provider value={value}>
      {children}
      {status === 'authenticated' && (
        <>
          <FarmAlertViewer />
          {/* The panel stays mounted while docked, so it reopens where it was */}
          {panel !== 'closed' && <FarmAlertPanel />}
          <FarmAlertCard />
        </>
      )}
    </Ctx.Provider>
  )
}
