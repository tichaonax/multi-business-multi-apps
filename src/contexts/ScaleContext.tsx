'use client'

// MBM-275 Phase 4: three-way fallback so nothing that works today changes.
//  1. Electron present (window.electron?.scale) -> unchanged, exact same
//     code path as before this phase touched the file at all.
//  2. No Electron, but this business has an AGENT-mode scale config
//     (paired workstation relay) -> connect a Socket.io client, join the
//     workstationAgentId's room, and mirror the relayed weight/status
//     events + call the new REST routes for connect/disconnect/tare.
//  3. Neither -> unavailable, identical to today's non-Electron behavior.

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'
import type { ScaleWeight, ScaleStatus } from '@/types/electron'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

interface ScaleContextValue {
  weight: ScaleWeight | null
  status: ScaleStatus
  isElectron: boolean
  /** True once either Electron or an agent-relayed scale is usable — the
   *  gate consuming pages should check instead of isElectron alone, so
   *  agent-relay businesses see the same UI Electron ones always have. */
  isAvailable: boolean
  isConfigured: boolean
  isConnected: boolean
  tare: () => Promise<void>
  /** Re-attempts the agent-relay connect flow on demand — no-op for Electron.
   *  MBM-277: the agent-mode connect in the effect below only ever runs once
   *  per business/mount; if it lands during a brief AGENT_OFFLINE window
   *  (the workstation agent reconnecting after a restart or network blip),
   *  status gets stuck on 'error' indefinitely with nothing to recover it
   *  short of a full page reload, even though the agent is back online
   *  moments later. This lets a "Retry" button re-run that same flow. */
  reconnect: () => void
}

const defaultStatus: ScaleStatus = { status: 'disconnected', comPort: null }

const ScaleContext = createContext<ScaleContextValue>({
  weight: null,
  status: defaultStatus,
  isElectron: false,
  isAvailable: false,
  isConfigured: false,
  isConnected: false,
  tare: async () => {},
  reconnect: () => {},
})

export function ScaleProvider({ children }: { children: ReactNode }) {
  const [isElectron, setIsElectron] = useState(false)
  const [isAgentMode, setIsAgentMode] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)
  const [weight, setWeight] = useState<ScaleWeight | null>(null)
  const [status, setStatus] = useState<ScaleStatus>(defaultStatus)
  const { currentBusinessId } = useBusinessPermissionsContext()
  const socketRef = useRef<Socket | null>(null)
  // Bumping this re-runs the agent-relay effect below from scratch (tears
  // down the old socket, re-fetches config, re-attempts connect) — see
  // reconnect()'s comment on the context value.
  const [reconnectTick, setReconnectTick] = useState(0)

  // ── Branch 1: Electron — unchanged from before this phase ──────────────
  useEffect(() => {
    if (!window.electron?.scale) return
    setIsElectron(true)

    const unsubWeight = window.electron.scale.onWeight(setWeight)
    const unsubStatus = window.electron.scale.onStatus((s) => {
      setStatus(s)
      if (s.status === 'connected') setIsConfigured(true)
    })

    return () => {
      unsubWeight()
      unsubStatus()
    }
  }, [])

  useEffect(() => {
    if (!window.electron?.scale) return

    window.electron.scale.getSavedPort().then(async (savedPort) => {
      if (savedPort) {
        setIsConfigured(true)
        const savedBaud = await window.electron!.scale.getSavedBaud()
        await window.electron!.scale.connect(savedPort, savedBaud ?? 1200)
        return
      }

      if (!currentBusinessId) return
      try {
        const res = await fetch(`/api/scale-config?businessId=${currentBusinessId}`)
        if (!res.ok) return
        const { scaleConfig } = await res.json()
        if (scaleConfig?.comPort) {
          console.log('[ScaleContext] Restoring scale from DB:', scaleConfig)
          await window.electron!.scale.connect(scaleConfig.comPort, scaleConfig.baudRate ?? 1200)
          setIsConfigured(true)
        }
      } catch (_) {}
    })
  }, [currentBusinessId])

  // ── Branch 2: agent relay — only attempted when Electron isn't present ─
  useEffect(() => {
    if (window.electron?.scale) return // Electron takes priority — branch 1 already handles it
    if (!currentBusinessId) return

    let cancelled = false

    fetch(`/api/scale/device-config?businessId=${currentBusinessId}`)
      .then(res => res.ok ? res.json() : null)
      .then(async (data) => {
        if (cancelled) return
        const config = data?.config
        if (!config?.comPort || !config?.workstationAgentId) {
          setIsAgentMode(false)
          return
        }

        setIsAgentMode(true)
        setIsConfigured(true)

        const socket = io(window.location.origin, { transports: ['websocket', 'polling'] })
        socketRef.current = socket

        socket.on('connect', () => {
          socket.emit('join-room', { room: `workstation-scale:${config.workstationAgentId}` })
        })
        socket.on('scale:weight', (reading: ScaleWeight) => { if (!cancelled) setWeight(reading) })
        socket.on('scale:status', (s: ScaleStatus) => {
          if (cancelled) return
          setStatus(s)
        })

        // Auto-connect, same intent as Electron's auto-restore-on-mount —
        // idempotent on the agent side (mirrors ScaleDriver.connect()'s own
        // mutex), safe to call on every business switch.
        //
        // Phase 5: if the agent is offline, dispatchJob rejects before the
        // agent ever gets a chance to emit its own scale:status — there is
        // no "disconnect" event to relay in that case, since it was never
        // connected. Read the response here and surface it directly,
        // mirroring R710's "the local agent is offline, contact IT" UX
        // instead of leaving the UI showing a plain, unexplained
        // "disconnected" as if the scale just wasn't plugged in yet.
        try {
          const res = await fetch('/api/scale/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ businessId: currentBusinessId }),
          })
          if (!res.ok && !cancelled) {
            const data = await res.json().catch(() => ({}))
            setStatus({ status: 'error', comPort: config.comPort, error: data.error || 'Failed to connect to scale' })
          }
        } catch (_) {
          if (!cancelled) setStatus({ status: 'error', comPort: config.comPort, error: 'Failed to reach the server to connect the scale' })
        }
      })
      .catch(() => { if (!cancelled) setIsAgentMode(false) })

    return () => {
      cancelled = true
      socketRef.current?.disconnect()
      socketRef.current = null
    }
  }, [currentBusinessId, reconnectTick])

  const reconnect = useCallback(() => {
    if (window.electron?.scale) return
    setStatus({ status: 'connecting', comPort: null })
    setReconnectTick(t => t + 1)
  }, [])

  const tare = useCallback(async () => {
    if (window.electron?.scale) {
      await window.electron.scale.tare()
      return
    }
    if (isAgentMode && currentBusinessId) {
      await fetch('/api/scale/tare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: currentBusinessId }),
      })
    }
  }, [isAgentMode, currentBusinessId])

  return (
    <ScaleContext.Provider
      value={{
        weight,
        status,
        isElectron,
        isAvailable: isElectron || isAgentMode,
        isConfigured,
        isConnected: status.status === 'connected',
        tare,
        reconnect,
      }}
    >
      {children}
    </ScaleContext.Provider>
  )
}

export function useScale() {
  return useContext(ScaleContext)
}
