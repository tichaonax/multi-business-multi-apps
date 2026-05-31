'use client'

import { useEffect, useState } from 'react'
import type { ComPort, ScaleStatus, ScaleWeight } from '@/types/electron'

export function ScaleSettings() {
  const [isElectron, setIsElectron] = useState(false)
  const [ports, setPorts] = useState<ComPort[]>([])
  const [selectedPort, setSelectedPort] = useState<string>('')
  const [status, setStatus] = useState<ScaleStatus>({ status: 'disconnected', comPort: null })
  const [lastWeight, setLastWeight] = useState<ScaleWeight | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!window.electron) return
    setIsElectron(true)

    // Load saved port & initial status
    window.electron.scale.getSavedPort().then((saved) => {
      if (saved) setSelectedPort(saved)
    })

    // Subscribe to status and weight events
    const unsubStatus = window.electron.scale.onStatus((s) => setStatus(s))
    const unsubWeight = window.electron.scale.onWeight((w) => setLastWeight(w))

    return () => {
      unsubStatus()
      unsubWeight()
    }
  }, [])

  async function refreshPorts() {
    if (!window.electron) return
    setLoading(true)
    try {
      const list = await window.electron.scale.listPorts()
      setPorts(list)
    } finally {
      setLoading(false)
    }
  }

  async function handleConnect() {
    if (!window.electron || !selectedPort) return
    await window.electron.scale.connect(selectedPort)
  }

  async function handleDisconnect() {
    if (!window.electron) return
    await window.electron.scale.disconnect()
  }

  async function handleTare() {
    if (!window.electron) return
    await window.electron.scale.tare()
  }

  if (!isElectron) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Scale integration is only available in the desktop (Electron) app.
        </p>
      </div>
    )
  }

  const connected = status.status === 'connected'
  const hasError = status.status === 'error'

  return (
    <div className="space-y-4">
      {/* Connection row */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">COM Port</label>
          <div className="flex gap-2">
            <select
              value={selectedPort}
              onChange={(e) => setSelectedPort(e.target.value)}
              className="flex-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">— select port —</option>
              {ports.map((p) => (
                <option key={p.path} value={p.path}>
                  {p.path}{p.manufacturer ? ` (${p.manufacturer})` : ''}
                </option>
              ))}
            </select>
            <button
              onClick={refreshPorts}
              disabled={loading}
              className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
              title="Refresh port list"
            >
              {loading ? '…' : '↺'}
            </button>
          </div>
        </div>

        {connected ? (
          <button
            onClick={handleDisconnect}
            className="px-4 py-2 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={handleConnect}
            disabled={!selectedPort}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40"
          >
            Connect
          </button>
        )}

        {connected && (
          <button
            onClick={handleTare}
            className="px-4 py-2 text-sm bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50"
          >
            Tare
          </button>
        )}
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2 text-sm">
        <span
          className={`inline-block w-2.5 h-2.5 rounded-full ${
            connected ? 'bg-green-500' : hasError ? 'bg-red-500' : 'bg-gray-400'
          }`}
        />
        <span className={connected ? 'text-green-700 dark:text-green-400' : hasError ? 'text-red-600 dark:text-red-400' : 'text-gray-500'}>
          {connected
            ? `Connected — ${status.comPort}`
            : hasError
            ? `Error: ${status.error ?? 'unknown'}`
            : 'Disconnected'}
        </span>
      </div>

      {/* Live weight preview */}
      {connected && lastWeight && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-800 font-mono text-sm">
          <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {lastWeight.overload ? 'OVERLOAD' : `${lastWeight.weight.toFixed(3)} ${lastWeight.unit}`}
          </span>
          <span className={`ml-3 text-xs ${lastWeight.stable ? 'text-green-600 dark:text-green-400' : 'text-amber-500'}`}>
            {lastWeight.stable ? 'STABLE' : 'UNSTABLE'}
          </span>
        </div>
      )}
    </div>
  )
}
