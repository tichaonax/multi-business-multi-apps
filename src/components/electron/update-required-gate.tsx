'use client'

/**
 * MBM-352: a till must match its server.
 *
 * In the POS app (Electron), the till can't be used while:
 *  - the POS app is older than the server's (electron/package.json), and the
 *    server has an installer to give; or
 *  - the R710 agent (needed for remote printing; it comes with the POS app)
 *    isn't running on this PC, or is older than the server's.
 * Ahead of the server is never blocked: that server needs deploying, not
 * the till.
 *
 * - **Update now:** the POS app installs the server's version, which
 *   carries the agent (see electron/updater.js). A running agent of the
 *   wrong version only needs a restart of the bundled one.
 * - **In the middle of work:** a check that fails while someone is using the
 *   till shows a bar first. The full screen comes on the next page change or
 *   after 2 minutes without input, so a sale can be finished.
 * - **Continue for now (admin PIN):** lets this session through, for when an
 *   update can't be done right now.
 * - **Plain browser on a PC:** can't install anything, so a dismissible
 *   warning only. Phones are never checked.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { compareVersions } from '@/lib/workstation-agents/agent-version'
import { isMobileDevice } from '@/lib/workstation-agents/local-agent-sync'

const AGENT_PORT = 47710
const CHECK_MS = 30_000
const IDLE_MS = 2 * 60_000
const BYPASS_KEY = 'mbm-update-bypass'
const AGENT_GRACE_MS = 45_000

interface Expected { version: string; agentVersion: string | null; installerAvailable: boolean }
interface Progress { phase: string; percent?: number; message: string }

async function probeAgent(): Promise<string | null | undefined> {
  try {
    const res = await fetch(`http://127.0.0.1:${AGENT_PORT}/probe?serverUrl=${encodeURIComponent(window.location.origin)}`, { signal: AbortSignal.timeout(2500) })
    if (!res.ok) return null
    return ((await res.json())?.agentVersion as string) || null
  } catch {
    return null // not running (or blocked)
  }
}

export function UpdateRequiredGate() {
  const pathname = usePathname()
  const [isElectron, setIsElectron] = useState(false)
  const [isPcBrowser, setIsPcBrowser] = useState(false)
  const [appVersion, setAppVersion] = useState<string | null>(null)
  const [expected, setExpected] = useState<Expected | null>(null)
  const [agentVersion, setAgentVersion] = useState<string | null | undefined>(undefined) // undefined = not checked yet
  const [bypassed, setBypassed] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [full, setFull] = useState(false) // full screen (vs. the "finish your work" bar)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pinOpen, setPinOpen] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [agentStarting, setAgentStarting] = useState(false)
  const [startGraceOver, setStartGraceOver] = useState(false)
  const triedAgentStart = useRef(false)
  const lastInput = useRef(Date.now())
  const loadedAt = useRef(Date.now())

  const excluded = !!pathname?.startsWith('/customer-display')

  useEffect(() => {
    const el = !!window.electron?.isElectron
    setIsElectron(el)
    setIsPcBrowser(!el && !isMobileDevice())
    if (el && typeof window.electron?.getAppVersion === 'function') window.electron.getAppVersion().then(setAppVersion).catch(() => {})
    try { setBypassed(!!sessionStorage.getItem(BYPASS_KEY)) } catch { /* storage unavailable */ }
  }, [])

  const check = useCallback(async () => {
    try {
      const res = await fetch('/api/public/electron/latest-version', { cache: 'no-store' })
      const d = await res.json()
      if (d?.data?.version) setExpected({ version: d.data.version, agentVersion: d.data.agentVersion ?? null, installerAvailable: !!d.data.installerAvailable })
    } catch { /* server unreachable: keep what we had */ }
    setAgentVersion(await probeAgent())
  }, [])

  useEffect(() => {
    if (excluded || !(isElectron || isPcBrowser)) return
    check()
    const t = setInterval(check, CHECK_MS)
    const onFocus = () => check()
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(t); window.removeEventListener('focus', onFocus) }
  }, [excluded, isElectron, isPcBrowser, check])

  // Track input, so a check failing mid-sale waits until the till is idle
  useEffect(() => {
    const mark = () => { lastInput.current = Date.now() }
    window.addEventListener('keydown', mark, true)
    window.addEventListener('pointerdown', mark, true)
    return () => { window.removeEventListener('keydown', mark, true); window.removeEventListener('pointerdown', mark, true) }
  }, [])

  const appBehind = !!(appVersion && expected && expected.installerAvailable && compareVersions(appVersion, expected.version) < 0)
  const agentBehind = !!(expected?.agentVersion && agentVersion && compareVersions(agentVersion, expected.agentVersion) < 0)
  const agentMissing = !!expected?.agentVersion && agentVersion === null
  const agentProblem = agentBehind || agentMissing
  const needsUpdate = appBehind || agentProblem

  // POS app up to date but its agent isn't running: start the bundled one once
  // by itself. The app also starts it at launch; both wait on the same start.
  useEffect(() => {
    if (!isElectron || appBehind || !agentProblem || triedAgentStart.current) return
    if (typeof window.electron?.ensureAgent !== 'function') return
    triedAgentStart.current = true
    setAgentStarting(true)
    window.electron.ensureAgent().catch(() => {}).finally(() => { check().finally(() => setAgentStarting(false)) })
  }, [isElectron, appBehind, agentProblem, check])

  // The agent takes a few seconds to start after the app opens: for the first
  // 45 s say "Starting…" (and check every 3 s), not "not running" + a button
  useEffect(() => {
    const t = setTimeout(() => setStartGraceOver(true), AGENT_GRACE_MS)
    return () => clearTimeout(t)
  }, [])
  const waitingForAgent = isElectron && !appBehind && agentProblem && (agentStarting || !startGraceOver)
  useEffect(() => {
    if (!waitingForAgent) return
    const t = setInterval(() => { probeAgent().then(setAgentVersion) }, 3000)
    return () => clearInterval(t)
  }, [waitingForAgent])

  // Full screen straight away at start-up / sign-in; otherwise on the next
  // page change or once the till has been idle for 2 minutes
  useEffect(() => {
    if (!needsUpdate) { setFull(false); return }
    if (Date.now() - loadedAt.current < 60_000) { setFull(true); return }
    const t = setInterval(() => { if (Date.now() - lastInput.current > IDLE_MS) setFull(true) }, 5000)
    return () => clearInterval(t)
  }, [needsUpdate])
  const prevPath = useRef(pathname)
  useEffect(() => {
    if (prevPath.current !== pathname && needsUpdate) setFull(true)
    prevPath.current = pathname
  }, [pathname, needsUpdate])

  useEffect(() => {
    if (!isElectron || typeof window.electron?.onUpdateProgress !== 'function') return
    return window.electron.onUpdateProgress((p) => setProgress(p))
  }, [isElectron])

  const canInstall = isElectron && typeof window !== 'undefined' && typeof window.electron?.installUpdate === 'function'
  const canPin = isElectron && typeof window !== 'undefined' && typeof window.electron?.verifyPin === 'function'

  const updateNow = async () => {
    setError(null)
    setBusy(true)
    try {
      if (!appBehind && agentProblem && typeof window.electron?.ensureAgent === 'function') {
        setAgentStarting(true)
        try { await window.electron.ensureAgent(); await check() } finally { setAgentStarting(false) }
        return
      }
      const r = await window.electron!.installUpdate!()
      if (!r.ok) setError(r.error || 'The update failed.')
      else if (r.message) setProgress({ phase: 'done', message: r.message })
    } catch (e: any) {
      setError(e?.message || 'The update failed.')
    } finally {
      setBusy(false)
    }
  }

  const submitPin = async () => {
    setPinError(null)
    const ok = await window.electron!.verifyPin!(pin).catch(() => false)
    if (!ok) { setPinError('Incorrect PIN (or no admin PIN is set on this till).'); return }
    try { sessionStorage.setItem(BYPASS_KEY, new Date().toISOString()) } catch { /* storage unavailable */ }
    setBypassed(true)
    setPinOpen(false)
    setPin('')
  }

  if (excluded || !needsUpdate || bypassed) return null

  // Plain browser on a PC: warn only (the agent is what matters there)
  if (!isElectron) {
    if (!isPcBrowser || dismissed || !agentProblem) return null
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9990] max-w-[calc(100%-2rem)] flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-700 px-4 py-2 text-sm text-amber-900 dark:text-amber-200 shadow-lg" role="status">
        <span>
          ⚠️ {agentMissing ? 'The R710 agent is not running on this PC' : `The R710 agent on this PC is out of date (v${agentVersion}, server v${expected?.agentVersion})`}. Remote printing won&apos;t work. Install the POS app on this PC; it includes the agent.
        </span>
        <button onClick={() => setDismissed(true)} className="shrink-0 text-xs underline">Dismiss</button>
      </div>
    )
  }

  const rows = [
    { name: 'POS app', have: appVersion, want: expected?.version, bad: appBehind },
    { name: 'R710 agent', have: waitingForAgent ? 'starting…' : agentVersion ?? (agentVersion === null ? 'not running' : '…'), want: expected?.agentVersion, bad: agentProblem && !waitingForAgent },
  ]

  const spinner = <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" aria-hidden />
  const actions = waitingForAgent ? (
    <div className="flex items-center justify-center gap-3 text-sm text-gray-700 dark:text-gray-200" role="status">
      {spinner}
      <span>Starting the R710 agent, please wait…</span>
    </div>
  ) : (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {canInstall ? (
        <button onClick={updateNow} disabled={busy}
          className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-60">
          {busy ? 'Updating…' : appBehind ? 'Update now' : 'Start the R710 agent'}
        </button>
      ) : (
        // target=_blank: old POS apps (≤1.0.37) send it to the web browser,
        // which shows the download's progress. Downloaded in-app, the file
        // showed up at once but stayed locked ("Another program is currently
        // using this file") until the download ended, with nothing to show it.
        <div className="flex flex-col items-center gap-1">
          <a href="/api/public/electron/download" target="_blank" rel="noopener noreferrer"
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold">
            Download the POS app
          </a>
          <span className="text-xs text-gray-600 dark:text-gray-300">
            Opens in your web browser. When the download has finished, run it from there.
          </span>
        </div>
      )}
    </div>
  )

  if (!full) {
    return (
      <div className="fixed top-14 sm:top-16 inset-x-0 z-[9990] flex justify-center px-4 mt-1 pointer-events-none">
        <button onClick={() => setFull(true)}
          className="pointer-events-auto max-w-full truncate rounded-full bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-semibold px-4 py-1 shadow-lg">
          ⬆️ Update required: finish what you are doing, then click here
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-gray-900/95 p-4" role="alertdialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-xl bg-white dark:bg-gray-800 shadow-2xl p-6 text-center">
        <div className="text-4xl mb-2">⬆️</div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{waitingForAgent ? 'Getting this till ready' : 'Update required'}</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          {waitingForAgent
            ? 'The R710 agent (for printing) takes a few seconds to start after the POS app opens.'
            : 'This till must match the server before it can be used.'}
        </p>
        <table className="mx-auto mt-4 text-sm">
          <thead><tr className="text-gray-500 dark:text-gray-400"><th className="px-3 text-left font-medium"></th><th className="px-3 font-medium">This till</th><th className="px-3 font-medium">Server</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.name} className={r.bad ? 'text-red-700 dark:text-red-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}>
                <td className="px-3 py-1 text-left">{r.name}</td>
                <td className="px-3 py-1">{r.have ?? '…'}</td>
                <td className="px-3 py-1">{r.want ?? '…'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-5">{actions}</div>
        {appBehind && canInstall && !error && (
          <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">
            While it updates, the POS app will close and then reopen by itself in about a minute.
            Please be patient and don&apos;t reopen it yourself.
          </p>
        )}
        {!canInstall && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            This POS app is too old to update itself. Run the downloaded installer (it needs an administrator once); after that, updates are one click.
          </p>
        )}
        {progress && !error && (
          <div className="mt-4">
            <p className="text-sm text-gray-700 dark:text-gray-200">{progress.message}</p>
            {typeof progress.percent === 'number' && progress.percent >= 0 && (
              <div className="mt-2 h-2 rounded bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div className="h-full bg-blue-600 transition-all" style={{ width: `${progress.percent}%` }} />
              </div>
            )}
          </div>
        )}
        {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

        {canPin && (
          <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
            {pinOpen ? (
              <div className="flex flex-col items-center gap-2">
                <input type="password" inputMode="numeric" autoFocus value={pin} onChange={e => setPin(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') submitPin() }}
                  placeholder="Admin PIN" className="w-40 px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-center" />
                {pinError && <p className="text-xs text-red-600 dark:text-red-400">{pinError}</p>}
                <div className="flex gap-2">
                  <button onClick={() => { setPinOpen(false); setPin(''); setPinError(null) }} className="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600">Cancel</button>
                  <button onClick={submitPin} className="px-3 py-1 text-sm rounded bg-gray-700 text-white">Continue</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setPinOpen(true)} className="text-xs text-gray-500 dark:text-gray-400 underline">
                Continue for now (admin PIN)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
