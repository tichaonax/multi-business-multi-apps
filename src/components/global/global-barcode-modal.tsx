'use client'

import { useState, useEffect } from 'react'
import { globalBarcodeService, GlobalBarcodeEvent } from '@/lib/services/global-barcode-service'
import { useSession } from 'next-auth/react'
import { getGlobalBarcodeScanningAccess, canStockInventoryFromModal } from '@/lib/permission-utils'
import { BusinessSelectionModal, InventoryType, ProductData } from './business-selection-modal'
import { useToast } from '@/components/ui/use-toast'

interface BusinessInventory {
  businessId: string
  businessName: string
  businessType: string
  stockQuantity: number
  price: number
  hasAccess: boolean
  isInformational: boolean
  productId?: string
  variantId?: string | null
  productName?: string
  variantName?: string | null
  description?: string | null
  productAttributes?: any
  variantAttributes?: any
}

interface GlobalBarcodeModalProps {
  isOpen: boolean
  onClose: () => void
  barcode: string
  confidence: 'high' | 'medium' | 'low'
}

export function GlobalBarcodeModal({ isOpen, onClose, barcode, confidence }: GlobalBarcodeModalProps) {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [businesses, setBusinesses] = useState<BusinessInventory[]>([])
  const [selectedBusiness, setSelectedBusiness] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [customSku, setCustomSku] = useState('')
  const [currentBarcode, setCurrentBarcode] = useState(barcode)
  const [currentConfidence, setCurrentConfidence] = useState(confidence)
  const [showBusinessSelection, setShowBusinessSelection] = useState(false)
  const { push: showToast } = useToast()

  useEffect(() => {
    if (isOpen && barcode) {
      setCurrentBarcode(barcode)
      setCurrentConfidence(confidence)
      lookupBarcode(barcode)
    }
  }, [isOpen, barcode])

  const lookupBarcode = async (barcodeToLookup: string) => {
    if (!session?.user) return

    setIsLoading(true)
    setError(null)
    setBusinesses([])
    setSelectedBusiness(null)

    try {
      // Check user permissions
      const access = getGlobalBarcodeScanningAccess(session.user as any)
      if (!access.canScan) {
        setError('You do not have permission to use global barcode scanning')
        return
      }

      // Call the inventory lookup API
      const response = await fetch(`/api/global/inventory-lookup/${encodeURIComponent(barcodeToLookup)}`)

      // Don't throw on non-200 responses, handle gracefully
      if (!response.ok) {
        const errorText = await response.text()
        console.warn('API returned non-200 status:', response.status, errorText)
        setError(`Failed to lookup barcode (${response.status}). Please try again.`)
        return
      }

      const data = await response.json()

      if (!data.success) {
        setError(data.error || 'Failed to lookup barcode')
        return
      }

      // Transform the response into our business inventory format
      const businessInventory: BusinessInventory[] = []

      // Process the businesses data from the API
      if (data.data?.businesses) {
        data.data.businesses.forEach((biz: any) => {
          businessInventory.push({
            businessId: biz.businessId,
            businessName: biz.businessName,
            businessType: biz.businessType || 'unknown',
            stockQuantity: biz.stockQuantity || 0,
            price: biz.price || 0,
            hasAccess: biz.hasAccess || false,
            isInformational: access.canViewAcrossBusinesses && !biz.hasAccess,
            productId: biz.productId,
            variantId: biz.variantId,
            productName: biz.productName,
            variantName: biz.variantName,
            description: biz.description,
            productAttributes: biz.productAttributes || {},
            variantAttributes: biz.variantAttributes || {}
          })
        })
      }

      // Filter based on permissions
      let filteredBusinesses = businessInventory.filter(biz => biz.hasAccess)
      if (access.canViewAcrossBusinesses) {
        // Add informational businesses
        const informationalBusinesses = businessInventory
          .filter(biz => !biz.hasAccess)
          .map(biz => ({ ...biz, isInformational: true }))
        filteredBusinesses = [...filteredBusinesses, ...informationalBusinesses]
      }

      setBusinesses(filteredBusinesses)

      // Auto-select the first accessible business
      const firstAccessible = filteredBusinesses.find(biz => biz.hasAccess)
      if (firstAccessible) {
        setSelectedBusiness(firstAccessible.businessId)
      }

    } catch (err) {
      console.error('Error looking up barcode:', err)
      setError('Failed to lookup barcode. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetScan = () => {
    setError(null)
    setBusinesses([])
    setSelectedBusiness(null)
    setCurrentBarcode('')
    setCurrentConfidence('low')
    setCustomSku('')
    setIsLoading(false)
  }

  const handleCustomSkuSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (customSku.trim()) {
      setCurrentBarcode(customSku.trim())
      setCurrentConfidence('high') // Custom entry is considered high confidence
      lookupBarcode(customSku.trim())
      setCustomSku('') // Clear the input
    }
  }

  const handleBusinessSelect = async (businessId: string) => {
    if (!selectedBusiness || !session?.user) return

    setIsLoading(true)
    try {
      // Emit the barcode event for the selected business
      globalBarcodeService.emitBarcodeEvent({
        barcode: currentBarcode,
        businessId,
        confidence: currentConfidence,
        userId: session.user.id
      })

      // Close the modal
      onClose()
    } catch (err) {
      console.error('Error selecting business:', err)
      setError('Failed to select business. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddToInventory = () => {
    setShowBusinessSelection(true)
  }

  // Helper function to format product attributes for display
  const getProductDetails = (business: BusinessInventory) => {
    const details: string[] = []

    // Variant name (usually contains size/color info for clothing)
    if (business.variantName && business.variantName !== business.productName) {
      details.push(business.variantName)
    }

    // Variant attributes (size, color, etc.)
    const variantAttrs = business.variantAttributes || {}
    if (variantAttrs.size) details.push(`Size: ${variantAttrs.size}`)
    if (variantAttrs.color) details.push(`Color: ${variantAttrs.color}`)
    if (variantAttrs.condition) details.push(`Condition: ${variantAttrs.condition}`)

    // Product attributes
    const productAttrs = business.productAttributes || {}
    if (productAttrs.size && !variantAttrs.size) details.push(`Size: ${productAttrs.size}`)
    if (productAttrs.color && !variantAttrs.color) details.push(`Color: ${productAttrs.color}`)
    if (productAttrs.material) details.push(`Material: ${productAttrs.material}`)
    if (productAttrs.brand) details.push(`Brand: ${productAttrs.brand}`)

    // Business-type specific attributes
    if (business.businessType === 'grocery') {
      if (productAttrs.expiryDate) details.push(`Expires: ${productAttrs.expiryDate}`)
      if (productAttrs.organic) details.push('Organic')
    }

    if (business.businessType === 'hardware') {
      if (productAttrs.dimensions) details.push(`Size: ${productAttrs.dimensions}`)
      if (productAttrs.weight) details.push(`Weight: ${productAttrs.weight}`)
    }

    if (business.businessType === 'restaurant') {
      if (productAttrs.spiceLevel) details.push(`Spice: ${productAttrs.spiceLevel}`)
      if (productAttrs.allergens) details.push(`Allergens: ${productAttrs.allergens}`)
    }

    return details
  }

  const handleBusinessSelectedForInventory = async (businessId: string, inventoryType: InventoryType, productData: ProductData) => {
    if (!session?.user) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/global/inventory-add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          barcode: currentBarcode,
          businessId,
          inventoryType,
          productData
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to add inventory: ${response.status}`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to add inventory')
      }

      // Show success message
      showToast(`✅ Product "${productData.name}" added successfully with ${productData.quantity} ${productData.unit}(s) in stock!`)

      // Close both modals
      setShowBusinessSelection(false)
      onClose()

      // Reset state
      setError(null)
      setBusinesses([])
      setSelectedBusiness(null)

    } catch (err) {
      console.error('Error adding inventory:', err)
      setError(err instanceof Error ? err.message : 'Failed to add inventory. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {businesses.length === 0 && !isLoading ? 'Product Not Found' : 'Product Found'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>

          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Barcode:</span>
              <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm text-gray-900 dark:text-gray-100">{currentBarcode}</code>
              <span className={`text-xs px-2 py-1 rounded ${
                currentConfidence === 'high' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                currentConfidence === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
                {currentConfidence} confidence
              </span>
            </div>

            {/* Custom SKU Input and Reset */}
            <div className="flex items-center gap-2 mb-2">
              <form onSubmit={handleCustomSkuSubmit} className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={customSku}
                  onChange={(e) => setCustomSku(e.target.value)}
                  placeholder="Enter custom SKU or scan new barcode..."
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !customSku.trim()}
                  className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Lookup
                </button>
              </form>
              <button
                onClick={handleResetScan}
                disabled={isLoading}
                className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Reset and scan again"
              >
                🔄 Reset
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400">Looking up product...</span>
            </div>
          ) : businesses.length === 0 ? (
            <div className="text-center py-8">
              <div className="mb-4">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  ⚠️ Product not found in any business.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
                  This product is not in your inventory. Would you like to add it?
                </p>
                {canStockInventoryFromModal(session?.user as any) && (
                  <button
                    onClick={handleAddToInventory}
                    disabled={isLoading}
                    className="px-6 py-3 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    📦 Add to Inventory
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900 dark:text-white">Select Business:</h3>
              {businesses.map((business) => (
                <div
                  key={business.businessId}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    business.isInformational
                      ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-75'
                      : selectedBusiness === business.businessId
                        ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => !business.isInformational && setSelectedBusiness(business.businessId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">{business.productName}</h4>
                        <span className={`text-xs px-2 py-1 rounded ${
                          business.businessType === 'grocery' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          business.businessType === 'hardware' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                          business.businessType === 'clothing' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                          business.businessType === 'restaurant' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {business.businessType}
                        </span>
                        {business.isInformational && (
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                            View Only
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{business.businessName}</p>

                      {/* Product Details */}
                      {(() => {
                        const details = getProductDetails(business)
                        return details.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {details.map((detail, idx) => (
                              <span key={idx} className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                                {detail}
                              </span>
                            ))}
                          </div>
                        )
                      })()}

                      {/* Description */}
                      {business.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                          {business.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                        <span>Stock: {business.stockQuantity}</span>
                        <span>Price: ${business.price.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {/* View button - always available */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          window.location.href = `/${business.businessType}/products`
                        }}
                        className="px-3 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 text-sm"
                      >
                        View
                      </button>
                      {/* Add to Cart - only for businesses with full access */}
                      {!business.isInformational && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (business.productId) {
                              window.location.href = `/${business.businessType}/pos?businessId=${business.businessId}&addProduct=${business.productId}${business.variantId ? `&variantId=${business.variantId}` : ''}`
                            }
                          }}
                          className="px-3 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 text-sm"
                        >
                          Add to Cart
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <BusinessSelectionModal
        isOpen={showBusinessSelection}
        onClose={() => setShowBusinessSelection(false)}
        onBusinessSelected={handleBusinessSelectedForInventory}
        barcode={currentBarcode}
      />
    </div>
  )
}