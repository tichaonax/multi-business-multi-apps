'use client'

/**
 * Unified Receipt Preview Modal
 *
 * Single modal component for all business types
 * Features:
 * - Receipt preview using standard template
 * - Printer selection
 * - Dual receipt support (Restaurant: business + customer copy)
 * - Print settings (copies, customer copy toggle)
 * - Print/Cancel actions
 */

import { useState, useEffect, useRef } from 'react'
import { Printer, X, Check, AlertCircle, Usb } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { useToastContext } from '@/components/ui/toast'
import { ReceiptTemplate } from '@/components/printing/receipt-template'
import { LocalPrinterSetup } from '@/components/printing/local-printer-setup'
import { generateReceipt } from '@/lib/printing/receipt-templates'
import {
  isWebSerialSupported,
  getLocalPrinterConfig,
  printToLocalPrinter,
  isLocalPrinterAvailable,
} from '@/lib/printing/local-serial-printer'
import type { ReceiptData, NetworkPrinter, BusinessType } from '@/types/printing'

const LOCAL_PRINTER_ID = 'local-serial'

interface UnifiedReceiptPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  receiptData: ReceiptData | null
  businessType: BusinessType
  onPrintConfirm: (options: {
    printerId?: string
    copies: number
    printCustomerCopy: boolean
  }) => Promise<void>
}

