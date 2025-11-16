'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { canAddInventoryFromModal } from '@/lib/permission-utils'

export type InventoryType = 'clothing' | 'hardware' | 'grocery' | 'restaurant'

interface BusinessForInventory {
  id: string
  name: string
  type: string
  canAddInventory: boolean
}

interface BusinessSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onBusinessSelected: (businessId: string, inventoryType: InventoryType) => void
  barcode: string
}

export function BusinessSelectionModal({
  isOpen,
  onClose,
  onBusinessSelected,
  barcode
}: BusinessSelectionModalProps) {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [businesses, setBusinesses] = useState<BusinessForInventory[]>([])
  const [selectedInventoryType, setSelectedInventoryType] = useState<InventoryType | null>(null)
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const inventoryTypes: { value: InventoryType; label: string; icon: string }[] = [
    { value: 'clothing', label: 'Clothing', icon: '👕' },
    { value: 'hardware', label: 'Hardware', icon: '🔧' },
    { value: 'grocery', label: 'Grocery', icon: '🛒' },
    { value: 'restaurant', label: 'Restaurant', icon: '🍽️' }
  ]

  useEffect(() => {
    if (isOpen) {
      loadBusinesses()
    } else {
      // Reset state when modal closes
      setSelectedInventoryType(null)
      setSelectedBusinessId(null)
      setBusinesses([])
      setError(null)
    }
  }, [isOpen])

  const loadBusinesses = async () => {
    if (!session?.user || !selectedInventoryType) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/global/user-businesses-for-inventory?inventoryType=${selectedInventoryType}`)

      if (!response.ok) {
        throw new Error(`Failed to load businesses: ${response.status}`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to load businesses')
      }

      setBusinesses(data.businesses || [])
    } catch (err) {
      console.error('Error loading businesses:', err)
      setError(err instanceof Error ? err.message : 'Failed to load businesses')
      setBusinesses([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (selectedInventoryType) {
      loadBusinesses()
    }
  }, [selectedInventoryType])

  const handleInventoryTypeSelect = (inventoryType: InventoryType) => {
    setSelectedInventoryType(inventoryType)
    setSelectedBusinessId(null)
    setBusinesses([])
  }

  const handleBusinessSelect = (businessId: string) => {
    setSelectedBusinessId(businessId)
  }

  const handleAddProduct = () => {
    if (!selectedBusinessId || !selectedInventoryType) return

    // Check permission before proceeding
    if (!canAddInventoryFromModal(session?.user as any, selectedBusinessId)) {
      setError('You do not have permission to add inventory to this business')
      return
    }

    onBusinessSelected(selectedBusinessId, selectedInventoryType)
  }

  const canProceed = selectedBusinessId && selectedInventoryType && businesses.find(b => b.id === selectedBusinessId)?.canAddInventory

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              📦 Add Product to Inventory
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
              <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm text-gray-900 dark:text-gray-100">
                {barcode}
              </code>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
            </div>
          )}

          {/* Inventory Type Selection */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">
              Select inventory type:
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {inventoryTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => handleInventoryTypeSelect(type.value)}
                  className={`p-4 border rounded-lg text-left transition-colors ${
                    selectedInventoryType === type.value
                      ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{type.icon}</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {type.label}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Business Selection */}
          {selectedInventoryType && (
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                Select business:
              </h3>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">Loading businesses...</span>
                </div>
              ) : businesses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-400">
                    No businesses found for {selectedInventoryType} inventory.
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    You may not have permission to add inventory to any {selectedInventoryType} businesses.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {businesses.map((business) => (
                    <div
                      key={business.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        !business.canAddInventory
                          ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-60 cursor-not-allowed'
                          : selectedBusinessId === business.id
                            ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                      onClick={() => business.canAddInventory && handleBusinessSelect(business.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {business.name}
                            </h4>
                            <span className={`text-xs px-2 py-1 rounded ${
                              business.canAddInventory
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                            }`}>
                              {business.canAddInventory ? 'Can add inventory' : 'No permission'}
                            </span>
                          </div>
                        </div>
                        {business.canAddInventory && (
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            selectedBusinessId === business.id
                              ? 'border-blue-500 dark:border-blue-400 bg-blue-500 dark:bg-blue-400'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {selectedBusinessId === business.id && (
                              <div className="w-full h-full rounded-full bg-white scale-50"></div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleAddProduct}
              disabled={!canProceed || isLoading}
              className="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Loading...' : 'Add Product'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}