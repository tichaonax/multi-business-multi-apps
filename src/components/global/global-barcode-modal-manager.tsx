'use client'

import { useState, useEffect } from 'react'
import { globalBarcodeService, GlobalBarcodeEvent } from '@/lib/services/global-barcode-service'
import { GlobalBarcodeModal } from './global-barcode-modal'

export function GlobalBarcodeModalManager() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentBarcode, setCurrentBarcode] = useState<string>('')
  const [currentConfidence, setCurrentConfidence] = useState<'high' | 'medium' | 'low'>('low')

  useEffect(() => {
    console.log('🔍 GlobalBarcodeModalManager: Setting up listener')

    // Subscribe to global barcode events
    const unsubscribe = globalBarcodeService.addListener({
      onBarcodeScanned: (event: GlobalBarcodeEvent) => {
        console.log('🎯 GlobalBarcodeModalManager: Barcode scanned event received:', event.barcode, `(${event.confidence} confidence)`)
        console.log('🎯 GlobalBarcodeModalManager: Service enabled?', globalBarcodeService.isEnabled())
        console.log('🎯 GlobalBarcodeModalManager: Service initialized?', globalBarcodeService.isServiceInitialized())

        // Show the modal with the scanned barcode
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
  }, [])

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
    />
  )
}