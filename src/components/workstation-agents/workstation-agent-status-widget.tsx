'use client'

// MBM-281 follow-up: surfaces the workstation agent's health right on the
// dashboard homepage, checked live against THIS browser's own machine —
// mirrors the exact probe the "Pair This Workstation" card on
// /admin/workstation-agents already uses (http://127.0.0.1:47710/probe),
// rather than the server's DB-backed list of paired workstations.
//
// That distinction matters: the DB list only knows about workstations that
// have already been paired to some business, which can't tell you "is an
// agent even running on the machine I'm sitting at right now" — a fresh or
// just-redeployed workstation with nothing paired yet looked identical to
// "nothing wrong" on the old (DB-based) version of this widget.
//
// Two independent, unconditional facts (true regardless of business type or
// pairing state, since they're facts about the physical machine):
//  1. Is an agent process reachable on 127.0.0.1:47710 at all?
//  2. If so, does it report the version this server currently expects?
// Deliberately NOT flagged: a running, up-to-date agent that simply isn't
// paired to this particular business — that's a legitimate "this business
// doesn't use a workstation agent (yet)" state, not a problem.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { isMobileDevice } from '@/lib/workstation-agents/local-agent-sync'
import { compareVersions } from '@/lib/workstation-agents/agent-version'

const PAIRING_PORT = 47710
const BASE_POLL_MS = 30000
const FAST_POLL_MS = 3000
const FAST_POLL_CAP_MS = 3 * 60 * 1000

