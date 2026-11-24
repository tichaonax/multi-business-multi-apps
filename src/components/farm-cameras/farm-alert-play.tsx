'use client'

// MBM-340 — playing an alert in its row, and the row's buttons (alert list
// guide §2.2, §3.3; Farm Control screenshot 003608).
// - ▶ Play swaps the row's picture for a larger video: Farm Control's
//   `player` frame on the recording, 5 s before the finding, no buttons of its
//   own (`controls=0`). Scrolled into view. One row at a time.
// - The clip player (integration guide rev 6 §5): `mode=recordings&controls=0`
//   from 5 s before to 3 s after (`until`); muted at first, click to pause,
//   2 minutes at a time with ▶ Play on — all inside Farm Control's frame.
// - A joined alert (×n) gets ‹ Back · n of m · Next › over the video: they
//   send `player.seek` (no reload); "n" follows `player.position`.
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
  /** Where the clip has reached (for ⛶ Big at that moment) */
  currentAt: () => string | null
}

/** Where the list scrolls to show a row: its top at the list's top, below the
 *  day heading that stays there on a phone (less a small gap); when the row is
 *  taller than the list, its bottom (the buttons) at the list's bottom.
 *  Farm Control's rowTop (MBM-343). */
function rowTop(list: HTMLElement, el: HTMLElement): number {
  const head = list.querySelector<HTMLElement>('[data-day-head]')
  const gap = 6 + (head && head.offsetParent ? head.offsetHeight : 0)
  const top = list.scrollTop + el.getBoundingClientRect().top - list.getBoundingClientRect().top - gap
  const tall = el.offsetHeight + gap + 6 > list.clientHeight
  return Math.max(0, tall ? top + el.offsetHeight + gap + 6 - list.clientHeight : top)
}

/** The clip's end: 3 s after the alert's end; none while it's going on (guide rev 6 §5) */
const untilFor = (a: FarmAlert) => (a.end ? new Date(Date.parse(a.end) + 3_000).toISOString() : undefined)

