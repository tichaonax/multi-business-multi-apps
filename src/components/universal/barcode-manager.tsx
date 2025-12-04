import React, { useState, useEffect } from 'react'
import ModalPortal from '@/components/ui/modal-portal'
import { globalBarcodeService } from '@/lib/services/global-barcode-service'

export type BarcodeType = 'UPC_A' | 'UPC_E' | 'EAN_13' | 'EAN_8' | 'CODE128' | 'CODE39' | 'ITF' | 'CODABAR' | 'QR_CODE' | 'DATA_MATRIX' | 'PDF417' | 'CUSTOM' | 'SKU_BARCODE'

export interface ProductBarcode {
  id: string
  code: string
  type: BarcodeType
  isPrimary: boolean
  isUniversal: boolean
  isActive: boolean
  label?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

interface BarcodeManagerProps {
  productId?: string
  variantId?: string
  businessId: string
  barcodes: ProductBarcode[]
  onBarcodesChange: (barcodes: ProductBarcode[]) => void
  readOnly?: boolean
}

const BARCODE_TYPE_OPTIONS = [
  { value: 'UPC_A', label: 'UPC-A (12 digits)', example: '123456789012' },
  { value: 'UPC_E', label: 'UPC-E (6 digits)', example: '123456' },
  { value: 'EAN_13', label: 'EAN-13 (13 digits)', example: '1234567890123' },
  { value: 'EAN_8', label: 'EAN-8 (8 digits)', example: '12345678' },
  { value: 'CODE128', label: 'Code 128', example: 'ABC123' },
  { value: 'CODE39', label: 'Code 39', example: 'ABC123' },
  { value: 'ITF', label: 'ITF (Interleaved 2 of 5)', example: '1234567890' },
  { value: 'CODABAR', label: 'Codabar', example: 'A123456789A' },
  { value: 'QR_CODE', label: 'QR Code', example: 'Any text/data' },
  { value: 'DATA_MATRIX', label: 'Data Matrix', example: 'Any text/data' },
  { value: 'PDF417', label: 'PDF417', example: 'Any text/data' },
  { value: 'CUSTOM', label: 'Custom', example: 'Business-specific' },
  { value: 'SKU_BARCODE', label: 'SKU Barcode', example: 'Internal SKU' }
]

export function BarcodeManager({
  productId,
  variantId,
  businessId,
  barcodes,
  onBarcodesChange,
  readOnly = false
}: BarcodeManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingBarcode, setEditingBarcode] = useState<ProductBarcode | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [formData, setFormData] = useState({
    code: '',
    type: 'CODE128' as BarcodeType,
    isPrimary: false,
    isUniversal: false,
    label: '',
    notes: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Disable global barcode scanning while the Add/Edit Barcode modal is open
  useEffect(() => {
    if (showAddForm) {
      const wasEnabled = globalBarcodeService.isEnabled()
      if (wasEnabled) {
        globalBarcodeService.disable()
        console.log('🔒 BarcodeManager: Disabled global scanning while modal is open')
      }

      return () => {
        if (wasEnabled) {
          globalBarcodeService.enable()
          console.log('🔓 BarcodeManager: Re-enabled global scanning after modal closed')
        }
      }
    }
  }, [showAddForm])

  const resetForm = () => {
    setFormData({
      code: '',
      type: 'CODE128',
      isPrimary: false,
      isUniversal: false,
      label: '',
      notes: ''
    })
    setErrors({})
    setShowScanner(false)
  }

  const handleBarcodeScanned = (scannedCode: string) => {
    setFormData(prev => ({ ...prev, code: scannedCode }))
    // Keep scanner open so user can continue making updates
    // User can manually close scanner if needed
    if (errors.code) setErrors(prev => ({ ...prev, code: '' }))
  }

  const validateBarcode = (code: string, type: BarcodeType): string | null => {
    if (!code.trim()) return 'Barcode code is required'

    // Basic validation by type
    switch (type) {
      case 'UPC_A':
        if (!/^\d{12}$/.test(code)) return 'UPC-A must be exactly 12 digits'
        break
      case 'UPC_E':
        if (!/^\d{6}$/.test(code)) return 'UPC-E must be exactly 6 digits'
        break
      case 'EAN_13':
        if (!/^\d{13}$/.test(code)) return 'EAN-13 must be exactly 13 digits'
        break
      case 'EAN_8':
        if (!/^\d{8}$/.test(code)) return 'EAN-8 must be exactly 8 digits'
        break
      case 'CODE39':
        if (!/^[A-Z0-9\-\.\$\/\+\%\s]*$/.test(code.toUpperCase())) {
          return 'Code 39 can only contain letters, numbers, and -.$/+ %'
        }
        break
      case 'CODABAR':
        if (!/^[A-D][A-D0-9\-\.\$\/\+\%\:\s]*[A-D]$/.test(code.toUpperCase())) {
          return 'Codabar must start and end with A-D, contain valid characters'
        }
        break
      // Other types have more flexible validation
    }

    return null
  }

  const handleSubmit = async (e?: React.FormEvent | React.KeyboardEvent) => {
    try { e?.preventDefault?.() } catch (ex) {}

    const validationError = validateBarcode(formData.code, formData.type)
    if (validationError) {
      setErrors({ code: validationError })
      return
    }

    // Check for duplicate barcodes
    const duplicate = barcodes.find(b =>
      b.code === formData.code &&
      b.type === formData.type &&
      b.id !== editingBarcode?.id
    )
    if (duplicate) {
      setErrors({ code: 'This barcode already exists for this product' })
      return
    }

    try {
      let updatedBarcodes: ProductBarcode[]

      if (editingBarcode) {
        // Update existing barcode
        updatedBarcodes = barcodes.map(b =>
          b.id === editingBarcode.id
            ? { ...b, ...formData, updatedAt: new Date().toISOString() }
            : b
        )
      } else {
        // Add new barcode
        const newBarcode: ProductBarcode = {
          id: `temp-${Date.now()}`, // Temporary ID until saved
          code: formData.code,
          type: formData.type,
          isPrimary: formData.isPrimary,
          isUniversal: formData.isUniversal,
          isActive: true,
          label: formData.label || undefined,
          notes: formData.notes || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        updatedBarcodes = [...barcodes, newBarcode]
      }

      // If setting as primary, unset other primaries
      if (formData.isPrimary) {
        updatedBarcodes = updatedBarcodes.map(b => ({
          ...b,
          isPrimary: b.id === (editingBarcode?.id || `temp-${Date.now()}`)
        }))
      }

      onBarcodesChange(updatedBarcodes)
      setShowAddForm(false)
      setEditingBarcode(null)
      resetForm()
    } catch (error) {
      console.error('Error saving barcode:', error)
      setErrors({ general: 'Failed to save barcode' })
    }
  }

  const handleDelete = (barcodeId: string) => {
    const updatedBarcodes = barcodes.filter(b => b.id !== barcodeId)
    onBarcodesChange(updatedBarcodes)
  }

  const handleEdit = (barcode: ProductBarcode) => {
    setEditingBarcode(barcode)
    setFormData({
      code: barcode.code,
      type: barcode.type,
      isPrimary: barcode.isPrimary,
      isUniversal: barcode.isUniversal,
      label: barcode.label || '',
      notes: barcode.notes || ''
    })
    setShowAddForm(true)
  }

  const getBarcodeTypeInfo = (type: BarcodeType) => {
    return BARCODE_TYPE_OPTIONS.find(opt => opt.value === type)
  }

  const activeBarcodes = barcodes.filter(b => b.isActive)
  const primaryBarcode = activeBarcodes.find(b => b.isPrimary)

  if (readOnly) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Barcodes</h4>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {activeBarcodes.length} barcode{activeBarcodes.length !== 1 ? 's' : ''}
          </span>
        </div>

        {activeBarcodes.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">No barcodes assigned</p>
        ) : (
          <div className="space-y-2">
            {activeBarcodes.map((barcode) => (
              <div key={barcode.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  {barcode.isPrimary && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      Primary
                    </span>
                  )}
                  {barcode.isUniversal && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Universal
                    </span>
                  )}
                  <div>
                    <div className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
                      {barcode.code}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {getBarcodeTypeInfo(barcode.type)?.label}
                      {barcode.label && ` • ${barcode.label}`}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Barcodes</h4>
        <button
          type="button"
          onClick={() => {
            setShowAddForm(true)
            setEditingBarcode(null)
            resetForm()
          }}
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          + Add Barcode
        </button>
      </div>

      {activeBarcodes.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p className="text-sm">No barcodes assigned to this product</p>
          <p className="text-xs mt-1">Add barcodes to enable scanning and identification</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeBarcodes.map((barcode) => (
            <div key={barcode.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="flex flex-col">
                  {barcode.isPrimary && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 w-fit mb-1">
                      Primary
                    </span>
                  )}
                  {barcode.isUniversal && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 w-fit mb-1">
                      Universal
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
                    {barcode.code}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {getBarcodeTypeInfo(barcode.type)?.label}
                    {barcode.label && ` • ${barcode.label}`}
                  </div>
                  {barcode.notes && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {barcode.notes}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleEdit(barcode)}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(barcode.id)}
                  className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddForm && (
        <ModalPortal>
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {editingBarcode ? 'Edit Barcode' : 'Add New Barcode'}
                </h3>
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingBarcode(null)
                    resetForm()
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              {showScanner && (
                <div data-scanner-section className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800 mb-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">📱</span>
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">Barcode Scanner</h4>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Focus this input and scan a barcode, then press Enter or click the button to capture it.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Scan barcode here..."
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        onKeyDown={(e) => {
                          // Debug: log all key events
                          console.log('Scanner keydown:', {
                            key: e.key,
                            code: e.code,
                            ctrlKey: e.ctrlKey,
                            altKey: e.altKey,
                            metaKey: e.metaKey,
                            shiftKey: e.shiftKey,
                            target: e.target?.tagName
                          })

                          // Prevent ALL default behavior and propagation for ANY key
                          e.preventDefault()
                          e.stopPropagation()

                          // Only handle Enter key for barcode capture
                          if (e.key === 'Enter') {
                            const barcode = (e.target as HTMLInputElement).value.trim()
                            if (barcode) {
                              console.log('Capturing barcode:', barcode)
                              handleBarcodeScanned(barcode)
                              ;(e.target as HTMLInputElement).value = ''
                            }
                          }
                        }}
                        onKeyUp={(e) => {
                          // Prevent any keyup events from bubbling
                          e.stopPropagation()
                        }}
                        onKeyPress={(e) => {
                          // Prevent any keypress events from bubbling
                          e.stopPropagation()
                        }}
                        onInput={(e) => {
                          // Prevent input events from bubbling
                          e.stopPropagation()
                        }}
                        onChange={(e) => {
                          // Allow normal typing but prevent bubbling
                          e.stopPropagation()
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement
                          const barcode = input.value.trim()
                          if (barcode) {
                            handleBarcodeScanned(barcode)
                            input.value = ''
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        Capture
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Press Enter after scanning or click "Capture" to fill the barcode field below.
                    </p>
                  </div>
                </div>
              )}

              <div
                role="form"
                tabIndex={-1}
                className="space-y-4"
                onKeyDown={(e) => {
                  // Only handle Enter for form submission, not in scanner or textarea
                  if (e.key === 'Enter') {
                    const t = e.target as HTMLElement
                    // Check if we're in the scanner section or a textarea
                    const inScanner = showScanner && t?.closest('[data-scanner-section]')
                    if (!inScanner && t && t.tagName !== 'TEXTAREA') {
                      e.preventDefault()
                      e.stopPropagation()
                      // Call submit without event
                      void handleSubmit()
                    }
                  }
                }}
              >
                {errors.general && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-600 text-sm">{errors.general}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Barcode Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as BarcodeType }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {BARCODE_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Example: {BARCODE_TYPE_OPTIONS.find(opt => opt.value === formData.type)?.example}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Barcode Code *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, code: e.target.value }))
                        if (errors.code) setErrors(prev => ({ ...prev, code: '' }))
                      }}
                      className={`flex-1 px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 font-mono ${
                        errors.code
                          ? 'border-red-300 focus:ring-red-500'
                          : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                      }`}
                      placeholder="Enter barcode value"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowScanner(!showScanner)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors whitespace-nowrap"
                      title="Scan barcode"
                    >
                      📱 {showScanner ? 'Hide' : 'Scan'}
                    </button>
                  </div>
                  {errors.code && <p className="text-red-600 text-sm mt-1">{errors.code}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Label (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.label}
                    onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Retail UPC, Case Barcode"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={2}
                    placeholder="Additional notes about this barcode"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isPrimary"
                      checked={formData.isPrimary}
                      onChange={(e) => setFormData(prev => ({ ...prev, isPrimary: e.target.checked }))}
                      className="rounded"
                    />
                    <label htmlFor="isPrimary" className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                      Set as Primary Barcode
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 ml-5">
                    Primary barcodes are used as the main identifier for this product
                  </p>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isUniversal"
                      checked={formData.isUniversal}
                      onChange={(e) => setFormData(prev => ({ ...prev, isUniversal: e.target.checked }))}
                      className="rounded"
                    />
                    <label htmlFor="isUniversal" className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                      Universal Barcode (UPC/EAN)
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 ml-5">
                    Universal barcodes can be shared across businesses (e.g., standard UPC codes)
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false)
                      setEditingBarcode(null)
                      resetForm()
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSubmit()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    {editingBarcode ? 'Update' : 'Add'} Barcode
                  </button>
                </div>
              </div>
            </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}