'use client'

/**
 * Printer Editor Modal
 * Modal for adding or editing printer configurations
 */

import { useState, useEffect } from 'react'
import { Printer, X, Save } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToastContext } from '@/components/ui/toast'
import type { NetworkPrinter } from '@/types/printing'

interface PrinterEditorProps {
  isOpen: boolean
  onClose: () => void
  printer: NetworkPrinter | null
  onSuccess: () => void
}

export function PrinterEditor({ isOpen, onClose, printer, onSuccess }: PrinterEditorProps) {
  const [loading, setLoading] = useState(false)
  const [discovering, setDiscovering] = useState(false)
  const [detectingPorts, setDetectingPorts] = useState(false)
  const [systemPrinters, setSystemPrinters] = useState<Array<{ name: string; type: string; portName: string }>>([])
  const [availablePorts, setAvailablePorts] = useState<string[]>([])
  const [connectionType, setConnectionType] = useState<'network' | 'usb'>('network')
  const [formData, setFormData] = useState({
    printerId: '',
    printerName: '',
    printerType: 'receipt' as 'label' | 'receipt' | 'document',
    ipAddress: '',
    port: '9100',
    usbPort: '',
    capabilities: [] as string[],
    isShareable: true,
    receiptWidth: 48,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const toast = useToastContext()

  // Discover system printers when modal opens
  useEffect(() => {
    if (isOpen && !printer) {
      discoverSystemPrinters()
    }
  }, [isOpen, printer])

  // Initialize form when printer changes
  useEffect(() => {
    if (printer) {
      // Detect if it's a USB printer (no IP address and name matches USB/COM pattern)
      const isUSB = !printer.ipAddress && /^(USB\d{3}|COM\d+|LPT\d+)$/i.test(printer.printerName)
      setConnectionType(isUSB ? 'usb' : 'network')

      setFormData({
        printerId: printer.printerId,
        printerName: printer.printerName,
        printerType: printer.printerType,
        ipAddress: printer.ipAddress || '',
        port: printer.port?.toString() || '9100',
        usbPort: isUSB ? printer.printerName : '',
        capabilities: printer.capabilities || [],
        isShareable: printer.isShareable,
        receiptWidth: printer.receiptWidth || 48,
      })
    } else {
      // Reset form for new printer
      setConnectionType('network')
      setFormData({
        printerId: '',
        printerName: '',
        printerType: 'receipt',
        ipAddress: '',
        port: '9100',
        usbPort: '',
        capabilities: [],
        isShareable: true,
        receiptWidth: 48,
      })
    }
    setErrors({})
  }, [printer, isOpen])

  async function discoverSystemPrinters() {
    setDiscovering(true)
    try {
      const response = await fetch('/api/printers/discover?source=local')
      if (response.ok) {
        const data = await response.json()
        // Transform API response to match component structure
        const printers = (data.printers || []).map((p: any) => ({
          name: p.printerName,
          type: p.printerType,
          portName: p.portName || 'Unknown',
        }))
        setSystemPrinters(printers)
        console.log('Discovered system printers:', printers)

        // Show success message if printers were found
        if (printers.length > 0) {
          console.log(`✅ Found ${printers.length} system printer(s)`)
        } else {
          console.log('⚠️ No system printers discovered')
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Discovery API error:', response.status, errorData)
        // Show fallback message
        console.log('⚠️ Could not discover system printers. You can still enter printer details manually.')
      }
    } catch (error) {
      console.error('Failed to discover printers:', error)
      // Show fallback message
      console.log('⚠️ Could not discover system printers. You can still enter printer details manually.')
    } finally {
      setDiscovering(false)
    }
  }

  async function fetchWithTimeout(url: string, timeout = 3000) {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeout)
    try {
      const res = await fetch(url, { signal: controller.signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res
    } finally {
      clearTimeout(id)
    }
  }

  async function detectUSBPorts() {
    // Prevent duplicate concurrent detection runs
    if (detectingPorts) return

    setDetectingPorts(true)

    try {
      // Prefer the detailed endpoint which returns real port names (TMUSB001, RongtaUSB ports, etc.)
      try {
        const detailedRes = await fetchWithTimeout('/api/printers/detect-ports-detailed', 3000)
        if (detailedRes) {
          const d = await detailedRes.json()
          const portsFromPrinters = (d.printers || []).map((p: any) => p.portName).filter(Boolean)

          // Normalise and dedupe
          const uniq = Array.from(new Set(portsFromPrinters.map((p: string) => p.trim()))).filter(Boolean)

          if (uniq.length > 0) {
            setAvailablePorts(uniq)
            console.log('Detected ports via Get-Printer:', uniq)
            return
          }
        }
      } catch (err) {
        console.warn('Detailed detect-ports-detailed fetch failed:', err)
        toast.push('⚠️ Port detection service not available (detailed)')
      }

      // Fallback to the basic detector
      try {
        const response = await fetchWithTimeout('/api/printers/detect-ports', 3000)
        if (response) {
          const data = await response.json()
          setAvailablePorts(data.ports || [])
          console.log('Detected USB ports (fallback):', data.ports)
          return
        }
      } catch (err) {
        console.warn('Basic detect-ports fetch failed:', err)
        toast.push('⚠️ Port detection service not available')
      }

      // Final fallback
      setAvailablePorts([
        'TMUSB001', 'USB001', 'USB002', 'USB003',
        'COM1', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8',
        'LPT1', 'LPT2'
      ])
    } catch (error) {
      console.error('Failed to detect USB ports (unexpected):', error)
      toast.push('❌ Port detection failed (unexpected error)')
      setAvailablePorts([
        'TMUSB001', 'USB001', 'USB002', 'USB003',
        'COM1', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8',
        'LPT1', 'LPT2'
      ])
    } finally {
      setDetectingPorts(false)
    }
  }

  function handleSelectSystemPrinter(printerName: string) {
    const selected = systemPrinters.find(p => p.name === printerName)
    if (selected) {
      const isDirectPort = /^(USB\d+|TMUSB\d+|RongtaUSB.*|COM\d+|LPT\d+)$/i.test(selected.portName)

      setFormData(prev => ({
        ...prev,
        printerName: selected.name,
        printerType: selected.type as any,
        printerId: `${selected.type}-${selected.name.toLowerCase().replace(/\s+/g, '-')}`,
        // If system printer uses a direct port, pre-fill USB port
        ipAddress: isDirectPort ? '' : (selected.portName && selected.portName !== 'Unknown' ? 'localhost' : ''),
        port: isDirectPort ? '9100' : '9100',
        usbPort: isDirectPort ? selected.portName : prev.usbPort,
        capabilities: selected.type === 'receipt' ? ['esc-pos'] : selected.type === 'label' ? ['zebra-zpl'] : [],
      }))
    }
  }

  function handleConnectionTypeChange(type: 'network' | 'usb') {
    setConnectionType(type)

    // Detect USB ports when switching to USB mode
    if (type === 'usb' && availablePorts.length === 0) {
      // Call and handle errors to avoid uncaught promise rejections
      detectUSBPorts().catch((err) => {
        console.error('detectUSBPorts error (unhandled):', err)
        toast.push('⚠️ Port detection failed')
      })
    }

    // Clear connection-specific fields
    setFormData(prev => ({
      ...prev,
      ipAddress: '',
      port: '9100',
      usbPort: '',
    }))
  }

  function handleUSBPortChange(port: string) {
    setFormData(prev => ({
      ...prev,
      usbPort: port,
      // Auto-generate printer ID based on port
      printerId: port ? `printer_${port.toLowerCase()}_${Date.now()}` : prev.printerId,
      // Set default capabilities for USB receipt printers
      capabilities: port && !prev.capabilities.length ? ['esc-pos'] : prev.capabilities,
    }))
  }

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {}

    if (!formData.printerId.trim()) {
      newErrors.printerId = 'Printer ID is required'
    }

    if (connectionType === 'usb') {
      // USB printer validation
      if (!formData.usbPort) {
        newErrors.usbPort = 'USB port is required'
      }

      if (!formData.printerName.trim()) {
        newErrors.printerName = 'Printer name is required'
      }
    } else {
      // Network printer validation
      if (!formData.printerName.trim()) {
        newErrors.printerName = 'Printer name is required'
      }

      // Validate IP address format if provided
      if (formData.ipAddress) {
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
        if (!ipRegex.test(formData.ipAddress)) {
          newErrors.ipAddress = 'Invalid IP address format'
        }
      }

      // Validate port if provided
      if (formData.port) {
        const portNum = parseInt(formData.port)
        if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
          newErrors.port = 'Port must be between 1 and 65535'
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const method = printer ? 'PUT' : 'POST'
      const url = printer ? `/api/printers/${printer.id}` : '/api/printers'

      // For USB printers, use the port as the printer name
      const finalPrinterName = connectionType === 'usb' ? formData.usbPort : formData.printerName

      const payload = {
        printerId: formData.printerId,
        printerName: finalPrinterName,
        printerType: formData.printerType,
        ipAddress: connectionType === 'usb' ? null : (formData.ipAddress || null),
        port: connectionType === 'usb' ? null : (formData.port ? parseInt(formData.port) : null),
        capabilities: formData.capabilities,
        isShareable: formData.isShareable,
        receiptWidth: formData.receiptWidth,
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save printer')
      }

      onSuccess()
    } catch (error) {
      console.error('Error saving printer:', error)
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to save printer',
      })
    } finally {
      setLoading(false)
    }
  }

  function handleCapabilityToggle(capability: string) {
    setFormData(prev => ({
      ...prev,
      capabilities: prev.capabilities.includes(capability)
        ? prev.capabilities.filter(c => c !== capability)
        : [...prev.capabilities, capability],
    }))
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={printer ? 'Edit Printer' : 'Add Printer'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Connection Type (only for new printers) */}
        {!printer && (
          <div>
            <Label htmlFor="connectionType">
              Connection Type <span className="text-red-500">*</span>
            </Label>
            <select
              id="connectionType"
              value={connectionType}
              onChange={(e) => handleConnectionTypeChange(e.target.value as 'network' | 'usb')}
              className="w-full border rounded-md px-3 py-2 dark:bg-gray-800 dark:border-gray-600"
            >
              <option value="network">Network Printer (IP Address)</option>
              <option value="usb">USB / Serial Port Printer</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {connectionType === 'network'
                ? 'Printer connected via network (Ethernet/WiFi)'
                : 'Printer connected via USB, COM, or LPT port'}
            </p>
          </div>
        )}

        {/* USB Port Selection (only for USB connection type) */}
        {connectionType === 'usb' && !printer && (
          <div>
            <Label htmlFor="usbPort">
              USB / Serial Port <span className="text-red-500">*</span>
            </Label>
            <div className="relative flex gap-2">
              <select
                id="usbPort"
                value={formData.usbPort}
                onChange={(e) => handleUSBPortChange(e.target.value)}
                className={`w-full border rounded-md px-3 py-2 dark:bg-gray-800 dark:border-gray-600 ${
                  errors.usbPort ? 'border-red-500' : ''
                } ${detectingPorts ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={detectingPorts}
              >
                <option value="">
                  {detectingPorts ? '-- Detecting ports... --' : '-- Select Port --'}
                </option>
                {availablePorts.map((port) => (
                  <option key={port} value={port}>
                    {port}
                  </option>
                ))}
              </select>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!formData.usbPort) return toast.push('Select a port first');

                  try {
                    toast.push('Sending test to port...')
                    const res = await fetch('/api/printers/test-usb-direct', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ portName: formData.usbPort }),
                    })

                    const data = await res.json();
                    if (res.ok) {
                      toast.push(`✅ Test sent: ${data.message || data.method || 'OK'}`)
                    } else {
                      toast.push(`❌ Test failed - ${data.error || data.message || 'Unknown'}`)
                    }
                  } catch (err) {
                    console.error('Port test failed:', err)
                    toast.push('❌ Test failed - see console')
                  }
                }}
                disabled={!formData.usbPort || detectingPorts}
              >
                Test Port
              </Button>
            </div>

            {errors.usbPort && (
              <p className="text-sm text-red-500 mt-1">{errors.usbPort}</p>
            )}
            {detectingPorts && (
              <div className="flex items-center gap-2 mt-1">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                <p className="text-xs text-blue-600">Detecting available ports...</p>
              </div>
            )}
            {!detectingPorts && availablePorts.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                ⚠️ No ports detected. Showing common port names.
              </p>
            )}
            {!detectingPorts && availablePorts.length > 0 && (
              <p className="text-xs text-green-600 mt-1">
                ✓ Found {availablePorts.length} available port(s)
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Select the port where your printer is connected (e.g., USB001, COM5) or use the Test Port button to verify
            </p>
          </div>
        )}

        {/* Printer ID */}
        <div>
          <Label htmlFor="printerId">
            Printer ID <span className="text-red-500">*</span>
          </Label>
          <Input
            id="printerId"
            value={formData.printerId}
            onChange={(e) => setFormData({ ...formData, printerId: e.target.value })}
            placeholder="e.g., zebra-001, epson-tm-t88"
            disabled={!!printer} // Can't change ID when editing
            className={errors.printerId ? 'border-red-500' : ''}
          />
          {errors.printerId && (
            <p className="text-sm text-red-500 mt-1">{errors.printerId}</p>
          )}
          {connectionType === 'usb' && !printer && (
            <p className="text-xs text-gray-500 mt-1">Auto-generated based on port selection</p>
          )}
        </div>

        {/* System Printer Selection (for network printers only) */}
        {!printer && connectionType === 'network' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="systemPrinter">
                Select System Printer
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={discoverSystemPrinters}
                disabled={discovering}
                className="text-xs"
              >
                {discovering ? 'Discovering...' : 'Refresh List'}
              </Button>
            </div>

            {systemPrinters.length > 0 ? (
              <select
                id="systemPrinter"
                value={formData.printerName}
                onChange={(e) => handleSelectSystemPrinter(e.target.value)}
                className="w-full border rounded-md px-3 py-2 dark:bg-gray-800 dark:border-gray-600"
              >
                <option value="">-- Choose from available printers --</option>
                {systemPrinters.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name} ({p.type}) - Port: {p.portName}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-sm text-gray-500 p-3 border rounded-md bg-gray-50 dark:bg-gray-800 dark:border-gray-600">
                {discovering ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    Discovering printers...
                  </div>
                ) : (
                  <div>
                    <p className="font-medium">No printers discovered</p>
                    <p className="text-xs mt-1">
                      Click "Refresh List" to search again, or enter printer details manually below.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Manual Printer Entry Section */}
            {(!discovering && systemPrinters.length === 0) && (
              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <span>Manual Printer Entry</span>
                  <span className="text-xs text-gray-500">(for undetected printers)</span>
                </h4>
                <div className="text-xs text-gray-600 mb-3">
                  If your printer isn't detected automatically, you can enter its details manually.
                  This is common for network printers or USB printers that need specific configuration.
                </div>
              </div>
            )}

            {discovering && (
              <p className="text-xs text-gray-500 mt-1">Discovering printers...</p>
            )}
          </div>
        )}

        {/* Printer Name (manual entry) */}
        <div>
          <Label htmlFor="printerName">
            Printer Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="printerName"
            value={formData.printerName}
            onChange={(e) => setFormData({ ...formData, printerName: e.target.value })}
            placeholder={connectionType === 'usb' ? 'e.g., EPSON TM-T20III' : 'e.g., Front Desk Receipt Printer'}
            className={errors.printerName ? 'border-red-500' : ''}
            readOnly={!printer && connectionType === 'network' && formData.printerName !== ''}
          />
          {errors.printerName && (
            <p className="text-sm text-red-500 mt-1">{errors.printerName}</p>
          )}
          {!printer && connectionType === 'network' && systemPrinters.length === 0 && (
            <p className="text-xs text-gray-500 mt-1">
              No system printers found. Enter the printer name manually (e.g., "EPSON TM-T20III Receipt" or "Front Desk Printer").
            </p>
          )}
          {connectionType === 'usb' && (
            <p className="text-xs text-gray-500 mt-1">
              Enter a friendly name for your printer (e.g., model name or location like "Kitchen Printer" or "EPSON TM-T20III")
            </p>
          )}
          {systemPrinters.length > 0 && !formData.printerName && (
            <p className="text-xs text-gray-500 mt-1">
              Choose from discovered printers above, or enter a custom name for manual configuration.
            </p>
          )}
        </div>

        {/* Printer Type */}
        <div>
          <Label htmlFor="printerType">
            Printer Type <span className="text-red-500">*</span>
          </Label>
          <select
            id="printerType"
            value={formData.printerType}
            onChange={(e) => setFormData({ ...formData, printerType: e.target.value as any })}
            className="w-full border rounded-md px-3 py-2"
          >
            <option value="receipt">Receipt Printer</option>
            <option value="label">Label Printer</option>
            <option value="document">Document Printer</option>
          </select>
        </div>

        {/* Receipt Width (receipt printers only) */}
        {formData.printerType === 'receipt' && (
          <div>
            <Label htmlFor="receiptWidth">
              Receipt Width (Characters) <span className="text-red-500">*</span>
            </Label>
            <select
              id="receiptWidth"
              value={formData.receiptWidth}
              onChange={(e) => setFormData({ ...formData, receiptWidth: parseInt(e.target.value) })}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="32">32 characters (58mm paper)</option>
              <option value="42">42 characters (72mm paper)</option>
              <option value="48">48 characters (80mm paper) - Recommended</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Select the character width that matches your printer's paper size.
              Most 80mm thermal receipt printers (like EPSON TM-T20III) use 48 characters for full-width printing.
            </p>
          </div>
        )}

        {/* IP Address (network printers only) */}
        {connectionType === 'network' && (
          <div>
            <Label htmlFor="ipAddress">
              IP Address (optional)
            </Label>
            <Input
              id="ipAddress"
              value={formData.ipAddress}
              onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
              placeholder="e.g., 192.168.1.100"
              className={errors.ipAddress ? 'border-red-500' : ''}
            />
            {errors.ipAddress && (
              <p className="text-sm text-red-500 mt-1">{errors.ipAddress}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              For network printers, enter the IP address (e.g., 192.168.1.100). Leave blank for USB printers.
            </p>
          </div>
        )}

        {/* Port (network printers only) */}
        {connectionType === 'network' && (
          <div>
            <Label htmlFor="port">
              Port (optional)
            </Label>
            <Input
              id="port"
              type="number"
              value={formData.port}
              onChange={(e) => setFormData({ ...formData, port: e.target.value })}
              placeholder="9100"
              className={errors.port ? 'border-red-500' : ''}
            />
            {errors.port && (
              <p className="text-sm text-red-500 mt-1">{errors.port}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Most receipt printers use port 9100. Leave blank to use default (9100).
            </p>
          </div>
        )}

        {/* Capabilities */}
        <div>
          <Label>Capabilities</Label>
          <div className="space-y-2 mt-2">
            {['esc-pos', 'zebra-zpl', 'pdf', 'image'].map((capability) => (
              <label key={capability} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.capabilities.includes(capability)}
                  onChange={() => handleCapabilityToggle(capability)}
                  className="rounded"
                />
                <span className="text-sm">{capability.toUpperCase()}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Select the command languages supported by this printer
          </p>
        </div>

        {/* Shareable Toggle */}
        <div className="flex items-center justify-between p-3 border rounded-md">
          <div>
            <Label htmlFor="isShareable" className="cursor-pointer">
              Share on Network
            </Label>
            <p className="text-xs text-gray-500 mt-1">
              Allow other nodes to discover and use this printer
            </p>
          </div>
          <Switch
            id="isShareable"
            checked={formData.isShareable}
            onChange={(e) => setFormData({ ...formData, isShareable: e.target.checked })}
          />
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>

          <Button type="submit" disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : printer ? 'Update' : 'Register'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
