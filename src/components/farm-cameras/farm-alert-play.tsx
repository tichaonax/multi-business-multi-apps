'use client'

// MBM-340 — playing an alert in its row, and the row's buttons (alert list
// guide §2.2, §3.3; Farm Control screenshot 003608).
// - ▶ Play swaps the row's picture for a larger video: Farm Control's
//   `player` frame on the recording, 5 s before the finding, no buttons of its
//   own (`controls=0`). Scrolled into view. One row at a time.
// - A joined alert (×n) gets ‹ Back · n of m · Next › over the video; "n"
//   follows the video as it plays on.
// - Playing: ↺ replay · ⛶ Big · ■ stop · Watch · ☆ Later · 🔕.
//   Otherwise: ▶ Play (only when there's video to play) · Watch · ☆ Later · 🔕.
// - `limit` (two videos open already) → "Close the other video first";
//   `denied` → "You can no longer watch this camera".
// - "Video no longer kept" when the alert is older than the camera's oldest
//   recording (GET /cameras/{id}/coverage, asked once per camera).
import { useCallback, useEffect, useRef, useState } from 'react'
import { useToastContext } from '@/components/ui/toast'
import { useFarmControl, FarmMessage } from './farm-control-provider'
import { FarmFrame } from './farm-frame'
import { atFor, FarmAlert, Finding, useFarmAlerts } from './farm-alerts-provider'
import { alertButtonClass as btn } from './farm-alert-row'

/** The findings to step through (an alert made from goingOn has none yet: its start) */
export function stepsOf(a: FarmAlert): Finding[] {
  return a.findings?.length ? a.findings : [{ eventId: '', start: a.start, end: a.end, trigger: a.trigger }]
}

const markSeen = (a: FarmAlert) => {
  if (a.seenAt) return
  fetch('/api/farm-control/alerts/actions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'seen', ids: [a.id] }),
  }).catch(() => {})
}

// The camera's oldest kept recording, asked once per camera per page
const oldest = new Map<string, Promise<number | null>>()
export function useVideoKept(a: FarmAlert): boolean | null {
  const farm = useFarmControl()
  const [kept, setKept] = useState<boolean | null>(null)
  useEffect(() => {
    if (!farm || farm.status !== 'ready') return
    let p = oldest.get(a.cameraId)
    if (!p) {
      p = farm.api('GET', `/cameras/${encodeURIComponent(a.cameraId)}/coverage`)
        .then((d: { coverage?: { oldest?: string } }) => (d?.coverage?.oldest ? Date.parse(d.coverage.oldest) : null))
        .catch(() => null)
      oldest.set(a.cameraId, p)
      setTimeout(() => oldest.delete(a.cameraId), 5 * 60_000) // recordings age: ask again later
    }
    let live = true
    p.then(o => { if (live) setKept(o === null ? true : Date.parse(a.lastAt || a.start) >= o) })
    return () => { live = false }
  }, [a.cameraId, a.start, a.lastAt, farm?.status]) // eslint-disable-line react-hooks/exhaustive-deps
  return kept
}

export interface AlertPlayer {
  playingId: string | null
  play: (a: FarmAlert, step?: number) => void
  stop: () => void
  render: (a: FarmAlert) => React.ReactNode
  /** The finding playing now (for ⛶ Big at that moment) */
  currentAt: () => string | null
}

