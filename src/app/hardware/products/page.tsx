"use client"

import { useState, useEffect, Suspense } from 'react'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { BusinessProvider } from '@/components/universal'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

function HardwareProductsContent() {
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [productName, setProductName] = useState('')
  const [productDescription, setProductDescription] = useState('')
  const [productPrice, setProductPrice] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  const {
    currentBusiness,
    currentBusinessId,
    isAuthenticated,
    loading: businessLoading,
    businesses
  } = useBusinessPermissionsContext()

  const businessId = currentBusinessId!

  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/auth/signin')
  }, [session, status, router])

  // Handle edit query parameter
  useEffect(() => {
    if (!searchParams) return
    const editProductId = searchParams.get('edit')
    if (editProductId && businessId) {
      setEditingProductId(editProductId)
      setEditModalOpen(true)
      // Clean up the URL
      router.replace('/hardware/products', undefined)
    }
  }, [searchParams, businessId, router])

  if (status === 'loading' || businessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!session || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You need to be logged in to access products.</p>
        </div>
      </div>
    )
  }

  const hardwareBusinesses = businesses.filter((b: any) => b.businessType === 'hardware' && b.isActive)
  const hasHardwareBusinesses = hardwareBusinesses.length > 0

  if (!currentBusiness && hasHardwareBusinesses) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Select a Hardware Business</h2>
          <p className="text-gray-600 mb-4">You have access to {hardwareBusinesses.length} hardware business{hardwareBusinesses.length > 1 ? 'es' : ''}. Please select one from the sidebar.</p>
        </div>
      </div>
    )
  }

  if (currentBusiness && currentBusiness.businessType !== 'hardware') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Wrong Business Type</h2>
          <p className="text-gray-600">The Hardware Products page is only for hardware businesses. Please select a hardware business.</p>
        </div>
      </div>
    )
  }

  const handleProductCreate = () => {
    window.location.href = '/hardware/products/new'
  }

  const handleSaveProduct = async () => {
    if (!editingProductId) return

    setIsSaving(true)
    setSaveError(null)

    try {
      const updateData: any = {}

      if (productName.trim()) updateData.name = productName.trim()
      if (productDescription.trim()) updateData.description = productDescription.trim()
      if (productPrice && !isNaN(parseFloat(productPrice))) {
        updateData.basePrice = parseFloat(productPrice)
      }

      const response = await fetch(`/api/universal/products/${editingProductId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update product')
      }

      // Close modal and reset state
      setSaveSuccess(true)
      setTimeout(() => {
        setEditModalOpen(false)
        setEditingProductId(null)
        setProductName('')
        setProductDescription('')
        setProductPrice('')
        setSaveError(null)
        setSaveSuccess(false)
      }, 1500) // Show success message for 1.5 seconds

    } catch (error) {
      console.error('Error saving product:', error)
      setSaveError(error instanceof Error ? error.message : 'Failed to save product')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <BusinessProvider businessId={businessId}>
      <BusinessTypeRoute requiredBusinessType="hardware">
        <ContentLayout
          title="Product Management"
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Hardware', href: '/hardware' },
            { label: 'Products', isActive: true }
          ]}
        >
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleProductCreate}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <span>➕</span>
                Add New Product
              </button>
            </div>

            {/* Hardware-specific Product Features */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-orange-900 mb-4">
                🔧 Hardware Product Management
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-orange-200">
                  <h3 className="font-semibold text-orange-900 mb-2">🛠️ Tool Inventory</h3>
                  <p className="text-sm text-orange-700">
                    Track power tools, hand tools, and equipment with maintenance schedules and warranty information.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-orange-200">
                  <h3 className="font-semibold text-orange-900 mb-2">🏗️ Construction Materials</h3>
                  <p className="text-sm text-orange-700">
                    Manage lumber, plumbing supplies, electrical components, and building materials inventory.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-orange-200">
                  <h3 className="font-semibold text-orange-900 mb-2">🏠 Home Improvement</h3>
                  <p className="text-sm text-orange-700">
                    Organize paint, flooring, appliances, and home improvement products by category.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-orange-200">
                  <h3 className="font-semibold text-orange-900 mb-2">📊 Bulk Pricing</h3>
                  <p className="text-sm text-orange-700">
                    Handle contractor pricing, bulk discounts, and wholesale inventory management.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Product Edit Modal */}
          {editModalOpen && editingProductId && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="flex items-center justify-between p-6 border-b">
                  <h2 className="text-xl font-semibold">Edit Product</h2>
                  <button
                    onClick={() => {
                      setEditModalOpen(false)
                      setEditingProductId(null)
                      setProductName('')
                      setProductDescription('')
                      setProductPrice('')
                      setSaveError(null)
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-6">
                  {saveSuccess ? (
                    <div className="text-center py-8">
                      <div className="text-green-500 text-4xl mb-4">✓</div>
                      <h3 className="text-lg font-semibold text-green-900 mb-2">Product Updated Successfully!</h3>
                      <p className="text-green-700">Your changes have been saved.</p>
                    </div>
                  ) : (
                    <>
                      {saveError && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-red-800 text-sm">{saveError}</p>
                        </div>
                      )}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Product Name</label>
                          <input
                            type="text"
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter product name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Description</label>
                          <textarea
                            value={productDescription}
                            onChange={(e) => setProductDescription(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            placeholder="Enter product description"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Price</label>
                          <input
                            type="number"
                            step="0.01"
                            value={productPrice}
                            onChange={(e) => setProductPrice(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-6">
                        <button
                          onClick={() => {
                            setEditModalOpen(false)
                            setEditingProductId(null)
                            setProductName('')
                            setProductDescription('')
                            setProductPrice('')
                            setSaveError(null)
                            setSaveSuccess(false)
                          }}
                          className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                          disabled={isSaving}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveProduct}
                          disabled={isSaving}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {isSaving ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Saving...
                            </>
                          ) : (
                            'Save Changes'
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </ContentLayout>
      </BusinessTypeRoute>
    </BusinessProvider>
  )
}

export default function HardwareProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    }>
      <HardwareProductsContent />
    </Suspense>
  )
}