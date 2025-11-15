'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { ReceiptData } from '@/types/printing'
import { ReceiptTemplate } from './receipt-template'
import { Printer, X, Settings } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ReceiptPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  receiptData: ReceiptData | null
  onPrint: (receiptData: ReceiptData, printerId?: string) => Promise<void>
  businessType?: string
}

interface PrinterConfig {
  id: string
  printerName: string
  printerType: string
  isOnline: boolean
}

export function ReceiptPreviewModal({
  isOpen,
  onClose,
  receiptData,
  onPrint,
  businessType = 'grocery'
}: ReceiptPreviewModalProps) {
  const router = useRouter()
  const [printing, setPrinting] = useState(false)
  const [configuredPrinter, setConfiguredPrinter] = useState<PrinterConfig | null>(null)
  const [loadingPrinter, setLoadingPrinter] = useState(true)

  // Load configured receipt printer when modal opens
  useEffect(() => {
    if (isOpen) {
      loadConfiguredPrinter()
    }
  }, [isOpen])

  const loadConfiguredPrinter = async () => {
    try {
      setLoadingPrinter(true)
      const response = await fetch('/api/printers?printerType=receipt&isOnline=true')

      if (response.ok) {
        const data = await response.json()
        if (data.printers && data.printers.length > 0) {
          // Get the first available receipt printer
          setConfiguredPrinter(data.printers[0])
        } else {
          setConfiguredPrinter(null)
        }
      }
    } catch (error) {
      console.error('Failed to load printer configuration:', error)
      setConfiguredPrinter(null)
    } finally {
      setLoadingPrinter(false)
    }
  }

  const handlePrint = async () => {
    if (!receiptData) return

    setPrinting(true)
    try {
      await onPrint(receiptData, configuredPrinter?.id)
      onClose()
    } catch (error) {
      console.error('Print failed:', error)
    } finally {
      setPrinting(false)
    }
  }

  const handleSetupPrinter = () => {
    onClose()
    router.push('/admin/printers')
  }

  if (!receiptData) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Receipt Preview</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Receipt Preview - Scrollable */}
        <div className="flex-1 overflow-y-auto border rounded-lg bg-gray-50 p-4">
          <div className="bg-white shadow-sm mx-auto">
            <ReceiptTemplate data={receiptData} />
          </div>
        </div>

        {/* Printer Status */}
        <div className="border-t pt-3">
          {loadingPrinter ? (
            <div className="text-sm text-gray-600 text-center">
              Loading printer configuration...
            </div>
          ) : configuredPrinter ? (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Printer className="h-4 w-4 text-green-600" />
                <span className="text-gray-700">
                  <span className="font-medium">{configuredPrinter.printerName}</span>
                  <span className="text-gray-500 ml-2">
                    ({configuredPrinter.isOnline ? 'Online' : 'Offline'})
                  </span>
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSetupPrinter}
                className="h-8"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md p-3">
              <div className="flex items-start gap-2">
                <Printer className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                    No Receipt Printer Configured
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    Please configure a receipt printer in admin settings before printing.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSetupPrinter}
                className="mt-2 w-full"
              >
                <Settings className="h-4 w-4 mr-2" />
                Setup Printer
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={printing}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePrint}
            disabled={printing || !configuredPrinter || !configuredPrinter.isOnline}
            className="bg-green-600 hover:bg-green-700"
          >
            {printing ? (
              <>
                <Printer className="h-4 w-4 mr-2 animate-pulse" />
                Printing...
              </>
            ) : (
              <>
                <Printer className="h-4 w-4 mr-2" />
                Print Receipt
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
