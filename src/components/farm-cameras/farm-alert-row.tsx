'use client'

// MBM-340 — one camera alert row, as in Farm Control's list (alert list
// guide §2.1; screenshots 003503 / 003608), shared by the 📹 panel and History.
// - Picture on the left (16:9, centred), framed in what set it off: amber
//   movement, blue sound, purple both; the same colour on the left edge.
// - Camera (bold) · what ×n · short day; then ✕, the time or from–to
//   ("going on" while it is), the site; "· in the player" (green outline)
//   for the alert in the big viewer.
// - Buttons on one line. ▶ Play swaps the picture for a larger video in the
//   row (pass 2, `player` slot); Watch opens the big viewer.
import type { ReactNode } from 'react'
import type { FarmAlert, Trigger } from './farm-alerts-provider'

export const TRIGGER_LABEL: Record<Trigger, string> = { motion: 'Movement', sound: 'Sound', both: 'Movement and sound' }
const EDGE: Record<Trigger, string> = {
  motion: 'border-l-amber-500',
  sound: 'border-l-blue-500',
  both: 'border-l-purple-500',
}
const FRAME: Record<Trigger, string> = {
  motion: 'border-amber-500',
  sound: 'border-blue-500',
  both: 'border-purple-500',
}
const TEXT: Record<Trigger, string> = {
  motion: 'text-amber-600 dark:text-amber-400',
  sound: 'text-blue-600 dark:text-blue-400',
  both: 'text-purple-600 dark:text-purple-400',
}

export function shortDay(iso: string) {
  const d = new Date(iso)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) })
}
export const clock = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })

/** "12:26:20 AM", "12:25:58 AM–12:33:11 AM" or "12:26:20 AM · going on" */
export function timeText(a: Pick<FarmAlert, 'start' | 'end'>) {
  if (!a.end) return `${clock(a.start)} · going on`
  const same = Math.abs(Date.parse(a.end) - Date.parse(a.start)) < 1000
  return same ? clock(a.start) : `${clock(a.start)}–${clock(a.end)}`
}

const btn = 'px-2.5 py-1 rounded text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100 disabled:opacity-40 whitespace-nowrap'
export const alertButtonClass = btn

export function FarmAlertRow({
  alert,
  inPlayer,
  focused,
  big,
  player,
  actions,
  onDismiss,
  rowRef,
}: {
  alert: FarmAlert
  /** This alert is in the big viewer */
  inPlayer?: boolean
  focused?: boolean
  /** History's larger pictures (160 × 90) */
  big?: boolean
  /** The row's video while it plays (replaces the picture, full width) */
  player?: ReactNode
  /** The row's buttons */
  actions: ReactNode
  onDismiss?: () => void
  rowRef?: (el: HTMLDivElement | null) => void
}) {
  const t = alert.trigger
  const picW = big ? 'w-40 h-[90px]' : 'w-28 h-[63px]'
  const goingOn = !alert.end
  const muted = !!alert.seenAt && !player && !inPlayer
  return (
    <div
      ref={rowRef}
      className={`rounded-lg border-l-4 ${EDGE[t]} border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2
        ${inPlayer ? 'ring-2 ring-green-500' : focused ? 'ring-2 ring-blue-500' : ''} ${goingOn ? 'shadow-md' : ''}`}
    >
      {player && <div className="mb-2">{player}</div>}
      <div className="flex gap-3 items-center">
        {!player && (
          <div className={`${picW} shrink-0 rounded border-2 ${FRAME[t]} bg-black overflow-hidden flex items-center justify-center`}>
            {alert.hasPicture
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={`/api/farm-control/alerts/${alert.id}/picture?v=${encodeURIComponent(alert.updatedAt)}`} alt="" loading="lazy" className="w-full h-full object-cover" />
              : <span className="text-[10px] text-gray-400">No picture</span>}
          </div>
        )}
        <div className={`min-w-0 flex-1 ${muted ? 'opacity-80' : ''}`}>
          <div className="text-sm leading-tight">
            <span className="font-semibold text-gray-900 dark:text-white">{alert.cameraName}</span>{' '}
            <span className={TEXT[t]}>{TRIGGER_LABEL[t]}{alert.times > 1 ? ` ×${alert.times}` : ''}</span>
            <span className="text-gray-500 dark:text-gray-400"> · {shortDay(alert.start)}</span>
          </div>
          <div className="flex items-start gap-1.5 mt-0.5 text-xs text-gray-600 dark:text-gray-300">
            {onDismiss && (
              <button onClick={onDismiss} title="Dismiss" className="shrink-0 -ml-0.5 px-1 leading-none text-gray-500 hover:text-red-600 dark:hover:text-red-400">✕</button>
            )}
            <span>
              {timeText(alert)}
              {alert.siteName ? ` · ${alert.siteName}` : ''}
              {inPlayer && <span className="text-green-600 dark:text-green-400"> · in the player</span>}
              {alert.laterAt && <span className="text-amber-600 dark:text-amber-400"> · ★ kept</span>}
            </span>
          </div>
          {alert.allowed === false && <div className="text-xs text-red-600 dark:text-red-400 mt-0.5">You can no longer watch this camera</div>}
          <div className="flex flex-wrap gap-1.5 mt-1.5">{actions}</div>
        </div>
      </div>
    </div>
  )
}
