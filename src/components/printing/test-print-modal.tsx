'use client'

import { useState, useEffect } from 'react'
import { disconnectQzTray, getQzPrinterConfig } from '@/lib/printing/qz-tray-printer'

interface Printer {
  id: string
  printerName: string
  printerType: string
  isOnline: boolean
}

interface TestPrintModalProps {
  businessId: string
  onClose: () => void
}

export function TestPrintModal({ businessId, onClose }: TestPrintModalProps) {
  const [printers, setPrinters] = useState<Printer[]>([])
  const [loading, setLoading] = useState(true)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [clearingId, setClearingId] = useState<string | null>(null)
  const [checkingOnlineId, setCheckingOnlineId] = useState<string | null>(null)
  const [stoppingQz, setStoppingQz] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [savedQzPrinter, setSavedQzPrinter] = useState<string | null>(null)

  useEffect(() => {
    fetchPrinters()
    const cfg = getQzPrinterConfig()
    if (cfg) setSavedQzPrinter(cfg.printerName)
  }, [businessId])

  const fetchPrinters = async () => {
    try {
      const res = await fetch(`/api/printers?businessId=${businessId}`)
      if (res.ok) {
        const data = await res.json()
        setPrinters(Array.isArray(data) ? data : data.printers || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const handleBringOnline = async (printer: Printer) => {
    setCheckingOnlineId(printer.id)
    setResult(null)
    try {
      const res = await fetch(`/api/printers/${printer.id}/check-connectivity`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to check connectivity')
      const { isOnline } = await res.json()
      if (isOnline) {
        setResult({ type: 'success', message: `${printer.printerName} is now online!` })
        await fetchPrinters()
      } else {
        setResult({ type: 'error', message: `${printer.printerName} is still offline. Check power and network connection.` })
      }
    } catch (err: any) {
      setResult({ type: 'error', message: err.message || 'Failed to check printer status' })
    } finally {
      setCheckingOnlineId(null)
    }
  }

  const handleTest = async (printer: Printer) => {
    setTestingId(printer.id)
    setResult(null)
    try {
      const res = await fetch('/api/printers/test-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ printerId: printer.id }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult({ type: 'success', message: `Test sent to ${printer.printerName}` })
      } else {
        setResult({ type: 'error', message: data.error || 'Test failed' })
      }
    } catch (err: any) {
      setResult({ type: 'error', message: err.message || 'Test failed' })
    } finally {
      setTestingId(null)
    }
  }

  const handleClearQueue = async (printer: Printer) => {
    setClearingId(printer.id)
    setResult(null)
    try {
      const res = await fetch(`/api/printers/${printer.id}/clear-queue`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setResult({ type: 'success', message: `Queue cleared for ${printer.printerName}` })
      } else {
        setResult({ type: 'error', message: data.error || 'Failed to clear queue' })
      }
    } catch (err: any) {
      setResult({ type: 'error', message: err.message || 'Failed to clear queue' })
    } finally {
      setClearingId(null)
    }
  }

  const handleStopQz = async () => {
    setStoppingQz(true)
    setResult(null)
    try {
      await disconnectQzTray()
      setResult({ type: 'success', message: 'QZ Tray disconnected — all pending QZ jobs stopped' })
    } catch {
      // disconnectQzTray swallows errors, so this is just for display
      setResult({ type: 'success', message: 'QZ Tray disconnected' })
    } finally {
      setStoppingQz(false)
    }
  }

  const busy = testingId !== null || clearingId !== null || checkingOnlineId !== null || stoppingQz

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm mx-4">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Test Print</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {result && (
            <div className={`p-2 rounded text-xs ${
              result.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
            }`}>
              {result.message}
            </div>
          )}

          {/* Network printers */}
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            </div>
          ) : printers.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No printers configured for this business.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Select a printer to send a test page:
              </p>
              {printers.map((printer) => (
                <div
                  key={printer.id}
                  className="p-2 rounded border border-gray-200 dark:border-gray-700 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${printer.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{printer.printerName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{printer.printerType}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      {!printer.isOnline && (
                        <button
                          onClick={() => handleBringOnline(printer)}
                          disabled={busy}
                          className="px-2 py-1 text-xs font-medium rounded bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white"
                        >
                          {checkingOnlineId === printer.id ? 'Checking…' : 'Bring Online'}
                        </button>
                      )}
                      <button
                        onClick={() => handleTest(printer)}
                        disabled={busy}
                        className="px-2 py-1 text-xs font-medium rounded bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white"
                      >
                        {testingId === printer.id ? 'Testing…' : 'Test'}
                      </button>
                    </div>
                  </div>
                  {/* Clear queue button */}
                  <button
                    onClick={() => handleClearQueue(printer)}
                    disabled={busy}
                    className="w-full px-2 py-1 text-xs font-medium rounded bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white flex items-center justify-center gap-1"
                  >
                    {clearingId === printer.id ? (
                      <><span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Clearing…</>
                    ) : (
                      '🗑 Clear Print Queue'
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* QZ Tray stop section */}
          {savedQzPrinter && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                QZ Tray local printer: <span className="font-medium">{savedQzPrinter}</span>
              </p>
              <button
                onClick={handleStopQz}
                disabled={busy}
                className="w-full px-2 py-1.5 text-xs font-medium rounded bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white flex items-center justify-center gap-1"
              >
                {stoppingQz ? (
                  <><span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Stopping…</>
                ) : (
                  '⏹ Stop QZ / Clear Pending Jobs'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
