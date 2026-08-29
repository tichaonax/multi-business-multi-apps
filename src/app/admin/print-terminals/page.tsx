'use client'

// MBM-283 follow-up: management for lightweight "print terminals" — a
// printer-less device (front counter till, a mobile-style tablet mounted
// somewhere) that self-registered from Settings → POS Settings → Printer
// Preferences ("This Device"). Deliberately a completely separate page
// from /admin/workstation-agents: a terminal has no local hardware and no
// running agent, so none of that page's pairing/connection-status/
// "waiting for agent" UI applies here — mixing the two produced a
// genuinely confusing page when a printer-less workstation landed on the
// hardware-pairing flow by mistake. This page only ever does one thing:
// assign each registered terminal a default remote printer, from anywhere,
// without needing to be standing at the terminal itself.

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { ContentLayout } from '@/components/layout/content-layout'
import { useAlert } from '@/components/ui/confirm-modal'
import { formatPrinterName } from '@/lib/printing/format-printer-label'

interface PrintTerminal {
  id: string
  label: string
  createdAt: string
  lastSeenAt: string | null
}

interface Printer {
  id: string
  printerName: string
  isOnline: boolean
  workstationLabel?: string | null
  workstationHostname?: string | null
}

export default function PrintTerminalsPage() {
  const { currentBusinessId, isSystemAdmin, isBusinessOwner } = useBusinessPermissionsContext()
  const isAdmin = isSystemAdmin || isBusinessOwner
  const alert = useAlert()

  const [terminals, setTerminals] = useState<PrintTerminal[]>([])
  const [printers, setPrinters] = useState<Printer[]>([])
  const [defaults, setDefaults] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [savingFor, setSavingFor] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const load = async () => {
    if (!currentBusinessId) return
    setLoading(true)
    try {
      const [terminalsRes, printersRes] = await Promise.all([
        fetch(`/api/printing/terminals?businessId=${currentBusinessId}`, { credentials: 'include' }),
        fetch(`/api/printers?businessId=${currentBusinessId}&printerType=receipt`, { credentials: 'include' }),
      ])
      let loadedTerminals: PrintTerminal[] = []
      if (terminalsRes.ok) {
        const data = await terminalsRes.json()
        loadedTerminals = data.data || []
        setTerminals(loadedTerminals)
      }
      if (printersRes.ok) {
        const data = await printersRes.json()
        setPrinters(data.printers || [])
      }
      if (loadedTerminals.length > 0) {
        const results = await Promise.all(
          loadedTerminals.map(t =>
            fetch(`/api/printing/default-printer?businessId=${currentBusinessId}&printTerminalId=${t.id}`, { credentials: 'include' })
              .then(r => r.ok ? r.json() : null)
              .catch(() => null)
          )
        )
        const next: Record<string, string> = {}
        loadedTerminals.forEach((t, i) => {
          const printerId = results[i]?.printerId
          if (printerId) next[t.id] = printerId
        })
        setDefaults(next)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [currentBusinessId])

  const handleDefaultChange = async (terminalId: string, printerId: string) => {
    if (!currentBusinessId) return
    setSavingFor(terminalId)
    try {
      if (!printerId) {
        await fetch(`/api/printing/default-printer?businessId=${currentBusinessId}&printTerminalId=${terminalId}`, {
          method: 'DELETE',
          credentials: 'include',
        })
        setDefaults(prev => { const next = { ...prev }; delete next[terminalId]; return next })
        return
      }
      const res = await fetch('/api/printing/default-printer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ businessId: currentBusinessId, printTerminalId: terminalId, printerId }),
      })
      const data = await res.json()
      if (!res.ok) {
        await alert({ title: 'Error', description: data.error || 'Failed to save default printer' })
        return
      }
      setDefaults(prev => ({ ...prev, [terminalId]: data.printerId }))
    } finally {
      setSavingFor(null)
    }
  }

  const handleRemove = async (terminal: PrintTerminal) => {
    if (!confirm(`Remove "${terminal.label}"? Any browser that registered as this terminal will need to register again to get an assigned default printer.`)) return
    setRemovingId(terminal.id)
    try {
      const res = await fetch(`/api/printing/terminals?id=${terminal.id}`, { method: 'DELETE', credentials: 'include' })
      if (res.ok) await load()
      else await alert({ title: 'Error', description: 'Failed to remove terminal' })
    } finally {
      setRemovingId(null)
    }
  }

  if (!isAdmin) {
    return (
      <ContentLayout title="Print Terminals">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <p className="text-red-800 dark:text-red-300">Only a system admin or this business&apos;s owner can manage print terminals.</p>
        </div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout
      title="Print Terminals"
      description="Printer-less devices (a till, a mounted tablet) that registered themselves for a centrally-assigned default printer — no local hardware or agent involved. For a workstation with an actual scale/printer attached, use Workstation Agents instead."
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="font-medium text-gray-900 dark:text-white mb-1">Registered Terminals</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          A device registers itself from <strong>Settings → POS Settings → Printer Preferences → This Device</strong> —
          nothing to set up here first. Once it appears below, assign it a default printer from anywhere.
        </p>

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading…</p>
        ) : terminals.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No terminals registered yet.</p>
        ) : printers.length === 0 ? (
          <p className="text-amber-600 dark:text-amber-400 text-sm">
            ⚠️ No printers available for this business yet — register a printer and, for a remote one, enable it for
            remote printing in Printer Connection Mode before assigning defaults here.
          </p>
        ) : (
          <div className="space-y-2">
            {terminals.map(terminal => (
              <div key={terminal.id} className="border border-gray-200 dark:border-gray-700 rounded-md p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">{terminal.label}</span>
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      {terminal.lastSeenAt ? `Last seen ${new Date(terminal.lastSeenAt).toLocaleString()}` : 'Never checked in'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemove(terminal)}
                    disabled={removingId === terminal.id}
                    className="text-sm text-red-600 hover:underline disabled:opacity-50"
                  >
                    {removingId === terminal.id ? 'Removing…' : 'Remove'}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">Default printer:</label>
                  <select
                    value={defaults[terminal.id] || ''}
                    onChange={(e) => handleDefaultChange(terminal.id, e.target.value)}
                    disabled={savingFor === terminal.id}
                    className="flex-1 text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  >
                    <option value="">No default set</option>
                    {printers.map(p => (
                      <option key={p.id} value={p.id}>
                        {formatPrinterName(p)}{p.isOnline ? '' : ' (offline)'}
                      </option>
                    ))}
                  </select>
                  {savingFor === terminal.id && <span className="text-xs text-gray-400 flex-shrink-0">Saving…</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ContentLayout>
  )
}
