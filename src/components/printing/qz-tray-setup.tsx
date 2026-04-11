'use client'

/**
 * QZ Tray Setup Component
 *
 * Shows QZ Tray connection status and lets the user pick + save a printer.
 * Rendered inside the local printer settings page.
 */

import { useState, useEffect } from 'react'
import { Check, AlertCircle, Printer, RefreshCw, Trash2 } from 'lucide-react'
import {
  isQzTrayAvailable,
  listQzPrinters,
  testQzPrinter,
  disconnectQzTray,
  getQzPrinterConfig,
  saveQzPrinterConfig,
  clearQzPrinterConfig,
  type QzPrinterConfig,
} from '@/lib/printing/qz-tray-printer'

interface QzTraySetupProps {
  onSetupComplete?: (config: QzPrinterConfig) => void
  onDisconnect?: () => void
  compact?: boolean
  /** When true, don't auto-check on mount — user must click "Check QZ Tray" first */
  lazy?: boolean
}

export function QzTraySetup({ onSetupComplete, onDisconnect, compact = false, lazy = false }: QzTraySetupProps) {
  const [available, setAvailable] = useState<boolean | null>(lazy ? false : null) // null = checking, false = not available
  const [printers, setPrinters] = useState<string[]>([])
  const [selectedPrinter, setSelectedPrinter] = useState('')
  const [savedConfig, setSavedConfig] = useState<QzPrinterConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [manualName, setManualName] = useState('')
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [successMsg, setSuccessMsg] = useState('Test print sent successfully')
  const [error, setError] = useState('')
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    const config = getQzPrinterConfig()
    setSavedConfig(config)
    if (config) setSelectedPrinter(config.printerName)
    if (!lazy) checkAvailability()
  }, [])

  async function checkAvailability() {
    setAvailable(null) // show spinner while checking
    setHasChecked(true)
    const ok = await isQzTrayAvailable()
    setAvailable(ok)
    if (ok) {
      try {
        const list = await listQzPrinters()
        setPrinters(list)
        // Pre-select saved printer if still in list
        const config = getQzPrinterConfig()
        if (config && list.includes(config.printerName)) {
          setSelectedPrinter(config.printerName)
        } else if (list.length > 0 && !selectedPrinter) {
          setSelectedPrinter(list[0])
        }
      } catch {
        // Printer list load failed — non-critical
      }
    }
  }

  async function handleSave() {
    const name = selectedPrinter || manualName.trim()
    if (!name) return
    const config: QzPrinterConfig = { printerName: name }
    saveQzPrinterConfig(config)
    setSavedConfig(config)
    if (!selectedPrinter) setSelectedPrinter(name)
    onSetupComplete?.(config)
  }

  async function handleTestPrint() {
    const printerName = selectedPrinter || manualName.trim()
    if (!printerName) return
    setLoading(true)
    setTestResult(null)
    setError('')
    setSuccessMsg('Test print sent successfully')
    try {
      await testQzPrinter(printerName)
      setTestResult('success')
    } catch (err: any) {
      setTestResult('error')
      setError(err.message || 'Test print failed')
    } finally {
      setLoading(false)
    }
  }

  function handleRemove() {
    clearQzPrinterConfig()
    setSavedConfig(null)
    setTestResult(null)
    setError('')
    onDisconnect?.()
  }

  async function handleStopQz() {
    setStopping(true)
    setTestResult(null)
    setError('')
    try {
      await disconnectQzTray()
      setAvailable(false)
      setHasChecked(false)
      setSuccessMsg('QZ Tray disconnected — pending jobs stopped')
      setTestResult('success')
    } catch {
      setAvailable(false)
    } finally {
      setStopping(false)
    }
  }

  const pad = compact ? 'p-3' : 'p-4'

  // Checking QZ Tray availability (spinner)
  if (available === null) {
    return (
      <div className={`${pad} bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg`}>
        <div className="flex items-center gap-2 text-sm text-secondary">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500" />
          Checking for QZ Tray…
        </div>
      </div>
    )
  }

  // QZ Tray not running (or lazy and not yet checked)
  if (!available) {
    // Lazy mode before first check — just show a connect button
    if (lazy && !hasChecked) {
      return (
        <div className={`${pad} bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg`}>
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-xs text-secondary flex-1">
              {savedConfig ? `QZ: ${savedConfig.printerName}` : 'QZ Tray local printer'}
            </span>
            <button
              onClick={checkAvailability}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Bring Online
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className={`${pad} bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg`}>
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">QZ Tray not detected</p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-0.5">
              Make sure QZ Tray is installed and running (look for the QZ icon in the system tray).
            </p>
            <a
              href="https://qz.io/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-yellow-800 dark:text-yellow-200 underline mt-1 inline-block"
            >
              Download QZ Tray →
            </a>
          </div>
          <button
            onClick={checkAvailability}
            className="text-yellow-700 dark:text-yellow-400 hover:text-yellow-900 dark:hover:text-yellow-200"
            title="Retry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  // Connected — show printer picker
  return (
    <div className={`${pad} bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          <span className="text-sm font-medium text-primary">QZ Tray connected</span>
          {savedConfig && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              {savedConfig.printerName}
            </span>
          )}
        </div>
        <button
          onClick={checkAvailability}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          title="Refresh printer list"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Printer selector */}
      {printers.length > 0 ? (
        <div>
          <label className="block text-xs font-medium text-secondary mb-1">Select Printer</label>
          <select
            value={selectedPrinter}
            onChange={e => setSelectedPrinter(e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-primary"
          >
            <option value="">-- Choose a printer --</option>
            {printers.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-yellow-700 dark:text-yellow-400">
            QZ Tray could not list printers automatically — this can happen if a security approval is pending in the QZ Tray popup. Check your taskbar for a QZ Tray dialog and click <strong>Allow</strong>, then refresh.
          </p>
          <p className="text-xs text-secondary">Or enter your printer name manually:</p>
          <input
            type="text"
            value={manualName}
            onChange={e => setManualName(e.target.value)}
            placeholder="e.g. EPSON TM-T20III"
            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-primary placeholder-gray-400"
          />
          <p className="text-xs text-gray-400">
            Find the exact name: open Windows <strong>Start → Settings → Printers & scanners</strong>
          </p>
        </div>
      )}

      {/* Feedback */}
      {testResult === 'success' && (
        <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs">
          <Check className="w-3 h-3" /> {successMsg}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-1 text-red-600 dark:text-red-400 text-xs">
          <AlertCircle className="w-3 h-3" /> {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleSave}
          disabled={!selectedPrinter && !manualName.trim()}
          className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Save Printer
        </button>
        <button
          onClick={handleTestPrint}
          disabled={loading || (!selectedPrinter && !manualName.trim())}
          className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-primary rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 flex items-center gap-1"
        >
          <Printer className="w-3 h-3" />
          {loading ? 'Printing…' : 'Test Print'}
        </button>
        <button
          onClick={handleStopQz}
          disabled={loading || stopping}
          className="px-3 py-1.5 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 flex items-center gap-1"
          title="Disconnect QZ Tray and stop all pending print jobs"
        >
          {stopping ? '…' : '⏹ Stop QZ'}
        </button>
        {savedConfig && (
          <button
            onClick={handleRemove}
            className="px-3 py-1.5 text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Remove
          </button>
        )}
      </div>
    </div>
  )
}
