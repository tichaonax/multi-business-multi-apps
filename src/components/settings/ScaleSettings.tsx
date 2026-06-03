'use client'

import { useEffect, useState } from 'react'
import type { ComPort, ScaleStatus, ScaleWeight } from '@/types/electron'

interface ScaleSettingsProps {
  businessId?: string
}

export function ScaleSettings({ businessId }: ScaleSettingsProps) {
  const [isElectron, setIsElectron] = useState(false)
  const [ports, setPorts] = useState<ComPort[]>([])
  const [selectedPort, setSelectedPort] = useState<string>('')
  const [status, setStatus] = useState<ScaleStatus>({ status: 'disconnected', comPort: null })
  const [lastWeight, setLastWeight] = useState<ScaleWeight | null>(null)
  const [loading, setLoading] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [detectedBaud, setDetectedBaud] = useState<number | null>(null)
  const [detectError, setDetectError] = useState(false)
  // Baud rate saved from a previous successful detection
  const [savedBaud, setSavedBaud] = useState<number | null>(null)
  const [dbSaveStatus, setDbSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle')

  // One-time Electron setup: subscriptions + load local store values
  useEffect(() => {
    if (!window.electron) return
    setIsElectron(true)
    window.electron.scale.listPorts().then(setPorts)
    window.electron.scale.getSavedBaud().then(setSavedBaud)
    window.electron.scale.getSavedPort().then((saved) => {
      if (saved) setSelectedPort(saved)
    })
    const unsubStatus = window.electron.scale.onStatus((s) => setStatus(s))
    const unsubWeight = window.electron.scale.onWeight((w) => setLastWeight(w))
    return () => { unsubStatus(); unsubWeight() }
  }, [])

  // DB fallback: runs when businessId becomes available (or changes)
  useEffect(() => {
    if (!window.electron || !businessId) return
    window.electron.scale.getSavedPort().then(async (saved) => {
      if (saved) return // local store wins — no need for DB
      try {
        const res = await fetch(`/api/scale-config?businessId=${businessId}`)
        if (!res.ok) return
        const { scaleConfig } = await res.json()
        if (scaleConfig?.comPort) {
          setSelectedPort(scaleConfig.comPort)
          if (scaleConfig.baudRate) setSavedBaud(scaleConfig.baudRate)
          window.electron!.scale.connect(scaleConfig.comPort, scaleConfig.baudRate ?? 1200)
          console.log('[ScaleSettings] Restored from DB:', scaleConfig)
        }
      } catch (_) {}
    })
  }, [businessId])

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

  // Full detect + connect: probes each baud rate, then connects
  async function handleDetectAndConnect() {
    if (!window.electron || !selectedPort) return
    setDetecting(true)
    setDetectedBaud(null)
    setDetectError(false)
    const { baudRate } = await window.electron.scale.detectBaud(selectedPort)
    setDetecting(false)
    if (!baudRate) {
      setDetectError(true)
      return
    }
    setDetectedBaud(baudRate)
    setSavedBaud(baudRate)
    await window.electron.scale.connect(selectedPort, baudRate)
    saveToDb(selectedPort, baudRate)
  }

  // Quick connect: skip detection, use the already-known baud rate
  async function handleQuickConnect() {
    if (!window.electron || !selectedPort || !savedBaud) return
    setDetectError(false)
    await window.electron.scale.connect(selectedPort, savedBaud)
    saveToDb(selectedPort, savedBaud)
  }

  async function saveToDb(comPort: string, baudRate: number) {
    if (!businessId) {
      console.error('[ScaleSettings] saveToDb: no businessId — config will NOT be saved to DB')
      return
    }
    setDbSaveStatus('saving')
    try {
      const res = await fetch('/api/scale-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, comPort, baudRate }),
      })
      if (res.ok) {
        setDbSaveStatus('saved')
        console.log('[ScaleSettings] Scale config saved to DB:', { businessId, comPort, baudRate })
      } else {
        const err = await res.json().catch(() => ({}))
        console.error('[ScaleSettings] DB save failed:', res.status, err)
        setDbSaveStatus('failed')
      }
    } catch (e) {
      console.error('[ScaleSettings] DB save error:', e)
      setDbSaveStatus('failed')
    }
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
          <>
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50"
            >
              Disconnect
            </button>
            <button
              onClick={handleTare}
              className="px-4 py-2 text-sm bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50"
            >
              Tare
            </button>
          </>
        ) : (
          <>
            {/* Quick Connect — available when a baud rate was already detected */}
            {savedBaud && (
              <button
                onClick={handleQuickConnect}
                disabled={!selectedPort}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40"
                title={`Connect at ${savedBaud} baud (previously detected)`}
              >
                Connect ({savedBaud} baud)
              </button>
            )}
            {/* Full detect + connect */}
            <button
              onClick={handleDetectAndConnect}
              disabled={!selectedPort || detecting}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40"
            >
              {detecting ? 'Detecting…' : savedBaud ? 'Re-detect' : 'Detect & Connect'}
            </button>
          </>
        )}
      </div>

      {/* Feedback */}
      {detecting && (
        <p className="text-sm text-blue-600 dark:text-blue-400">
          Detecting baud rate… (trying 1200 → 38400)
        </p>
      )}
      {!detecting && detectError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Could not detect baud rate — check the scale is on and the cable is connected.
          {savedBaud && ' Try "Connect" to use the previously detected baud rate instead.'}
        </p>
      )}
      {!detecting && detectedBaud && (
        <p className="text-sm text-green-600 dark:text-green-400">
          Detected: {detectedBaud} baud
        </p>
      )}

      {/* DB save status */}
      {dbSaveStatus === 'saving' && (
        <p className="text-xs text-gray-400">Saving configuration to database…</p>
      )}
      {dbSaveStatus === 'saved' && (
        <p className="text-xs text-green-600 dark:text-green-400">Configuration saved — will auto-connect on next launch.</p>
      )}
      {dbSaveStatus === 'failed' && (
        <p className="text-xs text-red-600 dark:text-red-400">Failed to save to database. Check browser console for details.</p>
      )}

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