export function useAlertPlayer(): AlertPlayer {
  const farm = useFarmControl()
  const toast = useToastContext()
  // One clip player frame per playing alert; Back / Next / ↺ seek inside it
  const [playing, setPlaying] = useState<{ alert: FarmAlert; at: string; key: number } | null>(null)
  const [step, setStep] = useState(0)
  const [problem, setProblem] = useState<string | null>(null)
  const position = useRef<number | null>(null) // the clip's time from player.position
  const frameRef = useRef<HTMLIFrameElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  const play = useCallback((a: FarmAlert, toStep = 0) => {
    const steps = stepsOf(a)
    const i = Math.max(0, Math.min(toStep, steps.length - 1))
    const at = atFor(steps[i].start)
    setProblem(null)
    setStep(i)
    position.current = null
    if (playing?.alert.id === a.id && frameRef.current) {
      // Same alert: play from there in the same frame, no reload, no second place (guide §6)
      farm?.send(frameRef.current, { type: 'player.seek', at, ...(untilFor(a) ? { until: untilFor(a) } : {}) })
      return
    }
    setPlaying({ alert: a, at, key: Date.now() })
    markSeen(a)
  }, [playing, farm])
  const stop = useCallback(() => { setPlaying(null); setProblem(null) }, [])

  // Scroll the playing row into view once it opens (guide §2.2). On a phone
  // (MBM-343, as Farm Control's rowTop): its top just below the day heading,
  // up or down, so its buttons show below the video; again once the video
  // has its size. A computer is unchanged.
  useEffect(() => {
    if (!playing) return
    const go = () => {
      const wrap = wrapRef.current
      if (!wrap) return
      const row = wrap.closest<HTMLElement>('[data-alert-row]')
      const list = row?.closest<HTMLElement>('[data-alert-list]')
      if (!row || !list || !window.matchMedia('(max-width: 639px)').matches) {
        wrap.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        return
      }
      list.scrollTo({ top: rowTop(list, row), behavior: 'smooth' })
    }
    let f2 = 0
    const f1 = requestAnimationFrame(() => { f2 = requestAnimationFrame(go) })
    const again = setTimeout(go, 450)
    return () => { cancelAnimationFrame(f1); cancelAnimationFrame(f2); clearTimeout(again) }
  }, [playing?.key]) // eslint-disable-line react-hooks/exhaustive-deps

  const onMessage = useCallback((m: FarmMessage) => {
    if (m.type === 'player.position' && typeof m.at === 'string' && playing) {
      // "n of m" follows the video's real position (guide §3.3)
      const p = Date.parse(m.at)
      if (Number.isNaN(p)) return
      position.current = p
      const steps = stepsOf(playing.alert)
      if (steps.length < 2) return
      let n = 0
      steps.forEach((s, i) => { if (Date.parse(s.start) - 5_000 <= p) n = i })
      setStep(n)
      return
    }
    if (m.type !== 'state' || typeof m.code !== 'string') return
    if (m.code === 'limit') { toast.push('Close the other video first (two can play at once)', { type: 'warning' }); setPlaying(null) }
    else if (m.code === 'denied') setProblem('You can no longer watch this camera')
  }, [toast, playing])

  const render = useCallback((a: FarmAlert) => {
    if (!playing || playing.alert.id !== a.id || !farm) return null
    const steps = stepsOf(a)
    const src = farm.frameSrc('player', { camera: a.cameraId, mode: 'recordings', controls: '0', at: playing.at, until: untilFor(a) })
    return (
      <div ref={wrapRef} className="relative w-full aspect-video bg-black rounded overflow-hidden">
        {src && <FarmFrame key={playing.key} src={src} title={a.cameraName} className="absolute inset-0 w-full h-full" onMessage={onMessage} onFrame={f => { frameRef.current = f }} />}
        {steps.length > 1 && (
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded bg-black/70 text-white text-xs px-2 py-1">
            <button disabled={step === 0} className="disabled:opacity-40 hover:underline" onClick={() => play(a, step - 1)}>‹ Back</button>
            <span className="font-semibold">{step + 1} of {steps.length}</span>
            <button disabled={step >= steps.length - 1} className="disabled:opacity-40 hover:underline" onClick={() => play(a, step + 1)}>Next ›</button>
          </div>
        )}
        {problem && <div className="absolute inset-x-0 bottom-0 bg-black/80 text-red-300 text-xs px-2 py-1">{problem}</div>}
      </div>
    )
  }, [playing, step, problem, farm, onMessage, play])

  const currentAt = useCallback(() => {
    if (!playing) return null
    if (position.current !== null) return new Date(position.current).toISOString()
    const steps = stepsOf(playing.alert)
    return atFor(steps[Math.min(step, steps.length - 1)].start)
  }, [playing, step])

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
  // On a phone the mark alone (▶, ⛶, ☆), so the buttons keep to one line (MBM-343, as Farm Control)
  const word = (w: string) => <span className="hidden sm:inline">{w}</span>
  const later = (
    <button key="later" className={btn} onClick={onLater} title={alert.laterAt ? 'Remove from Watch later' : 'Keep for later'} aria-label={alert.laterAt ? '★ Kept' : '☆ Later'}>
      {alert.laterAt ? '★' : '☆'}{word(alert.laterAt ? ' Kept' : ' Later')}
    </button>
  )
  const pause = onPause && <button key="pause" className={btn} onClick={onPause} title={`Pause alerts from ${alert.cameraName} for you`}>🔕</button>

  if (isPlaying) {
    return (
      <>
        <button className={btn} title="Play again" onClick={() => player.play(alert)}>↺</button>
        <button className={btn} title="Bigger, in Farm Control's viewer" aria-label="Big" onClick={() => { const at = player.currentAt() || undefined; player.stop(); watch(at) }}>⛶{word(' Big')}</button>
        <button className={btn} title="Stop" onClick={player.stop}>■</button>
        <button className={btn} onClick={() => watch()}>Watch</button>
        {later}{pause}
      </>
    )
  }
  return (
    <>
      {allowed && kept !== false && <button className={btn} title="Play it here" aria-label="Play" onClick={() => player.play(alert)}>▶{word(' Play')}</button>}
      {kept === false && <span className="text-xs text-gray-500 dark:text-gray-400 self-center">Video no longer kept</span>}
      {allowed && <button className={btn} onClick={() => watch()}>Watch</button>}
      {later}{pause}
    </>
  )
}
