'use client'

// MBM-275: printer connection-mode setup — closes the gap left in Phase 3
// (the PATCH route existed with no UI). System-admin only: NetworkPrinters
// has no businessId column (printers are a shared/global resource in this
// app's existing data model — picked as a "default printer" per business
// via PrinterPreferencesSettings, not owned by one), so unlike the scale
// setup page this isn't business-scoped.

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { ContentLayout } from '@/components/layout/content-layout'
import { useAlert } from '@/components/ui/confirm-modal'

interface Printer {
  id: string
  name: string
  type: string
  status: string
  connectionMode?: 'DIRECT' | 'AGENT'
  workstationAgentId?: string | null
  remoteEnabled?: boolean
  qzOverlap?: boolean
}

interface WorkstationAgentOption {
  id: string
  label: string
  connectionStatus: 'ONLINE' | 'OFFLINE'
  businessName: string
}

export default function NetworkPrintersPage() {
  const { isSystemAdmin } = useBusinessPermissionsContext()
  const alert = useAlert()

  const [printers, setPrinters] = useState<Printer[]>([])
  const [agents, setAgents] = useState<WorkstationAgentOption[]>([])
  const [loading, setLoading] = useState(true)

  // Per-printer editing state, keyed by printer id
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftMode, setDraftMode] = useState<'DIRECT' | 'AGENT'>('DIRECT')
  const [draftAgentId, setDraftAgentId] = useState('')
  const [draftPrinterName, setDraftPrinterName] = useState('')
  const [draftRemoteEnabled, setDraftRemoteEnabled] = useState(false)
  const [remotePrinters, setRemotePrinters] = useState<{ name: string }[]>([])
  const [listingRemote, setListingRemote] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [printersRes, agentsRes] = await Promise.all([
        fetch('/api/network-printers', { credentials: 'include' }),
        fetch('/api/admin/workstation-agents/all', { credentials: 'include' }),
      ])
      if (printersRes.ok) {
        const data = await printersRes.json()
        setPrinters(data.printers || [])
      }
      if (agentsRes.ok) {
        const data = await agentsRes.json()
        setAgents(data.data || [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const startEdit = (printer: Printer) => {
    setEditingId(printer.id)
    setDraftMode(printer.connectionMode || 'DIRECT')
    setDraftAgentId(printer.workstationAgentId || '')
    setDraftPrinterName(printer.name)
    setDraftRemoteEnabled(!!printer.remoteEnabled)
    setRemotePrinters([])
  }

  const cancelEdit = () => {
    setEditingId(null)
    setRemotePrinters([])
  }

  const handleListRemotePrinters = async () => {
    if (!draftAgentId) return
    setListingRemote(true)
    try {
      const res = await fetch('/api/print/list-printers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ workstationAgentId: draftAgentId }),
      })
      const data = await res.json()
      if (!res.ok) {
        await alert({ title: 'Error', description: data.error || 'Failed to list printers on that workstation' })
        return
      }
      setRemotePrinters(data.printers || [])
    } finally {
      setListingRemote(false)
    }
  }

  const handleSave = async (printerId: string) => {
    if (draftMode === 'AGENT' && !draftAgentId) {
      await alert({ title: 'Error', description: 'Select a workstation for AGENT mode' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/network-printers/${printerId}/connection-mode`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          connectionMode: draftMode,
          workstationAgentId: draftMode === 'AGENT' ? draftAgentId : undefined,
          printerName: draftMode === 'AGENT' ? draftPrinterName : undefined,
          remoteEnabled: draftMode === 'AGENT' ? draftRemoteEnabled : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        await alert({ title: 'Error', description: data.error || 'Failed to save' })
        return
      }
      setEditingId(null)
      await load()
    } finally {
      setSaving(false)
    }
  }

  if (!isSystemAdmin) {
    return (
      <ContentLayout title="Printer Connection Mode">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <p className="text-red-800 dark:text-red-300">Only a system admin can manage printer connection mode.</p>
        </div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout
      title="Printer Connection Mode"
      description="Route a printer directly (server prints it itself, today's default) or via a paired workstation agent (MBM-275) when the printer is USB-attached somewhere the central server can't reach directly"
    >
      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading…</p>
      ) : printers.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No printers registered.</p>
      ) : (
        <div className="space-y-2">
          {printers.map(printer => (
            <div key={printer.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">{printer.name}</span>
                  <span className="ml-2 text-xs text-gray-500">{printer.type}</span>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${(printer.connectionMode || 'DIRECT') === 'AGENT' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600'}`}>
                    {(printer.connectionMode || 'DIRECT') === 'AGENT' ? 'AGENT (relayed)' : 'DIRECT'}
                  </span>
                  {(printer.connectionMode || 'DIRECT') === 'AGENT' && (() => {
                    const via = agents.find(a => a.id === printer.workstationAgentId)
                    return via ? (
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                        via <span className="font-medium text-gray-700 dark:text-gray-300">{via.label}</span> ({via.businessName})
                      </span>
                    ) : printer.workstationAgentId ? (
                      <span className="ml-2 text-xs text-red-500 dark:text-red-400" title={printer.workstationAgentId}>
                        via an unknown/revoked workstation
                      </span>
                    ) : null
                  })()}
                  {(printer.connectionMode || 'DIRECT') === 'AGENT' && (
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${printer.remoteEnabled ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>
                      {printer.remoteEnabled ? '📱 Remote-enabled' : 'Not remote-enabled'}
                    </span>
                  )}
                  {printer.qzOverlap && (
                    <span
                      className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"
                      title="This exact printer name is also saved as a QZ Tray printer on this same workstation (Profile → Printer Setup). Not unsafe — both paths go through the real Windows print spooler — but pointless to run both at once for the same physical printer. Consider using just one."
                    >
                      ⚠️ Also set up for QZ Tray here
                    </span>
                  )}
                </div>
                {editingId !== printer.id && (
                  <button onClick={() => startEdit(printer)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                    Configure
                  </button>
                )}
              </div>

              {editingId === printer.id && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="radio" checked={draftMode === 'DIRECT'} onChange={() => setDraftMode('DIRECT')} />
                      DIRECT — server prints it directly (unchanged, today's default)
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="radio" checked={draftMode === 'AGENT'} onChange={() => setDraftMode('AGENT')} />
                      AGENT — relay through a paired workstation
                    </label>
                  </div>

                  {draftMode === 'AGENT' && (
                    <div className="space-y-3 pl-4 border-l-2 border-purple-200 dark:border-purple-800">
                      <div>
                        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Workstation</label>
                        <select
                          value={draftAgentId}
                          onChange={(e) => { setDraftAgentId(e.target.value); setRemotePrinters([]) }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">Select a workstation…</option>
                          {agents.map(a => (
                            <option key={a.id} value={a.id}>
                              {a.label} — {a.businessName} {a.connectionStatus === 'ONLINE' ? '🟢' : '🔴'}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Printer Name (as installed on that workstation)</label>
                          <select
                            value={draftPrinterName}
                            onChange={(e) => setDraftPrinterName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                          >
                            {remotePrinters.length === 0 && draftPrinterName && <option value={draftPrinterName}>{draftPrinterName}</option>}
                            {remotePrinters.length === 0 && !draftPrinterName && <option value="">Select…</option>}
                            {remotePrinters.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                          </select>
                        </div>
                        <button onClick={handleListRemotePrinters} disabled={!draftAgentId || listingRemote} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
                          {listingRemote ? 'Listing…' : 'List Printers'}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Click "List Printers" to pull the actual printer names installed on that workstation — the agent must be online.
                      </p>

                      <label className="flex items-start gap-2 text-sm bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                        <input
                          type="checkbox"
                          checked={draftRemoteEnabled}
                          onChange={(e) => setDraftRemoteEnabled(e.target.checked)}
                          className="mt-0.5"
                        />
                        <span>
                          <span className="font-medium text-gray-900 dark:text-white">📱 Enable for remote/mobile printing</span>
                          <br />
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            Off by default (MBM-283). While off, this printer can't be used by <strong>any</strong> device — including a browser on this printer's own paired workstation — not just phones elsewhere. Turn this on once the workstation setup above is confirmed working.
                          </span>
                        </span>
                      </label>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() => handleSave(printer.id)} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={cancelEdit} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </ContentLayout>
  )
}
