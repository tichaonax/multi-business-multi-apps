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

import { useState, useEffect } from 'react'
import { Printer, X, Check, AlertCircle } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { useToastContext } from '@/components/ui/toast'
import { ReceiptTemplate } from '@/components/printing/receipt-template'
import type { ReceiptData, NetworkPrinter, BusinessType } from '@/types/printing'

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
  const toast = useToastContext()

  // Load configured receipt printer on mount
  useEffect(() => {
    if (isOpen) {
      loadPrinters()
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

      // Auto-select first online printer if none selected
      if (!selectedPrinterId && availablePrinters.length > 0) {
        setSelectedPrinterId(availablePrinters[0].id)
      }

      // Check if no printers available
      if (availablePrinters.length === 0) {
        toast.push('No receipt printers found. Please configure a printer in Admin > Printers.')
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

    setLoading(true)

    try {
      await onPrintConfirm({
        printerId: selectedPrinterId,
        copies,
        printCustomerCopy,
      })

      toast.push('Receipt sent to printer')
      onClose()

    } catch (error) {
      console.error('Print failed:', error)
      toast.push('Error: Print failed - ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const selectedPrinter = printers.find(p => p.id === selectedPrinterId)
  const isRestaurant = businessType === 'restaurant'

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
                  receiptType: 'business' // Always show business copy in preview
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
              Select Printer
            </label>

            {printersLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 dark:border-gray-100"></div>
                Loading printers...
              </div>
            ) : printers.length === 0 ? (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <div>
                  <div className="font-medium text-yellow-800 dark:text-yellow-200">
                    No printers configured
                  </div>
                  <div className="text-yellow-700 dark:text-yellow-300 text-xs mt-1">
                    Please set up a printer in Admin → Printers
                  </div>
                </div>
              </div>
            ) : (
              <select
                value={selectedPrinterId || ''}
                onChange={(e) => setSelectedPrinterId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-600"
              >
                {printers.map((printer) => (
                  <option key={printer.id} value={printer.id}>
                    {printer.printerName} {printer.isOnline ? '(Online)' : '(Offline)'}
                  </option>
                ))}
              </select>
            )}

            {selectedPrinter && (
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
          </div>

          {/* Number of Copies */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Number of Copies
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
              Business copy will print {copies} time{copies > 1 ? 's' : ''}
            </p>
          </div>

          {/* Customer Copy Toggle (Restaurant Only) */}
          {isRestaurant && (
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
              <li>• Business Copy: {copies} {copies > 1 ? 'copies' : 'copy'}</li>
              {isRestaurant && printCustomerCopy && (
                <li>• Customer Copy: 1 copy</li>
              )}
              {isRestaurant && !printCustomerCopy && (
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
            disabled={loading || !selectedPrinterId || !selectedPrinter?.isOnline}
          >
            <Printer className="w-4 h-4 mr-2" />
            {loading ? 'Printing...' : 'Print Receipt'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
