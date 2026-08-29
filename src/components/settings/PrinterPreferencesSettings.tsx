'use client'

/**
 * PrinterPreferencesSettings
 * Per-user receipt printer preferences (localStorage, not business-wide).
 * Shown on the unified POS Settings page for all business types.
 *
 * Any user with canPrintReceipts or canSelectPrinters can access this section.
 */

import { useEffect, useState } from 'react'
import { usePrintPreferences } from '@/hooks/use-print-preferences'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { getPrintTerminal, setPrintTerminal, clearPrintTerminal, type PrintTerminalIdentity } from '@/lib/printing/print-terminal'
import { formatPrinterName } from '@/lib/printing/format-printer-label'

interface Printer {
  id: string
  printerName: string
  isOnline: boolean
  printerType: string
  // MBM-283: which workstation this AGENT-relayed printer is physically
  // attached to — distinguishes two printers sharing a model name across
  // different workstations (e.g. two identical thermal printers).
  workstationLabel?: string | null
  workstationHostname?: string | null
}

interface PrinterPreferencesSettingsProps {
  businessType: 'restaurant' | 'grocery' | 'clothing' | 'hardware'
  posLink: string
}

export function PrinterPreferencesSettings({ businessType, posLink }: PrinterPreferencesSettingsProps) {
  const { preferences, isLoaded, setAutoPrint, setDefaultPrinter } = usePrintPreferences()
  const { currentBusinessId, isSystemAdmin, isBusinessOwner } = useBusinessPermissionsContext()
  const canManageBusinessDefault = isSystemAdmin || isBusinessOwner
  const [printers, setPrinters] = useState<Printer[]>([])
  const [loadingPrinters, setLoadingPrinters] = useState(true)
  const [saveIndicator, setSaveIndicator] = useState<string | null>(null)

  // MBM-283 Phase 3: business-wide default — the fallback used at print
  // time (e.g. by a mobile device with no per-user choice of its own yet).
  const [businessDefaultPrinterId, setBusinessDefaultPrinterId] = useState<string | null>(null)
  const [loadingBusinessDefault, setLoadingBusinessDefault] = useState(true)
  const [savingBusinessDefault, setSavingBusinessDefault] = useState(false)

  // MBM-283 follow-up: this device's own lightweight "print terminal"
  // identity, if it's ever been registered — lets an admin assign THIS
  // specific machine a default printer that survives whoever's logged in,
  // without needing the local agent at all. See print-terminal.ts.
  const [terminal, setTerminal] = useState<PrintTerminalIdentity | null>(null)
  const [registerLabel, setRegisterLabel] = useState('')
  const [registering, setRegistering] = useState(false)

  useEffect(() => {
    setTerminal(getPrintTerminal())
  }, [])

  const handleRegisterTerminal = async () => {
    if (!currentBusinessId || !registerLabel.trim()) return
    setRegistering(true)
    try {
      const res = await fetch('/api/printing/terminals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ businessId: currentBusinessId, label: registerLabel.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        showSaved(data.error || 'Failed to register this device')
        return
      }
      const identity = { id: data.data.id, label: data.data.label }
      setPrintTerminal(identity)
      setTerminal(identity)
      showSaved('Device registered')
    } finally {
      setRegistering(false)
    }
  }

  const handleForgetTerminal = () => {
    clearPrintTerminal()
    setTerminal(null)
    setRegisterLabel('')
  }

  useEffect(() => {
    fetchPrinters()
  }, [currentBusinessId])

  useEffect(() => {
    if (!currentBusinessId) return
    setLoadingBusinessDefault(true)
    fetch(`/api/printing/default-printer?businessId=${currentBusinessId}`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => setBusinessDefaultPrinterId(data?.printerId ?? null))
      .catch(() => {})
      .finally(() => setLoadingBusinessDefault(false))
  }, [currentBusinessId])

  const fetchPrinters = async () => {
    try {
      setLoadingPrinters(true)
      // MBM-283 Phase 1/2: businessId scopes out another business's
      // AGENT-relayed printers, and excludes ones not opted in for
      // remote/general use — see printer-service.ts's listPrinters().
      const res = await fetch(`/api/printers?printerType=receipt${currentBusinessId ? `&businessId=${encodeURIComponent(currentBusinessId)}` : ''}`)
      if (res.ok) {
        const data = await res.json()
        setPrinters(data.printers ?? [])
      }
    } catch {
      // Non-fatal: proceed with empty list
    } finally {
      setLoadingPrinters(false)
    }
  }

  const handleBusinessDefaultChange = async (printerId: string) => {
    if (!currentBusinessId) return
    setSavingBusinessDefault(true)
    try {
      if (!printerId) {
        await fetch(`/api/printing/default-printer?businessId=${currentBusinessId}`, { method: 'DELETE', credentials: 'include' })
        setBusinessDefaultPrinterId(null)
        showSaved('Business default printer cleared')
        return
      }
      const res = await fetch('/api/printing/default-printer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ businessId: currentBusinessId, printerId }),
      })
      const data = await res.json()
      if (!res.ok) {
        showSaved(data.error || 'Failed to save business default printer')
        return
      }
      setBusinessDefaultPrinterId(data.printerId)
      showSaved('Business default printer saved')
    } finally {
      setSavingBusinessDefault(false)
    }
  }

  const handleAutoPrintToggle = () => {
    const next = !preferences.autoPrintReceipt
    setAutoPrint(next)
    showSaved(`Auto-print ${next ? 'enabled' : 'disabled'}`)
  }

  const handlePrinterChange = (printerId: string) => {
    setDefaultPrinter(printerId || undefined)
    showSaved(printerId ? 'Default printer saved' : 'Default printer cleared')
  }

  const showSaved = (msg: string) => {
    setSaveIndicator(msg)
    setTimeout(() => setSaveIndicator(null), 2500)
  }

  const selectedPrinter = printers.find(p => p.id === preferences.defaultPrinterId)

  if (!isLoaded) {
    return (
      <div className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">
        Loading preferences…
      </div>
    )
  }

  return (
    <div className="max-w-xl space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">🖨️</span>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Receipt Printer Preferences</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Your personal settings for this device — saved locally, not shared with other staff.
          </p>
        </div>
      </div>

      {/* Auto-Print Toggle */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Auto-Print Receipts</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Automatically print a receipt after completing an order
            </p>
          </div>
          <button
            onClick={handleAutoPrintToggle}
            aria-pressed={preferences.autoPrintReceipt}
            className={`relative inline-flex h-8 w-14 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              preferences.autoPrintReceipt
                ? 'bg-green-600'
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
                preferences.autoPrintReceipt ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        <p className="mt-3 text-xs">
          {preferences.autoPrintReceipt ? (
            <span className="text-green-600 dark:text-green-400">✅ Enabled — receipts print automatically</span>
          ) : (
            <span className="text-gray-500 dark:text-gray-400">❌ Disabled — use the "Print Receipt" button</span>
          )}
        </p>
      </div>

      {/* Default Printer */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Default Receipt Printer</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Select the printer to use for receipts on this device
        </p>

        {loadingPrinters ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">Loading printers…</p>
        ) : (
          <>
            <select
              value={preferences.defaultPrinterId ?? ''}
              onChange={e => handlePrinterChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">No default printer</option>
              {printers.map(p => (
                <option key={p.id} value={p.id}>
                  {formatPrinterName(p)}{p.isOnline ? '' : ' (offline)'}
                </option>
              ))}
            </select>

            {printers.length === 0 && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                ⚠️ No receipt printers found. Ask your admin to add one in Admin → Printers.
              </p>
            )}

            {selectedPrinter && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Currently using: <span className="font-medium text-gray-700 dark:text-gray-300">{selectedPrinter.printerName}</span>
                {selectedPrinter.isOnline
                  ? <span className="ml-1 text-green-600 dark:text-green-400">● Online</span>
                  : <span className="ml-1 text-red-500 dark:text-red-400">● Offline</span>}
              </p>
            )}

            {!preferences.defaultPrinterId && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                If no printer is selected you&apos;ll be prompted to choose one each time.
              </p>
            )}
          </>
        )}
      </div>

      {/* This Device / Print Terminal (MBM-283 follow-up) — any user can
          register; this is what makes a shared machine (not the login)
          eligible for an admin-assigned default printer, without ever
          running the local agent. No pairing, no agent, just an id this
          browser remembers. */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">This Device</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Register this specific machine so an admin can assign it a fixed default printer — useful for a shared
          till used by rotating staff, where a per-user choice above doesn&apos;t help. No local hardware or
          agent required.
        </p>
        {terminal ? (
          <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <p className="text-sm text-green-800 dark:text-green-300">
              ✅ Registered as <strong>&quot;{terminal.label}&quot;</strong>
              {canManageBusinessDefault && <> — set its default printer in <strong>Admin → Print Terminals</strong>.</>}
            </p>
            <button onClick={handleForgetTerminal} className="text-xs text-red-600 dark:text-red-400 hover:underline flex-shrink-0 ml-3">
              Forget this device
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={registerLabel}
              onChange={(e) => setRegisterLabel(e.target.value)}
              placeholder="e.g. Front Counter Till"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={handleRegisterTerminal}
              disabled={!registerLabel.trim() || registering}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex-shrink-0"
            >
              {registering ? 'Registering…' : 'Register this device'}
            </button>
          </div>
        )}
      </div>

      {/* Business Default Printer (MBM-283 Phase 3) — admin/owner only */}
      {canManageBusinessDefault && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Business Default Printer</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Used for anyone (any device, including mobile) who hasn't picked their own printer above — the
            fallback so a phone with no printer set up yet still has somewhere sensible to print.
          </p>

          {loadingPrinters || loadingBusinessDefault ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">Loading…</p>
          ) : (
            <>
              <select
                value={businessDefaultPrinterId ?? ''}
                onChange={(e) => handleBusinessDefaultChange(e.target.value)}
                disabled={savingBusinessDefault}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
              >
                <option value="">No business default printer</option>
                {printers.map(p => (
                  <option key={p.id} value={p.id}>
                    {formatPrinterName(p)}{p.isOnline ? '' : ' (offline)'}
                  </option>
                ))}
              </select>
              {printers.length === 0 && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ No receipt printers found for this business — an AGENT-relayed printer must also be
                  "Enabled for remote/mobile printing" in Printer Connection Mode to appear here.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Current settings summary */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">Current Settings</h4>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <li>• Auto-print: <strong>{preferences.autoPrintReceipt ? 'ON' : 'OFF'}</strong></li>
          <li>• Default printer: <strong>{preferences.defaultPrinterId ? (selectedPrinter?.printerName ?? 'Set') : 'Not set'}</strong></li>
        </ul>
      </div>

      {/* Save indicator (ephemeral) */}
      {saveIndicator && (
        <div className="text-center text-sm text-green-600 dark:text-green-400 font-medium animate-pulse">
          ✅ {saveIndicator}
        </div>
      )}
    </div>
  )
}
