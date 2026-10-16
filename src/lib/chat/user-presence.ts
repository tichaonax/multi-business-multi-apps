/**
 * Is a human actually looking at this page right now? Used to gate chat
 * read receipts so a minimized/background window or an idle computer
 * never marks messages read. "Present" = page visible AND some
 * mouse/keyboard/touch/scroll activity on THIS page within IDLE_MS
 * (activity in other apps never reaches us, so a window left open on an
 * unattended machine correctly reads as absent).
 */
const IDLE_MS = 60_000
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel'] as const

let lastActivityAt = 0
let installed = false
const listeners = new Set<() => void>()

function notifyIfPresent() {
  if (!isUserPresent()) return
  listeners.forEach(cb => { try { cb() } catch { /* non-critical */ } })
}

function onActivity() {
  const wasIdle = Date.now() - lastActivityAt >= 1000
  lastActivityAt = Date.now()
  // Throttled — mousemove fires constantly, subscribers only need a nudge
  // at most once a second.
  if (wasIdle) notifyIfPresent()
}

function install() {
  if (installed || typeof window === 'undefined') return
  installed = true
  // Loading the page counts as activity only if it's actually visible.
  if (document.visibilityState === 'visible') lastActivityAt = Date.now()
  ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, onActivity, { passive: true, capture: true }))
  document.addEventListener('visibilitychange', notifyIfPresent)
}

export function isUserPresent(): boolean {
  install()
  if (typeof document === 'undefined') return false
  return document.visibilityState === 'visible' && Date.now() - lastActivityAt < IDLE_MS
}

/** Calls cb whenever the user becomes (or still is) present after activity/visibility changes. */
export function onUserPresent(cb: () => void): () => void {
  install()
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}
