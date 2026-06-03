'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import type { ScaleWeight, ScaleStatus } from '@/types/electron'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

interface ScaleContextValue {
  weight: ScaleWeight | null
  status: ScaleStatus
  isElectron: boolean
  isConfigured: boolean
  isConnected: boolean
  tare: () => Promise<void>
}

const defaultStatus: ScaleStatus = { status: 'disconnected', comPort: null }

const ScaleContext = createContext<ScaleContextValue>({
  weight: null,
  status: defaultStatus,
  isElectron: false,
  isConfigured: false,
  isConnected: false,
  tare: async () => {},
})

export function ScaleProvider({ children }: { children: ReactNode }) {
  const [isElectron, setIsElectron] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)
  const [weight, setWeight] = useState<ScaleWeight | null>(null)
  const [status, setStatus] = useState<ScaleStatus>(defaultStatus)
  const { currentBusinessId } = useBusinessPermissionsContext()

  // One-time setup: subscribe to scale events
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

  // Auto-restore: runs whenever the active business changes.
  // On switch: if a saved port exists, always call connect() — it's idempotent
  // (scale service ignores the call if the port is already open on the same path).
  // Falls back to DB config when no local store entry exists.
  useEffect(() => {
    if (!window.electron?.scale) return

    window.electron.scale.getSavedPort().then(async (savedPort) => {
      if (savedPort) {
        setIsConfigured(true)
        // Re-connect on every business switch so scale is always live after switching
        const savedBaud = await window.electron!.scale.getSavedBaud()
        await window.electron!.scale.connect(savedPort, savedBaud ?? 1200)
        return
      }

      // No local config — try database
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

  const tare = useCallback(async () => {
    if (!window.electron?.scale) return
    await window.electron.scale.tare()
  }, [])

  return (
    <ScaleContext.Provider value={{ weight, status, isElectron, isConfigured, isConnected: status.status === 'connected', tare }}>
      {children}
    </ScaleContext.Provider>
  )
}

export function useScale() {
  return useContext(ScaleContext)
}
