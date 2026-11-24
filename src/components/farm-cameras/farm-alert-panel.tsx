'use client'

// MBM-340 — the 📹 camera alerts panel (plan §1.1; alert list guide §2.1, §3.6,
// §3.7; Farm Control screenshots 003503 / 003608).
// - Full height down the right side over a dimmed page, on every page (a
//   portal); full screen on a phone. Never navigates away.
// - Tabs: New, ★ Watch later, 🔕 Paused (only while something is paused).
// - Filters: find (camera, site or a time), site, day ‹ ›, hour, kind chips;
//   "n new match · Clear the filters"; forgotten when the panel closes.
// - Foot: Mark all seen / Dismiss all (Mark n seen / Dismiss n while
//   filtered, taking every match), 🔊 chime on/off for this device, History →.
// - Stays mounted while docked (the big viewer playing) so ▲ reopens it where
//   it was: same tab, filters and scroll.
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useToastContext } from '@/components/ui/toast'
import { FarmAlert, useFarmAlerts } from './farm-alerts-provider'
import { alertButtonClass as btn, dayHeading, FarmAlertRow } from './farm-alert-row'
import { FarmAlertActions, useAlertPlayer } from './farm-alert-play'
import { chimeOn, setChimeOn } from './farm-alert-card'
import { AlertFilterBar, useAlertFilters } from './farm-alert-filters'

type Tab = 'new' | 'later' | 'paused'
interface Paused { cameraId: string; cameraName: string; siteName: string | null; pausedAt: string }
interface ListAnswer {
  alerts?: FarmAlert[]
  paused?: Paused[]
  total?: number
  more?: number
  counts: { new: number; later: number; paused: number; newMatching?: number | null }
  sites: { id: string; name: string; newCount: number }[]
  timeNote?: string | null
}

export async function alertAction(action: string, body: Record<string, unknown>) {
  const r = await fetch('/api/farm-control/alerts/actions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...body }),
  })
  const d = await r.json().catch(() => ({}))
  if (!r.ok || !d.success) throw new Error(d.error || 'Could not save')
  return d.data as { changed: number; newCount: number }
}

export async function pauseCamera(cameraId: string, pause: boolean) {
  const r = await fetch('/api/farm-control/alerts/pauses', {
    method: pause ? 'POST' : 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cameraId }),
  })
  if (!r.ok) throw new Error('Could not change the pause')
}

