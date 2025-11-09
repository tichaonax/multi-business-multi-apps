'use client'

import { Modal } from '@/components/ui/modal'
import { useState } from 'react'
import { DollarSign } from 'lucide-react'

interface BulkPriceModalProps {
  isOpen: boolean
  onClose: () => void
  productIds: string[]
  onSuccess: () => void
}

export function BulkPriceModal({ isOpen, onClose, productIds, onSuccess }: BulkPriceModalProps) {
  const [loading, setLoading] = useState(false)
  const [updateType, setUpdateType] = useState<'fixed' | 'markup'>('fixed')
  const [fixedPrice, setFixedPrice] = useState('')
  const [markupPercent, setMarkupPercent] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [error, setError] = useState('')

  const validate = () => {
    if (updateType === 'fixed') {
      const price = parseFloat(fixedPrice)
      if (!fixedPrice || isNaN(price) || price < 0) {
        setError('Please enter a valid price')
        return false
      }
    } else {
      const markup = parseFloat(markupPercent)
      if (!markupPercent || isNaN(markup) || markup < 0) {
        setError('Please enter a valid markup percentage')
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
        action: 'update_price',
        productIds
      }

      if (updateType === 'fixed') {
        requestData.basePrice = parseFloat(fixedPrice)
        if (costPrice) {
          requestData.costPrice = parseFloat(costPrice)
        }
      } else {
        requestData.priceMultiplier = 1 + (parseFloat(markupPercent) / 100)
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
        setError(data.error || 'Failed to update prices')
      }
    } catch (error) {
      console.error('Error updating prices:', error)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setUpdateType('fixed')
    setFixedPrice('')
    setMarkupPercent('')
    setCostPrice('')
    setError('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Bulk Price Update" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info */}
        <div className="rounded-lg border bg-muted/50 p-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm">
              Updating prices for <span className="font-semibold">{productIds.length}</span> product(s)
            </p>
          </div>
        </div>

        {/* Update Type Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Update Method</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="updateType"
                value="fixed"
                checked={updateType === 'fixed'}
                onChange={(e) => setUpdateType('fixed')}
                className="rounded-full"
              />
              <span className="text-sm">Set fixed price for all products</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="updateType"
                value="markup"
                checked={updateType === 'markup'}
                onChange={(e) => setUpdateType('markup')}
                className="rounded-full"
              />
              <span className="text-sm">Apply markup percentage to cost price</span>
            </label>
          </div>
        </div>

        {/* Fixed Price Input */}
        {updateType === 'fixed' && (
          <>
            <div>
              <label htmlFor="fixedPrice" className="block text-sm font-medium mb-1">
                Base Price <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                <input
                  id="fixedPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={fixedPrice}
                  onChange={(e) => setFixedPrice(e.target.value)}
                  className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label htmlFor="costPrice" className="block text-sm font-medium mb-1">
                Cost Price (Optional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                <input
                  id="costPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm"
                  placeholder="0.00"
                />
              </div>
            </div>
          </>
        )}

        {/* Markup Percentage Input */}
        {updateType === 'markup' && (
          <div>
            <label htmlFor="markupPercent" className="block text-sm font-medium mb-1">
              Markup Percentage <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="markupPercent"
                type="number"
                step="0.01"
                min="0"
                value={markupPercent}
                onChange={(e) => setMarkupPercent(e.target.value)}
                className="w-full rounded-md border border-input bg-background pl-3 pr-8 py-2 text-sm"
                placeholder="0"
                autoFocus
              />
              <span className="absolute right-3 top-2.5 text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Example: 100% markup = 2x cost price, 50% markup = 1.5x cost price
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-950 p-3">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

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
            {loading ? 'Updating...' : `Update ${productIds.length} Product(s)`}
          </button>
        </div>
      </form>
    </Modal>
  )
}
