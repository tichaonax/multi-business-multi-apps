'use client'

// MBM-275: pairing + scale setup for the workstation agent (scale + printer
// relay). Mirrors the R710 Agent panel's pairing UX (src/app/r710-portal/
// devices/[id]/agent/page.tsx) as closely as possible so admins learn one
// pairing workflow across device types. Printer connection-mode setup has
// no dedicated UI yet (see PATCH /api/admin/network-printers/[id]/
// connection-mode) — this page covers pairing + scale, the primary
// deliverable for this phase; printer setup is a fast-follow.

export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useState } from 'react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { ContentLayout } from '@/components/layout/content-layout'
import { useAlert } from '@/components/ui/confirm-modal'

const PAIRING_PORT = 47710

interface WorkstationAgent {
  id: string
  label: string
  agentVersion: string | null
  autoStartEnabled: boolean | null
  connectionStatus: 'ONLINE' | 'OFFLINE'
  lastConnectedAt: string | null
  lastSeenAt: string | null
  lastError: string | null
  createdAt: string
}

interface ActivityEntry {
  id: string
  jobType: string
  status: 'SUCCESS' | 'TIMEOUT' | 'AGENT_OFFLINE' | 'ERROR'
  requestedByName: string | null
  durationMs: number | null
  errorMessage: string | null
  createdAt: string
}

interface ScaleConfig {
  id: string
  workstationAgentId: string
  comPort: string | null
  baudRate: number | null
  workstation_agent: { id: string; label: string; connectionStatus: string }
}

