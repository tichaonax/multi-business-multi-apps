'use client'

// MBM-331 — Farm Control cameras: this server's admin screen.
// 1. Connection: address, integration id, audience (from FarmNet), this
//    server's signing key (public key goes to FarmNet), origins, limit, on/off.
// 2. Cameras & businesses: which business each Farm Control camera belongs to.
// 3. Businesses: camera access on/off per business.
// 4. Users: stable ids to send to FarmNet for linking, and link status.
// Linking users and what each Farm Control identity may do is managed in
// Farm Control by FarmNet, not here.

export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { ContentLayout } from '@/components/layout/content-layout'
import { useToastContext } from '@/components/ui/toast'
import { hasUserPermission, SessionUser } from '@/lib/permission-utils'
import { FarmCamera, useFarmControl } from '@/components/farm-cameras/farm-control-provider'

type Tab = 'connection' | 'cameras' | 'businesses' | 'users'

interface Config {
  isEnabled: boolean
  baseUrl: string
  integrationId: string
  audience: string
  keyId: string
  publicKeyPem: string
  allowedOrigins: string[]
  maxLargeViews: number
  hasPrivateKey: boolean
  // MBM-332: the alerts poller's last run
  alertsLastRunAt?: string | null
  alertsLastError?: string | null
  alertsUsers?: number
  // MBM-339: the camera-alerts (movement / sound) check
  motion?: { lastRunAt: string | null; watching: number; lastError: string | null }
}

interface BusinessRow {
  id: string
  name: string
  type: string
  isUmbrellaBusiness: boolean
  camerasEnabled: boolean
}

interface Assignment {
  cameraId: string
  siteId: string
  cameraName: string
  siteName: string
  businessId: string
}

interface UserRow {
  id: string
  name: string
  email: string
  role: string
  viewBusinesses: { id: string; name: string }[]
  captureBusinesses: { id: string; name: string }[]
  link: { status: string; farmControlName: string | null; requestedAt: string | null; lastSessionAt: string | null; lastRefusedAt: string | null; alertsCheckedAt?: string | null; alertsError?: string | null }
  viewAllBusinesses: boolean
  captureAllBusinesses: boolean
}

const businessLabel = (b: { name: string; isUmbrellaBusiness: boolean }) => (b.isUmbrellaBusiness ? 'All' : b.name)

async function call<T = any>(url: string, method = 'GET', body?: unknown): Promise<T> {
  const r = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(d.error || `Request failed (${r.status})`)
  return d.data as T
}

/** MBM-332 — how the server's alerts check is going (it runs every minute) */
function AlertsStatus({ config, alertsOn }: { config: Config; alertsOn?: string }) {
  const ago = (d: string) => {
    const min = Math.round((Date.now() - new Date(d).getTime()) / 60_000)
    return min < 1 ? 'just now' : min < 60 ? `${min} min ago` : new Date(d).toLocaleString()
  }
  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-3 text-sm">
      <span className="font-medium text-primary">Camera alerts: </span>
      {alertsOn === 'off' || alertsOn === 'unavailable' ? (
        <span className="text-secondary">{alertsOn === 'off' ? 'switched off for this integration in Farm Control' : 'not in this Farm Control release'}</span>
      ) : !config.alertsLastRunAt ? (
        <span className="text-secondary">not checked yet (this server checks every minute while the connection is on)</span>
      ) : (
        <span className="text-secondary">checked {ago(config.alertsLastRunAt)} for {config.alertsUsers ?? 0} {config.alertsUsers === 1 ? 'person' : 'people'}</span>
      )}
      {config.alertsLastError && <p className="text-red-600 dark:text-red-400 mt-1">{config.alertsLastError}</p>}
    </div>
  )
}

/** MBM-339 — the movement / sound alerts check (every 5 s for people with alerting cameras) */
function MotionStatus({ config, cameraAlertsOn }: { config: Config; cameraAlertsOn?: string }) {
  const m = config.motion
  return (
    <div className="text-sm">
      <span className="font-medium text-primary">Movement &amp; sound alerts: </span>
      {cameraAlertsOn && cameraAlertsOn !== 'on' ? (
        <span className="text-secondary">{cameraAlertsOn === 'off' ? 'switched off for this integration in Farm Control' : 'not in this Farm Control release'}</span>
      ) : !m || m.watching === 0 ? (
        <span className="text-secondary">nobody has chosen alerting cameras yet (people choose them on My Cameras)</span>
      ) : (
        <span className="text-secondary">
          watching for {m.watching} {m.watching === 1 ? 'person' : 'people'}
          {m.lastRunAt ? `, last checked ${new Date(m.lastRunAt).toLocaleTimeString()}` : ''}
        </span>
      )}
      {m?.lastError && <p className="text-red-600 dark:text-red-400 mt-1">{m.lastError}</p>}
    </div>
  )
}

function FarmNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 px-4 py-3">
      <span className="font-semibold">Managed in Farm Control: </span>
      {children}
    </div>
  )
}

export default function FarmControlAdminPage() {
  const { data: session, status: authStatus } = useSession()
  const allowed = !!session?.user && hasUserPermission(session.user as SessionUser, 'canManageFarmControl')
  const [tab, setTab] = useState<Tab>('connection')

  if (authStatus === 'loading') return <ContentLayout title="Farm Cameras"><p className="text-secondary">Loading…</p></ContentLayout>
  if (!allowed) {
    return (
      <ContentLayout title="Farm Cameras">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <p className="text-red-800 dark:text-red-300">You need the &quot;Manage Farm Control Camera Integration&quot; permission to open this screen.</p>
        </div>
      </ContentLayout>
    )
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'connection', label: 'Connection' },
    { id: 'cameras', label: 'Cameras & businesses' },
    { id: 'businesses', label: 'Businesses' },
    { id: 'users', label: 'Users' },
  ]

  return (
    <ContentLayout title="Farm Cameras" description="Connect this server to Farm Control and decide who sees which cameras">
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px ${
              tab === t.id ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-secondary hover:text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'connection' && <ConnectionTab />}
      {tab === 'cameras' && <CamerasTab />}
      {tab === 'businesses' && <BusinessesTab />}
      {tab === 'users' && <UsersTab />}
    </ContentLayout>
  )
}

// ── 1. Connection ───────────────────────────────────────────────────────────

