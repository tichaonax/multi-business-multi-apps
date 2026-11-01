'use client'

// MBM-331 — the one place the browser talks to Farm Control (guide §4.4, §6).
// - Loads what MBM allows this user (/api/farm-control/me).
// - Holds the Farm Control API session token in memory only, renews it about
//   2 minutes before it ends, and on a 401 signs in again once, then stops.
// - Answers every frame's `ready` / `assertion.needed` with a fresh assertion.
// - Accepts messages only from the exact Farm Control origin and passes the
//   rest (camera.open, state, previews, session.ended, …) to subscribers.
// - On sign-out ends the API session; frames end their own sessions when
//   they're removed (guide §5).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'

export type StripMode = 'live' | 'pictures'

export interface FarmCameraPreferences {
  stripVisible: boolean
  stripCameraIds: string[]
  stripMode: StripMode
  posStripMode: StripMode
  showNamesOnStrip: boolean
  showStripOnPos: boolean
  cameraLabels: Record<string, { name?: string; showName?: boolean }>
  /** MBM-332: camera alerts in the bell / the Farm Camera Alerts chat */
  alertsBell: boolean
  alertsChat: boolean
}

export interface FarmControlMe {
  enabled: boolean
  baseUrl?: string
  integrationId?: string
  maxLargeViews?: number
  canManage?: boolean
  cameraIds?: string[]
  captureCameraIds?: string[]
  cameraBusinesses?: Record<string, string[]>
  preferences?: FarmCameraPreferences
}

/** Farm Control's camera object (guide §8), as far as MBM uses it */
export interface FarmCamera {
  id: number
  name: string
  notes?: string
  site?: { id: number; name: string }
  state?: string
  may?: Record<string, boolean>
  pinned?: boolean
}

export type FarmStatus = 'off' | 'loading' | 'connecting' | 'ready' | 'refused' | 'unreachable'

export interface FarmMessage {
  type: string
  [k: string]: unknown
}

type Listener = (m: FarmMessage, source: MessageEventSource | null) => void

interface FarmControlContextValue {
  me: FarmControlMe | null
  status: FarmStatus
  /** Why the last sign-in failed, in plain words (null when fine) */
  problem: string | null
  /** Farm Control's own name for the user, from the session */
  farmUserName: string | null
  features: Record<string, string>
  origin: string | null
  /** Frame address: /embed/v1/<page>?integration=…&<params> */
  frameSrc: (page: 'previews' | 'player' | 'modal', params: Record<string, string | undefined>) => string | null
  /** Integration API call with the session token (null body on 204) */
  api: <T = any>(method: string, path: string, body?: unknown) => Promise<T>
  /** Post a message to a frame, only to the Farm Control origin */
  send: (frame: HTMLIFrameElement | null | undefined, message: FarmMessage) => void
  subscribe: (listener: Listener) => () => void
  refresh: () => Promise<void>
  /** Sign in to Farm Control again (e.g. after FarmNet links this user) */
  reconnect: () => Promise<boolean>
  savePreferences: (patch: Partial<FarmCameraPreferences>) => Promise<boolean>
  /** Cameras from Farm Control, narrowed to what MBM allows (all: every camera the
   *  linked identity sees, for the admin's camera ↔ business mapping) */
  listCameras: (q?: string, all?: boolean) => Promise<FarmCamera[]>
}

const FarmControlContext = createContext<FarmControlContextValue | null>(null)

export function useFarmControl() {
  return useContext(FarmControlContext)
}

const RENEW_BEFORE_MS = 120_000

async function fetchAssertion(): Promise<string> {
  const r = await fetch('/api/farm-control/assertion', { method: 'POST', cache: 'no-store' })
  if (!r.ok) throw new Error((await r.text().catch(() => '')) || 'No assertion')
  return r.text()
}

class FarmApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message)
  }
}