export function FarmAlertPanel() {
  const alerts = useFarmAlerts()
  const toast = useToastContext()
  const [since] = useState(() => new Date().toISOString()) // seen since the panel opened stays listed
  const [tab, setTab] = useState<Tab>('new')
  const fl = useAlertFilters()
  const [data, setData] = useState<ListAnswer | null>(null)
  const [rows, setRows] = useState<FarmAlert[]>([])
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [chime, setChime] = useState(true)
  const [undo, setUndo] = useState<{ cameraId: string; name: string } | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const rowEls = useRef(new Map<string, HTMLDivElement>())
  const player = useAlertPlayer()

  useEffect(() => { setChime(chimeOn()) }, [])

  const filter = fl.params
  const filtered = fl.filtered

  const load = useCallback(async (p = 0) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ view: tab, since, page: String(p), ...filter })
      const r = await fetch(`/api/farm-control/alerts?${params}`, { cache: 'no-store' })
      const d = await r.json()
      if (!d.success) throw new Error(d.error || 'Could not load')
      setData(d.data)
      setRows(prev => (p === 0 ? d.data.alerts || [] : [...prev, ...(d.data.alerts || [])]))
      setPage(p)
      alerts?.setNewCount(d.data.counts.new)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load camera alerts')
    } finally {
      setLoading(false)
    }
  }, [tab, since, filter]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(0) }, [load])

  // Live: a new alert reloads the first page; a join updates its row in place
  const lastEvent = alerts?.lastEvent
  useEffect(() => {
    if (!lastEvent?.alert) return
    const a = lastEvent.alert
    if (lastEvent.kind === 'update' && rows.some(r => r.id === a.id)) {
      setRows(prev => prev.map(r => (r.id === a.id ? { ...r, ...a } : r)))
    } else if (lastEvent.kind === 'new' && tab === 'new' && page === 0) {
      load(0)
    }
  }, [lastEvent]) // eslint-disable-line react-hooks/exhaustive-deps

  // The bar's ‹ › walk the listed alerts
  useEffect(() => { alerts?.setListed(rows) }, [rows]) // eslint-disable-line react-hooks/exhaustive-deps

  // Opened on one alert (a corner card): scroll to it
  const focusId = alerts?.focusId
  useEffect(() => {
    if (!focusId || alerts?.panel !== 'open') return
    const el = rowEls.current.get(focusId)
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [focusId, rows, alerts?.panel])

  // A corner card's ▶ Play: play that alert in its row once it's listed
  useEffect(() => {
    if (!alerts?.focusPlay || !focusId) return
    const row = rows.find(r => r.id === focusId)
    if (!row) return
    alerts.clearFocusPlay()
    player.play(row)
  }, [alerts?.focusPlay, focusId, rows]) // eslint-disable-line react-hooks/exhaustive-deps

  // A newly focused alert that isn't on the New list's first page: show it anyway
  useEffect(() => {
    if (!focusId || alerts?.panel !== 'open' || loading || rows.some(r => r.id === focusId)) return
    if (tab !== 'new' || page !== 0) return
    load(0)
  }, [focusId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Folding the panel away (or closing it) removes the row video and frees its place (guide §2.2)
  const panelState = alerts?.panel
  useEffect(() => { if (panelState !== 'open') player.stop() }, [panelState]) // eslint-disable-line react-hooks/exhaustive-deps

  // Phone: the Back button closes the panel, not the page (guide §2.4)
  useEffect(() => {
    if (panelState !== 'open' || window.innerWidth >= 640) return
    const href = window.location.href
    window.history.pushState({ ...(window.history.state || {}), alertList: true }, '')
    const onPop = () => {
      if (!(window.history.state as { alertList?: boolean } | null)?.alertList && window.location.href === href) alerts?.closeAlerts()
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      // Closed by its own ✕: take our step off again
      if ((window.history.state as { alertList?: boolean } | null)?.alertList) window.history.back()
    }
  }, [panelState]) // eslint-disable-line react-hooks/exhaustive-deps

  // Tab change stops the row video (alert list guide §2.2)
  useEffect(() => { player.stop() }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!alerts || typeof document === 'undefined') return null
  const open = alerts.panel === 'open'
  const counts = data?.counts

  const markAll = async (action: 'seen' | 'dismiss') => {
    try {
      const d = await alertAction(action, { filter: { ...filter, view: 'new' } })
      toast.push(action === 'seen' ? `${d.changed} marked seen` : `${d.changed} dismissed`, { type: 'success' })
      load(0)
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not save') }
  }
  const dismiss = async (a: FarmAlert) => {
    if (player.playingId === a.id) player.stop()
    setRows(prev => prev.filter(r => r.id !== a.id))
    try { await alertAction('dismiss', { ids: [a.id] }) } catch { load(0) }
  }
  const toggleLater = async (a: FarmAlert) => {
    const on = !a.laterAt
    setRows(prev => (tab === 'later' && !on ? prev.filter(r => r.id !== a.id) : prev.map(r => (r.id === a.id ? { ...r, laterAt: on ? new Date().toISOString() : null } : r))))
    try {
      await alertAction(on ? 'later' : 'unlater', { ids: [a.id] })
      setData(d => (d ? { ...d, counts: { ...d.counts, later: Math.max(0, d.counts.later + (on ? 1 : -1)) } } : d))
    } catch { load(0) }
  }
  const pause = async (a: FarmAlert) => {
    try {
      await pauseCamera(a.cameraId, true)
      if (player.playingId && rows.find(r => r.id === player.playingId)?.cameraId === a.cameraId) player.stop()
      setUndo({ cameraId: a.cameraId, name: a.cameraName })
      load(0)
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not pause') }
  }
  const resume = async (cameraId: string) => {
    try { await pauseCamera(cameraId, false); setUndo(null); load(0) } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not resume') }
  }
  const toggleChime = () => { const next = !chime; setChime(next); setChimeOn(next) }

  const n = filtered ? counts?.newMatching ?? 0 : counts?.new ?? 0
  const tabBtn = (t: Tab, label: string) => (
    <button key={t} onClick={() => setTab(t)} className={`px-3 py-1 rounded-full text-sm ${tab === t ? 'bg-blue-600 text-white' : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{label}</button>
  )

  return createPortal(
    <div className={open ? '' : 'hidden'} aria-hidden={!open}>
      {/* A light shade of the page behind, so the two never mix; the page keeps running */}
      <div className="fixed inset-0 z-[85] bg-black/40" onClick={() => alerts.closeAlerts()} />
      <div className="fixed top-0 right-0 bottom-0 z-[86] w-full sm:w-[470px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-2xl flex flex-col" role="dialog" aria-label="Camera alerts">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="text-base font-semibold text-gray-900 dark:text-white">
            Camera alerts <span className="font-normal text-gray-500 dark:text-gray-400 text-sm ml-1">{counts?.new ?? alerts.newCount} new</span>
          </div>
          <button onClick={() => alerts.closeAlerts()} title="Close" className="w-8 h-8 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-lg">✕</button>
        </div>

        <div className="px-4 pb-2 space-y-2 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            {tabBtn('new', `New (${counts?.new ?? 0})`)}
            {tabBtn('later', `★ Watch later (${counts?.later ?? 0})`)}
            {(counts?.paused ?? 0) > 0 && tabBtn('paused', `🔕 Paused (${counts?.paused})`)}
          </div>
          {tab !== 'paused' && (
            <>
              <AlertFilterBar f={fl} sites={data?.sites || []} newCount={counts?.new ?? 0} newMatching={counts?.newMatching} timeNote={data?.timeNote} />
            </>
          )}
          {undo && (
            <p className="text-xs text-gray-700 dark:text-gray-200">
              Alerts from <b>{undo.name}</b> paused for you. <button className="text-blue-600 dark:text-blue-400 hover:underline font-semibold" onClick={() => resume(undo.cameraId)}>Undo</button>
            </p>
          )}
        </div>

        <div ref={listRef} data-alert-list className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          {tab === 'paused' ? (
            (data?.paused || []).length === 0
              ? <p className="text-sm text-gray-500 dark:text-gray-400 p-3">No camera is paused.</p>
              : (data?.paused || []).map(p => (
                <div key={p.cameraId} className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-sm bg-white dark:bg-gray-800">
                  <span className="flex-1 text-gray-900 dark:text-white">🔕 <b>{p.cameraName}</b>{p.siteName ? <span className="text-gray-500 dark:text-gray-400"> · {p.siteName}</span> : null}
                    <span className="block text-xs text-gray-500 dark:text-gray-400">Paused {new Date(p.pausedAt).toLocaleString()}</span>
                  </span>
                  <button className={btn} onClick={() => resume(p.cameraId)}>Resume</button>
                </div>
              ))
          ) : (
            <>
              {!loading && rows.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 p-3">
                  {tab === 'later' ? 'Nothing kept for later. ☆ Later keeps an alert here.' : filtered ? 'No alerts match.' : <>Nothing new. Earlier alerts are in <Link href="/cameras/alerts" className="text-blue-600 dark:text-blue-400 hover:underline" onClick={() => alerts.closeAlerts()}>History</Link>.</>}
                </p>
              )}
              {/* A heading for each day, on a phone only; it stays at the top
                  while its day scrolls (MBM-343, as Farm Control) */}
              {rows.map((a, i) => (
                <Fragment key={a.id}>
                {(i === 0 || dayHeading(rows[i - 1].start) !== dayHeading(a.start)) && (
                  <div data-day-head className="sm:hidden sticky -top-2 z-10 -mx-3 px-4 py-1 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400">
                    {dayHeading(a.start)}
                  </div>
                )}
                <FarmAlertRow
                  dayHeadings
                  alert={a}
                  rowRef={el => { if (el) rowEls.current.set(a.id, el); else rowEls.current.delete(a.id) }}
                  focused={focusId === a.id}
                  inPlayer={alerts.viewer?.alert.id === a.id}
                  player={player.playingId === a.id ? player.render(a) : undefined}
                  onDismiss={tab === 'new' ? () => dismiss(a) : undefined}
                  actions={<FarmAlertActions alert={a} player={player} onLater={() => toggleLater(a)} onPause={() => pause(a)} />}
                />
                </Fragment>
              ))}
              {(data?.more ?? 0) > 0 && (
                <div className="text-center text-xs text-gray-600 dark:text-gray-300 py-2 space-x-2">
                  <span>and {data!.more} more</span>
                  <button className="text-blue-600 dark:text-blue-400 hover:underline" disabled={loading} onClick={() => load(page + 1)}>Show more</button>
                  <span>·</span>
                  <Link href="/cameras/alerts" className="text-blue-600 dark:text-blue-400 hover:underline" onClick={() => alerts.closeAlerts()}>History</Link>
                </div>
              )}
              {loading && <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">Loading…</p>}
            </>
          )}
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2.5 flex flex-wrap items-center gap-2">
          {tab === 'new' && (
            <>
              <button className={btn} disabled={n === 0} onClick={() => markAll('seen')}>{filtered ? `Mark ${n} seen` : 'Mark all seen'}</button>
              <button className={btn} disabled={(data?.total ?? 0) === 0} onClick={() => markAll('dismiss')}>{filtered ? `Dismiss ${data?.total ?? 0}` : 'Dismiss all'}</button>
            </>
          )}
          <button onClick={toggleChime} className="text-xs text-gray-700 dark:text-gray-200 hover:underline ml-auto" title="The chime when an alert arrives, on this device">
            {chime ? '🔊 Chime on' : '🔇 Chime off'}
          </button>
          <Link href="/cameras/alerts" className="text-xs text-blue-600 dark:text-blue-400 hover:underline" onClick={() => alerts.closeAlerts()}>History →</Link>
        </div>
      </div>
    </div>,
    document.body
  )
}
