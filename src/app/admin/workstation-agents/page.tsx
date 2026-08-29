'use client'

// MBM-275: pairing + scale setup for the workstation agent (scale + printer
// relay). Mirrors the R710 Agent panel's pairing UX (src/app/r710-portal/
// devices/[id]/agent/page.tsx) as closely as possible so admins learn one
// pairing workflow across device types.
//
// One pairing here covers BOTH capabilities a workstation can offer — its
// physically-attached scale (configured right on this page) and any local
// receipt printer (registered + routed on two other admin pages, since
// printers are a shared, cross-business resource — see the Receipt Printer
// Setup card below, which links there directly rather than requiring the
// admin to already know those pages exist).

export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useScale } from '@/contexts/ScaleContext'
import { ContentLayout } from '@/components/layout/content-layout'
import { useAlert } from '@/components/ui/confirm-modal'
import { formatPrinterName } from '@/lib/printing/format-printer-label'

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
  // What's actually configured for this workstation right now — a direct
  // database read (see printer-status.ts), not anything that needs a live
  // agent connection, so this is accurate even while the agent is offline.
  configuredPrinters: string[]
  qzPrinterName?: string
}

// This workstation's own AGENT-mode printer — declared and edited right on
// its own row below, replacing the old separate "Printer Connection Mode"
// admin page for this exact job (see route.ts's header comment for why).
interface AgentPrinter {
  id: string
  printerName: string
  // Two independent flags — see route.ts's header comment. remotePrintingEnabled
  // = this workstation's printer receives jobs relayed from the centralized
  // server at all (the original MBM-275 behavior). remoteEnabled = "share
  // this printer," whether OTHER devices can also route to it; only
  // meaningful (and only ever true) while remotePrintingEnabled is also true.
  remotePrintingEnabled: boolean
  remoteEnabled: boolean
  qzOverlap: boolean
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

// MBM-277: live scale test for the currently active business — reuses
// ScaleContext exactly as-is (already resolves the scale via
// /api/scale/device-config?businessId=<currentBusinessId>, so this is
// automatically scoped to whichever business this page is open for, with no
// new wiring). A reading here shows up in WorkstationAgentRequestLog like any
// other SCALE_CONNECT/SCALE_TARE job, so it's diagnosable the same way
// without a separate logging path.
function TestScalePanel() {
  const { weight, status, isAvailable, isConfigured, tare, reconnect } = useScale()
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [taring, setTaring] = useState(false)

  useEffect(() => {
    setLastUpdatedAt(new Date())
  }, [weight, status])

  const handleTare = async () => {
    setTaring(true)
    try {
      await tare()
    } finally {
      setTaring(false)
    }
  }

  const statusLabel: Record<typeof status.status, string> = {
    connected: '🟢 Connected',
    connecting: '🟡 Connecting…',
    disconnected: '⚪ Disconnected',
    error: '🔴 Error',
  }

  if (!isConfigured) {
    return (
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        Save a scale configuration above, then this panel will let you test a live reading.
      </p>
    )
  }

  return (
    <div className="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Test Scale (this business)</p>
      <div className="bg-gray-50 dark:bg-gray-900/40 rounded-md p-4 space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-mono font-semibold text-gray-900 dark:text-white">
            {weight ? `${weight.weight.toFixed(3)} ${weight.unit}` : '—'}
          </span>
          <span className="text-sm">{statusLabel[status.status]}</span>
        </div>
        {weight && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {weight.stable ? 'Stable' : 'Settling…'}
            {weight.overload ? ' · Overload' : ''}
            {weight.error ? ' · Reading error' : ''}
          </p>
        )}
        {status.error && (
          <p className="text-xs text-red-600 dark:text-red-400">⚠️ {status.error}</p>
        )}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {lastUpdatedAt ? `Last updated ${lastUpdatedAt.toLocaleTimeString()}` : 'Waiting for a reading…'}
          </span>
          <div className="flex items-center gap-2">
            {status.status !== 'connected' && (
              <button
                onClick={reconnect}
                disabled={status.status === 'connecting'}
                title="Re-attempt the connection — useful if the workstation agent had a brief disconnect and hasn't been retried since this page loaded"
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                {status.status === 'connecting' ? 'Connecting…' : 'Retry'}
              </button>
            )}
            <button
              onClick={handleTare}
              disabled={!isAvailable || status.status !== 'connected' || taring}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              {taring ? 'Taring…' : 'Tare'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function WorkstationAgentsPage() {
  const { currentBusinessId, currentBusiness, isSystemAdmin, isBusinessOwner } = useBusinessPermissionsContext()
  const isAdmin = isSystemAdmin || isBusinessOwner
  const alert = useAlert()

  // MG-S8200 scale support only applies to grocery/restaurant — mirrors
  // POSSettingsHub.tsx's identical hasScale check. Printer relay has no such
  // restriction; every business type can register a receipt printer.
  // Enforced server-side too (POST /api/scale/device-config), not just
  // hidden here — this only controls what the UI offers.
  const hasScale = currentBusiness?.businessType === 'grocery' || currentBusiness?.businessType === 'restaurant'

  const [agents, setAgents] = useState<WorkstationAgent[]>([])
  const [scaleConfig, setScaleConfig] = useState<ScaleConfig | null>(null)
  const [loading, setLoading] = useState(true)
  // MBM-281: current agent build's version (agent/r710-local-agent/package.json,
  // read server-side) — compared against each paired agent's own reported
  // version to flag ones that haven't been rebuilt/redistributed since the
  // server last shipped a protocol change. Same source R710's Agent panel
  // already uses; ported here since this page previously had no equivalent
  // signal at all despite tracking `lastError` in its own agent shape.
  const [latestAgentVersion, setLatestAgentVersion] = useState<string | null>(null)

  const [pairLabel, setPairLabel] = useState('')
  const [pairing, setPairing] = useState(false)
  const [localAgentDetected, setLocalAgentDetected] = useState(false)
  // Populated from the agent's own /probe response when this exact machine
  // already has a workstation pairing to this exact server — lets the pair
  // flow detect and skip creating a redundant second WorkstationAgents row
  // for a machine that's already paired here. MBM-279: /probe is now scoped
  // by businessId (see the probe effect below), so this can only ever be
  // THIS business's own pairing — a workstation pairing that belongs to a
  // DIFFERENT business on this same machine is no longer surfaced here (and
  // is expected: the agent now supports several businesses per machine,
  // switching which one is active rather than evicting the others).
  const [existingWorkstationAgentId, setExistingWorkstationAgentId] = useState<string | undefined>(undefined)
  const [existingProfileLabel, setExistingProfileLabel] = useState<string | undefined>(undefined)
  // True when this machine already has an R710 pairing to this exact
  // server but no workstation pairing yet — the common "same machine,
  // second capability" case (e.g. a machine already relaying R710 that now
  // also needs its printer/scale paired). Drives pre-filling the label
  // field with the existing profile's own name and a shortcut message,
  // instead of treating this like a completely unknown machine.
  const [hasExistingR710Only, setHasExistingR710Only] = useState(false)
  const existingAgentInThisBusiness = agents.find(a => a.id === existingWorkstationAgentId)
  const [togglingAutoStartId, setTogglingAutoStartId] = useState<string | null>(null)

  // This workstation's own printer — keyed by workstationAgentId. Fetched
  // per paired agent (GET .../[id]/printer); null once loaded means "not
  // set up yet," not "still loading" (see agentPrintersLoaded).
  const [agentPrinters, setAgentPrinters] = useState<Record<string, AgentPrinter | null>>({})
  const [editingPrinterFor, setEditingPrinterFor] = useState<string | null>(null)
  const [draftPrinterName, setDraftPrinterName] = useState('')
  const [draftRemotePrintingEnabled, setDraftRemotePrintingEnabled] = useState(true)
  const [draftRemoteEnabled, setDraftRemoteEnabled] = useState(false)
  const [remotePrinterOptions, setRemotePrinterOptions] = useState<{ name: string }[]>([])
  const [listingRemotePrinters, setListingRemotePrinters] = useState(false)
  const [savingPrinterFor, setSavingPrinterFor] = useState<string | null>(null)

  // Restored per-workstation default override: lets several workstations in
  // this business each default to a *different* remote printer (e.g.
  // workstation C always prints through workstation D's shared printer),
  // independent of both a workstation's own declared printer and the
  // business-wide default. businessPrinters is every printer currently
  // available to this business (shared AGENT ones + DIRECT ones) — the
  // exact same pool the receipt-preview picker offers.
  const [businessPrinters, setBusinessPrinters] = useState<{ id: string; printerName: string; isOnline: boolean; workstationLabel?: string | null; workstationHostname?: string | null }[]>([])
  const [workstationOverrides, setWorkstationOverrides] = useState<Record<string, string>>({})
  const [savingOverrideFor, setSavingOverrideFor] = useState<string | null>(null)

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

      let loadedAgents: WorkstationAgent[] = []
      if (agentsRes.ok) {
        const data = await agentsRes.json()
        loadedAgents = data.data || []
        setAgents(loadedAgents)
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

      // Each paired workstation's own printer, if it's declared one, and its
      // default-printer override, if an admin set one — no bulk endpoint
      // exists for either; N small requests is fine here since a business
      // rarely has more than a handful of workstations.
      if (loadedAgents.length > 0) {
        const [printerResults, overrideResults, businessPrintersRes] = await Promise.all([
          Promise.all(
            loadedAgents.map(a =>
              fetch(`/api/admin/workstation-agents/${a.id}/printer`, { credentials: 'include' })
                .then(r => r.ok ? r.json() : null)
                .catch(() => null)
            )
          ),
          Promise.all(
            loadedAgents.map(a =>
              fetch(`/api/printing/default-printer?businessId=${currentBusinessId}&workstationAgentId=${a.id}&strict=true`, { credentials: 'include' })
                .then(r => r.ok ? r.json() : null)
                .catch(() => null)
            )
          ),
          fetch(`/api/printers?businessId=${currentBusinessId}&printerType=receipt`, { credentials: 'include' }),
        ])
        const printers: Record<string, AgentPrinter | null> = {}
        loadedAgents.forEach((a, i) => { printers[a.id] = printerResults[i]?.printer ?? null })
        setAgentPrinters(printers)

        const overrides: Record<string, string> = {}
        loadedAgents.forEach((a, i) => { if (overrideResults[i]?.printerId) overrides[a.id] = overrideResults[i].printerId })
        setWorkstationOverrides(overrides)

        if (businessPrintersRes.ok) {
          const data = await businessPrintersRes.json()
          setBusinessPrinters(data.printers || [])
        }
      }
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId])

  // Refreshes just the connection-status badges — not the full load() (which
  // would reset the scale form's selected port/baud while someone might be
  // mid-edit, and flips the page-wide loading spinner). The server now
  // checks the agent hub's live in-memory state on every call (see
  // GET /api/admin/workstation-agents), not just the DB's last-known value,
  // so this is what actually keeps "Connected" honest after the underlying
  // socket drops without a clean disconnect — otherwise a stale ONLINE
  // status could sit there indefinitely until a manual reload.
  const refreshAgentStatus = useCallback(async () => {
    if (!currentBusinessId) return
    const res = await fetch(`/api/admin/workstation-agents?businessId=${currentBusinessId}`, { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      setAgents(data.data || [])
    }
  }, [currentBusinessId])

  useEffect(() => {
    if (!currentBusinessId) return
    const interval = setInterval(refreshAgentStatus, 10000)
    return () => clearInterval(interval)
  }, [currentBusinessId, refreshAgentStatus])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetch('/api/admin/r710/agents/latest-version', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.data?.version) setLatestAgentVersion(data.data.version) })
      .catch(() => { /* non-critical — banner just won't show */ })
  }, [])

  // Probe the local agent on this browser's own machine — mirrors the R710
  // Agent panel's polling probe so the Pair button appears without a reload
  // once the admin has downloaded and started the agent.
  //
  // MBM-279: businessId is now required for the workstation-specific answer
  // (hasWorkstation/workstationAgentId are scoped per business, since one
  // profile can hold pairings for several — see pairing-server.ts's /probe).
  // Skipped entirely until currentBusinessId is known.
  useEffect(() => {
    if (!currentBusinessId) return
    let cancelled = false
    const probe = () => {
      fetch(`http://127.0.0.1:${PAIRING_PORT}/probe?serverUrl=${encodeURIComponent(window.location.origin)}&businessId=${encodeURIComponent(currentBusinessId)}`, { signal: AbortSignal.timeout(2500) })
        .then(async res => {
          if (cancelled) return
          setLocalAgentDetected(res.ok)
          if (!res.ok) { setExistingWorkstationAgentId(undefined); setHasExistingR710Only(false); return }
          const data = await res.json().catch(() => null)
          if (data?.profile?.hasWorkstation) {
            setExistingWorkstationAgentId(data.profile.workstationAgentId)
            setExistingProfileLabel(data.profile.label)
            setHasExistingR710Only(false)
          } else if (data?.profile?.hasR710) {
            // This machine is already known to this server — just not for
            // printer/scale yet. Pre-fill (never overwrite something
            // already typed) rather than leaving the field blank as if
            // this were a totally unfamiliar machine.
            setExistingWorkstationAgentId(undefined)
            setExistingProfileLabel(data.profile.label)
            setHasExistingR710Only(true)
            if (data.profile.label) setPairLabel(prev => prev || data.profile.label)
          } else {
            setExistingWorkstationAgentId(undefined)
            setHasExistingR710Only(false)
          }
        })
        .catch(() => { if (!cancelled) { setLocalAgentDetected(false); setExistingWorkstationAgentId(undefined); setHasExistingR710Only(false) } })
    }
    probe()
    const interval = setInterval(probe, 2000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [currentBusinessId])

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
          businessId: currentBusinessId,
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

  const startPrinterEdit = (agentId: string) => {
    const current = agentPrinters[agentId]
    setEditingPrinterFor(agentId)
    setDraftPrinterName(current?.printerName || '')
    setDraftRemotePrintingEnabled(current?.remotePrintingEnabled ?? true)
    setDraftRemoteEnabled(current?.remoteEnabled ?? false)
    setRemotePrinterOptions([])
  }

  const cancelPrinterEdit = () => {
    setEditingPrinterFor(null)
    setRemotePrinterOptions([])
  }

  const handleListRemotePrinters = async (agentId: string) => {
    setListingRemotePrinters(true)
    try {
      const res = await fetch('/api/print/list-printers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ workstationAgentId: agentId }),
      })
      const data = await res.json()
      if (!res.ok) {
        await alert({ title: 'Error', description: data.error || 'Failed to list printers on that workstation' })
        return
      }
      setRemotePrinterOptions(data.printers || [])
    } finally {
      setListingRemotePrinters(false)
    }
  }

  const handleSavePrinter = async (agentId: string) => {
    if (!draftPrinterName.trim()) return
    setSavingPrinterFor(agentId)
    try {
      const res = await fetch(`/api/admin/workstation-agents/${agentId}/printer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ printerName: draftPrinterName.trim(), remotePrintingEnabled: draftRemotePrintingEnabled, remoteEnabled: draftRemoteEnabled }),
      })
      const data = await res.json()
      if (!res.ok) {
        await alert({ title: 'Error', description: data.error || 'Failed to save printer' })
        return
      }
      setAgentPrinters(prev => ({ ...prev, [agentId]: { ...data.printer, qzOverlap: agentPrinters[agentId]?.qzOverlap ?? false } }))
      setEditingPrinterFor(null)
    } finally {
      setSavingPrinterFor(null)
    }
  }

  const handleSaveOverride = async (agentId: string, printerId: string) => {
    if (!currentBusinessId) return
    setSavingOverrideFor(agentId)
    try {
      if (!printerId) {
        await fetch(`/api/printing/default-printer?businessId=${currentBusinessId}&workstationAgentId=${agentId}`, {
          method: 'DELETE',
          credentials: 'include',
        })
        setWorkstationOverrides(prev => { const next = { ...prev }; delete next[agentId]; return next })
        return
      }
      const res = await fetch('/api/printing/default-printer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ businessId: currentBusinessId, workstationAgentId: agentId, printerId }),
      })
      const data = await res.json()
      if (!res.ok) {
        await alert({ title: 'Error', description: data.error || 'Failed to save default printer' })
        return
      }
      setWorkstationOverrides(prev => ({ ...prev, [agentId]: data.printerId }))
    } finally {
      setSavingOverrideFor(null)
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
      description="Pair a workstation once, then use that single pairing for BOTH its locally-connected scale and its receipt printer (MBM-275)"
    >
      {isSystemAdmin && (
        <Link href="/admin/network-printers" className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4">
          Default Printer (set the business-wide fallback) →
        </Link>
      )}
      <div className="space-y-6">
        {/* MBM-281 follow-up: same page-top, unmissable treatment for the two
            more basic "there's no working agent at all" cases — previously
            only a version *mismatch* got a banner, so a workstation that had
            never been paired, or whose agent was stopped/uninstalled ahead of
            a redeploy, gave no page-top signal at all despite being the more
            fundamental problem (found live: a freshly-redeployed workstation
            with the agent not yet reinstalled looked identical to "nothing
            wrong" until you scrolled down). Mutually exclusive with each
            other (the offline check only runs once at least one workstation
            is paired) but either can co-occur with the version banner below. */}
        {!loading && agents.length === 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-4">
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">
              ⚠️ No workstation agent paired for this business yet
            </p>
            <p className="text-sm text-red-700 dark:text-red-400 mt-1">
              {hasScale ? 'The scale and receipt printer' : 'The receipt printer'} on this workstation won't work
              until the local agent is downloaded, running, and paired below.
            </p>
            <p className="text-sm text-red-700 dark:text-red-400 mt-2">
              <a href="/api/admin/r710/agents/download" className="underline font-medium hover:no-underline">Download the latest r710-agent.zip →</a>{' '}
              then run <code className="text-xs bg-red-100 dark:bg-red-900/40 px-1 rounded">r710-agent.exe</code> on this workstation and pair it below.
            </p>
            <p className="text-sm text-red-700 dark:text-red-400 mt-2">
              Only relevant if THIS workstation has a {hasScale ? 'scale or printer' : 'printer'} physically attached. A device with none of its own — one
              that'll only ever print through some other workstation's shared printer — doesn't need any of this; use{' '}
              <Link href="/admin/print-terminals" className="underline font-medium">Print Terminals</Link> instead.
            </p>
          </div>
        )}

        {!loading && agents.length > 0 && agents.some(a => a.connectionStatus === 'OFFLINE') && (
          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-4">
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">
              ⚠️ Agent not running
            </p>
            <p className="text-sm text-red-700 dark:text-red-400 mt-1">
              {agents.filter(a => a.connectionStatus === 'OFFLINE').map(a => `"${a.label}"`).join(', ')}{' '}
              {agents.filter(a => a.connectionStatus === 'OFFLINE').length === 1 ? 'is' : 'are'} paired but currently
              offline — its scale/printer won't work until <code className="text-xs bg-red-100 dark:bg-red-900/40 px-1 rounded">r710-agent.exe</code> is
              running again on that workstation (it may just need reinstalling after a redeploy, or restarting if it was closed).
            </p>
          </div>
        )}

        {/* MBM-281: page-top, unmissable — any paired workstation whose agent
            hasn't been rebuilt/redistributed since the server last shipped a
            protocol change (e.g. the MBM-279 business-switching work) can
            silently fail to support newer features (like /activate) with no
            visible error at all, which is worse than a loud one. Shown above
            everything else on the page, not just as a per-row detail. */}
        {latestAgentVersion && agents.some(a => a.agentVersion && a.agentVersion !== latestAgentVersion) && (
          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-4">
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">
              ⚠️ Agent update required
            </p>
            <p className="text-sm text-red-700 dark:text-red-400 mt-1">
              {agents.filter(a => a.agentVersion && a.agentVersion !== latestAgentVersion).map(a => `"${a.label}"`).join(', ')}{' '}
              {agents.filter(a => a.agentVersion && a.agentVersion !== latestAgentVersion).length === 1 ? 'is' : 'are'} running an older agent build than this server now expects.
              Business switching, printer routing, and other recent features may silently not work until it's updated — the connection itself won't necessarily show as broken.
            </p>
            <p className="text-sm text-red-700 dark:text-red-400 mt-2">
              <a href="/api/admin/r710/agents/download" className="underline font-medium hover:no-underline">Download the latest r710-agent.zip →</a>{' '}
              then on that workstation: run <code className="text-xs bg-red-100 dark:bg-red-900/40 px-1 rounded">Stop R710 Agent.bat</code>, extract the new download, and run the new <code className="text-xs bg-red-100 dark:bg-red-900/40 px-1 rounded">r710-agent.exe</code>. Existing pairings stay intact — no need to re-pair.
            </p>
          </div>
        )}

        {/* Pairing */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">Pair This Workstation</h3>
          <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 mb-3">
            ⚠️ <strong>Does this workstation have {hasScale ? 'no scale or printer' : 'no printer'} of its own</strong> — it'll only ever print through some
            OTHER workstation's shared printer? You don't need any of this. Skip pairing entirely and use{' '}
            <Link href="/admin/print-terminals" className="underline font-medium">Print Terminals</Link> instead — register the device in one click
            (Settings → POS Settings → Printer Preferences → This Device), no agent, no download, then assign its default printer from anywhere.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Pairing below is only for a workstation that has a {hasScale ? 'scale and/or printer' : 'printer'} physically attached to it.
            Open this page from that workstation.
            {' '}<a href="/api/admin/r710/agents/download" className="text-blue-600 dark:text-blue-400 hover:underline">Download r710-agent.zip</a>{' '}
            (same agent used for R710) and run it there first if it isn't already running.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {hasScale ? (
              <>⚖️ 🖨️ <strong>One pairing covers both</strong> — you don't pair separately for the scale and the printer. Pair once here, then configure whichever of the two this workstation actually has: scale setup is right below, printer setup is one click away in the card underneath it.</>
            ) : (
              <>🖨️ This pairing is used for the <strong>receipt printer</strong> — set up is one click away in the card below. (MG-S8200 scale support isn't available for this business type.)</>
            )}
          </p>
          {localAgentDetected && existingAgentInThisBusiness ? (
            // This exact machine already has a workstation pairing, and it's
            // already part of THIS business's paired list — nothing to do.
            // Pairing again here would just create a redundant, disconnected
            // second row for the same physical machine (previously the only
            // outcome, unconditionally, on every click).
            <div className="mb-4 text-sm px-3 py-2 rounded-md bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300">
              ✅ This machine is already paired here as <strong>"{existingAgentInThisBusiness.label}"</strong> — see it in Paired Workstations below. No need to pair again.
            </div>
          ) : localAgentDetected ? (
            <>
              {hasExistingR710Only ? (
                // This exact machine is already paired to this server for
                // R710, just not for printer/scale yet — no need to make
                // this feel like a brand new, unfamiliar machine. The label
                // below is pre-filled from the R710 pairing's own name.
                <div className="mb-4 text-sm px-3 py-2 rounded-md bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300">
                  ✅ This machine is already connected to this server as <strong>"{existingProfileLabel}"</strong> (R710). Add the printer/scale to that same connection below.
                </div>
              ) : (
                <div className="mb-4 text-sm px-3 py-2 rounded-md bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300">
                  🟢 Local agent detected on this machine and waiting to be paired.
                </div>
              )}
            </>
          ) : (
            <p className="mb-4 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3">
              🔴 No local agent detected on this machine yet — the label field and <strong>Pair this machine</strong> button below stay disabled until it is.
              Download and run <code className="text-xs bg-amber-100 dark:bg-amber-900/40 px-1 rounded">r710-agent.exe</code> (link above) if you haven't already.
              This page checks automatically every couple of seconds — <strong>no need to reload</strong> once the agent is running; the button will activate on its own.
              <br />
              <span className="block mt-2">
                Already running it? A browser can't tell this page apart from "nothing's there" when something else is quietly
                blocking the connection —{' '}
                <a href={`http://127.0.0.1:${PAIRING_PORT}/probe?serverUrl=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')}&businessId=${encodeURIComponent(currentBusinessId || '')}`} target="_blank" rel="noopener noreferrer" className="underline font-medium hover:no-underline">
                  test the local connection directly →
                </a>{' '}
                If that opens fine but this still won't detect, try this page in an <strong>Incognito/Private window</strong> — if it works
                there, an ad-blocker or privacy extension on this browser's normal profile is blocking it (check{' '}
                <code className="text-xs bg-amber-100 dark:bg-amber-900/40 px-1 rounded">chrome://extensions</code>).
              </span>
            </p>
          )}
          {!existingAgentInThisBusiness && (
          <div className={`flex gap-2 ${!localAgentDetected ? 'opacity-50' : ''}`}>
            <input
              type="text"
              value={pairLabel}
              onChange={(e) => setPairLabel(e.target.value)}
              disabled={!localAgentDetected}
              placeholder="e.g. Front Desk PC — Bulawayo Branch"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white disabled:cursor-not-allowed"
            />
            <button
              onClick={handlePair}
              disabled={!localAgentDetected || !pairLabel.trim() || pairing}
              title={!localAgentDetected ? 'Waiting for the local agent to be detected on this machine' : undefined}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
            >
              {pairing ? 'Pairing…' : localAgentDetected ? 'Pair this machine' : 'Waiting for agent…'}
            </button>
          </div>
          )}
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
              {agents.map(agent => {
                const isOutdated = !!(latestAgentVersion && agent.agentVersion && agent.agentVersion !== latestAgentVersion)
                return (
                <div key={agent.id} className="border border-gray-200 dark:border-gray-700 rounded-md">
                  <div className="flex items-center justify-between p-3">
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">{agent.label}</span>{' '}
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${agent.connectionStatus === 'ONLINE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {agent.connectionStatus === 'ONLINE' ? '🟢 Connected' : '🔴 Offline'}
                      </span>
                      {agent.agentVersion && (
                        <span className={`ml-2 text-xs ${isOutdated ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-500'}`}>
                          v{agent.agentVersion}{isOutdated && ' — update required'}
                        </span>
                      )}
                      {agent.lastError && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{agent.lastError}</p>
                      )}
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
                  {/* This workstation's own printer — the physical printer
                      attached HERE, declared once and edited right on this
                      row. Two independent flags:
                       - Remote printing (connectionMode AGENT/DIRECT): does
                         the centralized server relay jobs to it through
                         this workstation's agent at all? The original
                         MBM-275 behavior.
                       - Share this printer (remoteEnabled): can OTHER
                         devices/workstations in the business also route to
                         it, on top of remote printing being on? Meaningless
                         — and disabled — while remote printing is off. */}
                  <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2">
                    {editingPrinterFor === agent.id ? (
                      <div className="space-y-2">
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Printer name (as installed on this workstation)</label>
                            <select
                              value={draftPrinterName}
                              onChange={(e) => setDraftPrinterName(e.target.value)}
                              className="w-full text-xs px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                            >
                              {remotePrinterOptions.length === 0 && draftPrinterName && <option value={draftPrinterName}>{draftPrinterName}</option>}
                              {remotePrinterOptions.length === 0 && !draftPrinterName && <option value="">Select…</option>}
                              {remotePrinterOptions.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                            </select>
                          </div>
                          <button
                            onClick={() => handleListRemotePrinters(agent.id)}
                            disabled={listingRemotePrinters}
                            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-xs hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                          >
                            {listingRemotePrinters ? 'Listing…' : 'List Printers'}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Click "List Printers" to pull the actual printer names Windows sees on this workstation — the agent must be online.
                        </p>
                        <label className="flex items-start gap-2 text-xs bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-2">
                          <input
                            type="checkbox"
                            checked={draftRemotePrintingEnabled}
                            onChange={(e) => {
                              setDraftRemotePrintingEnabled(e.target.checked)
                              if (!e.target.checked) setDraftRemoteEnabled(false)
                            }}
                            className="mt-0.5"
                          />
                          <span>
                            <span className="font-medium text-gray-900 dark:text-white">🔌 Enable remote printing</span>
                            <br />
                            Lets the centralized server relay print jobs to this printer through this workstation's agent. Off = this
                            printer is set up but not currently reachable from the server (paused, not deleted).
                          </span>
                        </label>
                        <label className={`flex items-start gap-2 text-xs border rounded-md p-2 ${draftRemotePrintingEnabled ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700 opacity-60'}`}>
                          <input
                            type="checkbox"
                            checked={draftRemoteEnabled}
                            disabled={!draftRemotePrintingEnabled}
                            onChange={(e) => setDraftRemoteEnabled(e.target.checked)}
                            className="mt-0.5"
                          />
                          <span>
                            <span className="font-medium text-gray-900 dark:text-white">🔗 Share this printer</span>
                            <br />
                            {draftRemotePrintingEnabled
                              ? <>While off, only this workstation can print to it. Turn on to let other devices/workstations in this business use it too (e.g. as their default, or picked on the fly).</>
                              : <>Requires remote printing to be on — there's no relay for another device to reach otherwise.</>}
                          </span>
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSavePrinter(agent.id)}
                            disabled={!draftPrinterName.trim() || savingPrinterFor === agent.id}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-md text-xs hover:bg-green-700 disabled:opacity-50"
                          >
                            {savingPrinterFor === agent.id ? 'Saving…' : 'Save'}
                          </button>
                          <button onClick={cancelPrinterEdit} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-xs hover:bg-gray-50 dark:hover:bg-gray-700">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : agentPrinters[agent.id] ? (
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          <span className="font-medium text-gray-900 dark:text-white">🖨️ {agentPrinters[agent.id]!.printerName}</span>
                          <span className={`ml-2 px-1.5 py-0.5 rounded-full font-medium ${agentPrinters[agent.id]!.remotePrintingEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                            {agentPrinters[agent.id]!.remotePrintingEnabled ? '🔌 Remote printing on' : '⏸️ Remote printing off'}
                          </span>
                          {agentPrinters[agent.id]!.remotePrintingEnabled && (
                            <span className={`ml-2 px-1.5 py-0.5 rounded-full font-medium ${agentPrinters[agent.id]!.remoteEnabled ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>
                              {agentPrinters[agent.id]!.remoteEnabled ? '🔗 Shared' : 'This workstation only'}
                            </span>
                          )}
                          {agentPrinters[agent.id]!.qzOverlap && (
                            <span
                              className="ml-2 px-1.5 py-0.5 rounded-full font-medium bg-amber-100 text-amber-800"
                              title="This exact printer name is also saved as a QZ Tray printer on this same workstation (Profile → Printer Setup). Not unsafe — both paths go through the real Windows print spooler — just avoid setting both up unless you actually want this printer usable both ways."
                            >
                              ⚠️ Also set up for QZ Tray
                            </span>
                          )}
                        </div>
                        <button onClick={() => startPrinterEdit(agent.id)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex-shrink-0">Edit</button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">No printer set up for this workstation yet.</span>
                        <button onClick={() => startPrinterEdit(agent.id)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex-shrink-0">Set up printer</button>
                      </div>
                    )}
                  </div>
                  {/* Restored per-workstation default override — separate
                      from "This workstation's own printer" above (that
                      declares hardware physically attached HERE; this picks
                      which printer THIS workstation should print through by
                      default, which can be a completely different
                      workstation's shared printer). Lets several
                      workstations in one business each default to a
                      different remote printer instead of one shared
                      business-wide value. */}
                  {businessPrinters.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2 flex items-center gap-2">
                      <label className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">Default printer for this workstation:</label>
                      <select
                        value={workstationOverrides[agent.id] || ''}
                        onChange={(e) => handleSaveOverride(agent.id, e.target.value)}
                        disabled={savingOverrideFor === agent.id}
                        className="flex-1 text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white disabled:opacity-50"
                      >
                        <option value="">No override — use its own printer, then the business default</option>
                        {businessPrinters.map(p => (
                          <option key={p.id} value={p.id}>{formatPrinterName(p)}{p.isOnline ? '' : ' (offline)'}</option>
                        ))}
                      </select>
                      {savingOverrideFor === agent.id && <span className="text-xs text-gray-400 flex-shrink-0">Saving…</span>}
                    </div>
                  )}
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
              )})}
            </div>
          )}
        </div>

        {/* Scale setup — grocery/restaurant only, see hasScale's comment above */}
        {hasScale && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="font-medium text-gray-900 dark:text-white mb-4">⚖️ MG-S8200 Scale Setup</h3>
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
                <>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Currently active: {scaleConfig.comPort} on "{scaleConfig.workstation_agent.label}"
                  </p>
                  <TestScalePanel />
                </>
              )}
            </div>
          )}
        </div>
        )}

        {/* Printer setup — two separate admin pages, linked directly here so this
            page is a complete starting point for both capabilities, not just the
            scale. Registering a printer (any user) and routing it through a
            paired workstation (system admin only, since printers are a shared,
            cross-business resource — not gated per-business like the scale) are
            deliberately separate steps/pages; this card exists purely to make
            both reachable without already knowing they exist. */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">🖨️ Receipt Printer Setup</h3>
          {agents.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">Pair a workstation first.</p>
          ) : (
            <div className="space-y-4">
              {agents.some(a => a.configuredPrinters.length > 0 || a.qzPrinterName) && (
                // Current-state summary — shown first and unconditionally
                // whenever anything is actually set up, so an admin never
                // has to guess "is this already done?" from setup
                // instructions alone. Both print paths are genuinely
                // independent (see the tray's own explanation) — a
                // workstation can have either, both, or neither.
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Current configuration for this business:</p>
                  {agents.map(agent => {
                    const hasRelay = agent.configuredPrinters.length > 0
                    const hasQz = !!agent.qzPrinterName
                    if (!hasRelay && !hasQz) return null
                    return (
                      <div key={agent.id} className="text-sm bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3">
                        <p className="font-medium text-green-800 dark:text-green-300 mb-1">✅ {agent.label}</p>
                        {hasRelay && (
                          <p className="text-green-700 dark:text-green-400">
                            Agent-relayed: <strong>{agent.configuredPrinters.join(', ')}</strong> (server → this workstation)
                          </p>
                        )}
                        {hasQz && (
                          <p className="text-green-700 dark:text-green-400">
                            QZ Tray (this machine's browser): <strong>{agent.qzPrinterName}</strong>
                          </p>
                        )}
                      </div>
                    )
                  })}
                  {agents.some(a => a.configuredPrinters.length === 0 && !a.qzPrinterName) && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Not yet configured: {agents.filter(a => a.configuredPrinters.length === 0 && !a.qzPrinterName).map(a => `"${a.label}"`).join(', ')}
                    </p>
                  )}
                </div>
              )}

              <p className="text-sm text-gray-600 dark:text-gray-400">
                Each paired workstation's own printer is declared right on its row above — click <strong>"Set up printer"</strong> or <strong>"Edit"</strong> there.
                <strong>"Enable remote printing"</strong> is what makes it reachable from this centralized server at all. <strong>"Share this printer"</strong> is
                a separate, additional choice — it makes it available for other devices in this business to use too, via the picker in Settings → POS Settings →
                Printer Preferences (or their own workstation/print-terminal default).
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Prefer QZ Tray instead? That's set up separately, per browser/machine, at{' '}
                <Link href="/admin/printers" className="text-blue-600 dark:text-blue-400 hover:underline">👤 Profile → Printer Setup</Link> — see Section 26 of the user guide.
              </p>
            </div>
          )}
        </div>
      </div>
    </ContentLayout>
  )
}