export function FarmControlProvider({ children }: { children: React.ReactNode }) {
  const { status: authStatus } = useSession()
  const [me, setMe] = useState<FarmControlMe | null>(null)
  const [status, setStatus] = useState<FarmStatus>('off')
  const [features, setFeatures] = useState<Record<string, string>>({})
  const [farmUserName, setFarmUserName] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const token = useRef<string | null>(null)
  const renewTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const listeners = useRef(new Set<Listener>())
  const reported = useRef<boolean | null>(null)

  const origin = useMemo(() => {
    if (!me?.enabled || !me.baseUrl) return null
    try { return new URL(me.baseUrl).origin } catch { return null }
  }, [me])
  const apiBase = origin ? `${origin}/api/integration/v1` : null

  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/farm-control/me', { cache: 'no-store' })
      const d = await r.json()
      setMe(d.success ? d.data : { enabled: false })
    } catch {
      setMe({ enabled: false })
    }
  }, [])

  useEffect(() => {
    if (authStatus === 'authenticated') { setStatus('loading'); refresh() }
    if (authStatus === 'unauthenticated') { setMe(null); setStatus('off') }
  }, [authStatus, refresh])

  const report = useCallback((ok: boolean, name?: string) => {
    // Once per outcome per page: a later success (e.g. after linking) still reports
    if (reported.current === ok) return
    reported.current = ok
    fetch('/api/farm-control/link-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok, farmControlName: name }),
    }).catch(() => {})
  }, [])

  const raw = useCallback(async (method: string, path: string, body?: unknown, withToken = true) => {
    if (!apiBase) throw new FarmApiError(0, 'off', 'Farm cameras are off')
    const headers: Record<string, string> = {}
    if (withToken && token.current) headers.Authorization = `Bearer ${token.current}`
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    let r: Response
    try {
      r = await fetch(apiBase + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
    } catch {
      // The browser hides why a request failed. If Farm Control answers a plain
      // (no-cors) request, it's up but doesn't accept this MBM address (origin).
      const answered = await fetch(`${apiBase}/session`, { mode: 'no-cors', cache: 'no-store' }).then(() => true, () => false)
      throw answered
        ? new FarmApiError(0, 'origin', `Farm Control answered, but it doesn't accept sign-ins from this MBM address (${window.location.origin}). Ask FarmNet to register this address for the integration.`)
        : new FarmApiError(0, 'unreachable', `Farm Control at ${apiBase.replace('/api/integration/v1', '')} can't be reached from this device. Check the device is on the farm's tailnet and the address is right.`)
    }
    if (r.status === 204) return null
    if ((r.headers.get('Content-Type') || '').startsWith('image/')) return r.blob()
    const d = await r.json().catch(() => ({}))
    if (!r.ok) throw new FarmApiError(r.status, d.code || '', d.error || r.statusText)
    return d
  }, [apiBase])

  const scheduleRenew = useCallback((expiresAt: string) => {
    if (renewTimer.current) clearTimeout(renewTimer.current)
    const wait = Math.max(Date.parse(expiresAt) - Date.now() - RENEW_BEFORE_MS, 5_000)
    renewTimer.current = setTimeout(async () => {
      try {
        const d = await raw('POST', '/session/renew', { assertion: await fetchAssertion() })
        setFeatures(d.features || {})
        scheduleRenew(d.expiresAt)
      } catch {
        token.current = null
        setStatus('refused')
      }
    }, wait)
  }, [raw])

  const startSession = useCallback(async () => {
    token.current = null
    setStatus('connecting')
    try {
      const d = await raw('POST', '/session', { assertion: await fetchAssertion() }, false)
      token.current = d.token
      setFeatures(d.features || {})
      setFarmUserName(d.user?.name || null)
      setProblem(null)
      setStatus('ready')
      report(true, d.user?.name)
      scheduleRenew(d.expiresAt)
      return true
    } catch (e) {
      setProblem(e instanceof FarmApiError
        ? (e.status ? `Farm Control refused the sign-in (${e.status}${e.code ? ` ${e.code}` : ''}): ${e.message}` : e.message)
        : e instanceof Error ? `Could not sign in: ${e.message}` : 'Could not sign in')
      if (e instanceof FarmApiError && (e.code === 'unreachable' || e.code === 'origin')) setStatus('unreachable')
      else {
        setStatus('refused')
        if (e instanceof FarmApiError && e.status === 401) report(false)
      }
      return false
    }
  }, [raw, report, scheduleRenew])

  // Sign in to the API once MBM says this user has cameras. Only a change of
  // connection signs in again — saving preferences or camera lists doesn't.
  const connectionKey = me ? (me.enabled ? `${origin}|${me.integrationId}` : 'off') : ''
  useEffect(() => {
    if (!connectionKey) return
    if (connectionKey === 'off') { setStatus('off'); return }
    startSession()
    return () => {
      if (renewTimer.current) clearTimeout(renewTimer.current)
    }
  }, [connectionKey, startSession])

  // On MBM sign-out: end the API session at once (frames end their own)
  useEffect(() => {
    if (authStatus !== 'unauthenticated' || !token.current || !apiBase) return
    const t = token.current
    token.current = null
    fetch(`${apiBase}/session`, { method: 'DELETE', headers: { Authorization: `Bearer ${t}` }, keepalive: true }).catch(() => {})
  }, [authStatus, apiBase])

  // A 401 means the session ended: sign in again once, then stop (guide §4.4)
  const api = useCallback(async (method: string, path: string, body?: unknown) => {
    try {
      return await raw(method, path, body)
    } catch (e) {
      if (e instanceof FarmApiError && e.status === 401 && (await startSession())) return raw(method, path, body)
      throw e
    }
  }, [raw, startSession])

  // Messages from the frames: only from the exact Farm Control origin
  useEffect(() => {
    if (!origin) return
    const onMessage = async (e: MessageEvent) => {
      if (e.origin !== origin || !e.data || typeof e.data !== 'object' || typeof e.data.type !== 'string') return
      const m = e.data as FarmMessage
      if (m.type === 'ready' || m.type === 'assertion.needed') {
        try {
          const assertion = await fetchAssertion()
          ;(e.source as WindowProxy | null)?.postMessage({ type: 'assertion', assertion }, origin)
        } catch {
          // No assertion (permission withdrawn): the frame shows its own ended state
        }
        return
      }
      listeners.current.forEach(l => l(m, e.source))
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [origin])

  const send = useCallback((frame: HTMLIFrameElement | null | undefined, message: FarmMessage) => {
    if (!origin || !frame?.contentWindow) return
    frame.contentWindow.postMessage(message, origin)
  }, [origin])

  const subscribe = useCallback((l: Listener) => {
    listeners.current.add(l)
    return () => { listeners.current.delete(l) }
  }, [])

  const frameSrc = useCallback((page: 'previews' | 'player' | 'modal', params: Record<string, string | undefined>) => {
    if (!origin || !me?.integrationId) return null
    const q = new URLSearchParams({ integration: me.integrationId })
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') q.set(k, v)
    return `${origin}/embed/v1/${page}?${q.toString()}`
  }, [origin, me])

  const savePreferences = useCallback(async (patch: Partial<FarmCameraPreferences>) => {
    const r = await fetch('/api/farm-control/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok || !d.success) return false
    setMe(prev => (prev ? { ...prev, preferences: d.data } : prev))
    return true
  }, [])

  const listCameras = useCallback(async (q = '', unfiltered = false) => {
    const allowed = new Set(me?.cameraIds || [])
    const all: FarmCamera[] = []
    for (let offset = 0; offset < 2000; offset += 200) {
      const d = await api('GET', `/cameras?${new URLSearchParams({ q, limit: '200', offset: String(offset) })}`)
      all.push(...(d.cameras || []))
      if (all.length >= (d.total || 0) || !(d.cameras || []).length) break
    }
    return unfiltered ? all : all.filter(c => allowed.has(String(c.id)))
  }, [api, me])

  const value = useMemo<FarmControlContextValue>(() => ({
    me, status, problem, farmUserName, features, origin, frameSrc, api, send, subscribe, refresh, reconnect: startSession, savePreferences, listCameras,
  }), [me, status, problem, farmUserName, features, origin, frameSrc, api, send, subscribe, refresh, startSession, savePreferences, listCameras])

  return <FarmControlContext.Provider value={value}>{children}</FarmControlContext.Provider>
}
