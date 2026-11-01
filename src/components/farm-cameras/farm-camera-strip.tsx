'use client'

// MBM-331 — the camera strip in the header, and the larger-cameras panel
// under it (plan §6.3, F12).
// - Up to 4 cameras in one row, about 400 × 56 px, in the middle of the header
//   on wide screens and in a row under it on narrow ones. Only one strip frame
//   is ever loaded.
// - The user's cameras (else the first 4 they're allowed), names on/off and
//   personal names, live video or still pictures. Changes go to the frame as
//   messages, never a reload.
// - On POS screens only when the user switched it on, in their POS mode
//   (still pictures by default). Not on popups or the customer display (the
//   header isn't there either).
// - ⚙ opens / closes the panel: the strip's cameras large, as still pictures
//   (every 10 s). With the panel open, a click on a strip camera swaps it: the
//   large one plays live and the strip shows that camera still (guide §5.2
//   `stillCameras`); another click swaps back. Closing the panel puts the
//   strip back as it was. Live places stay within the user's 4.
// - Panel closed, a click on a strip camera opens Farm Control's viewer (the
//   enlarged view); so does a click on a large camera in the panel.
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useFarmControl, FarmMessage, StripMode } from './farm-control-provider'
import { useFarmCameraViews } from './farm-camera-views'
import { FarmFrame } from './farm-frame'

const WIDE = '(min-width: 1024px)'
const isPosPath = (p: string | null) => !!p && /\/pos(\/|$)/.test(p)
/** Farm Control camera ids are numbers; MBM keeps them as text */
const toFarmId = (id: string) => (/^\d+$/.test(id) ? Number(id) : id)

function useWide() {
  const [wide, setWide] = useState<boolean | null>(null)
  useEffect(() => {
    const q = window.matchMedia(WIDE)
    const on = () => setWide(q.matches)
    on()
    q.addEventListener('change', on)
    return () => q.removeEventListener('change', on)
  }, [])
  return wide
}

