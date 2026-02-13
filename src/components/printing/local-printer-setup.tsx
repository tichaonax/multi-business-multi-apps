'use client'

/**
 * Local Printer Setup Component
 *
 * Allows users to pair a local USB thermal printer via the Web Serial API.
 * The printer is stored in localStorage (per-machine, not shared).
 */

import { useState, useEffect } from 'react'
import { Usb, Check, AlertCircle, Trash2, Printer } from 'lucide-react'
import {
  isWebSerialSupported,
  requestLocalPrinter,
  getLocalPrinterConfig,
  clearLocalPrinterConfig,
  testLocalPrinter,
  isLocalPrinterAvailable,
  type LocalPrinterConfig,
} from '@/lib/printing/local-serial-printer'

interface LocalPrinterSetupProps {
  onSetupComplete?: (config: LocalPrinterConfig) => void
  onDisconnect?: () => void
  compact?: boolean
}

const BAUD_RATES = [9600, 19200, 38400, 57600, 115200]

export function LocalPrinterSetup({
  onSetupComplete,
  onDisconnect,
  compact = false,
}: LocalPrinterSetupProps) {
  const [supported, setSupported] = useState(false)
  const [config, setConfig] = useState<LocalPrinterConfig | null>(null)
  const [available, setAvailable] = useState(false)
  const [name, setName] = useState('Local Receipt Printer')
  const [baudRate, setBaudRate] = useState(9600)
  const [loading, setLoading] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const webSerialSupported = isWebSerialSupported()
    setSupported(webSerialSupported)

    if (webSerialSupported) {
      const savedConfig = getLocalPrinterConfig()
      if (savedConfig) {
        setConfig(savedConfig)
        setName(savedConfig.name)
        setBaudRate(savedConfig.baudRate)
        // Check if the port is still accessible
        isLocalPrinterAvailable().then(setAvailable)
      }
    }
  }, [])

  async function handleConnect() {
    setLoading(true)
    setError('')
    setTestResult(null)
    try {
      const result = await requestLocalPrinter(name, baudRate)
      if (result) {
        setConfig(result)
        setAvailable(true)
        onSetupComplete?.(result)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect printer')
    } finally {
      setLoading(false)
    }
  }

  function handleDisconnect() {
    clearLocalPrinterConfig()
    setConfig(null)
    setAvailable(false)
    setTestResult(null)
    onDisconnect?.()
  }

  async function handleTestPrint() {
    setLoading(true)
    setTestResult(null)
    setError('')
    try {
      await testLocalPrinter()
      setTestResult('success')
    } catch (err: any) {
      setTestResult('error')
      setError(err.message || 'Test print failed')
    } finally {
      setLoading(false)
    }
  }

  if (!supported) {
    return (
      <div className={`${compact ? 'p-3' : 'p-4'} bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg`}>
        <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm">
            Local USB printing requires Chrome or Edge browser with a secure connection.
          </p>
        </div>
      </div>
    )
  }

  // Connected state
  if (config) {
    return (
      <div className={`${compact ? 'p-3' : 'p-4'} bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Usb className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="font-medium text-sm text-primary">{config.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              available
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {available ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="text-xs text-secondary mb-3">
          Baud Rate: {config.baudRate}
          {config.vendorId ? ` | USB ${config.vendorId.toString(16).toUpperCase()}:${config.productId?.toString(16).toUpperCase()}` : ''}
        </div>

        {testResult === 'success' && (
          <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs mb-2">
            <Check className="w-3 h-3" /> Test print sent successfully
          </div>
        )}

        {error && (
          <div className="flex items-center gap-1 text-red-600 dark:text-red-400 text-xs mb-2">
            <AlertCircle className="w-3 h-3" /> {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleTestPrint}
            disabled={loading || !available}
            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <Printer className="w-3 h-3" />
            {loading ? 'Printing...' : 'Test Print'}
          </button>
          <button
            onClick={handleConnect}
            disabled={loading}
            className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-primary rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            Reconnect
          </button>
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="px-3 py-1.5 text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Remove
          </button>
        </div>
      </div>
    )
  }

  // Setup state
  return (
    <div className={`${compact ? 'p-3' : 'p-4'} bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg`}>
      <h4 className="text-sm font-medium text-primary mb-3 flex items-center gap-2">
        <Usb className="w-4 h-4" />
        Setup Local USB Printer
      </h4>

      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-xs font-medium text-secondary mb-1">Printer Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-primary"
            placeholder="Local Receipt Printer"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-secondary mb-1">Baud Rate</label>
          <select
            value={baudRate}
            onChange={e => setBaudRate(Number(e.target.value))}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-primary"
          >
            {BAUD_RATES.map(rate => (
              <option key={rate} value={rate}>
                {rate}{rate === 9600 ? ' (Default)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-1 text-red-600 dark:text-red-400 text-xs mb-3">
          <AlertCircle className="w-3 h-3" /> {error}
        </div>
      )}

      <button
        onClick={handleConnect}
        disabled={loading || !name.trim()}
        className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Usb className="w-4 h-4" />
        {loading ? 'Connecting...' : 'Connect USB Printer'}
      </button>

      <p className="text-xs text-secondary mt-2">
        Your browser will show a list of available serial ports. Select the port for your thermal receipt printer.
      </p>
    </div>
  )
}
