'use client'

/**
 * Receipt Preview Component
 * Shows a preview of the receipt before printing
 */

import { useState, useEffect } from 'react'
import { Printer, X } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { PrinterSelector } from './printer-selector'
import type { ReceiptData, NetworkPrinter } from '@/types/printing'

interface ReceiptPreviewProps {
  isOpen: boolean
  onClose: () => void
  receiptData: ReceiptData
  onPrint?: (printer: NetworkPrinter) => Promise<void>
}

export function ReceiptPreview({
  isOpen,
  onClose,
  receiptData,
  onPrint,
}: ReceiptPreviewProps) {
  const [showPrinterSelector, setShowPrinterSelector] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [availablePrinters, setAvailablePrinters] = useState<NetworkPrinter[]>([])
  const [autoSelectedPrinter, setAutoSelectedPrinter] = useState<NetworkPrinter | null>(null)
  const { push: showToast } = useToast()

  // Fetch available receipt printers when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAvailablePrinters()
    }
  }, [isOpen])

  async function fetchAvailablePrinters() {
    try {
      const response = await fetch('/api/printers?printerType=receipt&isOnline=true')
      if (response.ok) {
        const data = await response.json()
        const printers = data.printers || []
        setAvailablePrinters(printers)

        // If there's only one printer, auto-select it
        if (printers.length === 1) {
          setAutoSelectedPrinter(printers[0])
        }
      }
    } catch (error) {
      console.error('Error fetching printers:', error)
    }
  }

  async function handleSelectPrinter(printer: NetworkPrinter) {
    if (!onPrint) {
      showToast('Error: Print handler not configured')
      return
    }

    try {
      setPrinting(true)
      await onPrint(printer)

      showToast(`✅ Receipt sent to ${printer.printerName}`)

      onClose()
    } catch (error) {
      console.error('Print error:', error)
      showToast(`❌ Print failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setPrinting(false)
    }
  }

  function handlePrintClick() {
    if (autoSelectedPrinter) {
      // Auto-print with the single available printer
      handleSelectPrinter(autoSelectedPrinter)
    } else {
      // Show printer selector
      setShowPrinterSelector(true)
    }
  }

  function formatCurrency(amount: number): string {
    return `$${amount.toFixed(2)}`
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Receipt Preview"
        size="lg"
      >
        <div className="flex flex-col h-full space-y-4">
          {/* Receipt Preview Card - Scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <Card className="p-6 bg-white dark:bg-gray-800 h-full">
              <div className="font-mono text-sm space-y-2 max-w-md mx-auto">
              {/* Business Header */}
              <div className="text-center border-b-2 border-dashed border-gray-300 dark:border-gray-600 pb-3">
                <h2 className="font-bold text-lg text-gray-900 dark:text-gray-100">{receiptData.businessName}</h2>
                {receiptData.businessAddress && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">{receiptData.businessAddress}</p>
                )}
                {receiptData.businessPhone && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">{receiptData.businessPhone}</p>
                )}
                {receiptData.businessTaxId && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">Tax ID: {receiptData.businessTaxId}</p>
                )}
              </div>

              {/* Receipt Number and Date */}
              <div className="text-center py-2">
                <p className="font-bold text-gray-900 dark:text-gray-100">Receipt #{receiptData.receiptNumber}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {new Date(receiptData.date).toLocaleString()}
                </p>
                {receiptData.cashierName && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">Cashier: {receiptData.cashierName}</p>
                )}
              </div>

              {/* Items */}
              <div className="border-t-2 border-dashed border-gray-300 dark:border-gray-600 pt-2">
                {receiptData.items.map((item, index) => (
                  <div key={index} className="flex justify-between py-1 text-gray-900 dark:text-gray-100">
                    <div className="flex-1">
                      <span>{item.name}</span>
                      {item.quantity > 1 && (
                        <span className="text-gray-600 dark:text-gray-400 ml-2">x{item.quantity}</span>
                      )}
                    </div>
                    <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t-2 border-dashed border-gray-300 dark:border-gray-600 pt-2 space-y-1">
                <div className="flex justify-between text-gray-900 dark:text-gray-100">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(receiptData.subtotal)}</span>
                </div>

                {receiptData.discount && receiptData.discount > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Discount:</span>
                    <span>-{formatCurrency(receiptData.discount)}</span>
                  </div>
                )}

                {receiptData.tax && receiptData.tax > 0 && (
                  <div className="flex justify-between text-gray-900 dark:text-gray-100">
                    <span>Tax:</span>
                    <span>{formatCurrency(receiptData.tax)}</span>
                  </div>
                )}

                <div className="flex justify-between font-bold text-lg border-t border-gray-300 dark:border-gray-600 pt-1 text-gray-900 dark:text-gray-100">
                  <span>Total:</span>
                  <span>{formatCurrency(receiptData.total)}</span>
                </div>
              </div>

              {/* Payment Method */}
              {receiptData.paymentMethod && (
                <div className="border-t border-dashed border-gray-300 dark:border-gray-600 pt-2 text-gray-900 dark:text-gray-100">
                  <div className="flex justify-between">
                    <span>Payment:</span>
                    <span>{receiptData.paymentMethod}</span>
                  </div>

                  {receiptData.cashTendered && (
                    <>
                      <div className="flex justify-between">
                        <span>Cash Tendered:</span>
                        <span>{formatCurrency(receiptData.cashTendered)}</span>
                      </div>
                      {receiptData.changeDue !== undefined && (
                        <div className="flex justify-between font-medium">
                          <span>Change:</span>
                          <span>{formatCurrency(receiptData.changeDue)}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Customer Info */}
              {(receiptData.customerName || receiptData.customerPhone) && (
                <div className="border-t border-dashed border-gray-300 dark:border-gray-600 pt-2 text-xs text-gray-900 dark:text-gray-100">
                  {receiptData.customerName && (
                    <p>Customer: {receiptData.customerName}</p>
                  )}
                  {receiptData.customerPhone && (
                    <p>Phone: {receiptData.customerPhone}</p>
                  )}
                </div>
              )}

              {/* Notes */}
              {receiptData.notes && (
                <div className="border-t border-dashed border-gray-300 dark:border-gray-600 pt-2 text-xs text-center text-gray-600 dark:text-gray-400">
                  {receiptData.notes}
                </div>
              )}

              {/* Footer */}
              <div className="text-center text-xs text-gray-600 dark:text-gray-400 pt-2 border-t-2 border-dashed border-gray-300 dark:border-gray-600">
                <p>Thank you for your business!</p>
              </div>
            </div>
          </Card>
          </div>

          {/* Action Buttons - Always visible */}
          <div className="flex gap-2 justify-end flex-shrink-0 border-t border-gray-200 dark:border-gray-700 pt-4">
            <Button variant="outline" onClick={onClose} disabled={printing}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handlePrintClick}
              disabled={printing}
            >
              <Printer className="w-4 h-4 mr-2" />
              {printing ? 'Printing...' : autoSelectedPrinter ? `Print to ${autoSelectedPrinter.printerName}` : 'Print'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Printer Selector */}
      <PrinterSelector
        isOpen={showPrinterSelector}
        onClose={() => setShowPrinterSelector(false)}
        onSelect={handleSelectPrinter}
        printerType="receipt"
        title="Select Receipt Printer"
        description="Choose a printer to print this receipt"
      />
    </>
  )
}
