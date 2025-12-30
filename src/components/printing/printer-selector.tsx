'use client'

/**
 * Printer Selector Modal
 * Allows users to select a printer for printing receipts or labels
 */

import { useState, useEffect } from 'react'
import { Printer, Check, Circle, Wifi, WifiOff, Server, Filter, Tag, Receipt, FileText } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import type { NetworkPrinter } from '@/types/printing'

interface PrinterSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (printer: NetworkPrinter) => void
  printerType?: 'label' | 'receipt' | 'document' | 'all'
  title?: string
  description?: string
}

export function PrinterSelector({
  isOpen,
  onClose,
  onSelect,
  printerType = 'all',
  title = 'Select Printer',
  description = 'Choose a printer for this print job',
}: PrinterSelectorProps) {
  const [printers, setPrinters] = useState<NetworkPrinter[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPrinter, setSelectedPrinter] = useState<NetworkPrinter | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterOnline, setFilterOnline] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) {
      fetchPrinters()
    } else {
      // Reset state when modal closes
      setSelectedPrinter(null)
      setSearchQuery('')
    }
  }, [isOpen])

  async function fetchPrinters() {
    try {
      setLoading(true)
      const params = new URLSearchParams()

      // Filter by printer type if specified
      if (printerType !== 'all') {
        params.append('printerType', printerType)
      }

      // Only show online printers by default
      if (filterOnline) {
        params.append('isOnline', 'true')
      }

      const response = await fetch(`/api/printers?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch printers')
      }

      const data = await response.json()
      setPrinters(data.printers || [])

      // If no printers found, show helpful message
      if (!data.printers || data.printers.length === 0) {
        toast({
          title: 'No printers available',
          description: 'Please check printer connections or contact an administrator',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error fetching printers:', error)
      toast({
        title: 'Error',
        description: 'Failed to load available printers',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function handleSelect() {
    if (selectedPrinter) {
      onSelect(selectedPrinter)
      onClose()
    }
  }

  // Filter printers based on search query
  const filteredPrinters = printers.filter((printer) => {
    const matchesSearch =
      printer.printerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      printer.printerId.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        {/* Description */}
        <p className="text-sm text-gray-600">{description}</p>

        {/* Search and Filter */}
        <div className="flex gap-2">
          <Input
            placeholder="Search printers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button
            variant={filterOnline ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setFilterOnline(!filterOnline)
              fetchPrinters()
            }}
          >
            <Filter className="w-4 h-4 mr-2" />
            {filterOnline ? 'Online Only' : 'All'}
          </Button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading printers...</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredPrinters.length === 0 && (
          <div className="text-center py-8">
            <Printer className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
            <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-gray-100">No printers found</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {searchQuery
                ? 'Try adjusting your search'
                : 'No printers are currently available'}
            </p>
          </div>
        )}

        {/* Printer List */}
        {!loading && filteredPrinters.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredPrinters.map((printer) => {
              const isSelected = selectedPrinter?.id === printer.id
              const isOnline = printer.isOnline

              return (
                <button
                  key={printer.id}
                  onClick={() => setSelectedPrinter(printer)}
                  className={`w-full text-left p-4 border rounded-lg transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
                  } ${!isOnline ? 'opacity-50' : ''}`}
                  disabled={!isOnline}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {/* Status Indicator */}
                        {isOnline ? (
                          <Circle className="w-3 h-3 text-green-500 fill-current" />
                        ) : (
                          <Circle className="w-3 h-3 text-gray-400 fill-current" />
                        )}

                        {/* Printer Name */}
                        <span className="font-medium text-gray-900 dark:text-gray-100">{printer.printerName}</span>

                        {/* Selected Checkmark */}
                        {isSelected && (
                          <Check className="w-5 h-5 text-blue-600" />
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {/* Printer Type with Icon */}
                        <Badge
                          variant="secondary"
                          className={`flex items-center gap-1 text-xs ${
                            printer.printerType === 'receipt'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                              : printer.printerType === 'label'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                              : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                          }`}
                        >
                          {printer.printerType === 'receipt' && <Receipt className="w-3 h-3" />}
                          {printer.printerType === 'label' && <Tag className="w-3 h-3" />}
                          {printer.printerType === 'document' && <FileText className="w-3 h-3" />}
                          {printer.printerType.charAt(0).toUpperCase() + printer.printerType.slice(1)}
                        </Badge>

                        {/* Connection Status */}
                        {isOnline ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <Wifi className="w-3 h-3" />
                            Online
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-gray-400">
                            <WifiOff className="w-3 h-3" />
                            Offline
                          </span>
                        )}

                        {/* Local/Remote */}
                        {printer.nodeId !== process.env.NEXT_PUBLIC_NODE_ID && (
                          <span className="flex items-center gap-1 text-blue-600">
                            <Server className="w-3 h-3" />
                            Remote
                          </span>
                        )}
                      </div>

                      {/* Capabilities */}
                      {printer.capabilities && printer.capabilities.length > 0 && (
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                          {printer.capabilities.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSelect}
            disabled={!selectedPrinter}
          >
            Select Printer
          </Button>
        </div>
      </div>
    </Modal>
  )
}