export default function WorkstationAgentsPage() {
  const { currentBusinessId, isSystemAdmin, isBusinessOwner } = useBusinessPermissionsContext()
  const isAdmin = isSystemAdmin || isBusinessOwner
  const alert = useAlert()

  const [agents, setAgents] = useState<WorkstationAgent[]>([])
  const [scaleConfig, setScaleConfig] = useState<ScaleConfig | null>(null)
  const [loading, setLoading] = useState(true)

  const [pairLabel, setPairLabel] = useState('')
  const [pairing, setPairing] = useState(false)
  const [localAgentDetected, setLocalAgentDetected] = useState(false)
  const [togglingAutoStartId, setTogglingAutoStartId] = useState<string | null>(null)

  // Scale setup state
  const [selectedAgentId, setSelectedAgentId] = useState('')
  const [ports, setPorts] = useState<{ path: string; manufacturer: string | null }[]>([])
  const [listingPorts, setListingPorts] = useState(false)
  const [selectedPort, setSelectedPort] = useState('')
  const [baudRate, setBaudRate] = useState<number | ''>('')
  const [detectingBaud, setDetectingBaud] = useState(false)
  const [savingScale, setSavingScale] = useState(false)

  // Recent Activity (Phase 5)
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null)
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [loadingActivity, setLoadingActivity] = useState(false)

  const toggleActivity = async (agentId: string) => {
    if (expandedAgentId === agentId) {
      setExpandedAgentId(null)
      return
    }
    setExpandedAgentId(agentId)
    setLoadingActivity(true)
    try {
      const res = await fetch(`/api/admin/workstation-agents/${agentId}/activity`, { credentials: 'include' })
      const data = await res.json()
      setActivity(res.ok ? (data.data || []) : [])
    } finally {
      setLoadingActivity(false)
    }
  }

  const load = useCallback(async () => {
    if (!currentBusinessId) return
    try {
      setLoading(true)
      const [agentsRes, scaleRes] = await Promise.all([
        fetch(`/api/admin/workstation-agents?businessId=${currentBusinessId}`, { credentials: 'include' }),
        fetch(`/api/scale/device-config?businessId=${currentBusinessId}`, { credentials: 'include' }),
      ])
      if (agentsRes.ok) {
        const data = await agentsRes.json()
        setAgents(data.data || [])
      }
      if (scaleRes.ok) {
        const data = await scaleRes.json()
        setScaleConfig(data.config || null)
        if (data.config) {
          setSelectedAgentId(data.config.workstationAgentId)
          setSelectedPort(data.config.comPort || '')
          setBaudRate(data.config.baudRate || '')
        }
      }
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId])

  useEffect(() => { load() }, [load])

  // Probe the local agent on this browser's own machine — mirrors the R710
  // Agent panel's polling probe so the Pair button appears without a reload
  // once the admin has downloaded and started the agent.
  useEffect(() => {
    let cancelled = false
    const probe = () => {
      fetch(`http://127.0.0.1:${PAIRING_PORT}/probe?serverUrl=${encodeURIComponent(window.location.origin)}`, { signal: AbortSignal.timeout(2500) })
        .then(res => { if (!cancelled) setLocalAgentDetected(res.ok) })
        .catch(() => { if (!cancelled) setLocalAgentDetected(false) })
    }
    probe()
    const interval = setInterval(probe, 2000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  const handlePair = async () => {
    if (!currentBusinessId || !pairLabel.trim()) return
    setPairing(true)
    try {
      const mintRes = await fetch('/api/admin/workstation-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ businessId: currentBusinessId, label: pairLabel.trim() }),
      })
      const mintData = await mintRes.json()
      if (!mintRes.ok) {
        await alert({ title: '❌ Pairing Failed', description: mintData.error || 'Failed to mint an agent token' })
        return
      }

      const pairRes = await fetch(`http://127.0.0.1:${PAIRING_PORT}/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pairingType: 'workstation',
          serverUrl: window.location.origin,
          agentToken: mintData.data.agentToken,
          workstationAgentId: mintData.data.workstationAgentId,
          label: pairLabel.trim(),
          caCert: mintData.data.caCert ?? undefined,
        }),
      })

      if (!pairRes.ok) {
        await alert({ title: '❌ Pairing Failed', description: 'The local agent rejected the pairing request. Make sure it is running and unpaired.' })
        return
      }

      await alert({ title: '✅ Paired', description: 'This workstation is now paired. It may take a few seconds to show as connected.' })
      setPairLabel('')
      await load()
    } catch (error) {
      console.error('Pairing failed:', error)
      await alert({
        title: '❌ Pairing Failed',
        description: `Could not reach the local agent on this machine (http://127.0.0.1:${PAIRING_PORT}). Make sure it is installed and running, and that you opened this page from the workstation being paired.`,
      })
    } finally {
      setPairing(false)
    }
  }

  const handleRevoke = async (agentId: string) => {
    if (!confirm('Revoke this workstation? Anything relying on it (scale, printers) will stop working until re-paired.')) return
    const res = await fetch(`/api/admin/workstation-agents/${agentId}`, { method: 'DELETE', credentials: 'include' })
    if (res.ok) await load()
    else await alert({ title: 'Error', description: 'Failed to revoke workstation' })
  }

  const handleToggleAutoStart = async (agent: WorkstationAgent) => {
    const enabled = !agent.autoStartEnabled
    setTogglingAutoStartId(agent.id)
    try {
      const res = await fetch(`/api/admin/workstation-agents/${agent.id}/auto-start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enabled }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, autoStartEnabled: data.data?.autoStartEnabled ?? enabled } : a))
      } else {
        await alert({ title: '❌ Update Failed', description: data.error || 'Failed to update auto-start setting' })
      }
    } catch {
      await alert({ title: '❌ Update Failed', description: 'Unable to reach the server. Please try again.' })
    } finally {
      setTogglingAutoStartId(null)
    }
  }

  const handleListPorts = async () => {
    if (!selectedAgentId) return
    setListingPorts(true)
    try {
      const res = await fetch('/api/scale/list-ports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ workstationAgentId: selectedAgentId }),
      })
      const data = await res.json()
      if (!res.ok) {
        await alert({ title: 'Error', description: data.error || 'Failed to list ports' })
        return
      }
      setPorts(data.ports || [])
    } finally {
      setListingPorts(false)
    }
  }

  const handleDetectBaud = async () => {
    if (!selectedAgentId || !selectedPort) return
    setDetectingBaud(true)
    try {
      const res = await fetch('/api/scale/detect-baud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ workstationAgentId: selectedAgentId, comPort: selectedPort }),
      })
      const data = await res.json()
      if (!res.ok) {
        await alert({ title: 'Error', description: data.error || 'Failed to detect baud rate' })
        return
      }
      if (data.data?.baudRate) {
        setBaudRate(data.data.baudRate)
        await alert({ title: 'Detected', description: `Baud rate: ${data.data.baudRate}` })
      } else {
        await alert({ title: 'Not Detected', description: 'Could not auto-detect a baud rate. Check the cable and port.' })
      }
    } finally {
      setDetectingBaud(false)
    }
  }

  const handleSaveScale = async () => {
    if (!currentBusinessId || !selectedAgentId || !selectedPort) return
    setSavingScale(true)
    try {
      const res = await fetch('/api/scale/device-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          businessId: currentBusinessId,
          workstationAgentId: selectedAgentId,
          comPort: selectedPort,
          baudRate: baudRate || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        await alert({ title: 'Error', description: data.error || 'Failed to save scale config' })
        return
      }
      setScaleConfig(data.config)
      await alert({ title: 'Saved', description: 'Scale configuration saved.' })
    } finally {
      setSavingScale(false)
    }
  }

  if (!isAdmin) {
    return (
      <ContentLayout title="Workstation Agents">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <p className="text-red-800 dark:text-red-300">Only a system admin or this business's owner can manage workstation agents.</p>
        </div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout
      title="Workstation Agents"
      description="Pair a workstation so its locally-connected scale and printer can be reached by this centrally-hosted app (MBM-275)"
    >
      <div className="space-y-6">
        {/* Pairing */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">Pair This Workstation</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Open this page from the workstation you want to pair (the one with the scale/printer physically attached),
            with the local agent already downloaded and running.
          </p>
          <div className={`mb-4 text-sm px-3 py-2 rounded-md ${localAgentDetected ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300' : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
            {localAgentDetected ? '🟢 Local agent detected on this machine and waiting to be paired.' : '⚪ No local agent detected on this machine yet.'}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={pairLabel}
              onChange={(e) => setPairLabel(e.target.value)}
              placeholder="e.g. Front Desk PC — Bulawayo Branch"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={handlePair}
              disabled={!localAgentDetected || !pairLabel.trim() || pairing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {pairing ? 'Pairing…' : 'Pair this machine'}
            </button>
          </div>
        </div>

        {/* Paired agents list */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="font-medium text-gray-900 dark:text-white mb-4">Paired Workstations</h3>
          {loading ? (
            <p className="text-gray-500 dark:text-gray-400">Loading…</p>
          ) : agents.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No workstations paired yet.</p>
          ) : (
            <div className="space-y-2">
              {agents.map(agent => (
                <div key={agent.id} className="border border-gray-200 dark:border-gray-700 rounded-md">
                  <div className="flex items-center justify-between p-3">
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">{agent.label}</span>{' '}
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${agent.connectionStatus === 'ONLINE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {agent.connectionStatus === 'ONLINE' ? '🟢 Connected' : '🔴 Offline'}
                      </span>
                      {agent.agentVersion && <span className="ml-2 text-xs text-gray-500">v{agent.agentVersion}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleAutoStart(agent)}
                        disabled={togglingAutoStartId === agent.id}
                        title="Start this workstation's agent automatically when Windows signs in (applies to the whole agent, not just this pairing)"
                        className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
                      >
                        <span
                          role="switch"
                          aria-checked={!!agent.autoStartEnabled}
                          className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${agent.autoStartEnabled ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${agent.autoStartEnabled ? 'translate-x-4' : 'translate-x-1'}`} />
                        </span>
                        Start with Windows
                      </button>
                      <button onClick={() => toggleActivity(agent.id)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                        {expandedAgentId === agent.id ? 'Hide Activity' : 'Recent Activity'}
                      </button>
                      <button onClick={() => handleRevoke(agent.id)} className="text-sm text-red-600 hover:underline">Revoke</button>
                    </div>
                  </div>
                  {expandedAgentId === agent.id && (
                    <div className="border-t border-gray-200 dark:border-gray-700 p-3">
                      {loadingActivity ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400">Loading…</p>
                      ) : activity.length === 0 ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400">No activity recorded yet.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-xs">
                            <thead>
                              <tr className="text-left text-gray-500 dark:text-gray-400">
                                <th className="pr-4 py-1">Job</th>
                                <th className="pr-4 py-1">Status</th>
                                <th className="pr-4 py-1">By</th>
                                <th className="pr-4 py-1">Duration</th>
                                <th className="pr-4 py-1">When</th>
                                <th className="py-1">Error</th>
                              </tr>
                            </thead>
                            <tbody>
                              {activity.map(entry => (
                                <tr key={entry.id} className="border-t border-gray-100 dark:border-gray-800">
                                  <td className="pr-4 py-1 font-mono">{entry.jobType}</td>
                                  <td className="pr-4 py-1">
                                    <span className={
                                      entry.status === 'SUCCESS' ? 'text-green-600' :
                                      entry.status === 'AGENT_OFFLINE' ? 'text-orange-600' :
                                      entry.status === 'TIMEOUT' ? 'text-orange-600' : 'text-red-600'
                                    }>
                                      {entry.status}
                                    </span>
                                  </td>
                                  <td className="pr-4 py-1">{entry.requestedByName || '—'}</td>
                                  <td className="pr-4 py-1">{entry.durationMs != null ? `${entry.durationMs}ms` : '—'}</td>
                                  <td className="pr-4 py-1">{new Date(entry.createdAt).toLocaleString()}</td>
                                  <td className="py-1 text-red-500">{entry.errorMessage || ''}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scale setup */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="font-medium text-gray-900 dark:text-white mb-4">MG-S8200 Scale Setup</h3>
          {agents.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">Pair a workstation first.</p>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Workstation</label>
                <select
                  value={selectedAgentId}
                  onChange={(e) => { setSelectedAgentId(e.target.value); setPorts([]) }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select a workstation…</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              </div>

              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">COM Port</label>
                  <select
                    value={selectedPort}
                    onChange={(e) => setSelectedPort(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select…</option>
                    {ports.map(p => <option key={p.path} value={p.path}>{p.path}{p.manufacturer ? ` (${p.manufacturer})` : ''}</option>)}
                    {selectedPort && !ports.some(p => p.path === selectedPort) && <option value={selectedPort}>{selectedPort}</option>}
                  </select>
                </div>
                <button onClick={handleListPorts} disabled={!selectedAgentId || listingPorts} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
                  {listingPorts ? 'Listing…' : 'List Ports'}
                </button>
              </div>

              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Baud Rate</label>
                  <input
                    type="number"
                    value={baudRate}
                    onChange={(e) => setBaudRate(e.target.value ? parseInt(e.target.value) : '')}
                    placeholder="Leave blank to auto-detect on connect"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <button onClick={handleDetectBaud} disabled={!selectedAgentId || !selectedPort || detectingBaud} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
                  {detectingBaud ? 'Detecting…' : 'Detect Baud'}
                </button>
              </div>

              <button
                onClick={handleSaveScale}
                disabled={!selectedAgentId || !selectedPort || savingScale}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {savingScale ? 'Saving…' : 'Save Scale Configuration'}
              </button>

              {scaleConfig && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Currently active: {scaleConfig.comPort} on "{scaleConfig.workstation_agent.label}"
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </ContentLayout>
  )
}
