'use client'

/**
 * Printer Management - Main Admin Page
 * Allows admins to register, configure, and manage network printers
 */

import { useState, useEffect } from 'react'
import { Printer, Plus, RefreshCw, Server, Activity, X, Check, Circle } from 'lucide-react'
import { PrinterList } from './printer-list'
import { PrinterEditor } from './printer-editor'
import { PrintQueueDashboard } from './print-queue-dashboard'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs } from '@/components/ui/tabs'
import { Modal } from '@/components/ui/modal'
import { useToastContext } from '@/components/ui/toast'
import type { NetworkPrinter } from '@/types/printing'

export function PrinterManagement() {
  const [printers, setPrinters] = useState<NetworkPrinter[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingPrinter, setEditingPrinter] = useState<NetworkPrinter | null>(null)
  const [activeTab, setActiveTab] = useState('printers')
  const [statistics, setStatistics] = useState({
    total: 0,
    online: 0,
    offline: 0,
    local: 0,
    remote: 0,
  })
  const [discoveredPrinters, setDiscoveredPrinters] = useState<any[]>([])
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false)
  const toast = useToastContext()

  // Fetch printers on mount
  useEffect(() => {
    fetchPrinters()
  }, [])

  // Update statistics when printers change
  useEffect(() => {
    const currentNodeId = process.env.NEXT_PUBLIC_NODE_ID || 'local-node'
    setStatistics({
      total: printers.length,
      online: printers.filter(p => p.isOnline).length,
      offline: printers.filter(p => !p.isOnline).length,
      local: printers.filter(p => p.nodeId === currentNodeId).length,
      remote: printers.filter(p => p.nodeId !== currentNodeId).length,
    })
  }, [printers])

  async function fetchPrinters() {
    try {
      setLoading(true)
      const response = await fetch('/api/printers')

      if (!response.ok) {
        throw new Error('Failed to fetch printers')
      }

      const data = await response.json()
      setPrinters(data.printers || [])
    } catch (error) {
      console.error('Error fetching printers:', error)
      toast.push('Error: Failed to load printers')
    } finally {
      setLoading(false)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    await fetchPrinters()
    setRefreshing(false)

    toast.push('Printer list refreshed')
  }

  async function handleDiscover() {
    try {
      toast.push('Discovering printers... Scanning local and network printers')

      const response = await fetch('/api/printers/discover')

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.details || errorData.error || 'Discovery failed')
      }

      const data = await response.json()

      // Log discovery details for debugging
      console.log('[PrinterManagement] Discovery result:', data)
      if (data.discoveryLog) {
        console.log('[PrinterManagement] Discovery log:', data.discoveryLog)
      }

      if (data.count === 0) {
        toast.push('No physical printers found. Make sure your printers are connected and powered on.')
      } else {
        toast.push(`Discovery complete - Found ${data.count} physical printer(s). Select one to register.`)
        // Store discovered printers for selection UI
        setDiscoveredPrinters(data.printers)
        setShowDiscoveryModal(true)
      }
    } catch (error) {
      console.error('Error discovering printers:', error)
      toast.push(`Discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Register a single selected printer
  async function handleRegisterPrinter(printer: any) {
    try {
      const registerResponse = await fetch('/api/printers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printerId: printer.printerId,
          printerName: printer.printerName,
          printerType: printer.printerType,
          ipAddress: printer.ipAddress || null,
          port: printer.port || null,
          capabilities: printer.capabilities || ['raw'],
          isShareable: true,
        }),
      })

      if (registerResponse.ok) {
        toast.push(`Registered printer: ${printer.printerName}`)
        setShowDiscoveryModal(false)
        await fetchPrinters()
      } else {
        const errorData = await registerResponse.json().catch(() => ({}))
        toast.push(`Failed to register: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error registering printer:', error)
      toast.push(`Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  function handleAddPrinter() {
    setEditingPrinter(null)
    setIsEditorOpen(true)
  }

  function handleEditPrinter(printer: NetworkPrinter) {
    setEditingPrinter(printer)
    setIsEditorOpen(true)
  }

  function handleEditorClose() {
    setIsEditorOpen(false)
    setEditingPrinter(null)
  }

  function handleEditorSuccess() {
    setIsEditorOpen(false)
    setEditingPrinter(null)
    fetchPrinters()

    toast.push(editingPrinter ? 'Printer updated successfully' : 'Printer registered successfully')
  }

  async function handleDeletePrinter(printerId: string) {
    try {
      const response = await fetch(`/api/printers/${printerId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete printer')
      }

      toast.push('Printer removed successfully')

      fetchPrinters()
    } catch (error) {
      console.error('Error deleting printer:', error)
      toast.push('Error: Failed to delete printer')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Printer className="w-8 h-8" />
            Printer Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage network printers and print jobs across all locations
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            onClick={handleDiscover}
          >
            <Server className="w-4 h-4 mr-2" />
            Discover
          </Button>

          <Button onClick={handleAddPrinter}>
            <Plus className="w-4 h-4 mr-2" />
            Add Printer
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600">Total Printers</div>
          <div className="text-2xl font-bold mt-1">{statistics.total}</div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-gray-600 flex items-center gap-1">
            <Activity className="w-4 h-4 text-green-500" />
            Online
          </div>
          <div className="text-2xl font-bold mt-1 text-green-600">{statistics.online}</div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-gray-600 flex items-center gap-1">
            <Activity className="w-4 h-4 text-gray-400" />
            Offline
          </div>
          <div className="text-2xl font-bold mt-1 text-gray-500">{statistics.offline}</div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-gray-600">Local</div>
          <div className="text-2xl font-bold mt-1">{statistics.local}</div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-gray-600">Remote</div>
          <div className="text-2xl font-bold mt-1">{statistics.remote}</div>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b">
          <div className="flex gap-4">
            <button
              className={`px-4 py-2 border-b-2 transition-colors ${
                activeTab === 'printers'
                  ? 'border-blue-500 text-blue-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setActiveTab('printers')}
            >
              <Printer className="w-4 h-4 inline mr-2" />
              Printers ({statistics.total})
            </button>

            <button
              className={`px-4 py-2 border-b-2 transition-colors ${
                activeTab === 'queue'
                  ? 'border-blue-500 text-blue-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setActiveTab('queue')}
            >
              <Activity className="w-4 h-4 inline mr-2" />
              Print Queue
            </button>
          </div>
        </div>

        <div className="mt-6">
          {activeTab === 'printers' && (
            <PrinterList
              printers={printers}
              loading={loading}
              onEdit={handleEditPrinter}
              onDelete={handleDeletePrinter}
              onRefresh={fetchPrinters}
            />
          )}

          {activeTab === 'queue' && (
            <PrintQueueDashboard />
          )}
        </div>
      </Tabs>

      {/* Printer Editor Modal */}
      <PrinterEditor
        isOpen={isEditorOpen}
        onClose={handleEditorClose}
        printer={editingPrinter}
        onSuccess={handleEditorSuccess}
      />

      {/* Printer Discovery Modal */}
      <Modal
        isOpen={showDiscoveryModal}
        onClose={() => setShowDiscoveryModal(false)}
        title="Discovered Printers"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Select a printer to register. Only physical printers are shown.
          </p>

          {discoveredPrinters.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Printer className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No printers discovered</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {discoveredPrinters.map((printer, index) => (
                <div
                  key={printer.printerId || index}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-700"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${printer.status === 'available' ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">{printer.printerName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {printer.printerType} • {printer.portName || printer.ipAddress || 'Local'}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleRegisterPrinter(printer)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Register
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-4 border-t dark:border-gray-700">
            <Button variant="outline" onClick={() => setShowDiscoveryModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
