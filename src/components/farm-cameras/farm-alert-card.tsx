'use client'

// MBM-340 — an arriving camera alert (alert list guide §2.5): a corner card
// for about 8 s (picture, camera, what, time; ▶ Play, ✕, 🔕; a click opens the
// panel on it) and a short chime. Only for a NEW alert: a finding that joins
// one already listed updates its row quietly. The card follows the person's
// "Corner card when one arrives" switch (My Cameras); the chime is on/off per
// device (the panel's foot), kept in this browser.
import { useEffect, useRef, useState } from 'react'
import { useFarmControl } from './farm-control-provider'
import { FarmAlert, useFarmAlerts } from './farm-alerts-provider'
import { alertAction, pauseCamera } from './farm-alert-panel'
import { clock, TRIGGER_LABEL } from './farm-alert-row'

const CHIME_KEY = 'mbm.farmAlertChime'
export function chimeOn(): boolean {
  try { return window.localStorage.getItem(CHIME_KEY) !== 'off' } catch { return true }
}
export function setChimeOn(on: boolean) {
  try { window.localStorage.setItem(CHIME_KEY, on ? 'on' : 'off') } catch { /* private window: just this time */ }
}

/** Two soft notes, made in the browser (no sound file). Browsers may keep it silent until the page was clicked once. */
function playChime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    ;[880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = f
      const t = ctx.currentTime + i * 0.18
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35)
      o.connect(g).connect(ctx.destination)
      o.start(t)
      o.stop(t + 0.4)
    })
    setTimeout(() => ctx.close().catch(() => {}), 1000)
  } catch { /* no sound: the card still shows */ }
}

const EDGE = { motion: 'border-l-amber-500', sound: 'border-l-blue-500', both: 'border-l-purple-500' } as const

export function FarmAlertCard() {
  const alerts = useFarmAlerts()
  const farm = useFarmControl()
  const [card, setCard] = useState<FarmAlert | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ev = alerts?.lastEvent
  const cardsOn = farm?.me?.preferences?.motionAlertsSound !== false

  useEffect(() => {
    if (!ev || ev.kind !== 'new' || !ev.alert) return
    if (chimeOn()) playChime()
    if (!cardsOn) return
    setCard(ev.alert)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCard(null), 8000)
  }, [ev]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  if (!card || !alerts) return null
  const hold = () => { if (timer.current) clearTimeout(timer.current) }
  const later = () => { timer.current = setTimeout(() => setCard(null), 3000) }
  const open = (play: boolean) => { setCard(null); alerts.openAlerts(card.id, play) }
  const btn = 'px-2 py-0.5 rounded text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100'

  return (
    <div
      className={`fixed bottom-4 right-4 z-[90] w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-gray-200 dark:border-gray-700 border-l-4 ${EDGE[card.trigger]} bg-white dark:bg-gray-900 shadow-2xl p-2 flex gap-2 cursor-pointer`}
      onMouseEnter={hold}
      onMouseLeave={later}
      onClick={() => open(false)}
      role="status"
    >
      <div className="w-24 h-[54px] shrink-0 rounded bg-black overflow-hidden flex items-center justify-center">
        {card.hasPicture
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={`/api/farm-control/alerts/${card.id}/picture?v=${encodeURIComponent(card.updatedAt)}`} alt="" className="w-full h-full object-cover" />
          : <span className="text-[10px] text-gray-400">📹</span>}
      </div>
      <div className="min-w-0 flex-1 text-sm">
        <div className="truncate"><b className="text-gray-900 dark:text-white">{card.cameraName}</b> <span className="text-gray-600 dark:text-gray-300">{TRIGGER_LABEL[card.trigger]}</span></div>
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{clock(card.start)}{card.siteName ? ` · ${card.siteName}` : ''}</div>
        <div className="flex gap-1.5 mt-1" onClick={e => e.stopPropagation()}>
          <button className={btn} onClick={() => open(true)}>▶ Play</button>
          <button className={btn} title="Dismiss" onClick={() => { setCard(null); alertAction('dismiss', { ids: [card.id] }).catch(() => {}) }}>✕</button>
          <button className={btn} title={`Pause alerts from ${card.cameraName} for you`} onClick={() => { setCard(null); pauseCamera(card.cameraId, true).catch(() => {}) }}>🔕</button>
        </div>
      </div>
    </div>
  )
}