export function useAlertPlayer(): AlertPlayer {
  const farm = useFarmControl()
  const toast = useToastContext()
  const [playing, setPlaying] = useState<{ alert: FarmAlert; step: number; at: string; key: number } | null>(null)
  const [shownStep, setShownStep] = useState(0)
  const [problem, setProblem] = useState<string | null>(null)
  const startedAt = useRef(0) // when the video started (ms), paused time left out
  const pausedAt = useRef<number | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  const play = useCallback((a: FarmAlert, step = 0) => {
    const steps = stepsOf(a)
    const i = Math.max(0, Math.min(step, steps.length - 1))
    setProblem(null)
    setPlaying({ alert: a, step: i, at: atFor(steps[i].start), key: Date.now() })
    setShownStep(i)
    startedAt.current = Date.now()
    pausedAt.current = null
    markSeen(a)
  }, [])
  const stop = useCallback(() => { setPlaying(null); setProblem(null) }, [])

  // Scroll the playing row into view once it opens (guide §2.2)
  useEffect(() => {
    if (!playing) return
    const t = setTimeout(() => wrapRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 150)
    return () => clearTimeout(t)
  }, [playing?.key]) // eslint-disable-line react-hooks/exhaustive-deps

  // "n of m" follows the video: the last finding whose start − 5 s is before the video's time
  useEffect(() => {
    if (!playing) return
    const steps = stepsOf(playing.alert)
    if (steps.length < 2) return
    const t = setInterval(() => {
      if (pausedAt.current !== null) return
      const videoTime = Date.parse(playing.at) + (Date.now() - startedAt.current)
      let n = 0
      steps.forEach((s, i) => { if (Date.parse(s.start) - 5_000 <= videoTime) n = i })
      setShownStep(n)
    }, 1000)
    return () => clearInterval(t)
  }, [playing])

  const onMessage = useCallback((m: FarmMessage) => {
    if (m.type !== 'state' || typeof m.code !== 'string') return
    if (m.code === 'paused' && pausedAt.current === null) pausedAt.current = Date.now()
    else if (m.code === 'playing' && pausedAt.current !== null) { startedAt.current += Date.now() - pausedAt.current; pausedAt.current = null }
    else if (m.code === 'limit') { toast.push('Close the other video first (two can play at once)', { type: 'warning' }); setPlaying(null) }
    else if (m.code === 'denied') setProblem('You can no longer watch this camera')
  }, [toast])

  const render = useCallback((a: FarmAlert) => {
    if (!playing || playing.alert.id !== a.id || !farm) return null
    const steps = stepsOf(a)
    const src = farm.frameSrc('player', { camera: a.cameraId, mode: 'recordings', at: playing.at, controls: '0' })
    return (
      <div ref={wrapRef} className="relative w-full aspect-video bg-black rounded overflow-hidden">
        {src && <FarmFrame key={playing.key} src={src} title={a.cameraName} className="absolute inset-0 w-full h-full" onMessage={onMessage} />}
        {steps.length > 1 && (
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded bg-black/70 text-white text-xs px-2 py-1">
            <button disabled={shownStep === 0} className="disabled:opacity-40 hover:underline" onClick={() => play(a, shownStep - 1)}>‹ Back</button>
            <span className="font-semibold">{shownStep + 1} of {steps.length}</span>
            <button disabled={shownStep >= steps.length - 1} className="disabled:opacity-40 hover:underline" onClick={() => play(a, shownStep + 1)}>Next ›</button>
          </div>
        )}
        {problem && <div className="absolute inset-x-0 bottom-0 bg-black/80 text-red-300 text-xs px-2 py-1">{problem}</div>}
      </div>
    )
  }, [playing, shownStep, problem, farm, onMessage, play])

  const currentAt = useCallback(() => {
    if (!playing) return null
    const steps = stepsOf(playing.alert)
    return atFor(steps[Math.min(shownStep, steps.length - 1)].start)
  }, [playing, shownStep])

  return { playingId: playing?.alert.id ?? null, play, stop, render, currentAt }
}

/** The row's buttons, as in Farm Control */
export function FarmAlertActions({ alert, player, onLater, onPause }: {
  alert: FarmAlert
  player: AlertPlayer
  onLater: () => void
  onPause?: () => void
}) {
  const alerts = useFarmAlerts()
  const kept = useVideoKept(alert)
  const allowed = alert.allowed !== false
  const isPlaying = player.playingId === alert.id
  const watch = (at?: string) => alerts?.watch(alert, at)
  const later = <button key="later" className={btn} onClick={onLater} title={alert.laterAt ? 'Remove from Watch later' : 'Keep for later'}>{alert.laterAt ? '★ Kept' : '☆ Later'}</button>
  const pause = onPause && <button key="pause" className={btn} onClick={onPause} title={`Pause alerts from ${alert.cameraName} for you`}>🔕</button>

  if (isPlaying) {
    return (
      <>
        <button className={btn} title="Play again" onClick={() => player.play(alert)}>↺</button>
        <button className={btn} title="Bigger, in Farm Control's viewer" onClick={() => { const at = player.currentAt() || undefined; player.stop(); watch(at) }}>⛶ Big</button>
        <button className={btn} title="Stop" onClick={player.stop}>■</button>
        <button className={btn} onClick={() => watch()}>Watch</button>
        {later}{pause}
      </>
    )
  }
  return (
    <>
      {allowed && kept !== false && <button className={btn} onClick={() => player.play(alert)}>▶ Play</button>}
      {kept === false && <span className="text-xs text-gray-500 dark:text-gray-400 self-center">Video no longer kept</span>}
      {allowed && <button className={btn} onClick={() => watch()}>Watch</button>}
      {later}{pause}
    </>
  )
}
