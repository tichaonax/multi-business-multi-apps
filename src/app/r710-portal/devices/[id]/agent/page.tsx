'use client'

// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { ProtectedRoute } from '@/components/auth/protected-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { isSystemAdmin } from '@/lib/permission-utils'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useAlert } from '@/hooks/use-alert'

const PAIRING_PORT = 47710

interface DeviceInfo {
  id: string
  ipAddress: string
  description: string | null
  connectionMode: 'DIRECT' | 'AGENT'
  remoteAgent: { id: string; label: string; connectionStatus: 'ONLINE' | 'OFFLINE'; lastSeenAt: string | null } | null
}

interface AgentStatus {
  id: string
  label: string
  hostLabel: string | null
  agentVersion: string | null
  autoStartEnabled: boolean | null
  connectionStatus: 'ONLINE' | 'OFFLINE'
  lastConnectedAt: string | null
  lastSeenAt: string | null
  lastError: string | null
  createdAt: string
  pairer: { id: string; name: string }
}

interface RequestLog {
  id: string
  jobType: string
  requestedByName: string
  status: string
  durationMs: number | null
  errorMessage: string | null
  createdAt: string
}

export default function R710DeviceAgentPage() {
  return (
    <ProtectedRoute>
      <ContentLayout>
        <AgentPanelContent />
      </ContentLayout>
    </ProtectedRoute>
  )
}