function ConnectionTab() {
  const toast = useToastContext()
  const farm = useFarmControl()
  const [config, setConfig] = useState<Config | null>(null)
  const [saved, setSaved] = useState<Config | null>(null)
  const [originsText, setOriginsText] = useState('')
  const [saving, setSaving] = useState(false)
  const [making, setMaking] = useState(false)

  const load = useCallback(async () => {
    try {
      const c = await call<Config>('/api/admin/farm-control/config')
      setConfig(c)
      setSaved(c)
      setOriginsText(c.allowedOrigins.join('\n'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load the connection')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- toast changes on every toast

  useEffect(() => { load() }, [load])

  if (!config) return <p className="text-secondary">Loading…</p>

  const set = (patch: Partial<Config>) => setConfig(prev => (prev ? { ...prev, ...patch } : prev))
  const thisOrigin = typeof window !== 'undefined' ? window.location.origin : ''
  const origins = originsText.split(/\s+/).map(o => o.trim()).filter(Boolean)

  const save = async (isEnabled = config.isEnabled) => {
    const before = saved || config
    const wasOn = !!saved?.isEnabled
    setSaving(true)
    try {
      const c = await call<Config>('/api/admin/farm-control/config', 'PUT', {
        baseUrl: config.baseUrl,
        integrationId: config.integrationId,
        audience: config.audience,
        allowedOrigins: origins,
        maxLargeViews: config.maxLargeViews,
        isEnabled,
      })
      setConfig(c)
      setSaved(c)
      setOriginsText(c.allowedOrigins.join('\n'))
      toast.push(c.isEnabled ? 'Saved. Farm cameras are on' : 'Saved', { type: 'success' })
      // A changed address or integration id signs in again by itself; otherwise
      // sign in again here, so a fix made in Farm Control shows straight away
      const sameConnection = wasOn && before.baseUrl === c.baseUrl && before.integrationId === c.integrationId
      await farm?.refresh()
      if (c.isEnabled && sameConnection) await farm?.reconnect()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const makeKey = async () => {
    if (config.keyId && !confirm(`Make a new signing key? Sign-ins will use the new key at once, so FarmNet must add its public key first.\nThe current key "${config.keyId}" stays on this server.`)) return
    setMaking(true)
    try {
      const k = await call<{ keyId: string; publicKeyPem: string }>('/api/admin/farm-control/keys', 'POST', {})
      // Only the key changes; keep whatever was typed above and not saved yet
      set({ keyId: k.keyId, publicKeyPem: k.publicKeyPem, hasPrivateKey: true })
      toast.push('New key made. Copy the public key and send it to FarmNet', { type: 'success' })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not make the key')
    } finally {
      setMaking(false)
    }
  }

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.push(`${what} copied`, { type: 'success' })
    } catch {
      toast.error('Could not copy. Select the text and copy it instead')
    }
  }

  const statusText: Record<string, string> = {
    off: 'Off',
    loading: 'Loading…',
    connecting: 'Signing in to Farm Control…',
    ready: `Signed in${farm?.farmUserName ? ` as "${farm.farmUserName}"` : ''}`,
    refused: 'Farm Control refused the sign-in. Is your MBM user linked, and is the public key registered?',
    unreachable: 'Farm Control is not reachable from this device (tailnet, address, or certificate)',
  }
  const featureList = Object.entries(farm?.features || {})

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="card p-6 space-y-4">
        <h3 className="text-lg font-semibold text-primary">From FarmNet</h3>
        <label className="block">
          <span className="text-sm font-medium text-primary">Farm Control address</span>
          <input className="input-field w-full mt-1" placeholder="https://farm-server.tail1234.ts.net:8443" value={config.baseUrl} onChange={e => set({ baseUrl: e.target.value })} />
        </label>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-primary">Integration id</span>
            <input className="input-field w-full mt-1" value={config.integrationId} onChange={e => set({ integrationId: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-primary">Audience</span>
            <input className="input-field w-full mt-1" value={config.audience} onChange={e => set({ audience: e.target.value })} />
          </label>
        </div>
        <label className="block">
          <span className="text-sm font-medium text-primary">Cameras open in full view, per user</span>
          <select className="input-field mt-1 block" value={config.maxLargeViews} onChange={e => set({ maxLargeViews: Number(e.target.value) })}>
            <option value={2}>2 (Farm Control default)</option>
            <option value={3}>3 (only if the farm raised the limit)</option>
          </select>
        </label>
      </div>

      <div className="card p-6 space-y-3">
        <h3 className="text-lg font-semibold text-primary">This server&apos;s signing key</h3>
        <p className="text-sm text-secondary">
          The private key stays on this server. Send FarmNet the <b>key id</b> and <b>public key</b> below so Farm Control trusts this server&apos;s sign-ins.
        </p>
        {config.keyId ? (
          <>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-secondary">Key id:</span>
              <code className="font-mono text-primary">{config.keyId}</code>
              <button className="text-blue-600 dark:text-blue-400 hover:underline" onClick={() => copy(config.keyId, 'Key id')}>Copy</button>
              {!config.hasPrivateKey && <span className="text-red-600 dark:text-red-400">Private key file missing on this server: make a new key</span>}
            </div>
            <textarea readOnly className="input-field w-full font-mono text-xs h-28" value={config.publicKeyPem} />
            <div className="flex gap-2">
              <button className="btn-primary text-sm" onClick={() => copy(config.publicKeyPem, 'Public key')}>Copy public key</button>
              <button className="btn-secondary text-sm" onClick={() => copy(`Key id: ${config.keyId}
${config.publicKeyPem}
MBM address: ${thisOrigin}`, 'Key id, public key and MBM address')}>Copy all for FarmNet</button>
              <button className="btn-secondary text-sm" disabled={making} onClick={makeKey}>{making ? 'Making…' : 'Make a new key'}</button>
            </div>
          </>
        ) : (
          <button className="btn-primary text-sm" disabled={making} onClick={makeKey}>{making ? 'Making…' : 'Make signing key'}</button>
        )}
      </div>

      <div className="card p-6 space-y-3">
        <h3 className="text-lg font-semibold text-primary">Addresses of this MBM server</h3>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-secondary">This MBM address (as this device opened it):</span>
          <code className="font-mono text-primary">{thisOrigin}</code>
          <button className="text-blue-600 dark:text-blue-400 hover:underline" onClick={() => copy(thisOrigin, 'MBM address')}>Copy</button>
        </div>
        <p className="text-sm text-secondary">
          FarmNet must register every https address people use to open MBM, exactly as shown (up to 10). Keep the list here for reference, one per line.
        </p>
        <textarea className="input-field w-full font-mono text-sm h-24" value={originsText} onChange={e => setOriginsText(e.target.value)} placeholder="https://mbm-server.local:8080" />
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {thisOrigin && !origins.includes(thisOrigin) && (
            <button className="text-blue-600 dark:text-blue-400 hover:underline" onClick={() => setOriginsText(t => (t.trim() ? `${t.trim()}\n${thisOrigin}` : thisOrigin))}>
              + Add this address ({thisOrigin})
            </button>
          )}
          {origins.length > 0 && <button className="text-blue-600 dark:text-blue-400 hover:underline" onClick={() => copy(origins.join('\n'), 'Addresses')}>Copy all</button>}
        </div>
        {thisOrigin.startsWith('http:') && (
          <p className="text-sm text-red-600 dark:text-red-400">You opened MBM over plain http. Farm cameras only work over https with a certificate the browser trusts.</p>
        )}
        <p className="text-xs text-secondary">
          Each device must be on the farm&apos;s tailnet and trust this server&apos;s certificate (the MBM desktop app already does).
        </p>
      </div>

      <div className="card p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-primary">Farm cameras</h3>
          <label className="flex items-center gap-2 text-sm font-medium text-primary">
            <input type="checkbox" checked={config.isEnabled} onChange={e => set({ isEnabled: e.target.checked })} />
            On for this server
          </label>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary text-sm" disabled={saving} onClick={() => save()}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
        {config.isEnabled && farm && (
          <div className="text-sm space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-3">
              <span className={farm.status === 'ready' ? 'text-green-600 dark:text-green-400' : farm.status === 'connecting' || farm.status === 'loading' ? 'text-secondary' : 'text-red-600 dark:text-red-400'}>
                {(farm.status !== 'ready' && farm.problem) || statusText[farm.status] || farm.status}
              </span>
              {(farm.status === 'refused' || farm.status === 'unreachable') && (
                <button className="text-blue-600 dark:text-blue-400 hover:underline" onClick={() => farm.reconnect()}>Try again</button>
              )}
            </div>
            {featureList.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {featureList.map(([k, v]) => (
                  <span key={k} className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs text-primary">{k}: {String(v)}</span>
                ))}
              </div>
            )}
          </div>
        )}
        <AlertsStatus config={config} alertsOn={farm?.features?.alerts} />
        <MotionStatus config={config} cameraAlertsOn={farm?.features?.cameraAlerts} />
      </div>

      <FarmNote>linking MBM users to Farm Control people, which cameras each person may watch, record or control, recording limits, sites in the integration, and the live-view limits.</FarmNote>
    </div>
  )
}

// ── 2. Cameras & businesses ─────────────────────────────────────────────────

function useBusinessData() {
  const toast = useToastContext()
  const [data, setData] = useState<{ businesses: BusinessRow[]; assignments: Assignment[] } | null>(null)
  const load = useCallback(async () => {
    try {
      setData(await call('/api/admin/farm-control/camera-businesses'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load businesses')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- toast changes on every toast
  useEffect(() => { load() }, [load])
  return { data, setData, load }
}

function CamerasTab() {
  const toast = useToastContext()
  const farm = useFarmControl()
  const { data, setData } = useBusinessData()
  const [cameras, setCameras] = useState<FarmCamera[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [picked, setPicked] = useState<Record<string, string[]>>({})
  const [filter, setFilter] = useState('')
  const [saving, setSaving] = useState(false)
  const ready = farm?.status === 'ready'

  useEffect(() => {
    if (!ready || !farm) return
    farm.listCameras('', true).then(
      list => { setCameras(list); setLoadError('') },
      e => setLoadError(e instanceof Error ? e.message : 'Could not list cameras')
    )
  }, [ready, farm?.listCameras]) // eslint-disable-line react-hooks/exhaustive-deps

  // Start from what's saved
  useEffect(() => {
    if (!data) return
    const next: Record<string, string[]> = {}
    for (const a of data.assignments) (next[a.cameraId] ||= []).push(a.businessId)
    setPicked(next)
  }, [data])

  const businesses = data?.businesses || []
  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return (cameras || []).filter(c => !q || `${c.name} ${c.site?.name || ''}`.toLowerCase().includes(q))
  }, [cameras, filter])
  const listedIds = new Set((cameras || []).map(c => String(c.id)))
  const notListed = (data?.assignments || []).filter(a => !listedIds.has(a.cameraId))

  if (!farm || farm.status === 'off') return <p className="text-secondary">Switch farm cameras on in the Connection tab first.</p>
  if (!ready) {
    return (
      <div className="space-y-3 max-w-3xl">
        <p className="text-secondary">
          Camera lists come from Farm Control through your own sign-in. {farm.status === 'connecting' || farm.status === 'loading' ? 'Signing in…' : 'You are not signed in to Farm Control: ask FarmNet to link your MBM user (see the Users tab for your id).'}
        </p>
        {(farm.status === 'refused' || farm.status === 'unreachable') && <button className="btn-secondary text-sm" onClick={() => farm.reconnect()}>Try again</button>}
      </div>
    )
  }

  const toggle = (cameraId: string, businessId: string) =>
    setPicked(prev => {
      const cur = prev[cameraId] || []
      return { ...prev, [cameraId]: cur.includes(businessId) ? cur.filter(id => id !== businessId) : [...cur, businessId] }
    })

  const save = async () => {
    if (!cameras) return
    setSaving(true)
    try {
      const d = await call('/api/admin/farm-control/camera-businesses', 'PUT', {
        cameras: cameras.map(c => ({
          cameraId: String(c.id),
          siteId: c.site ? String(c.site.id) : '',
          cameraName: c.name,
          siteName: c.site?.name || '',
          businessIds: picked[String(c.id)] || [],
        })),
      })
      setData(d)
      toast.push('Camera businesses saved', { type: 'success' })
      await farm.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-secondary">
        Tick the businesses each camera belongs to. People see a camera only in businesses where camera access is on and they hold &quot;View Farm Cameras&quot;. Cameras with no business are hidden from everyone.
      </p>
      {loadError && <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>}
      {!cameras && !loadError && <p className="text-secondary">Loading cameras…</p>}
      {cameras && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <input className="input-field w-64" placeholder="Search cameras" value={filter} onChange={e => setFilter(e.target.value)} />
            <span className="text-sm text-secondary">{cameras.length} cameras you can see in Farm Control</span>
            <button className="btn-primary text-sm ml-auto" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
          <div className="card divide-y divide-gray-200 dark:divide-gray-700">
            {shown.map(c => {
              const id = String(c.id)
              const mine = picked[id] || []
              return (
                <div key={id} className="p-4 flex flex-col md:flex-row md:items-start gap-3">
                  <div className="md:w-64 shrink-0">
                    <div className="font-medium text-primary">{c.name}</div>
                    <div className="text-xs text-secondary">{c.site?.name || 'No site'} · id {id}{mine.length === 0 ? ' · hidden' : ''}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {businesses.map(b => (
                      <button
                        key={b.id}
                        onClick={() => toggle(id, b.id)}
                        title={b.camerasEnabled ? '' : 'Camera access is off for this business (Businesses tab)'}
                        className={`px-2.5 py-1 rounded-full text-xs border ${
                          mine.includes(b.id)
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-gray-300 dark:border-gray-600 text-primary hover:bg-gray-100 dark:hover:bg-gray-800'
                        } ${b.camerasEnabled ? '' : 'opacity-60'}`}
                      >
                        {businessLabel(b)}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
            {shown.length === 0 && <p className="p-4 text-secondary text-sm">No cameras match.</p>}
          </div>
        </>
      )}
      {notListed.length > 0 && (
        <div className="text-sm text-secondary">
          Saved for cameras your Farm Control sign-in can&apos;t see (left as they are):{' '}
          {[...new Set(notListed.map(a => a.cameraName || a.cameraId))].join(', ')}
        </div>
      )}
      <FarmNote>which cameras are in the integration (sites), and what each person may do with each camera. Your own sign-in only lists the cameras your Farm Control identity can see.</FarmNote>
    </div>
  )
}

// ── 3. Businesses ───────────────────────────────────────────────────────────

function BusinessesTab() {
  const toast = useToastContext()
  const farm = useFarmControl()
  const { data, setData } = useBusinessData()
  const [busy, setBusy] = useState<string | null>(null)

  if (!data) return <p className="text-secondary">Loading…</p>
  const counts: Record<string, number> = {}
  for (const a of data.assignments) counts[a.businessId] = (counts[a.businessId] || 0) + 1

  const flip = async (b: BusinessRow) => {
    setBusy(b.id)
    try {
      setData(await call('/api/admin/farm-control/camera-businesses', 'PUT', { business: { businessId: b.id, enabled: !b.camerasEnabled } }))
      await farm?.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <p className="text-sm text-secondary">Turn camera access on for the businesses that should see farm cameras. Off hides that business&apos;s cameras from everyone in it.</p>
      <div className="card divide-y divide-gray-200 dark:divide-gray-700">
        {data.businesses.map(b => (
          <div key={b.id} className="p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="font-medium text-primary">{businessLabel(b)}</div>
              <div className="text-xs text-secondary capitalize">{b.isUmbrellaBusiness ? 'umbrella' : b.type} · {counts[b.id] || 0} cameras</div>
            </div>
            <label className="flex items-center gap-2 text-sm text-primary">
              <input type="checkbox" checked={b.camerasEnabled} disabled={busy === b.id} onChange={() => flip(b)} />
              Camera access
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 4. Users ────────────────────────────────────────────────────────────────

const LINK_LABEL: Record<string, { text: string; cls: string }> = {
  NOT_REQUESTED: { text: 'No id', cls: 'bg-gray-100 dark:bg-gray-800 text-secondary' },
  REQUESTED: { text: 'Waiting for FarmNet', cls: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200' },
  LINKED: { text: 'Linked', cls: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200' },
  REFUSED: { text: 'Refused', cls: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200' },
}

function UsersTab() {
  const toast = useToastContext()
  const farm = useFarmControl()
  const { data: session } = useSession()
  const [users, setUsers] = useState<UserRow[] | null>(null)
  const [onlyCameraUsers, setOnlyCameraUsers] = useState(true)
  const [filter, setFilter] = useState('')

  const load = useCallback(async () => {
    try {
      setUsers(await call('/api/admin/farm-control/users'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load users')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- toast changes on every toast
  useEffect(() => { load() }, [load])

  if (!users) return <p className="text-secondary">Loading…</p>

  const q = filter.trim().toLowerCase()
  const shown = users.filter(u =>
    (!onlyCameraUsers || u.viewBusinesses.length > 0 || u.viewAllBusinesses || u.link.status !== 'NOT_REQUESTED') &&
    (!q || `${u.name} ${u.email} ${u.id}`.toLowerCase().includes(q))
  )

  const change = async (u: UserRow, patch: { status?: 'REQUESTED' | 'NOT_REQUESTED'; viewAllBusinesses?: boolean; captureAllBusinesses?: boolean }) => {
    try {
      await call('/api/admin/farm-control/users', 'PUT', { userId: u.id, ...patch })
      await load()
      // Your own access changed: the strip and camera lists pick it up now
      if (u.id === (session?.user as { id?: string } | undefined)?.id) await farm?.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save')
    }
  }
  const createId = (u: UserRow) => change(u, { status: 'REQUESTED' })
  const removeId = (u: UserRow) => {
    if (confirm(`Remove ${u.name}'s Farm Control id? They lose all farm cameras at once, and FarmNet must link them again after a new id is created.`)) change(u, { status: 'NOT_REQUESTED' })
  }

  const copy = async (u: UserRow) => {
    try {
      await navigator.clipboard.writeText(`MBM user: ${u.name} <${u.email}>
Farm Control id (sub): ${u.id}`)
      toast.push('Copied. Send it to FarmNet to link this person in Farm Control', { type: 'success' })
    } catch {
      toast.error('Could not copy. Select the text and copy it instead')
    }
  }

  const when = (d: string | null) => (d ? new Date(d).toLocaleString() : '')

  return (
    <div className="space-y-4">
      <p className="text-sm text-secondary">
        <b>Create a Farm Control id</b> for each person who should see cameras and send it to FarmNet (Copy). FarmNet links it to whichever Farm Control person they choose; several MBM users may share one. The person shows as Linked after their next sign-in to MBM once FarmNet has linked it.
      </p>
      <p className="text-sm text-secondary">
        Camera access: grant &quot;View Farm Cameras&quot; / &quot;Record Video &amp; Take Pictures&quot; per business in User Management, or tick <b>All businesses</b> here (useful for admins) to cover every business with camera access on. Both need the link to be active. Admins get no cameras until this is done.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <input className="input-field w-64" placeholder="Search name, email or id" value={filter} onChange={e => setFilter(e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-primary">
          <input type="checkbox" checked={onlyCameraUsers} onChange={e => setOnlyCameraUsers(e.target.checked)} />
          Only people with a Farm Control id or camera access (untick to create ids)
        </label>
      </div>
      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-secondary border-b border-gray-200 dark:border-gray-700">
              <th className="p-3">Person</th>
              <th className="p-3">Farm Control id</th>
              <th className="p-3">All businesses</th>
              <th className="p-3">View in</th>
              <th className="p-3">Capture in</th>
              <th className="p-3">Link</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {shown.map(u => {
              const l = LINK_LABEL[u.link.status] || LINK_LABEL.NOT_REQUESTED
              return (
                <tr key={u.id} className="align-top">
                  <td className="p-3">
                    <div className="font-medium text-primary">{u.name}</div>
                    <div className="text-xs text-secondary">{u.email}</div>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {u.link.status === 'NOT_REQUESTED' ? (
                      <button className="btn-primary text-xs" onClick={() => createId(u)}>Create id</button>
                    ) : (
                      <>
                        <code className="font-mono text-xs text-primary select-all">{u.id}</code>{' '}
                        <button className="text-blue-600 dark:text-blue-400 hover:underline text-xs" onClick={() => copy(u)}>Copy</button>
                      </>
                    )}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <label className="flex items-center gap-1.5 text-primary">
                      <input type="checkbox" checked={u.viewAllBusinesses} disabled={u.link.status !== 'LINKED' && !u.viewAllBusinesses} title={u.link.status !== 'LINKED' ? 'Available once linked' : ''} onChange={e => change(u, { viewAllBusinesses: e.target.checked })} />
                      View
                    </label>
                    <label className="flex items-center gap-1.5 text-primary mt-1">
                      <input type="checkbox" checked={u.captureAllBusinesses} disabled={u.link.status !== 'LINKED' && !u.captureAllBusinesses} title={u.link.status !== 'LINKED' ? 'Available once linked' : ''} onChange={e => change(u, { captureAllBusinesses: e.target.checked })} />
                      Capture
                    </label>
                  </td>
                  <td className="p-3 text-primary">{u.viewAllBusinesses ? 'All businesses' : u.viewBusinesses.map(b => b.name).join(', ') || <span className="text-secondary">–</span>}</td>
                  <td className="p-3 text-primary">{u.captureAllBusinesses ? 'All businesses' : u.captureBusinesses.map(b => b.name).join(', ') || <span className="text-secondary">–</span>}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${l.cls}`}>{l.text}</span>
                    <div className="text-xs text-secondary mt-1">
                      {u.link.status === 'LINKED' && `${u.link.farmControlName ? `as "${u.link.farmControlName}", ` : ''}${when(u.link.lastSessionAt)}`}
                      {u.link.status === 'REFUSED' && when(u.link.lastRefusedAt)}
                      {u.link.status === 'REQUESTED' && when(u.link.requestedAt)}
                    </div>
                    {u.link.status === 'LINKED' && (u.link.alertsError
                      ? <div className="text-xs text-red-600 dark:text-red-400 mt-1" title={u.link.alertsError}>Alerts: {u.link.alertsError}</div>
                      : u.link.alertsCheckedAt && <div className="text-xs text-secondary mt-1">Alerts checked {when(u.link.alertsCheckedAt)}</div>)}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {u.link.status !== 'NOT_REQUESTED' && <button className="text-red-600 dark:text-red-400 hover:underline text-xs" onClick={() => removeId(u)}>Remove id</button>}
                  </td>
                </tr>
              )
            })}
            {shown.length === 0 && (
              <tr><td colSpan={7} className="p-4 text-secondary">No one yet. Untick the filter to see everyone.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <FarmNote>the linking itself. Farm Control system administrators can&apos;t be linked; each MBM user links to an ordinary Farm Control person, whose permissions are the hard limit.</FarmNote>
    </div>
  )
}
