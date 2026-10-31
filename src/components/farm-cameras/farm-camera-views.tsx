'use client'

// MBM-331 — the enlarged camera view, shared by the strip, its larger-cameras
// panel and the camera screen.
// Each open camera is Farm Control's own **viewer** frame (guide §5,
// /embed/v1/modal): Live with full quality and sound, Record and Take picture;
// Recordings with the zoomable time bar, speeds, movement, day before / after,
// mark start / end, protect and download — the same parts as Farm Control's
// own camera page. MBM adds `&capture=0` for users without capture.
// Viewers and players share a per-user limit of 2 (3 if the farm raised it),
// so at most that many are open. While a camera is open here, Farm Control
// shows it as a still picture in the strip and panel by itself (§5).
// Every frame is sent `close` before it's removed (FarmFrame).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useToastContext } from '@/components/ui/toast'
import { FarmMessage, useFarmControl } from './farm-control-provider'
import { FarmFrame } from './farm-frame'

interface FarmCameraViewsValue {
  /** Open these cameras in the enlarged view (added to the ones already open) */
  open: (cameraIds: string[]) => void
  isOpen: boolean
  /** The user's name for a camera, else Farm Control's, else its id */
  cameraName: (cameraId: string) => string
  /** Farm Control's names, from the frames' `previews` messages */
  rememberNames: (cameras: unknown) => void
}

const FarmCameraViewsContext = createContext<FarmCameraViewsValue | null>(null)

export function useFarmCameraViews() {
  return useContext(FarmCameraViewsContext)
}

const PROBLEMS: Record<string, string> = {
  limit: 'Too many cameras are open: close one',
  denied: 'Not allowed to watch this camera',
  ended: 'Stopped',
  reconnecting: 'Reconnecting…',
}

export function FarmCameraViewsProvider({ children }: { children: React.ReactNode }) {
  const farm = useFarmControl()
  const toast = useToastContext()
  const [openIds, setOpenIds] = useState<string[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const openRef = useRef(openIds)
  openRef.current = openIds

  const me = farm?.me
  const max = me?.maxLargeViews || 2
  const allowed = useMemo(() => new Set(me?.cameraIds || []), [me?.cameraIds])
  const labels = me?.preferences?.cameraLabels

  const cameraName = useCallback(
    (id: string) => labels?.[id]?.name || names[id] || `Camera ${id}`,
    [labels, names]
  )

  const rememberNames = useCallback((cameras: unknown) => {
    if (!Array.isArray(cameras)) return
    setNames(prev => {
      const next = { ...prev }
      let changed = false
      for (const c of cameras) {
        const id = c && String(c.cameraId)
        if (id && typeof c.name === 'string' && next[id] !== c.name) { next[id] = c.name; changed = true }
      }
      return changed ? next : prev
    })
  }, [])

  const open = useCallback((cameraIds: string[]) => {
    const next = [...openRef.current]
    let full = false
    for (const id of cameraIds.map(String)) {
      if (!allowed.has(id) || next.includes(id)) continue
      if (next.length >= max) { full = true; break }
      next.push(id)
    }
    if (full) toast.push(`${max === 3 ? 'Three' : 'Two'} cameras can be open large at once: close one first`, { type: 'warning' })
    setOpenIds(next)
  }, [allowed, max, toast])

  // Cameras the user may no longer see close; nothing stays open when farm cameras go off
  useEffect(() => {
    setOpenIds(prev => (farm?.status === 'ready' ? prev.filter(id => allowed.has(id)) : []))
  }, [allowed, farm?.status])

  const value = useMemo<FarmCameraViewsValue>(
    () => ({ open, isOpen: openIds.length > 0, cameraName, rememberNames }),
    [open, openIds.length, cameraName, rememberNames]
  )

  return (
    <FarmCameraViewsContext.Provider value={value}>
      {children}
      {openIds.length > 0 && <FarmCameraModal openIds={openIds} setOpenIds={setOpenIds} cameraName={cameraName} max={max} />}
    </FarmCameraViewsContext.Provider>
  )
}

function FarmCameraModal({
  openIds,
  setOpenIds,
  cameraName,
  max,
}: {
  openIds: string[]
  setOpenIds: React.Dispatch<React.SetStateAction<string[]>>
  cameraName: (id: string) => string
  max: number
}) {
  const farm = useFarmControl()
  const [states, setStates] = useState<Record<string, string>>({})
  const canCapture = new Set(farm?.me?.captureCameraIds || [])

  const closeAll = useCallback(() => setOpenIds([]), [setOpenIds])
  const closeOne = (id: string) => setOpenIds(prev => prev.filter(x => x !== id))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeAll() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeAll])

  const onFrameMessage = (id: string) => (m: FarmMessage) => {
    if (m.type === 'modal.closed') closeOne(id) // the viewer's own Close
    else if (m.type === 'state' && typeof m.code === 'string') setStates(prev => ({ ...prev, [id]: m.code as string }))
  }

  if (!farm || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[70] bg-gray-950 flex flex-col p-2 sm:p-3" role="dialog" aria-label="Farm cameras">
      <div className="flex items-center justify-between text-white mb-2 px-1">
        <div className="text-sm font-semibold">📷 Farm cameras <span className="font-normal text-gray-400">· {openIds.length} of {max} open</span></div>
        <button onClick={closeAll} className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 text-sm" title="Close (Esc)">✕ Close</button>
      </div>
      <div className={`grid gap-2 flex-1 min-h-0 ${openIds.length > 1 ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}>
        {openIds.map(id => {
          const problem = PROBLEMS[states[id] || '']
          const src = farm.frameSrc('modal', { camera: id, capture: canCapture.has(id) ? undefined : '0' })
          return (
            <div key={id} className="flex flex-col min-h-[320px] rounded-lg overflow-hidden border border-gray-800 bg-gray-900">
              <div className="flex items-center gap-2 px-2 py-1 bg-gray-900 text-white text-sm border-b border-gray-800">
                <span className="font-semibold truncate">{cameraName(id)}</span>
                {problem && <span className="text-xs text-amber-300 truncate">{problem}</span>}
                <button onClick={() => closeOne(id)} className="ml-auto px-2 py-0.5 rounded text-xs bg-gray-800 hover:bg-red-700" title="Close this camera">✕</button>
              </div>
              <div className="relative flex-1 min-h-0">
                {src && (
                  <FarmFrame key={src} src={src} title={cameraName(id)} className="absolute inset-0 w-full h-full bg-gray-900" onMessage={onFrameMessage(id)} />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>,
    document.body
  )
}
