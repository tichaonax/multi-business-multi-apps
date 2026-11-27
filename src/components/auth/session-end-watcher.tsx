'use client'

/**
 * MBM-351 — when a manager signs this session out (or suspends the user), show
 * their message full-screen with a countdown, then sign out.
 *
 * Two ways the news arrives:
 *  - instantly: the socket pushes `session:force-logout`, which
 *    NotificationProvider re-dispatches as the window event `mbm:session-ending`;
 *  - backup (socket down): polling /api/user-sessions/status every 30 s.
 * Either way the server already refuses the session once its time is up, so
 * this screen is about telling the user, not about enforcing it.
 */
import { useEffect, useRef, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'

interface Ending {
  endsAt: number
  message: string | null
  byName: string | null
  reason: string | null
}

const POLL_MS = 30_000

export function SessionEndWatcher() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const sessionId = (session as any)?.sessionId as string | undefined
  const [ending, setEnding] = useState<Ending | null>(null)
  const [now, setNow] = useState(Date.now())
  const signingOutRef = useRef(false)
  // "OK" shrinks the notice to a banner so the user can finish (e.g. a sale)
  const [minimised, setMinimised] = useState(false)
  const isAuthPage = !!pathname?.startsWith('/auth')

  // Socket push
  useEffect(() => {
    const onEnding = (e: Event) => {
      const d = (e as CustomEvent).detail || {}
      if (d.sessionId && sessionId && d.sessionId !== sessionId) return
      setEnding({ endsAt: new Date(d.endsAt).getTime() || Date.now(), message: d.message ?? null, byName: d.byName ?? null, reason: d.reason ?? null })
    }
    window.addEventListener('mbm:session-ending', onEnding)
    return () => window.removeEventListener('mbm:session-ending', onEnding)
  }, [sessionId])

  // Backup poll
  useEffect(() => {
    if (status !== 'authenticated' || !sessionId || isAuthPage) return
    let stopped = false
    const check = async () => {
      try {
        const res = await fetch(`/api/user-sessions/status?sid=${encodeURIComponent(sessionId)}`, { cache: 'no-store' })
        const d = await res.json()
        if (stopped) return
        if (d.status === 'ending' || d.status === 'ended') {
          setEnding(prev => prev ?? { endsAt: new Date(d.endsAt).getTime() || Date.now(), message: d.message ?? null, byName: d.byName ?? null, reason: d.reason ?? null })
        }
      } catch { /* offline — try again next time */ }
    }
    check()
    const t = setInterval(check, POLL_MS)
    return () => { stopped = true; clearInterval(t) }
  }, [status, sessionId, isAuthPage])

  // Countdown, then sign out
  useEffect(() => {
    if (!ending) return
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [ending])

  useEffect(() => {
    if (!ending || signingOutRef.current) return
    if (now < ending.endsAt) return
    signingOutRef.current = true
    const notice = [
      ending.reason === 'SUSPENDED' ? 'Your account has been suspended.' : null,
      ending.message,
      ending.byName ? `— ${ending.byName}` : null,
    ].filter(Boolean).join('\n')
    try { if (notice) sessionStorage.setItem('mbm-signed-out-notice', notice) } catch { /* storage unavailable */ }
    signOut({ callbackUrl: '/auth/signin' }).catch(() => { window.location.href = '/auth/signin' })
  }, [now, ending])

  if (!ending || isAuthPage) return null
  const secondsLeft = Math.max(0, Math.ceil((ending.endsAt - now) / 1000))
  const suspended = ending.reason === 'SUSPENDED'

  if (minimised && secondsLeft > 0 && !suspended) {
    return (
      // A small pill just under the header (h-14 / sm:h-16) so the header's
      // links stay clickable; it only covers a little of the page's top centre.
      // Clicking it shows the full message again.
      <div className="fixed top-14 sm:top-16 inset-x-0 z-[10000] flex justify-center px-4 pointer-events-none mt-1">
        <button
          type="button"
          onClick={() => setMinimised(false)}
          title={ending.message ?? undefined}
          className="pointer-events-auto max-w-full truncate rounded-full bg-amber-500 hover:bg-amber-400 text-black text-xs sm:text-sm font-semibold px-4 py-1 shadow-lg"
          role="status"
        >
          🔒 Signing out in {secondsLeft} s{ending.message ? ` — ${ending.message}` : ''}
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4" role="alertdialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-xl bg-white dark:bg-gray-800 shadow-2xl border-2 border-amber-400 p-6 text-center">
        <div className="text-4xl mb-2">{suspended ? '⛔' : '🔒'}</div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {suspended ? 'Your account has been suspended' : 'You are being signed out'}
        </h2>
        {ending.message && (
          <p className="mt-3 text-base text-gray-800 dark:text-gray-200 whitespace-pre-line">{ending.message}</p>
        )}
        {ending.byName && <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">— {ending.byName}</p>}
        <p className="mt-5 text-lg font-semibold text-amber-700 dark:text-amber-400">
          {secondsLeft > 0 ? `Signing out in ${secondsLeft} s` : 'Signing out…'}
        </p>
        {secondsLeft > 0 && !suspended && (
          <>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Finish what you are doing — unsaved work will be lost.</p>
            <button
              type="button"
              onClick={() => setMinimised(true)}
              className="mt-4 px-6 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            >
              OK
            </button>
          </>
        )}
      </div>
    </div>
  )
}
