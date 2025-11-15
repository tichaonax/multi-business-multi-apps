'use client'

/**
 * Label Preview Component
 * Shows a preview of the SKU label before printing
 */

import { useState } from 'react'
import { Printer, X, Barcode } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { PrinterSelector } from './printer-selector'
import type { LabelData, NetworkPrinter, LabelFormat } from '@/types/printing'

interface LabelPreviewProps {
  isOpen: boolean
  onClose: () => void
  labelData: LabelData
  onPrint?: (printer: NetworkPrinter, copies: number) => Promise<void>
}

export function LabelPreview({
  isOpen,
  onClose,
  labelData,
  onPrint,
}: LabelPreviewProps) {
  const [showPrinterSelector, setShowPrinterSelector] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [copies, setCopies] = useState(1)
  const { toast } = useToast()

  async function handleSelectPrinter(printer: NetworkPrinter) {
    if (!onPrint) {
      toast({
        title: 'Error',
        description: 'Print handler not configured',
        variant: 'destructive',
      })
      return
    }

    try {
      setPrinting(true)
      await onPrint(printer, copies)

      toast({
        title: 'Print job queued',
        description: `${copies} label(s) sent to ${printer.printerName}`,
      })

      onClose()
    } catch (error) {
      console.error('Print error:', error)
      toast({
        title: 'Print failed',
        description: error instanceof Error ? error.message : 'Failed to print label',
        variant: 'destructive',
      })
    } finally {
      setPrinting(false)
    }
  }

  function formatCurrency(amount: number | undefined): string {
    if (amount === undefined) return 'N/A'
    return `$${amount.toFixed(2)}`
  }

  function getLabelFormatName(format: LabelFormat): string {
    const names: Record<LabelFormat, string> = {
      'standard': 'Standard',
      'with-price': 'With Price',
      'compact': 'Compact',
      'business-specific': 'Business Specific',
    }
    return names[format] || format
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Label Preview"
      >
        <div className="space-y-4">
          {/* Label Format Info */}
          <div className="flex items-center justify-between">
            <Badge variant="outline">
              {getLabelFormatName(labelData.labelFormat)}
            </Badge>
            <Badge variant="secondary">
              {labelData.barcode.format.toUpperCase()}
            </Badge>
          </div>

          {/* Label Preview Card */}
          <Card className="p-6 bg-white border-2 border-dashed">
            <div className="font-mono text-sm space-y-2 max-w-xs mx-auto">
              {/* Business Name */}
              {labelData.businessName && (
                <div className="text-center font-bold text-xs border-b pb-2">
                  {labelData.businessName}
                </div>
              )}

              {/* Item Name */}
              <div className="text-center font-semibold text-base py-2">
                {labelData.itemName}
              </div>

              {/* SKU */}
              <div className="text-center text-xs text-gray-600 pb-2">
                SKU: {labelData.sku}
              </div>

              {/* Price (if included) */}
              {labelData.price !== undefined && labelData.labelFormat === 'with-price' && (
                <div className="text-center py-3 border-y">
                  <div className="text-2xl font-bold">
                    {formatCurrency(labelData.price)}
                  </div>
                </div>
              )}

              {/* Business-Specific Data */}
              {labelData.businessSpecificData && labelData.labelFormat === 'business-specific' && (
                <div className="text-xs text-gray-700 py-2 space-y-1">
                  {Object.entries(labelData.businessSpecificData).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                      <span className="font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Barcode Placeholder */}
              <div className="text-center py-4">
                <div className="flex items-center justify-center">
                  <Barcode className="w-24 h-24 text-gray-400" />
                </div>
                <div className="text-xs mt-2 font-medium">
                  {labelData.barcode.data}
                </div>
                <div className="text-xs text-gray-500">
                  {labelData.barcode.format.toUpperCase()}
                </div>
              </div>
            </div>
          </Card>

          {/* Print Options */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-4">
              <Label htmlFor="copies" className="flex-shrink-0">
                Number of Copies:
              </Label>
              <Input
                id="copies"
                type="number"
                min="1"
                max="100"
                value={copies}
                onChange={(e) => setCopies(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                className="w-24"
              />
            </div>

            {copies > 1 && (
              <p className="text-xs text-gray-600">
                {copies} identical labels will be printed
              </p>
            )}
          </div>

          {/* Label Info */}
          <div className="text-xs text-gray-600 space-y-1 p-3 bg-gray-50 rounded">
            <p><strong>Preview Note:</strong> The actual label may look different depending on printer capabilities and settings.</p>
            <p>Barcode will be rendered by the printer using the selected format.</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose} disabled={printing}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={() => setShowPrinterSelector(true)}
              disabled={printing}
            >
              <Printer className="w-4 h-4 mr-2" />
              {printing ? 'Printing...' : `Print ${copies > 1 ? `(${copies})` : ''}`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Printer Selector */}
      <PrinterSelector
        isOpen={showPrinterSelector}
        onClose={() => setShowPrinterSelector(false)}
        onSelect={handleSelectPrinter}
        printerType="label"
        title="Select Label Printer"
        description="Choose a label printer for this print job"
      />
    </>
  )
}