export function UnifiedReceiptPreviewModal({
  isOpen,
  onClose,
  receiptData,
  businessType,
  onPrintConfirm,
}: UnifiedReceiptPreviewModalProps) {
  const [printers, setPrinters] = useState<NetworkPrinter[]>([])
  const [selectedPrinterId, setSelectedPrinterId] = useState<string | undefined>()
  const [copies, setCopies] = useState(1)
  const [printCustomerCopy, setPrintCustomerCopy] = useState(true)
  const [loading, setLoading] = useState(false)
  const [printersLoading, setPrintersLoading] = useState(true)
  const [hasLocalPrinter, setHasLocalPrinter] = useState(false)
  const [localPrinterName, setLocalPrinterName] = useState('')
  const [showLocalSetup, setShowLocalSetup] = useState(false)
  const toast = useToastContext()

  // Ref-based guard to prevent double-clicks (more reliable than state)
  const isPrintingRef = useRef(false)

  // Load configured receipt printer on mount
  useEffect(() => {
    if (isOpen) {
      loadPrinters()
      // Reset copies to 1 when modal opens (don't persist from previous session)
      setCopies(1)
      setPrintCustomerCopy(true)
      // Reset printing guard when modal opens
      isPrintingRef.current = false
    }
  }, [isOpen])

  async function loadPrinters() {
    try {
      setPrintersLoading(true)

      // Fetch available receipt printers
      const response = await fetch('/api/printers?printerType=receipt&isOnline=true')

      if (!response.ok) {
        throw new Error('Failed to load printers')
      }

      const data = await response.json()
      const availablePrinters = data.printers || []

      setPrinters(availablePrinters)

      // Check for local USB printer
      let localAvailable = false
      if (isWebSerialSupported()) {
        const localConfig = getLocalPrinterConfig()
        if (localConfig) {
          localAvailable = await isLocalPrinterAvailable()
          setHasLocalPrinter(localAvailable)
          setLocalPrinterName(localConfig.name)
        }
      }

      // Auto-select last used printer if available
      try {
        const lastPrinterId = localStorage.getItem('lastSelectedPrinterId')
        if (lastPrinterId) {
          // Check if it was the local printer
          if (lastPrinterId === LOCAL_PRINTER_ID && localAvailable) {
            setSelectedPrinterId(LOCAL_PRINTER_ID)
            console.log('✓ Auto-selected local USB printer')
          } else if (availablePrinters.length > 0) {
            const savedPrinter = availablePrinters.find((p: NetworkPrinter) => p.id === lastPrinterId)
            if (savedPrinter && savedPrinter.isOnline) {
              setSelectedPrinterId(lastPrinterId)
              console.log('✓ Auto-selected last used printer:', savedPrinter.printerName)
            } else if (savedPrinter && !savedPrinter.isOnline) {
              console.log('⚠️ Last used printer is offline:', savedPrinter.printerName)
            }
          }
        }
      } catch (storageError) {
        console.warn('Failed to load saved printer preference:', storageError)
      }

      // Check if no printers available at all
      if (availablePrinters.length === 0 && !localAvailable) {
        toast.push('No printers found. Configure a network printer in Admin > Printers, or set up a local USB printer.')
      }

    } catch (error) {
      console.error('Failed to load printers:', error)
      toast.push('Error: Failed to load available printers')
    } finally {
      setPrintersLoading(false)
    }
  }

  async function handlePrint() {
    if (!receiptData) {
      toast.push('Error: No receipt data')
      return
    }

    // Ref-based guard to prevent double-clicks (synchronous, not subject to React batching)
    if (isPrintingRef.current) {
      console.log('⚠️ Print already in progress (ref guard), ignoring click')
      return
    }

    // Also check state for UI consistency
    if (loading) {
      console.log('⚠️ Print already in progress (state guard), ignoring click')
      return
    }

    // Set ref immediately (synchronous) to block subsequent clicks
    isPrintingRef.current = true
    setLoading(true)

    try {
      // Local USB printer path — print directly from browser via Web Serial
      if (selectedPrinterId === LOCAL_PRINTER_ID) {
        console.log('🖨️ [Modal] Printing to local USB printer via Web Serial')

        // Generate business copy ESC/POS string client-side
        const businessReceiptData = { ...receiptData, receiptType: 'business' as const }
        const businessEscPos = generateReceipt(businessReceiptData)
        await printToLocalPrinter(businessEscPos, 1)
        console.log('✅ Business copy printed locally')

        // Print customer copy if enabled
        if (supportsCustomerCopy && printCustomerCopy) {
          const customerReceiptData = { ...receiptData, receiptType: 'customer' as const }
          const customerEscPos = generateReceipt(customerReceiptData)
          await printToLocalPrinter(customerEscPos, copies)
          console.log('✅ Customer copy printed locally (' + copies + ' copies)')
        }

        toast.push('Receipt printed to local USB printer')
        onClose()
        return
      }

      // Network printer path — send to server print queue
      console.log('📋 [Modal] Calling onPrintConfirm at:', new Date().toISOString())
      console.log('   printerId:', selectedPrinterId)
      console.log('   copies:', copies)
      console.log('   printCustomerCopy:', printCustomerCopy)

      await onPrintConfirm({
        printerId: selectedPrinterId,
        copies,
        printCustomerCopy,
      })

      console.log('✅ [Modal] onPrintConfirm completed')
      toast.push('Receipt sent to printer')
      onClose()

    } catch (error) {
      console.error('Print failed:', error)
      toast.push('Error: Print failed - ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      isPrintingRef.current = false
      setLoading(false)
    }
  }

  const selectedPrinter = printers.find(p => p.id === selectedPrinterId)
  const isLocalSelected = selectedPrinterId === LOCAL_PRINTER_ID
  const isRestaurant = businessType === 'restaurant'
  const supportsCustomerCopy = ['restaurant', 'grocery', 'clothing', 'services'].includes(businessType)
  const hasPrintersOrLocal = printers.length > 0 || hasLocalPrinter

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Receipt Preview"
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Receipt Preview */}
        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
          <h3 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
            Receipt Preview
          </h3>

          {receiptData ? (
            <div className="bg-white dark:bg-gray-900 rounded border max-h-96 overflow-y-auto">
              <ReceiptTemplate
                data={{
                  ...receiptData,
                  receiptType: 'customer' // Show customer copy in preview to verify WiFi token details
                }}
              />
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No receipt data
            </div>
          )}
        </div>

        {/* Print Settings */}
        <div className="space-y-4">
          {/* Printer Selection */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Select Printer <span className="text-red-500">*</span>
            </label>

            {printersLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 dark:border-gray-100"></div>
                Loading printers...
              </div>
            ) : !hasPrintersOrLocal ? (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <div>
                  <div className="font-medium text-yellow-800 dark:text-yellow-200">
                    No printers configured
                  </div>
                  <div className="text-yellow-700 dark:text-yellow-300 text-xs mt-1">
                    Set up a network printer in Admin → Printers, or connect a local USB printer below.
                  </div>
                </div>
              </div>
            ) : (
              <select
                value={selectedPrinterId || ''}
                onChange={(e) => {
                  const printerId = e.target.value
                  setSelectedPrinterId(printerId)

                  // Save selected printer to localStorage for future use
                  if (printerId) {
                    try {
                      localStorage.setItem('lastSelectedPrinterId', printerId)
                      console.log('✓ Saved printer preference:', printerId)
                    } catch (storageError) {
                      console.warn('Failed to save printer preference:', storageError)
                    }
                  }
                }}
                className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-600"
              >
                <option value="">-- Select a printer --</option>
                {hasLocalPrinter && (
                  <option value={LOCAL_PRINTER_ID}>
                    {localPrinterName} (Local USB)
                  </option>
                )}
                {printers.map((printer) => (
                  <option key={printer.id} value={printer.id}>
                    {printer.printerName} {printer.isOnline ? '(Online)' : '(Offline)'}
                  </option>
                ))}
              </select>
            )}

            {!selectedPrinterId && hasPrintersOrLocal && (
              <div className="mt-2 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-4 h-4" />
                Please select a printer to continue
              </div>
            )}

            {isLocalSelected && (
              <div className="mt-2 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <Usb className="w-4 h-4" />
                Local USB printer — prints directly from this browser
              </div>
            )}

            {selectedPrinter && !isLocalSelected && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                {selectedPrinter.isOnline ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    Printer is online and ready
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    Printer is offline
                  </>
                )}
              </div>
            )}

            {/* Local USB Printer Setup */}
            {isWebSerialSupported() && (
              <div className="mt-3">
                {!hasLocalPrinter && !showLocalSetup && (
                  <button
                    onClick={() => setShowLocalSetup(true)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <Usb className="w-3 h-3" />
                    Setup Local USB Printer
                  </button>
                )}
                {showLocalSetup && !hasLocalPrinter && (
                  <LocalPrinterSetup
                    compact
                    onSetupComplete={(config) => {
                      setHasLocalPrinter(true)
                      setLocalPrinterName(config.name)
                      setSelectedPrinterId(LOCAL_PRINTER_ID)
                      setShowLocalSetup(false)
                      localStorage.setItem('lastSelectedPrinterId', LOCAL_PRINTER_ID)
                    }}
                  />
                )}
              </div>
            )}
          </div>

          {/* Number of Copies (for Customer Copy only) */}
          {supportsCustomerCopy && (
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Customer Copy Quantity
              </label>
              <input
                type="number"
                min="1"
                max="5"
                value={copies}
                onChange={(e) => setCopies(parseInt(e.target.value) || 1)}
                className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-600"
              />
              <p className="text-xs text-gray-500 mt-1">
                How many customer copies to print (business copy is always 1)
              </p>
            </div>
          )}

          {/* Customer Copy Toggle (Restaurant & Grocery) */}
          {supportsCustomerCopy && (
            <div className="flex items-center justify-between p-3 border rounded-lg dark:border-gray-600">
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Print Customer Copy
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Business copy always prints. Customer copy is optional.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={printCustomerCopy}
                  onChange={(e) => setPrintCustomerCopy(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          )}

          {/* Print Summary */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm">
            <div className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              Print Summary
            </div>
            <ul className="space-y-1 text-blue-800 dark:text-blue-200">
              <li>• Business Copy: 1 copy (always)</li>
              {supportsCustomerCopy && printCustomerCopy && (
                <li>• Customer Copy: {copies} {copies > 1 ? 'copies' : 'copy'}</li>
              )}
              {supportsCustomerCopy && !printCustomerCopy && (
                <li className="text-blue-600 dark:text-blue-400">• Customer Copy: Disabled</li>
              )}
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>

          <Button
            onClick={handlePrint}
            disabled={loading || !selectedPrinterId || (!isLocalSelected && !selectedPrinter?.isOnline)}
            title={
              !selectedPrinterId
                ? 'Please select a printer first'
                : !isLocalSelected && !selectedPrinter?.isOnline
                ? 'Selected printer is offline'
                : 'Print receipt'
            }
          >
            <Printer className="w-4 h-4 mr-2" />
            {loading ? 'Printing...' : 'Print Receipt'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
