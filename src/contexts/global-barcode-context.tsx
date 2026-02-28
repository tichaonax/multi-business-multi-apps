'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { globalBarcodeService } from '@/lib/services/global-barcode-service'
import { SessionUser } from '@/lib/permission-utils'

interface GlobalBarcodeContextType {
  isEnabled: boolean
  enableScanning: () => void
  disableScanning: () => void
}

const GlobalBarcodeContext = createContext<GlobalBarcodeContextType | null>(null)

function GlobalBarcodeProviderInner({ children }: { children: React.ReactNode }) {
  const [isEnabled, setIsEnabled] = useState(false)
  const { data: session, status } = useSession()

  // Sync the current user into the service on every session change.
  // initialize() handles first-run setup; on subsequent calls it delegates
  // to updateUser() internally, re-enabling scanning after a kiosk login.
  useEffect(() => {
    if (status === 'loading') return

    const sessionUser: SessionUser | null = session?.user ? {
      id: (session.user as any).id || '',
      email: session.user.email || null,
      name: session.user.name || null,
      role: (session.user as any).role || 'user',
      permissions: (session.user as any).permissions || {},
      businessMemberships: (session.user as any).businessMemberships || []
    } : null

    globalBarcodeService.initialize(sessionUser)
    setIsEnabled(globalBarcodeService.isEnabled())
  }, [session, status])

  // Poll service state so the context stays in sync with any external enable/disable calls
  useEffect(() => {
    const checkEnabled = () => setIsEnabled(globalBarcodeService.isEnabled())
    const interval = setInterval(checkEnabled, 1000)
    return () => clearInterval(interval)
  }, [])

  const enableScanning = () => {
    globalBarcodeService.enable()
    setIsEnabled(globalBarcodeService.isEnabled())
  }

  const disableScanning = () => {
    globalBarcodeService.disable()
    setIsEnabled(globalBarcodeService.isEnabled())
  }

  return (
    <GlobalBarcodeContext.Provider value={{
      isEnabled,
      enableScanning,
      disableScanning
    }}>
      {children}
    </GlobalBarcodeContext.Provider>
  )
}

export function GlobalBarcodeProvider({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Don't render anything on the server
  if (!isClient) {
    return <>{children}</>
  }

  return (
    <GlobalBarcodeProviderInner>
      {children}
    </GlobalBarcodeProviderInner>
  )
}

export function useGlobalBarcode() {
  const context = useContext(GlobalBarcodeContext)
  if (!context) {
    throw new Error('useGlobalBarcode must be used within a GlobalBarcodeProvider')
  }
  return context
}