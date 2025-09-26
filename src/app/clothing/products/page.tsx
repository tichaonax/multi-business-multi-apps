'use client'

import { useState } from 'react'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { BusinessProvider } from '@/components/universal'
import { ClothingProductList } from './components/product-list'
import { ClothingVariantManager } from './components/variant-manager'
import { ClothingSeasonalManager } from './components/seasonal-manager'
import { ClothingBulkImport } from './components/bulk-import'

// This would typically come from session/auth
const BUSINESS_ID = process.env.NEXT_PUBLIC_DEMO_BUSINESS_ID || 'cmfj6cfvz00001pgg2rn9710e'

export default function ClothingProductsPage() {
  const [activeTab, setActiveTab] = useState<'products' | 'variants' | 'seasonal' | 'import'>('products')
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)

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
    {
      id: 'seasonal',
      label: 'Seasonal Collections',
      icon: '🌟',
      description: 'Organize products by seasons and collections'
    },
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
    window.location.href = `/clothing/products/${productId}/edit`
  }

  const handleProductCreate = () => {
    window.location.href = '/clothing/products/new'
  }

  const handleVariantManage = (productId: string) => {
    setSelectedProduct(productId)
    setActiveTab('variants')
  }

  return (
    <BusinessProvider businessId={BUSINESS_ID}>
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

              <button
                onClick={() => setActiveTab('seasonal')}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
              >
                <span>🌟</span>
                Manage Collections
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6" aria-label="Tabs">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`
                        py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors
                        ${activeTab === tab.id
                          ? 'border-primary text-primary'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }
                      `}
                    >
                      <span className="text-lg">{tab.icon}</span>
                      <div className="text-left">
                        <div>{tab.label}</div>
                        <div className="text-xs text-gray-400 font-normal">{tab.description}</div>
                      </div>
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {activeTab === 'products' && (
                  <ClothingProductList
                    businessId={BUSINESS_ID}
                    onProductView={handleProductView}
                    onProductEdit={handleProductEdit}
                    onVariantManage={handleVariantManage}
                  />
                )}

                {activeTab === 'variants' && (
                  <ClothingVariantManager
                    businessId={BUSINESS_ID}
                    selectedProduct={selectedProduct}
                    onProductSelect={setSelectedProduct}
                  />
                )}

                {activeTab === 'seasonal' && (
                  <ClothingSeasonalManager businessId={BUSINESS_ID} />
                )}

                {activeTab === 'import' && (
                  <ClothingBulkImport businessId={BUSINESS_ID} />
                )}
              </div>
            </div>

            {/* Clothing-specific Product Features */}
            <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-orange-900 mb-4">
                👔 Advanced Clothing Product Management
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-orange-200">
                  <h3 className="font-semibold text-orange-900 mb-2">📐 Smart Variants</h3>
                  <p className="text-sm text-orange-700">
                    Automatically generate size/color combinations with stock tracking and pricing per variant.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-orange-200">
                  <h3 className="font-semibold text-orange-900 mb-2">🔄 Condition Management</h3>
                  <p className="text-sm text-orange-700">
                    Track NEW, USED, and REFURBISHED items with different pricing and inventory rules.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-orange-200">
                  <h3 className="font-semibold text-orange-900 mb-2">🌟 Seasonal Collections</h3>
                  <p className="text-sm text-orange-700">
                    Organize products into Spring, Summer, Fall, Winter collections with automatic promotion.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-orange-200">
                  <h3 className="font-semibold text-orange-900 mb-2">🏷️ Smart Attributes</h3>
                  <p className="text-sm text-orange-700">
                    Gender categories, material composition, care instructions, and fit information.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-orange-200">
                  <h3 className="font-semibold text-orange-900 mb-2">📊 Bulk Operations</h3>
                  <p className="text-sm text-orange-700">
                    Import thousands of products with variants from CSV, update prices in bulk, generate barcodes.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-orange-200">
                  <h3 className="font-semibold text-orange-900 mb-2">📷 Image Management</h3>
                  <p className="text-sm text-orange-700">
                    Multiple product images, variant-specific photos, and automatic image optimization.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-orange-200">
                  <h3 className="font-semibold text-orange-900 mb-2">🎯 Smart Suggestions</h3>
                  <p className="text-sm text-orange-700">
                    AI-powered recommendations for pricing, categories, and cross-selling opportunities.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-orange-200">
                  <h3 className="font-semibold text-orange-900 mb-2">⚙️ Advanced Rules</h3>
                  <p className="text-sm text-orange-700">
                    Custom pricing rules, automatic discounting, and inventory reorder point calculations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ContentLayout>
      </BusinessTypeRoute>
    </BusinessProvider>
  )
}