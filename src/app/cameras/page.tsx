'use client'

// MBM-331 — the user's own camera screen (plan §6.3, phase 4), from the
// strip's ⚙. Preferences only, never access: the cameras listed are the ones
// MBM allows this user, narrowed by Farm Control.
// - Strip: on/off, names on the pictures, live video or still pictures, and
//   the same for POS screens.
// - Up to 4 strip cameras, in order.
// - A personal name per camera (at most 40 characters, Farm Control's limit).
// - Still pictures for finding cameras; "Open large" uses the enlarged view.

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ContentLayout } from '@/components/layout/content-layout'
import { useToastContext } from '@/components/ui/toast'
import { FarmCamera, FarmCameraPreferences, StripMode, useFarmControl } from '@/components/farm-cameras/farm-control-provider'
import { useFarmCameraViews } from '@/components/farm-cameras/farm-camera-views'

const MAX_STRIP = 4

export default function CamerasPage() {
  const farm = useFarmControl()
  const views = useFarmCameraViews()
  const toast = useToastContext()
  const [cameras, setCameras] = useState<FarmCamera[] | null>(null)
  const [error, setError] = useState('')
  const [pictures, setPictures] = useState<Record<string, string>>({})
  const pictureUrls = useRef<Record<string, string>>({})
  const [filter, setFilter] = useState('')
  const [site, setSite] = useState('')
  const [names, setNames] = useState<Record<string, string>>({})

  const ready = farm?.status === 'ready'
  const prefs = farm?.me?.preferences
  const allowedKey = (farm?.me?.cameraIds || []).join(',')

  // Cameras from Farm Control, narrowed to what MBM allows
  useEffect(() => {
    if (!ready || !farm) return
    farm.listCameras('').then(
      list => { setCameras(list); setError('') },
      e => setError(e instanceof Error ? e.message : 'Could not list cameras')
    )
  }, [ready, allowedKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // A still picture of each camera (Farm Control serves at most one new one per 10 s)
  const loadPictures = async (list: FarmCamera[]) => {
    if (!farm) return
    const next: Record<string, string> = {}
    await Promise.all(list.map(async c => {
      try {
        const blob = await farm.api('GET', `/cameras/${encodeURIComponent(String(c.id))}/picture`)
        if (blob instanceof Blob) next[String(c.id)] = URL.createObjectURL(blob)
      } catch {
        // No picture (offline, or no permission): the card shows a placeholder
      }
    }))
    Object.values(pictureUrls.current).forEach(u => URL.revokeObjectURL(u))
    pictureUrls.current = next
    setPictures(next)
  }
  useEffect(() => { if (cameras) loadPictures(cameras) }, [cameras]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { Object.values(pictureUrls.current).forEach(u => URL.revokeObjectURL(u)) }, [])

  // MBM-332: a camera alert links to /cameras?open=<id>: open that camera large once
  const openedFromLink = useRef(false)
  useEffect(() => {
    if (!ready || !views || openedFromLink.current) return
    const id = new URLSearchParams(window.location.search).get('open')
    if (!id || !(farm?.me?.cameraIds || []).includes(id)) return
    openedFromLink.current = true
    views.open([id])
  }, [ready, allowedKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Personal names being edited
  useEffect(() => {
    const n: Record<string, string> = {}
    for (const [id, v] of Object.entries(prefs?.cameraLabels || {})) if (v?.name) n[id] = v.name
    setNames(n)
  }, [prefs?.cameraLabels])

  const sites = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of cameras || []) if (c.site) m.set(String(c.site.id), c.site.name)
    return [...m.entries()]
  }, [cameras])

  if (!farm || !farm.me) return <ContentLayout title="Farm Cameras"><p className="text-secondary">Loading…</p></ContentLayout>
  if (!farm.me.enabled || !(farm.me.cameraIds || []).length) {
    return (
      <ContentLayout title="Farm Cameras">
        <p className="text-secondary">You have no farm cameras. Ask your administrator for camera access.</p>
      </ContentLayout>
    )
  }
  if (!ready || !prefs) {
    return (
      <ContentLayout title="Farm Cameras">
        <p className="text-secondary">{farm.status === 'connecting' || farm.status === 'loading' ? 'Connecting to Farm Control…' : farm.problem || 'Farm Control is not available right now.'}</p>
        {(farm.status === 'refused' || farm.status === 'unreachable') && <button className="btn-secondary text-sm mt-3" onClick={() => farm.reconnect()}>Try again</button>}
      </ContentLayout>
    )
  }

  const byId = new Map((cameras || []).map(c => [String(c.id), c]))
  const allowed = farm.me.cameraIds || []
  const chosen = prefs.stripCameraIds.filter(id => allowed.includes(id))
  const strip = (chosen.length ? chosen : allowed).slice(0, MAX_STRIP)
  const label = (id: string) => prefs.cameraLabels?.[id]?.name || byId.get(id)?.name || `Camera ${id}`

  const save = async (patch: Partial<FarmCameraPreferences>) => {
    if (!(await farm.savePreferences(patch))) toast.error('Could not save')
  }
  const setStrip = (ids: string[]) => save({ stripCameraIds: ids })
  const move = (i: number, d: -1 | 1) => {
    const ids = [...strip]
    const j = i + d
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    setStrip(ids)
  }
  const addToStrip = (id: string) => {
    if (strip.length >= MAX_STRIP) { toast.push(`The strip holds ${MAX_STRIP} cameras: remove one first`, { type: 'warning' }); return }
    setStrip([...strip, id])
  }
  const saveName = (id: string) => {
    const name = (names[id] || '').trim().slice(0, 40)
    if (name === (prefs.cameraLabels?.[id]?.name || '')) return
    const labels: Record<string, { name: string; showName: boolean }> = {}
    for (const [k, v] of Object.entries(prefs.cameraLabels || {})) if (v?.name) labels[k] = { name: v.name, showName: v.showName !== false }
    if (name) labels[id] = { name, showName: true }
    else delete labels[id]
    save({ cameraLabels: labels }).then(() => toast.push(name ? `Saved "${name}"` : 'Name removed', { type: 'success' }))
  }

  const q = filter.trim().toLowerCase()
  const shown = (cameras || []).filter(c =>
    (!site || String(c.site?.id) === site) &&
    (!q || `${c.name} ${c.site?.name || ''} ${prefs.cameraLabels?.[String(c.id)]?.name || ''}`.toLowerCase().includes(q))
  )

  const modeSelect = (value: StripMode, onChange: (m: StripMode) => void) => (
    <select className="input-field py-1 text-sm" value={value} onChange={e => onChange(e.target.value as StripMode)}>
      <option value="live">Live video</option>
      <option value="pictures">Still pictures (every 10 s)</option>
    </select>
  )

  return (
    <ContentLayout title="Farm Cameras" description="Your camera strip, your names for cameras, and every camera you may watch">
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <div className="card p-4 space-y-3">
          <h3 className="font-semibold text-primary">Camera strip</h3>
          <label className="flex items-center gap-2 text-sm text-primary">
            <input type="checkbox" checked={prefs.stripVisible} onChange={e => save({ stripVisible: e.target.checked })} />
            Show the camera strip at the top of the screen
          </label>
          <label className="flex items-center gap-2 text-sm text-primary">
            <input type="checkbox" checked={prefs.showNamesOnStrip} onChange={e => save({ showNamesOnStrip: e.target.checked })} />
            Names on the pictures
          </label>
          <div className="flex items-center gap-2 text-sm text-primary">
            <span className="w-28">Usually show</span>
            {modeSelect(prefs.stripMode, m => save({ stripMode: m }))}
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-2">
            <label className="flex items-center gap-2 text-sm text-primary">
              <input type="checkbox" checked={prefs.showStripOnPos} onChange={e => save({ showStripOnPos: e.target.checked })} />
              Show the camera strip on POS screens
            </label>
            <div className="flex items-center gap-2 text-sm text-primary">
              <span className="w-28">On POS show</span>
              {modeSelect(prefs.posStripMode, m => save({ posStripMode: m }))}
            </div>
            <p className="text-xs text-secondary">Still pictures use far less of the farm&apos;s connection: a good choice for a till that stays open all day.</p>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-2">
            <span className="text-sm font-medium text-primary">Camera alerts</span>
            <label className="flex items-center gap-2 text-sm text-primary">
              <input type="checkbox" checked={prefs.alertsBell} onChange={e => save({ alertsBell: e.target.checked })} />
              In notifications (🔔 Farm Cameras)
            </label>
            <label className="flex items-center gap-2 text-sm text-primary">
              <input type="checkbox" checked={prefs.alertsChat} onChange={e => save({ alertsChat: e.target.checked })} />
              In the Farm Camera Alerts chat
            </label>
            <p className="text-xs text-secondary">A camera that stops, a site that can&apos;t be reached, devices waiting for approval: for the cameras you may watch.</p>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-primary">On the strip ({strip.length} of {MAX_STRIP})</h3>
          </div>
          {!chosen.length && <p className="text-xs text-secondary mb-2">You haven&apos;t chosen yet, so the strip shows your first {MAX_STRIP} cameras.</p>}
          <ol className="space-y-2">
            {strip.map((id, i) => (
              <li key={id} className="flex items-center gap-2 text-sm">
                <span className="w-5 text-secondary">{i + 1}.</span>
                <span className="flex-1 truncate text-primary">{label(id)}</span>
                <button className="px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} title="Move left">↑</button>
                <button className="px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30" disabled={i === strip.length - 1} onClick={() => move(i, 1)} title="Move right">↓</button>
                <button className="px-2 rounded hover:bg-red-100 dark:hover:bg-red-900/40" onClick={() => setStrip(strip.filter(x => x !== id))} title="Take off the strip">✕</button>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input className="input-field w-64" placeholder="Search cameras" value={filter} onChange={e => setFilter(e.target.value)} />
        {sites.length > 1 && (
          <select className="input-field" value={site} onChange={e => setSite(e.target.value)}>
            <option value="">All sites</option>
            {sites.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        )}
        {cameras && <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline" onClick={() => loadPictures(cameras)}>↻ New pictures</button>}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>}
      {!cameras && !error && <p className="text-secondary">Loading cameras…</p>}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {shown.map(c => {
          const id = String(c.id)
          const onStrip = strip.indexOf(id)
          return (
            <div key={id} className="card overflow-hidden flex flex-col">
              <button className="relative aspect-video bg-black" onClick={() => views?.open([id])} title="Open large">
                {pictures[id]
                  ? <img src={pictures[id]} alt={label(id)} className="w-full h-full object-cover" />
                  : <span className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">No picture</span>}
                {c.state && c.state !== 'receiving' && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-gray-900 text-white text-xs capitalize">{c.state}</span>
                )}
              </button>
              <div className="p-3 space-y-2 flex-1 flex flex-col">
                <div className="text-xs text-secondary">{c.name}{c.site ? ` · ${c.site.name}` : ''}</div>
                <input
                  className="input-field w-full text-sm"
                  placeholder="Your name for this camera"
                  maxLength={40}
                  value={names[id] || ''}
                  onChange={e => setNames(prev => ({ ...prev, [id]: e.target.value }))}
                  onBlur={() => saveName(id)}
                  onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                />
                <div className="flex items-center gap-2 mt-auto pt-1">
                  {onStrip >= 0
                    ? <button className="btn-secondary text-xs" onClick={() => setStrip(strip.filter(x => x !== id))}>On strip #{onStrip + 1} · Remove</button>
                    : <button className="btn-secondary text-xs" onClick={() => addToStrip(id)}>+ Add to strip</button>}
                  <button className="btn-primary text-xs ml-auto" onClick={() => views?.open([id])}>⤢ Open large</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {cameras && shown.length === 0 && <p className="text-secondary">No cameras match.</p>}
    </ContentLayout>
  )
}
