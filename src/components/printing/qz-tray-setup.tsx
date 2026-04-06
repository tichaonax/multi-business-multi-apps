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
  getQzPrinterConfig,
  saveQzPrinterConfig,
  clearQzPrinterConfig,
  type QzPrinterConfig,
} from '@/lib/printing/qz-tray-printer'

interface QzTraySetupProps {
  onSetupComplete?: (config: QzPrinterConfig) => void
  onDisconnect?: () => void
  compact?: boolean
}

export function QzTraySetup({ onSetupComplete, onDisconnect, compact = false }: QzTraySetupProps) {
  const [available, setAvailable] = useState<boolean | null>(null) // null = checking
  const [printers, setPrinters] = useState<string[]>([])
  const [selectedPrinter, setSelectedPrinter] = useState('')
  const [savedConfig, setSavedConfig] = useState<QzPrinterConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const config = getQzPrinterConfig()
    setSavedConfig(config)
    if (config) setSelectedPrinter(config.printerName)
    checkAvailability()
  }, [])

  async function checkAvailability() {
    setAvailable(null)
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
    if (!selectedPrinter) return
    const config: QzPrinterConfig = { printerName: selectedPrinter }
    saveQzPrinterConfig(config)
    setSavedConfig(config)
    onSetupComplete?.(config)
  }

  async function handleTestPrint() {
    if (!selectedPrinter) return
    setLoading(true)
    setTestResult(null)
    setError('')
    try {
      await testQzPrinter(selectedPrinter)
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

  const pad = compact ? 'p-3' : 'p-4'

  // Still checking
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

  // QZ Tray not running
  if (!available) {
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
        <p className="text-xs text-secondary">No printers found. Check that your printer is installed in Windows.</p>
      )}

      {/* Feedback */}
      {testResult === 'success' && (
        <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs">
          <Check className="w-3 h-3" /> Test print sent successfully
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
          disabled={!selectedPrinter}
          className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Save Printer
        </button>
        <button
          onClick={handleTestPrint}
          disabled={loading || !selectedPrinter}
          className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-primary rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 flex items-center gap-1"
        >
          <Printer className="w-3 h-3" />
          {loading ? 'Printing…' : 'Test Print'}
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
