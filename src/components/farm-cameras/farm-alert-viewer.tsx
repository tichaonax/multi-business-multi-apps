'use client'

// MBM-340 — Watch: the big viewer, and the panel docked as a bar (plan §1.2;
// alert list guide §2.3; Farm Control screenshot 003340).
// - Farm Control's viewer frame on the recording at the alert (5 s before),
//   filling the page under MBM's header, on any page; the page behind is kept.
//   `alerts=0` (MBM has its own 🔔), `capture=0` without capture permission.
// - While the panel is folded away, a bar at the bottom right:
//   ▲ 📹 Camera alerts · n new · camera and time · ‹ › · ✕.
//   ▲ reopens the panel where it was, over the still-playing viewer.
//   ‹ › go to the alert before / after: only the viewer frame reloads with the
//   new `&at=` (version 1 has no message for a new time; FarmNet F1).
// - Opening it closes MBM's other enlarged cameras, so the viewer plus one
//   row video stay within Farm Control's 2 per person.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useFarmControl, FarmMessage } from './farm-control-provider'
import { useFarmCameraViews } from './farm-camera-views'
import { FarmFrame } from './farm-frame'
import { useFarmAlerts } from './farm-alerts-provider'
import { clock, shortDay } from './farm-alert-row'

export function FarmAlertViewer() {
  const alerts = useFarmAlerts()
  const farm = useFarmControl()
  const views = useFarmCameraViews()
  const [top, setTop] = useState(64)
  const [problem, setProblem] = useState<string | null>(null)
  const viewer = alerts?.viewer

  // Under MBM's header, whatever its height on this page
  useEffect(() => {
    if (!viewer) return
    const measure = () => {
      const h = document.querySelector('header')
      setTop(h ? Math.max(0, Math.round(h.getBoundingClientRect().bottom)) : 0)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [viewer])

  // The viewer takes one of the 2 places: close MBM's other enlarged cameras
  const watching = !!viewer
  useEffect(() => { if (watching) views?.closeAll() }, [watching]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setProblem(null) }, [viewer?.alert.id, viewer?.at])

  if (!alerts || !viewer || !farm || typeof document === 'undefined') return null
  const a = viewer.alert
  const canCapture = (farm.me?.captureCameraIds || []).includes(a.cameraId)
  const src = farm.frameSrc('modal', { camera: a.cameraId, tab: 'recordings', at: viewer.at, alerts: '0', capture: canCapture ? undefined : '0' })

  // ‹ › through the alerts the panel lists (newest first): ‹ older, › newer
  const list = alerts.listed
  const i = list.findIndex(x => x.id === a.id)
  const older = i >= 0 ? list[i + 1] : list[0]
  const newer = i > 0 ? list[i - 1] : undefined

  const onMessage = (m: FarmMessage) => {
    if (m.type === 'modal.closed') alerts.closeViewer() // the viewer's own Close
    else if (m.type === 'state' && m.code === 'limit') setProblem('Too many videos are open: stop the one playing in the alert list')
    else if (m.type === 'state' && m.code === 'denied') setProblem('You can no longer watch this camera')
  }

  const barBtn = 'w-8 h-8 rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white disabled:opacity-40'
  return createPortal(
    <>
      <div className="fixed inset-x-0 bottom-0 z-[80] bg-gray-100 dark:bg-gray-950" style={{ top }} role="dialog" aria-label={`${a.cameraName} recording`}>
        {src && <FarmFrame key={`${a.cameraId}|${viewer.at}`} src={src} title={a.cameraName} className="absolute inset-0 w-full h-full" onMessage={onMessage} />}
        {problem && <div className="absolute top-2 left-1/2 -translate-x-1/2 rounded bg-black/80 text-amber-300 text-sm px-3 py-1.5">{problem}</div>}
      </div>
      {alerts.panel === 'docked' && (
        <div className="fixed bottom-3 right-3 z-[87] max-w-[calc(100vw-1.5rem)] flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 shadow-2xl pl-2 pr-1.5 py-1.5 text-sm text-gray-900 dark:text-white">
          <button className={barBtn} title="Open the alert list" onClick={() => alerts.openAlerts(a.id)}>▲</button>
          <button className="min-w-0 truncate text-left" onClick={() => alerts.openAlerts(a.id)}>
            📹 <b>Camera alerts</b> · {alerts.newCount} new · {a.cameraName} {shortDay(a.start)} {clock(a.start)}
          </button>
          <button className={barBtn} title="The alert before" disabled={!older} onClick={() => older && alerts.watch(older)}>‹</button>
          <button className={barBtn} title="The alert after" disabled={!newer} onClick={() => newer && alerts.watch(newer)}>›</button>
          <button className={barBtn} title="Close the video" onClick={() => alerts.closeViewer()}>✕</button>
        </div>
      )}
    </>,
    document.body
  )
}
