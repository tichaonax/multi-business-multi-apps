'use client'

import { Modal } from '@/components/ui/modal'
import { useState } from 'react'
import { Barcode } from 'lucide-react'

interface BulkBarcodeModalProps {
  isOpen: boolean
  onClose: () => void
  productIds: string[]
  onSuccess: () => void
}

export function BulkBarcodeModal({ isOpen, onClose, productIds, onSuccess }: BulkBarcodeModalProps) {
  const [loading, setLoading] = useState(false)
  const [assignmentType, setAssignmentType] = useState<'auto' | 'manual'>('auto')
  const [barcodePrefix, setBarcodePrefix] = useState('CLO')
  const [error, setError] = useState('')

  const validate = () => {
    if (assignmentType === 'auto') {
      if (!barcodePrefix.trim()) {
        setError('Please enter a barcode prefix')
        return false
      }
      if (barcodePrefix.trim().length > 10) {
        setError('Prefix must be 10 characters or less')
        return false
      }
    }

    setError('')
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setLoading(true)

    try {
      const requestData: any = {
        action: 'update_barcode',
        productIds
      }

      if (assignmentType === 'auto') {
        requestData.barcodePrefix = barcodePrefix.trim()
      } else {
        // Manual assignment would require individual barcode inputs
        // For now, we'll show a message that this feature needs implementation
        setError('Manual barcode entry not yet implemented. Please use auto-generate.')
        setLoading(false)
        return
      }

      const response = await fetch('/api/admin/clothing/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      const data = await response.json()

      if (data.success) {
        onSuccess()
        onClose()
      } else {
        setError(data.error || 'Failed to assign barcodes')
      }
    } catch (error) {
      console.error('Error assigning barcodes:', error)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setAssignmentType('auto')
    setBarcodePrefix('CLO')
    setError('')
    onClose()
  }

  const previewBarcodes = () => {
    if (assignmentType === 'auto' && barcodePrefix.trim()) {
      return [
        `${barcodePrefix}000001`,
        `${barcodePrefix}000002`,
        `${barcodePrefix}000003`,
        '...'
      ]
    }
    return []
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Bulk Barcode Assignment" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info */}
        <div className="rounded-lg border bg-muted/50 p-3">
          <div className="flex items-center gap-2">
            <Barcode className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm">
              Assigning barcodes to <span className="font-semibold">{productIds.length}</span> product(s)
            </p>
          </div>
        </div>

        {/* Assignment Type Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Assignment Method</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="assignmentType"
                value="auto"
                checked={assignmentType === 'auto'}
                onChange={(e) => setAssignmentType('auto')}
                className="rounded-full"
              />
              <span className="text-sm">Auto-generate sequential barcodes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer opacity-50">
              <input
                type="radio"
                name="assignmentType"
                value="manual"
                checked={assignmentType === 'manual'}
                onChange={(e) => setAssignmentType('manual')}
                className="rounded-full"
                disabled
              />
              <span className="text-sm">Manual entry (Coming soon)</span>
            </label>
          </div>
        </div>

        {/* Auto-generate Options */}
        {assignmentType === 'auto' && (
          <>
            <div>
              <label htmlFor="barcodePrefix" className="block text-sm font-medium mb-1">
                Barcode Prefix <span className="text-red-500">*</span>
              </label>
              <input
                id="barcodePrefix"
                type="text"
                value={barcodePrefix}
                onChange={(e) => setBarcodePrefix(e.target.value.toUpperCase())}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                placeholder="CLO"
                maxLength={10}
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-1">
                Barcodes will be generated as: PREFIX000001, PREFIX000002, etc.
              </p>
            </div>

            {/* Preview */}
            {barcodePrefix.trim() && (
              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Preview:</p>
                <div className="space-y-1">
                  {previewBarcodes().map((barcode, i) => (
                    <p key={i} className="text-sm font-mono">
                      {barcode}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Error Message */}
        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-950 p-3">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Warning */}
        <div className="rounded-md bg-yellow-50 dark:bg-yellow-950 p-3">
          <p className="text-xs text-yellow-800 dark:text-yellow-200">
            <strong>Warning:</strong> This will overwrite existing barcodes for selected products.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Assigning...' : `Assign to ${productIds.length} Product(s)`}
          </button>
        </div>
      </form>
    </Modal>
  )
}
