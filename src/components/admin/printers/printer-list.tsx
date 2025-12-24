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
  const [directTestingPrinter, setDirectTestingPrinter] = useState<string | null>(null)
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
        businessAddress: '123 Main Street, City, ST 12345',
        businessPhone: '(555) 123-4567',
        businessEmail: 'test@example.com',
        transactionId: `TEST-${Date.now()}`,
        transactionDate: new Date().toISOString(),
        salespersonName: 'Test User',
        salespersonId: 'test-user-id',
        items: [
          {
            name: 'Test Item 1 - ESC/POS Receipt',
            sku: 'TEST-001',
            quantity: 2,
            unitPrice: 10.00,
            totalPrice: 20.00,
            barcode: {
              type: 'CODE128',
              code: 'TEST001'
            }
          },
          {
            name: 'Test Item 2 - Thermal Print',
            sku: 'TEST-002',
            quantity: 1,
            unitPrice: 15.50,
            totalPrice: 15.50
          },
          {
            name: 'Test Item 3 - Auto Cut Test',
            sku: 'TEST-003',
            quantity: 3,
            unitPrice: 5.00,
            totalPrice: 15.00
          }
        ],
        subtotal: 50.50,
        tax: 4.04,
        discount: 0.00,
        total: 54.54,
        paymentMethod: 'cash',
        amountPaid: 60.00,
        changeDue: 5.46,
        footerMessage: 'TEST PRINT - ESC/POS Commands',
        returnPolicy: 'This is a test receipt to verify ESC/POS formatting, emphasized mode, text alignment, and automatic paper cutting.',
        copies: 1,
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

  async function handleDirectTest(printer: NetworkPrinter) {
    setDirectTestingPrinter(printer.id)

    try {
      push(`Checking printer connectivity...`)

      // First check connectivity and update status
      const response = await fetch(`/api/printers/${printer.id}/check-connectivity`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to check printer connectivity')
      }

      const { isOnline } = await response.json()

      if (!isOnline) {
        push(`❌ Printer "${printer.printerName}" is offline or unreachable`)
        onRefresh() // Refresh to update status
        return
      }

      push(`Sending direct ESC/POS test to ${printer.printerName}...`)

      // If this is a USB/local printer (no ipAddress), call the USB-specific test
      let testResponse
      if (!printer.ipAddress) {
        testResponse = await fetch(`/api/printers/${printer.id}/test-usb`, {
          method: 'POST',
        })
      } else {
        testResponse = await fetch('/api/printers/test-direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ printerId: printer.id }),
        })
      }

      if (!testResponse.ok) {
        const errorData = await testResponse.json()
        throw new Error(errorData.details || errorData.error || 'Direct test failed')
      }

      push('✅ Direct test sent - check printer (bypassed queue)')
    } catch (error) {
      console.error('Direct test error:', error)
      push(`❌ Direct test failed - ${error instanceof Error ? error.message : 'Failed to send direct test'}`)
    } finally {
      setDirectTestingPrinter(null)
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
                  onClick={() => handleDirectTest(printer)}
                  disabled={directTestingPrinter === printer.id}
                  title="Direct ESC/POS test (checks connectivity first, bypasses queue)"
                >
                  <TestTube className="w-4 h-4 mr-1" />
                  {directTestingPrinter === printer.id ? 'Testing...' : 'Direct Test'}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestPrint(printer)}
                  disabled={!isOnline || testingPrinter === printer.id}
                  title="Test via queue (full receipt)"
                >
                  <Printer className="w-4 h-4 mr-1" />
                  {testingPrinter === printer.id ? 'Queued...' : 'Queue Test'}
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