function AgentPanelContent() {
  const { data: session } = useSession()
  const user = session?.user as any
  const params = useParams()
  const deviceId = params.id as string
  const { showSuccess, showError } = useAlert()

  const [device, setDevice] = useState<DeviceInfo | null>(null)
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null)
  const [logs, setLogs] = useState<RequestLog[]>([])
  const [latestAgentVersion, setLatestAgentVersion] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [togglingAutoStart, setTogglingAutoStart] = useState(false)

  // Pairing flow state — only relevant while unpaired
  const [localAgentDetected, setLocalAgentDetected] = useState<boolean | null>(null)
  const [pairLabel, setPairLabel] = useState('')
  const [pairing, setPairing] = useState(false)

  const loadDevice = useCallback(async () => {
    const res = await fetch(`/api/admin/r710/devices/${deviceId}`, { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      setDevice(data.device)
      setPairLabel(prev => prev || `Agent for ${data.device.description || data.device.ipAddress}`)
    }
  }, [deviceId])

  const loadAgentStatus = useCallback(async (agentId: string) => {
    const [statusRes, logsRes] = await Promise.all([
      fetch(`/api/admin/r710/agents/${agentId}/status`, { credentials: 'include' }),
      fetch(`/api/admin/r710/agents/${agentId}/logs`, { credentials: 'include' }),
    ])
    if (statusRes.ok) setAgentStatus((await statusRes.json()).data)
    if (logsRes.ok) setLogs((await logsRes.json()).data)
  }, [])

  useEffect(() => {
    (async () => {
      setLoading(true)
      await loadDevice()
      setLoading(false)
    })()
  }, [loadDevice])

  useEffect(() => {
    if (!device?.remoteAgent) return
    loadAgentStatus(device.remoteAgent.id)
    const interval = setInterval(() => loadAgentStatus(device.remoteAgent!.id), 10000)
    return () => clearInterval(interval)
  }, [device?.remoteAgent?.id, loadAgentStatus])

  // Fetched once — this doesn't change while the page is open, unlike agent
  // status which polls for live connection state.
  useEffect(() => {
    if (!device?.remoteAgent) return
    fetch('/api/admin/r710/agents/latest-version', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(json => { if (json?.success) setLatestAgentVersion(json.data.version) })
      .catch(() => { /* non-critical — just skip the update banner */ })
  }, [device?.remoteAgent])

  // Probe the local agent on THIS browser's machine — only meaningful when
  // an admin opens this page from the workstation that should be paired.
  // Polls every 2s rather than probing once on mount: the admin's normal
  // flow is download -> unzip -> run the exe -> come back to this
  // already-open tab, which used to require a manual page reload before
  // the "Pair" button would ever appear.
  useEffect(() => {
    if (device?.remoteAgent) return
    let cancelled = false
    const probe = () => {
      fetch(`http://127.0.0.1:${PAIRING_PORT}/probe?serverUrl=${encodeURIComponent(window.location.origin)}`, { signal: AbortSignal.timeout(2500) })
        .then(res => { if (!cancelled) setLocalAgentDetected(res.ok) })
        .catch(() => { if (!cancelled) setLocalAgentDetected(false) })
    }
    probe()
    const interval = setInterval(probe, 2000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [device?.remoteAgent])

  const handlePair = async () => {
    if (!device || !pairLabel.trim()) return
    setPairing(true)
    try {
      const mintRes = await fetch('/api/admin/r710/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ deviceRegistryId: device.id, label: pairLabel.trim() }),
      })
      const mintData = await mintRes.json()
      if (!mintRes.ok) {
        showError(mintData.error || 'Failed to mint an agent token', '❌ Pairing Failed')
        return
      }

      const pairRes = await fetch(`http://127.0.0.1:${PAIRING_PORT}/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverUrl: window.location.origin,
          agentToken: mintData.data.agentToken,
          deviceRegistryId: device.id,
          label: pairLabel.trim(),
          // Lets the agent trust this server's self-signed cert when it has
          // one — otherwise an https:// serverUrl fails TLS validation on
          // every connection attempt, silently, forever (Node doesn't trust
          // a custom CA by default). Absent/null when the server runs plain
          // HTTP or a real publicly-trusted cert.
          caCert: mintData.data.caCert ?? undefined,
          // Display-only, for the tray's benefit — see AgentConfig's
          // deviceIpAddress comment. Goes stale if the device's IP is later
          // edited on the admin panel; that's cosmetic, not functional.
          deviceIpAddress: device.ipAddress,
        }),
      })

      if (!pairRes.ok) {
        showError('The local agent rejected the pairing request. Make sure it is running and unpaired.', '❌ Pairing Failed')
        return
      }

      showSuccess('This machine is now paired. It may take a few seconds to show as connected.', '✅ Paired')
      await loadDevice()
    } catch (error) {
      console.error('Pairing failed:', error)
      showError(
        'Could not reach the local agent on this machine (http://127.0.0.1:47710). Make sure it is installed and running, and that you opened this page from the workstation being paired.',
        '❌ Pairing Failed'
      )
    } finally {
      setPairing(false)
    }
  }

  const handleTest = async () => {
    if (!device?.remoteAgent) return
    setTesting(true)
    try {
      const res = await fetch(`/api/admin/r710/agents/${device.remoteAgent.id}/test`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json()
      if (res.ok && data.success) {
        showSuccess('The agent responded and reached the R710 device.', '✅ Test Successful')
      } else {
        showError(data.error || 'Test failed', '❌ Test Connection Failed')
      }
    } catch {
      showError('Unable to reach the server. Please try again.', '❌ Test Connection Failed')
    } finally {
      setTesting(false)
      await loadAgentStatus(device.remoteAgent.id)
    }
  }

  const handleToggleAutoStart = async () => {
    if (!device?.remoteAgent || !agentStatus) return
    const enabled = !agentStatus.autoStartEnabled
    setTogglingAutoStart(true)
    try {
      const res = await fetch(`/api/admin/r710/agents/${device.remoteAgent.id}/auto-start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enabled }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setAgentStatus(prev => prev ? { ...prev, autoStartEnabled: data.data?.autoStartEnabled ?? enabled } : prev)
      } else {
        showError(data.error || 'Failed to update auto-start setting', '❌ Update Failed')
      }
    } catch {
      showError('Unable to reach the server. Please try again.', '❌ Update Failed')
    } finally {
      setTogglingAutoStart(false)
    }
  }

  const handleRevoke = async () => {
    if (!device?.remoteAgent) return
    if (!confirm(`Revoke the pairing "${device.remoteAgent.label}"? The agent will disconnect immediately and this device will stop being reachable until re-paired.`)) return
    setRevoking(true)
    try {
      const res = await fetch(`/api/admin/r710/agents/${device.remoteAgent.id}`, { method: 'DELETE', credentials: 'include' })
      if (res.ok) {
        showSuccess('Agent pairing revoked.', '✅ Revoked')
        setAgentStatus(null)
        setLogs([])
        await loadDevice()
      } else {
        const data = await res.json()
        showError(data.error || 'Failed to revoke', '❌ Revoke Failed')
      }
    } finally {
      setRevoking(false)
    }
  }

  const formatTimeAgo = (date: string | null) => {
    if (!date) return 'Never'
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  if (!isSystemAdmin(user)) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-200 mb-2">Admin Access Required</h3>
          <p className="text-yellow-800 dark:text-yellow-300">Only system administrators can manage R710 remote agents.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!device) {
    return <div className="container mx-auto px-4 py-6 text-gray-500 dark:text-gray-400">Device not found.</div>
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-2">
          <Link href={`/r710-portal/devices/${device.id}`} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Remote Agent</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 ml-8">
          {device.description || device.ipAddress} ({device.ipAddress})
        </p>
      </div>

      {device.connectionMode !== 'AGENT' && (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-sm text-gray-600 dark:text-gray-400">
          This device is set to <strong>Direct</strong> connection mode — the server reaches it directly and no agent is used.
          Edit the device to switch it to Remote Agent mode first.
        </div>
      )}

      {device.connectionMode === 'AGENT' && !device.remoteAgent && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Pair a Machine</h2>

          {/* Common case first: an agent already installed on this workstation (e.g. re-pairing
              after a Revoke, or pairing a second device/server from the same machine) needs
              nothing more than the form below — leading with download/install instructions here
              would wrongly imply a fresh download is required every time. */}
          {localAgentDetected === true && (
            <div className="space-y-3">
              <p className="text-sm text-green-700 dark:text-green-400">✓ Local agent detected on this machine and waiting to be paired. No need to download or reinstall it.</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Label for this workstation</label>
                <input
                  type="text"
                  value={pairLabel}
                  onChange={(e) => setPairLabel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                  placeholder="Front Desk PC — Bulawayo Branch"
                />
              </div>
              <button
                onClick={handlePair}
                disabled={pairing || !pairLabel.trim()}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {pairing ? 'Pairing…' : 'Pair this machine'}
              </button>
            </div>
          )}

          {localAgentDetected !== true && (
            <>
              <ol className="text-sm text-gray-600 dark:text-gray-400 list-decimal list-inside space-y-1">
                <li>
                  On the workstation that sits on the same network as this device, download and run the agent — skip this if it's already installed and running there:{' '}
                  <a href="/api/admin/r710/agents/download" className="text-primary-600 dark:text-primary-400 hover:underline">
                    Download r710-agent.zip
                  </a>
                </li>
                <li>Unzip it and double-click <code className="text-xs bg-gray-100 dark:bg-gray-900 px-1 rounded">r710-agent.exe</code> — a tray icon will appear (right-click it any time to Restart or Quit the agent).</li>
                <li>Open this page in a browser <strong>on that same workstation</strong> — it'll detect the running agent automatically and the Pair button will appear below.</li>
              </ol>

              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                {localAgentDetected === null && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Checking for a local agent on this machine…</p>
                )}
                {localAgentDetected === false && (
                  <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3">
                    No local agent detected on this machine (http://127.0.0.1:{PAIRING_PORT}). If it's already installed, make sure it's actually running (check the system tray) and that you opened this page on that same workstation, not remotely — this check only ever succeeds from the machine the agent is running on.
                    {' '}If it's stuck (e.g. this port is already in use by a previous run), run{' '}
                    <code className="text-xs bg-amber-100 dark:bg-amber-900/40 px-1 rounded">Stop R710 Agent.bat</code>{' '}
                    from the unzipped folder, then start <code className="text-xs bg-amber-100 dark:bg-amber-900/40 px-1 rounded">r710-agent.exe</code> again. Otherwise, install it using the link above.
                  </p>
                )}
              </div>
            </>
          )}

        </div>
      )}

      {device.connectionMode === 'AGENT' && device.remoteAgent && (
        <div className="space-y-6">
          {/* Status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{agentStatus?.label || device.remoteAgent.label}</h2>
              {(agentStatus?.connectionStatus || device.remoteAgent.connectionStatus) === 'ONLINE' ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  🟢 Connected
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                  🔴 Offline
                </span>
              )}
            </div>

            {agentStatus?.agentVersion && latestAgentVersion && agentStatus.agentVersion !== latestAgentVersion && (
              <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  <strong>⚠️ Update available</strong> — this workstation is running agent v{agentStatus.agentVersion}, current is v{latestAgentVersion}.
                  {' '}<a href="/api/admin/r710/agents/download" className="underline hover:no-underline">Download the latest r710-agent.zip</a>,
                  {' '}run <code className="text-xs bg-amber-100 dark:bg-amber-900/40 px-1 rounded">Stop R710 Agent.bat</code> on the workstation, then run the new <code className="text-xs bg-amber-100 dark:bg-amber-900/40 px-1 rounded">r710-agent.exe</code>.
                  {' '}This pairing stays intact — no need to re-pair or re-register the device's IP.
                </p>
              </div>
            )}

            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Host</dt>
                <dd className="text-gray-900 dark:text-white">{agentStatus?.hostLabel || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Agent Version</dt>
                <dd className="text-gray-900 dark:text-white">{agentStatus?.agentVersion || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Last Seen</dt>
                <dd className="text-gray-900 dark:text-white">{formatTimeAgo(agentStatus?.lastSeenAt ?? device.remoteAgent.lastSeenAt)}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Paired By</dt>
                <dd className="text-gray-900 dark:text-white">{agentStatus?.pairer?.name || '—'}</dd>
              </div>
            </dl>

            {agentStatus?.lastError && (
              <p className="mt-4 text-xs text-red-600 dark:text-red-400">Last error: {agentStatus.lastError}</p>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Start with Windows</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Applies to this whole workstation's agent, not just this pairing — it also covers any other server this machine is paired to.
                </p>
              </div>
              <button
                onClick={handleToggleAutoStart}
                disabled={togglingAutoStart || !agentStatus}
                role="switch"
                aria-checked={!!agentStatus?.autoStartEnabled}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${agentStatus?.autoStartEnabled ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${agentStatus?.autoStartEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleTest}
                disabled={testing}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                {testing ? 'Testing…' : 'Test Connection'}
              </button>
              <button
                onClick={handleRevoke}
                disabled={revoking}
                className="inline-flex items-center px-4 py-2 border border-red-300 dark:border-red-800 rounded-md text-sm font-medium text-red-700 dark:text-red-400 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
              >
                {revoking ? 'Revoking…' : 'Revoke Pairing'}
              </button>
              <a
                href="/api/admin/r710/agents/download"
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Download r710-agent.zip
              </a>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Re-download any time — e.g. to re-run the agent on the workstation, or to install it on another machine. The existing pairing stays intact; running the downloaded `r710-agent.exe` on this same workstation just picks it back up.
            </p>
          </div>

          {/* Request history */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
            </div>
            {logs.length === 0 ? (
              <p className="px-6 py-8 text-sm text-gray-500 dark:text-gray-400 text-center">No requests yet.</p>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Job</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Requested By</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Duration</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td className="px-4 py-2 text-gray-900 dark:text-white">{log.jobType}</td>
                      <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{log.requestedByName}</td>
                      <td className="px-4 py-2">
                        <span className={log.status === 'SUCCESS' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                          {log.status}
                        </span>
                        {log.errorMessage && (
                          <div className="text-xs text-gray-400 max-w-xs truncate" title={log.errorMessage}>{log.errorMessage}</div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{log.durationMs != null ? `${log.durationMs}ms` : '—'}</td>
                      <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{formatTimeAgo(log.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