export function WorkstationAgentStatusWidget() {
  const { isSystemAdmin, isBusinessOwner } = useBusinessPermissionsContext()
  // MBM-283 follow-up: the workstation agent is a Windows .exe — never
  // meaningful on a phone/tablet, which can't run one regardless of
  // pairing state. Without this, a mobile user was told "No workstation
  // agent running on this machine — download r710-agent.zip and run
  // r710-agent.exe" on their own phone, which is never something they can
  // act on (mobile printing relays through SOME OTHER workstation's
  // already-paired agent — see MBM-283 — it never runs one itself).
  const [isMobile] = useState(() => isMobileDevice())
  const isAdmin = (isSystemAdmin || isBusinessOwner) && !isMobile

  const [checked, setChecked] = useState(false)
  const [agentRunning, setAgentRunning] = useState(false)
  const [agentVersion, setAgentVersion] = useState<string | null>(null)
  const [latestAgentVersion, setLatestAgentVersion] = useState<string | null>(null)
  // MBM-281 follow-up: started the moment the admin clicks a "Download the
  // latest r710-agent.zip" link below — the realistic next few minutes are
  // "download, run the installer, come back," and this banner should clear
  // the moment that's actually done rather than however much of the base
  // 30s window happens to be left. Cleared automatically once the issue
  // that triggered it is actually resolved (see the effect below), or after
  // a cap if it never resolves, so this never turns into permanent
  // hammering of the local agent port over an abandoned download.
  const [fastPolling, setFastPolling] = useState(false)

  const mountedRef = useRef(true)
  useEffect(() => () => { mountedRef.current = false }, [])

  const checkAgent = useCallback(() => {
    fetch(`http://127.0.0.1:${PAIRING_PORT}/probe?serverUrl=${encodeURIComponent(window.location.origin)}`, { signal: AbortSignal.timeout(2500) })
      .then(async (res) => {
        if (!mountedRef.current) return
        setAgentRunning(res.ok)
        if (res.ok) {
          const data = await res.json().catch(() => null)
          if (!mountedRef.current) return
          setAgentVersion(data?.agentVersion || null)
        }
      })
      .catch(() => { if (mountedRef.current) setAgentRunning(false) })
      .finally(() => { if (mountedRef.current) setChecked(true) })
  }, [])

  // Base poll — fallback for whenever the admin doesn't click through a
  // download link at all (e.g. the agent was already downloaded earlier).
  // Also re-checks immediately on window focus / tab visibility regain,
  // since the realistic path is alt-tabbing away to run the installer and
  // coming straight back, not sitting and waiting out a timer.
  useEffect(() => {
    if (!isAdmin) return
    checkAgent()
    const baseInterval = setInterval(checkAgent, BASE_POLL_MS)

    const onFocus = () => checkAgent()
    const onVisibility = () => { if (document.visibilityState === 'visible') checkAgent() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      clearInterval(baseInterval)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [isAdmin, checkAgent])

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    fetch('/api/admin/r710/agents/latest-version', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (!cancelled && data?.data?.version) setLatestAgentVersion(data.data.version) })
      .catch(() => { /* non-critical — version check just won't fire */ })
    return () => { cancelled = true }
  }, [isAdmin])

  // MBM-284: direction matters. `agentBehind` is the original "this
  // workstation needs updating" case. `agentAhead` is the opposite — this
  // agent already exceeds what THIS server expects, most likely because the
  // machine was pointed at a different, less-recently-updated server — and
  // needs a completely different message (that server's admin needs to
  // update it, not this workstation).
  const versionCompare = agentVersion && latestAgentVersion ? compareVersions(agentVersion, latestAgentVersion) : 0
  const agentBehind = versionCompare < 0
  const agentAhead = versionCompare > 0
  const hasIssue = checked && (!agentRunning || agentBehind || agentAhead)

  // Fast-poll window, active only while fastPolling is true and there's
  // still actually something to resolve — stops itself the moment hasIssue
  // goes false (the banner is about to disappear) instead of running out
  // the clock, and stops itself at the cap either way.
  useEffect(() => {
    if (!fastPolling) return
    if (!hasIssue) { setFastPolling(false); return }
    const fastInterval = setInterval(checkAgent, FAST_POLL_MS)
    const capTimeout = setTimeout(() => setFastPolling(false), FAST_POLL_CAP_MS)
    return () => { clearInterval(fastInterval); clearTimeout(capTimeout) }
  }, [fastPolling, hasIssue, checkAgent])

  const handleDownloadClick = () => setFastPolling(true)

  if (!isAdmin || !checked) return null

  if (!agentRunning) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-4 mt-6">
        <p className="text-sm font-semibold text-red-800 dark:text-red-300">
          ⚠️ No workstation agent running on this machine
        </p>
        <p className="text-sm text-red-700 dark:text-red-400 mt-1">
          If this workstation has a scale or receipt printer that should relay through the agent, it won't work until
          the agent is downloaded and running here.
        </p>
        <p className="text-sm text-red-700 dark:text-red-400 mt-2">
          <a href="/api/admin/r710/agents/download" onClick={handleDownloadClick} className="underline font-medium hover:no-underline">Download the latest r710-agent.zip →</a>{' '}
          then run <code className="text-xs bg-red-100 dark:bg-red-900/40 px-1 rounded">r710-agent.exe</code> on this workstation.
        </p>
        <p className="text-sm text-red-700 dark:text-red-400 mt-2">
          Already running it? A browser can't tell this page apart from "nothing's there" when something else is
          quietly blocking the connection — worth ruling that out directly:{' '}
          <a href={`http://127.0.0.1:${PAIRING_PORT}/probe?serverUrl=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')}`} target="_blank" rel="noopener noreferrer" className="underline font-medium hover:no-underline">
            Test the local connection →
          </a>{' '}
          If that opens fine but this banner still won't clear, try the same page in an <strong>Incognito/Private window</strong> — if it
          works there, an ad-blocker or privacy extension on this browser's normal profile is blocking it (check{' '}
          <code className="text-xs bg-red-100 dark:bg-red-900/40 px-1 rounded">chrome://extensions</code>). If the direct test link
          itself won't load, the agent isn't actually reachable here — check it's really running.
        </p>
      </div>
    )
  }

  if (agentAhead) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-lg p-4 mt-6">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          ⚠️ This server is running an older agent build than this workstation has
        </p>
        <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
          This workstation's agent (v{agentVersion}) is newer than what this server currently expects (v{latestAgentVersion}).
          This usually means this machine was switched to a different server that hasn't been updated as recently.
          The connection should keep working for now — newer agent builds stay backward compatible — but a feature
          added since v{latestAgentVersion} may not work against this server until it's updated.
        </p>
        <p className="text-sm text-amber-700 dark:text-amber-400 mt-2">
          Nothing to do on this workstation — do not downgrade or reinstall the agent here. This server's administrator
          needs to redeploy a newer r710-agent build on their end.
        </p>
      </div>
    )
  }

  if (!agentBehind) return null

  return (
    <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-4 mt-6">
      <p className="text-sm font-semibold text-red-800 dark:text-red-300">
        ⚠️ Agent update required on this machine
      </p>
      <p className="text-sm text-red-700 dark:text-red-400 mt-1">
        This workstation's agent (v{agentVersion}) is older than what this server now expects (v{latestAgentVersion}).
        Business switching, printer routing, and other recent features may silently not work until it's updated — the
        connection itself won't necessarily show as broken.
      </p>
      <p className="text-sm text-red-700 dark:text-red-400 mt-2">
        <a href="/api/admin/r710/agents/download" onClick={handleDownloadClick} className="underline font-medium hover:no-underline">Download the latest r710-agent.zip →</a>{' '}
        then run <code className="text-xs bg-red-100 dark:bg-red-900/40 px-1 rounded">Stop R710 Agent.bat</code>, extract the new download, and run the new{' '}
        <code className="text-xs bg-red-100 dark:bg-red-900/40 px-1 rounded">r710-agent.exe</code>. Existing pairings stay intact.
      </p>
    </div>
  )
}
