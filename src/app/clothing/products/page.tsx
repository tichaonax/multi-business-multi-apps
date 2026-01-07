"use client"

import { useState, useEffect, Suspense } from 'react'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { BusinessProvider } from '@/components/universal'
import { ClothingProductList } from './components/product-list'
import { ClothingVariantManager } from './components/variant-manager'
import { ClothingSeasonalManager } from './components/seasonal-manager'
import { ClothingBulkImport } from './components/bulk-import'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

function ClothingProductsContent() {
  const [activeTab, setActiveTab] = useState<'products' | 'variants' | 'seasonal' | 'import'>('products')
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)

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
      setActiveTab('products')
      // Clean up the URL
      router.replace('/clothing/products', undefined)
    }
  }, [searchParams, businessId, router])

  if (status === 'loading' || businessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    )
  }

  if (!session || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400">You need to be logged in to access products.</p>
        </div>
      </div>
    )
  }

  const clothingBusinesses = businesses.filter((b: any) => b.businessType === 'clothing' && b.isActive)
  const hasClothingBusinesses = clothingBusinesses.length > 0

  if (!currentBusiness && hasClothingBusinesses) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Select a Clothing Business</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">You have access to {clothingBusinesses.length} clothing business{clothingBusinesses.length > 1 ? 'es' : ''}. Please select one from the sidebar.</p>
        </div>
      </div>
    )
  }

  if (currentBusiness && currentBusiness.businessType !== 'clothing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Wrong Business Type</h2>
          <p className="text-gray-600 dark:text-gray-400">The Clothing Products page is only for clothing businesses. Please select a clothing business.</p>
        </div>
      </div>
    )
  }

  const tabs = [
    {
      id: 'products',
      label: 'Product Management',
      icon: '👕',
      description: 'Manage clothing products and inventory'
    },
    {
      id: 'variants',
      label: 'Variant Manager',
      icon: '🔧',
      description: 'Bulk manage sizes, colors, and variants'
    },
    // Seasonal collections removed - was mock data only
    // {
    //   id: 'seasonal',
    //   label: 'Seasonal Collections',
    //   icon: '🌟',
    //   description: 'Organize products by seasons and collections'
    // },
    {
      id: 'import',
      label: 'Bulk Import',
      icon: '📁',
      description: 'Import products from CSV/Excel files'
    }
  ]

  const handleProductView = (productId: string) => {
    window.location.href = `/clothing/products/${productId}`
  }

  const handleProductEdit = (productId: string) => {
    setEditingProductId(productId)
    setEditModalOpen(true)
  }

  const handleProductCreate = () => {
    window.location.href = '/clothing/products/new'
  }

  const handleVariantManage = (productId: string) => {
    setSelectedProduct(productId)
    setActiveTab('variants')
  }

  return (
  <BusinessProvider businessId={businessId}>
      <BusinessTypeRoute requiredBusinessType="clothing">
        <ContentLayout
          title="Product Management"
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Clothing', href: '/clothing' },
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

              <button
                onClick={() => setActiveTab('import')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <span>📁</span>
                Bulk Import
              </button>

              {/* Seasonal collections button removed - was mock data only */}
            </div>

            {/* Tab Navigation */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex space-x-8 px-6" aria-label="Tabs">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`
                        py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors
                        ${activeTab === tab.id
                          ? 'border-primary text-primary dark:text-primary'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                        }
                      `}
                    >
                      <span className="text-lg">{tab.icon}</span>
                      <div className="text-left">
                        <div>{tab.label}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 font-normal">{tab.description}</div>
                      </div>
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {activeTab === 'products' && (
                  <ClothingProductList
                    businessId={businessId}
                    onProductView={handleProductView}
                    onProductEdit={handleProductEdit}
                    onVariantManage={handleVariantManage}
                  />
                )}

                {activeTab === 'variants' && (
                  <ClothingVariantManager
                    businessId={businessId}
                    selectedProduct={selectedProduct}
                    onProductSelect={setSelectedProduct}
                  />
                )}

                {/* Seasonal collections removed - was mock data only */}

                {activeTab === 'import' && (
                  <ClothingBulkImport businessId={businessId} />
                )}
              </div>
            </div>

            {/* Clothing-specific Product Features */}
            <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-orange-900 dark:text-orange-100 mb-4">
                👔 Advanced Clothing Product Management
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-orange-200 dark:border-orange-700">
                  <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">📐 Smart Variants</h3>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    Automatically generate size/color combinations with stock tracking and pricing per variant.
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-orange-200 dark:border-orange-700">
                  <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">🔄 Condition Management</h3>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    Track NEW, USED, and REFURBISHED items with different pricing and inventory rules.
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-orange-200 dark:border-orange-700">
                  <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">🌟 Seasonal Collections</h3>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    Organize products into Spring, Summer, Fall, Winter collections with automatic promotion.
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-orange-200 dark:border-orange-700">
                  <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">🏷️ Smart Attributes</h3>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    Gender categories, material composition, care instructions, and fit information.
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-orange-200 dark:border-orange-700">
                  <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">📊 Bulk Operations</h3>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    Import thousands of products with variants from CSV, update prices in bulk, generate barcodes.
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-orange-200 dark:border-orange-700">
                  <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">📷 Image Management</h3>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    Multiple product images, variant-specific photos, and automatic image optimization.
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-orange-200 dark:border-orange-700">
                  <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">🎯 Smart Suggestions</h3>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    AI-powered recommendations for pricing, categories, and cross-selling opportunities.
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-orange-200 dark:border-orange-700">
                  <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">⚙️ Advanced Rules</h3>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    Custom pricing rules, automatic discounting, and inventory reorder point calculations.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Product Edit Modal */}
          {editModalOpen && editingProductId && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Edit Product</h2>
                  <button
                    onClick={() => {
                      setEditModalOpen(false)
                      setEditingProductId(null)
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Name</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Enter product name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        rows={3}
                        placeholder="Enter product description"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <button
                      onClick={() => {
                        setEditModalOpen(false)
                        setEditingProductId(null)
                      }}
                      className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        // TODO: Implement save logic
                        setEditModalOpen(false)
                        setEditingProductId(null)
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </ContentLayout>
      </BusinessTypeRoute>
    </BusinessProvider>
  )
}

export default function ClothingProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    }>
      <ClothingProductsContent />
    </Suspense>
  )
}