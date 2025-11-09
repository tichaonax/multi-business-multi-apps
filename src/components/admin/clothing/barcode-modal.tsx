'use client'

import { Modal } from '@/components/ui/modal'
import { useState, useEffect } from 'react'
import { Barcode } from 'lucide-react'

interface Product {
  id: string
  name: string
  sku: string
  barcode: string | null
}

interface BarcodeModalProps {
  isOpen: boolean
  onClose: () => void
  product: Product | null
  onSuccess: () => void
}

export function BarcodeModal({ isOpen, onClose, product, onSuccess }: BarcodeModalProps) {
  const [loading, setLoading] = useState(false)
  const [barcode, setBarcode] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (product) {
      setBarcode(product.barcode || '')
    }
  }, [product])

  const validate = () => {
    if (!barcode.trim()) {
      setError('Barcode is required')
      return false
    }

    if (barcode.trim().length < 3) {
      setError('Barcode must be at least 3 characters')
      return false
    }

    setError('')
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate() || !product) return

    setLoading(true)

    try {
      const response = await fetch(`/api/admin/clothing/products/${product.id}/barcode`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: barcode.trim() })
      })

      const data = await response.json()

      if (data.success) {
        onSuccess()
        onClose()
      } else {
        setError(data.error || 'Failed to assign barcode')
      }
    } catch (error) {
      console.error('Error assigning barcode:', error)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async () => {
    if (!product || !product.barcode) return

    setLoading(true)

    try {
      const response = await fetch(`/api/admin/clothing/products/${product.id}/barcode`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        onSuccess()
        onClose()
      } else {
        setError(data.error || 'Failed to remove barcode')
      }
    } catch (error) {
      console.error('Error removing barcode:', error)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setBarcode('')
    setError('')
    onClose()
  }

  if (!product) return null

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Assign Barcode" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product Info */}
        <div className="rounded-lg border bg-muted/50 p-3">
          <div className="flex items-center gap-2">
            <Barcode className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">{product.name}</p>
              <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
            </div>
          </div>
        </div>

        {/* Barcode Input */}
        <div>
          <label htmlFor="barcode" className="block text-sm font-medium mb-1">
            Barcode <span className="text-red-500">*</span>
          </label>
          <input
            id="barcode"
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            className={`w-full rounded-md border ${error ? 'border-red-500' : 'border-input'} bg-background px-3 py-2 text-sm font-mono`}
            placeholder="Enter or scan barcode"
            autoFocus
          />
          {error && (
            <p className="text-xs text-red-500 mt-1">{error}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Scan a barcode or enter it manually
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-2">
          {/* Remove button (only if barcode exists) */}
          {product.barcode && (
            <button
              type="button"
              onClick={handleRemove}
              className="rounded-md border border-red-500 bg-background px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50"
              disabled={loading}
            >
              Remove Barcode
            </button>
          )}

          <div className={`flex gap-2 ${!product.barcode ? 'ml-auto' : ''}`}>
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
              {loading ? 'Assigning...' : 'Assign Barcode'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