/** placement: 'inline' = inside the header row (wide screens), 'row' = under it (narrow) */
export function FarmCameraStrip({ placement }: { placement: 'inline' | 'row' }) {
  const farm = useFarmControl()
  const views = useFarmCameraViews()
  const pathname = usePathname()
  const wide = useWide()
  const [panelOpen, setPanelOpen] = useState(false)
  /** Cameras playing live in the panel (shown still in the strip meanwhile) */
  const [liveBelow, setLiveBelow] = useState<string[]>([])

  const me = farm?.me
  const prefs = me?.preferences
  const onPos = isPosPath(pathname)
  const allowedKey = (me?.cameraIds || []).join(',')
  const ids = useMemo(() => {
    const allowed = allowedKey ? allowedKey.split(',') : []
    const chosen = (prefs?.stripCameraIds || []).filter(id => allowed.includes(id))
    return (chosen.length ? chosen : allowed).slice(0, 4)
  }, [allowedKey, prefs?.stripCameraIds])

  // A camera taken off the strip leaves the panel's live set too
  useEffect(() => {
    setLiveBelow(prev => (prev.every(id => ids.includes(id)) ? prev : prev.filter(id => ids.includes(id))))
  }, [ids])

  const shown = !!prefs && (onPos ? prefs.showStripOnPos : prefs.stripVisible)
  // The panel closes with the strip (hidden, or a page without it)
  useEffect(() => {
    if (!shown) { setPanelOpen(false); setLiveBelow([]) }
  }, [shown])

  if (wide === null || (placement === 'inline') !== wide) return null
  if (!farm || !views || farm.status !== 'ready' || !prefs || ids.length === 0) return null

  const mode: StripMode = onPos ? prefs.posStripMode : prefs.stripMode
  const labels: Record<string, string> = {}
  for (const id of ids) labels[id] = prefs.cameraLabels?.[id]?.name || ''

  const wrap = (content: React.ReactNode) =>
    placement === 'row' ? <div className="px-3 pb-1 flex justify-center">{content}</div> : <div className="flex-1 min-w-0 flex justify-center px-2">{content}</div>

  if (!shown) {
    return wrap(
      <button
        onClick={() => farm.savePreferences(onPos ? { showStripOnPos: true } : { stripVisible: true })}
        className="px-2 py-1 rounded text-sm text-secondary hover:bg-gray-100 dark:hover:bg-gray-800"
        title={onPos ? 'Show the camera strip on POS screens' : 'Show the camera strip'}
      >
        📷
      </button>
    )
  }

  const togglePanel = () => {
    setPanelOpen(o => !o)
    setLiveBelow([]) // opening starts all still; closing puts the strip back as it was
  }
  const swap = (id: string) => setLiveBelow(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  const onStripClick = (id: string) => (panelOpen ? swap(id) : views.open([id]))

  const btn = 'w-6 h-[26px] leading-none text-[13px] rounded text-secondary hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center'
  return wrap(
    <div className="flex items-center gap-1 min-w-0">
      <StripFrame
        ids={ids}
        mode={mode}
        showNames={prefs.showNamesOnStrip}
        labels={labels}
        stillCameras={liveBelow}
        onOpen={onStripClick}
        onNames={views.rememberNames}
      />
      <div className="flex flex-col gap-px shrink-0">
        <button className={btn} title={onPos ? 'Hide the camera strip on POS screens' : 'Hide the camera strip'} onClick={() => farm.savePreferences(onPos ? { showStripOnPos: false } : { stripVisible: false })}>👁</button>
        <button className={`${btn} ${panelOpen ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}`} title={panelOpen ? 'Close the larger cameras' : 'Show these cameras larger'} onClick={togglePanel}>⚙</button>
      </div>
      {panelOpen && (
        <LargerCameras
          ids={ids}
          liveBelow={liveBelow}
          onSwap={swap}
          onOpen={id => views.open([id])}
          onClose={togglePanel}
        />
      )}
    </div>
  )
}

/** The strip frame. Its address is fixed for its life; changes go as messages. */
function StripFrame({
  ids,
  mode,
  showNames,
  labels,
  stillCameras,
  onOpen,
  onNames,
}: {
  ids: string[]
  mode: StripMode
  showNames: boolean
  labels: Record<string, string>
  stillCameras: string[]
  onOpen: (cameraId: string) => void
  onNames: (cameras: unknown) => void
}) {
  const farm = useFarmControl()
  const frame = useRef<HTMLIFrameElement | null>(null)
  const [src] = useState(() =>
    farm?.frameSrc('previews', { cameras: ids.join(','), names: showNames ? undefined : '0', mode: mode === 'pictures' ? 'pictures' : undefined })
  )
  const options = { type: 'previews.options', showNames, labels, mode, stillCameras: stillCameras.map(toFarmId) }
  const optionsKey = JSON.stringify(options)
  const idsKey = ids.join(',')
  const sent = useRef({ ids: idsKey, options: optionsKey })

  useEffect(() => {
    if (sent.current.ids === idsKey) return
    sent.current.ids = idsKey
    farm?.send(frame.current, { type: 'previews.set', cameraIds: ids.map(toFarmId) })
  }, [idsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (sent.current.options === optionsKey) return
    sent.current.options = optionsKey
    farm?.send(frame.current, JSON.parse(optionsKey))
  }, [optionsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const onMessage = (m: FarmMessage) => {
    if (m.type === 'camera.open' && m.cameraId !== undefined) onOpen(String(m.cameraId))
    else if (m.type === 'previews') {
      onNames(m.cameras)
      // A (re)loaded strip starts without labels: send the current options again
      farm?.send(frame.current, JSON.parse(optionsKey))
    }
  }

  if (!src) return null
  return (
    <FarmFrame
      src={src}
      title="Farm cameras"
      className="rounded bg-black max-w-full shrink"
      style={{ width: ids.length * 100, height: 56 }}
      onMessage={onMessage}
      onFrame={el => { frame.current = el }}
    />
  )
}

/**
 * The strip's cameras large, under the header. Each is a one-camera preview
 * frame, still pictures (every 10 s) unless swapped to live; switched with
 * `previews.options` mode, without a reload. "✎ Names" shows, until Done,
 * the names-on-strip switch and, per camera, the user's own name and whether
 * it shows; otherwise the panel stays clean.
 */
function LargerCameras({
  ids,
  liveBelow,
  onSwap,
  onOpen,
  onClose,
}: {
  ids: string[]
  liveBelow: string[]
  onSwap: (id: string) => void
  onOpen: (id: string) => void
  onClose: () => void
}) {
  const farm = useFarmControl()
  const views = useFarmCameraViews()
  const [editing, setEditing] = useState(false)
  const prefs = farm?.me?.preferences
  const labels = prefs?.cameraLabels || {}

  // Saves one camera's name / show-name; the rest of the user's names stay
  const saveLabel = async (id: string, patch: { name?: string; showName?: boolean }) => {
    if (!farm) return
    const next: Record<string, { name: string; showName: boolean }> = {}
    for (const [k, v] of Object.entries(labels)) next[k] = { name: v?.name || '', showName: v?.showName !== false }
    const cur = next[id] || { name: '', showName: true }
    next[id] = { name: (patch.name ?? cur.name).trim().slice(0, 40), showName: patch.showName ?? cur.showName }
    if (!next[id].name && next[id].showName) delete next[id]
    await farm.savePreferences({ cameraLabels: next })
  }

  const link = 'hover:text-blue-600 dark:hover:text-white'
  return (
    <div className="absolute left-0 right-0 top-full z-[5] bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-xl px-3 py-2">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-3 text-xs text-gray-600 dark:text-gray-300 mb-1.5">
          {editing ? (
            <label className="flex items-center gap-1.5 text-gray-900 dark:text-white">
              <input type="checkbox" checked={!!prefs?.showNamesOnStrip} onChange={e => farm?.savePreferences({ showNamesOnStrip: e.target.checked })} />
              Names on the strip
            </label>
          ) : (
            <span className="truncate">Click a camera in the strip to play it live here; click a picture to open it with recordings, Record and Take picture.</span>
          )}
          <span className="flex items-center gap-3 shrink-0">
            <button className={editing ? 'px-2 py-0.5 rounded bg-blue-600 text-white hover:bg-blue-700' : link} onClick={() => setEditing(e => !e)}>
              {editing ? 'Done' : '✎ Names'}
            </button>
            <Link href="/cameras" className={link} onClick={onClose}>Camera settings</Link>
            <button className={link} onClick={onClose}>✕ Close</button>
          </span>
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
          {ids.map(id => (
            <LargerCamera
              key={id}
              id={id}
              live={liveBelow.includes(id)}
              name={views?.cameraName(id) || id}
              ownName={labels[id]?.name || ''}
              farmName={views?.farmName(id)}
              showName={labels[id]?.showName !== false}
              editing={editing}
              onRename={name => saveLabel(id, { name })}
              onShowName={showName => saveLabel(id, { showName })}
              onSwap={() => onSwap(id)}
              onOpen={() => onOpen(id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function LargerCamera({
  id,
  live,
  name,
  ownName,
  farmName,
  showName,
  editing,
  onRename,
  onShowName,
  onSwap,
  onOpen,
}: {
  id: string
  live: boolean
  name: string
  ownName: string
  farmName?: string
  showName: boolean
  editing: boolean
  onRename: (name: string) => void
  onShowName: (show: boolean) => void
  onSwap: () => void
  onOpen: () => void
}) {
  const farm = useFarmControl()
  const frame = useRef<HTMLIFrameElement | null>(null)
  const [src] = useState(() => farm?.frameSrc('previews', { cameras: id, names: '0', mode: live ? undefined : 'pictures' }))
  const [draft, setDraft] = useState(ownName)
  const first = useRef(true)

  useEffect(() => { setDraft(ownName) }, [ownName, editing])

  useEffect(() => {
    if (first.current) { first.current = false; return }
    farm?.send(frame.current, { type: 'previews.options', mode: live ? 'live' : 'pictures' })
  }, [live]) // eslint-disable-line react-hooks/exhaustive-deps

  const commit = () => { if (draft.trim() !== ownName) onRename(draft) }

  if (!src) return null
  return (
    <div className="bg-black rounded overflow-hidden border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white text-xs min-h-[24px]">
        {editing ? (
          <>
            <input
              className="flex-1 min-w-0 px-1.5 py-0.5 rounded bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-xs"
              value={draft}
              maxLength={40}
              placeholder={farmName || `Camera ${id}`}
              title="Your name for this camera (empty: Farm Control's name)"
              onChange={e => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
            />
            <label className="flex items-center gap-1 shrink-0" title="Show the name above this picture">
              <input type="checkbox" checked={showName} onChange={e => onShowName(e.target.checked)} />
              Show name
            </label>
          </>
        ) : (
          <>
            {showName && <span className="font-semibold truncate">{name}</span>}
            <button onClick={onSwap} className={`ml-auto px-1.5 rounded ${live ? 'bg-red-600 text-white' : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'}`} title={live ? 'Back to still pictures' : 'Play live here'}>
              {live ? '● Live' : 'Still · 10 s'}
            </button>
            <button onClick={onOpen} className="px-1.5 rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600" title="Open with recordings, Record and Take picture">⤢ Open</button>
          </>
        )}
      </div>
      <div className="relative aspect-video">
        <FarmFrame
          src={src}
          title={name}
          className="absolute inset-0 w-full h-full"
          onMessage={m => { if (m.type === 'camera.open') onOpen() }}
          onFrame={el => { frame.current = el }}
        />
      </div>
    </div>
  )
}
