'use client'

/**
 * Printer List Component
 * Displays a list of registered printers with status indicators and actions
 */

import { useState } from 'react'
import { Printer, Edit, Trash2, Circle, Wifi, WifiOff, Server, TestTube, Share2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { useConfirm } from '@/components/ui/confirm-modal'
import type { NetworkPrinter } from '@/types/printing'

interface PrinterListProps {
  printers: NetworkPrinter[]
  loading: boolean
  onEdit: (printer: NetworkPrinter) => void
  onDelete: (printerId: string) => void
  onRefresh: () => void
}

export function PrinterList({ printers, loading, onEdit, onDelete, onRefresh }: PrinterListProps) {
  const [testingPrinter, setTestingPrinter] = useState<string | null>(null)
  const { push } = useToast()
  const confirm = useConfirm()

  const currentNodeId = process.env.NEXT_PUBLIC_NODE_ID || 'default-node'

  async function handleTestPrint(printer: NetworkPrinter) {
    setTestingPrinter(printer.id)

    try {
      push(`Sending test print to ${printer.printerName}...`)

      // Fetch first available business for test print (receipt_sequences requires valid FK)
      const businessResponse = await fetch('/api/businesses')
      if (!businessResponse.ok) {
        throw new Error('Failed to fetch businesses for test print')
      }

      const { businesses } = await businessResponse.json()
      if (!businesses || businesses.length === 0) {
        push('❌ No businesses found - cannot test print')
        return
      }

      const testBusiness = businesses[0]

      // Send a test label/receipt
      const endpoint = printer.printerType === 'label' ? '/api/print/label' : '/api/print/receipt'

      const testData = printer.printerType === 'label' ? {
        printerId: printer.id,
        businessId: testBusiness.id,
        sku: 'TEST-001',
        itemName: 'Test Label Print',
        barcodeData: 'TEST001',
        barcodeFormat: 'code128',
        labelFormat: 'standard',
        copies: 1,
      } : {
        printerId: printer.id,
        businessId: testBusiness.id,
        businessType: testBusiness.businessType || 'other',
        businessName: testBusiness.businessName || 'Test Business',
        items: [
          {
            name: 'Test Item',
            quantity: 1,
            unitPrice: 10.00,
            totalPrice: 10.00
          }
        ],
        subtotal: 10.00,
        tax: 0.00,
        total: 10.00,
        paymentMethod: 'cash',
        notes: 'This is a test print',
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || errorData.error || 'Test print failed')
      }

      push('✅ Test print queued - check the printer for output')
    } catch (error) {
      console.error('Test print error:', error)
      push(`❌ Test failed - ${error instanceof Error ? error.message : 'Failed to send test print'}`)
    } finally {
      setTestingPrinter(null)
    }
  }

  async function handleToggleShare(printer: NetworkPrinter) {
    try {
      const response = await fetch(`/api/printers/${printer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isShareable: !printer.isShareable,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update printer')
      }

      push(`✅ Printer is now ${!printer.isShareable ? 'shareable' : 'not shareable'}`)

      onRefresh()
    } catch (error) {
      console.error('Error toggling share:', error)
      push('❌ Failed to update sharing status')
    }
  }

  async function handleDelete(printer: NetworkPrinter) {
    const confirmed = await confirm({
      title: 'Delete Printer',
      message: `Are you sure you want to delete "${printer.printerName}"? This action cannot be undone.`,
      confirmText: 'Delete',
      confirmVariant: 'destructive',
    })

    if (confirmed) {
      onDelete(printer.id)
    }
  }

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <span className="ml-3 text-gray-600">Loading printers...</span>
        </div>
      </Card>
    )
  }

  if (printers.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center text-gray-500">
          <Printer className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2">No printers registered</h3>
          <p className="text-sm">
            Click "Add Printer" to register a new printer or "Discover" to scan the network
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {printers.map((printer) => {
        const isLocal = printer.nodeId === currentNodeId
        const isOnline = printer.isOnline

        return (
          <Card key={printer.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              {/* Printer Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  {/* Status Indicator */}
                  <div className="flex items-center">
                    {isOnline ? (
                      <Circle className="w-3 h-3 text-green-500 fill-current animate-pulse" />
                    ) : (
                      <Circle className="w-3 h-3 text-gray-400 fill-current" />
                    )}
                  </div>

                  {/* Printer Name */}
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      {printer.printerName}
                      {isLocal && (
                        <Badge variant="outline" className="text-xs">
                          Local
                        </Badge>
                      )}
                      {!isLocal && (
                        <Badge variant="outline" className="text-xs text-blue-600">
                          <Server className="w-3 h-3 mr-1" />
                          {printer.nodeId}
                        </Badge>
                      )}
                    </h3>

                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                      {/* Printer Type */}
                      <Badge variant="secondary">
                        {printer.printerType.charAt(0).toUpperCase() + printer.printerType.slice(1)}
                      </Badge>

                      {/* Connection Info */}
                      {printer.ipAddress && (
                        <span className="flex items-center gap-1">
                          {isOnline ? (
                            <Wifi className="w-4 h-4 text-green-500" />
                          ) : (
                            <WifiOff className="w-4 h-4 text-gray-400" />
                          )}
                          {printer.ipAddress}:{printer.port || 9100}
                        </span>
                      )}

                      {/* Capabilities */}
                      {printer.capabilities && printer.capabilities.length > 0 && (
                        <span className="text-xs text-gray-500">
                          {printer.capabilities.join(', ')}
                        </span>
                      )}

                      {/* Shareable */}
                      {printer.isShareable && (
                        <Badge variant="outline" className="text-xs">
                          <Share2 className="w-3 h-3 mr-1" />
                          Shared
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="mt-2 text-xs text-gray-500">
                  Printer ID: {printer.printerId}
                  {' • '}
                  Last seen: {new Date(printer.lastSeen).toLocaleString()}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestPrint(printer)}
                  disabled={!isOnline || testingPrinter === printer.id}
                >
                  <TestTube className="w-4 h-4 mr-1" />
                  Test
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleShare(printer)}
                  disabled={!isLocal}
                  title={isLocal ? 'Toggle network sharing' : 'Only local printers can be configured'}
                >
                  <Share2 className="w-4 h-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(printer)}
                  disabled={!isLocal}
                  title={isLocal ? 'Edit printer' : 'Only local printers can be edited'}
                >
                  <Edit className="w-4 h-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(printer)}
                  disabled={!isLocal}
                  title={isLocal ? 'Delete printer' : 'Only local printers can be deleted'}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
