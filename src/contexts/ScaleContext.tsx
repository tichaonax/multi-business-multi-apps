'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import type { ScaleWeight, ScaleStatus } from '@/types/electron'

interface ScaleContextValue {
  weight: ScaleWeight | null
  status: ScaleStatus
  isElectron: boolean
  isConfigured: boolean
  tare: () => Promise<void>
}

const defaultStatus: ScaleStatus = { status: 'disconnected', comPort: null }

const ScaleContext = createContext<ScaleContextValue>({
  weight: null,
  status: defaultStatus,
  isElectron: false,
  isConfigured: false,
  tare: async () => {},
})

export function ScaleProvider({ children }: { children: ReactNode }) {
  const [isElectron, setIsElectron] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)
  const [weight, setWeight] = useState<ScaleWeight | null>(null)
  const [status, setStatus] = useState<ScaleStatus>(defaultStatus)

  useEffect(() => {
    if (!window.electron?.scale) return
    setIsElectron(true)

    // Check if a COM port has been saved (scale was previously configured)
    window.electron.scale.getSavedPort().then((saved) => {
      if (saved) setIsConfigured(true)
    })

    const unsubWeight = window.electron.scale.onWeight(setWeight)
    const unsubStatus = window.electron.scale.onStatus((s) => {
      setStatus(s)
      // Mark configured as soon as a successful connection is made
      if (s.status === 'connected') setIsConfigured(true)
    })

    return () => {
      unsubWeight()
      unsubStatus()
    }
  }, [])

  const tare = useCallback(async () => {
    if (!window.electron?.scale) return
    await window.electron.scale.tare()
  }, [])

  return (
    <ScaleContext.Provider value={{ weight, status, isElectron, isConfigured, tare }}>
      {children}
    </ScaleContext.Provider>
  )
}

export function useScale() {
  return useContext(ScaleContext)
}
