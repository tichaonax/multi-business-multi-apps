'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import type { ScaleWeight, ScaleStatus } from '@/types/electron'

interface ScaleContextValue {
  weight: ScaleWeight | null
  status: ScaleStatus
  isElectron: boolean
  tare: () => Promise<void>
}

const defaultStatus: ScaleStatus = { status: 'disconnected', comPort: null }

const ScaleContext = createContext<ScaleContextValue>({
  weight: null,
  status: defaultStatus,
  isElectron: false,
  tare: async () => {},
})

export function ScaleProvider({ children }: { children: ReactNode }) {
  const [isElectron, setIsElectron] = useState(false)
  const [weight, setWeight] = useState<ScaleWeight | null>(null)
  const [status, setStatus] = useState<ScaleStatus>(defaultStatus)

  useEffect(() => {
    if (!window.electron?.scale) return
    setIsElectron(true)

    const unsubWeight = window.electron.scale.onWeight(setWeight)
    const unsubStatus = window.electron.scale.onStatus(setStatus)

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
    <ScaleContext.Provider value={{ weight, status, isElectron, tare }}>
      {children}
    </ScaleContext.Provider>
  )
}

export function useScale() {
  return useContext(ScaleContext)
}
