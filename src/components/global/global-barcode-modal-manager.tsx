'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { globalBarcodeService, GlobalBarcodeEvent } from '@/lib/services/global-barcode-service'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { GlobalBarcodeModal } from './global-barcode-modal'

// Auth/public routes where the barcode modal must never appear
const AUTH_ROUTE_PREFIXES = ['/auth', '/signin', '/login', '/register', '/verify', '/reset-password']

export function GlobalBarcodeModalManager() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentBarcode, setCurrentBarcode] = useState<string>('')
  const [currentConfidence, setCurrentConfidence] = useState<'high' | 'medium' | 'low'>('low')
  const pathname = usePathname()

  // Source business context from the session-scoped provider — NOT from localStorage directly.
  // localStorage is shared across all users on the same machine; the context validates
  // the stored business ID against the authenticated user's actual memberships, so it is
  // always correct for the current session regardless of who was logged in before.
  const { currentBusinessId, currentBusiness, isAuthenticated } = useBusinessPermissionsContext()

  useEffect(() => {
    // Do not attach the barcode listener at all until the user is authenticated
    // AND they are not on an auth/sign-in page.
    const isAuthPage = AUTH_ROUTE_PREFIXES.some(prefix => pathname?.startsWith(prefix))
    if (!isAuthenticated || isAuthPage) return

    console.log('🔍 GlobalBarcodeModalManager: Setting up listener')

    // Subscribe to global barcode events
    const unsubscribe = globalBarcodeService.addListener({
      onBarcodeScanned: (event: GlobalBarcodeEvent) => {
        console.log('🎯 GlobalBarcodeModalManager: Barcode scanned event received:', event.barcode, `(${event.confidence} confidence)`)
        console.log('🎯 GlobalBarcodeModalManager: Service enabled?', globalBarcodeService.isEnabled())
        console.log('🎯 GlobalBarcodeModalManager: Service initialized?', globalBarcodeService.isServiceInitialized())

        // Show the modal with the scanned barcode.
        // currentBusinessId / currentBusiness are read from the closure at call time —
        // they are already the correct values for the active session because the context
        // re-validates on every session change.
        setCurrentBarcode(event.barcode)
        setCurrentConfidence(event.confidence)
        setIsModalOpen(true)
      },
      priority: 10 // High priority for the modal manager
    })

    console.log('🔍 GlobalBarcodeModalManager: Listener added, service state:', {
      enabled: globalBarcodeService.isEnabled(),
      initialized: globalBarcodeService.isServiceInitialized(),
      listenerCount: globalBarcodeService.getListenerCount()
    })

    return unsubscribe
  }, [isAuthenticated, pathname])

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setCurrentBarcode('')
    setCurrentConfidence('low')
  }

  return (
    <GlobalBarcodeModal
      isOpen={isModalOpen}
      onClose={handleCloseModal}
      barcode={currentBarcode}
      confidence={currentConfidence}
      currentBusinessId={currentBusinessId ?? undefined}
      currentBusinessType={currentBusiness?.businessType ?? undefined}
      currentBusinessName={currentBusiness?.businessName ?? undefined}
    />
  )
}