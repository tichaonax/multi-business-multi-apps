'use client'

import { useState, useEffect } from 'react'

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
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    fetchPrinters()
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

        <div className="p-4">
          {result && (
            <div className={`mb-3 p-2 rounded text-xs ${
              result.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
            }`}>
              {result.message}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : printers.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No printers configured for this business.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Select a printer to send a test page:
              </p>
              {printers.map((printer) => (
                <div
                  key={printer.id}
                  className="flex items-center justify-between p-2 rounded border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${printer.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {printer.printerName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {printer.printerType}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleTest(printer)}
                    disabled={testingId !== null}
                    className="ml-2 px-3 py-1 text-xs font-medium rounded bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white flex-shrink-0"
                  >
                    {testingId === printer.id ? 'Testing...' : 'Test'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
