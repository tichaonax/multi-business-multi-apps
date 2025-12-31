'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import SKUGenerator from '@/components/products/sku-generator'
import { trackTemplateUsage } from '@/lib/barcode-lookup'

export default function AddGroceryInventoryPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currentBusinessId } = useBusinessPermissionsContext()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fromTemplate, setFromTemplate] = useState(false)
  const [templateId, setTemplateId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    basePrice: '',
    costPrice: '',
    currentStock: '',
    lowStockThreshold: '10',
    category: 'Fresh Produce',
    attributes: {
      organicCertified: false,
      expirationDays: '7',
      temperatureZone: 'room',
      pluCode: '',
      batchNumber: ''
    }
  })

  const categories = [
    'Fresh Produce', 'Dairy & Eggs', 'Meat & Seafood', 'Bakery', 'Frozen Foods',
    'Pantry Staples', 'Beverages', 'Snacks & Candy', 'Health & Beauty', 'Household'
  ]

  const temperatureZones = [
    { value: 'room', label: 'Room Temperature' },
    { value: 'refrigerated', label: 'Refrigerated' },
    { value: 'frozen', label: 'Frozen' }
  ]

  // Pre-populate form from template data (Phase 6)
  useEffect(() => {
    const templateDataParam = searchParams?.get('templateData')
    if (templateDataParam) {
      try {
        const templateData = JSON.parse(decodeURIComponent(templateDataParam))
        setFormData(prev => ({
          ...prev,
          name: templateData.name || '',
          description: templateData.description || '',
          sku: templateData.sku || templateData.barcode || '',
          basePrice: templateData.basePrice?.toString() || '',
          category: templateData.category || prev.category,
        }))
        setFromTemplate(templateData.fromTemplate || false)
        setTemplateId(templateData.templateId || null)
      } catch (err) {
        console.error('Error parsing template data:', err)
      }
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!session?.user) {
      setError('You must be logged in to add inventory items')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/inventory/grocery-demo-business/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          sku: formData.sku || undefined,
          category: formData.category,
          basePrice: parseFloat(formData.basePrice),
          costPrice: formData.costPrice ? parseFloat(formData.costPrice) : undefined,
          currentStock: formData.currentStock ? parseInt(formData.currentStock) : 0,
          lowStockThreshold: parseInt(formData.lowStockThreshold),
          attributes: formData.attributes
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create inventory item')
      }

      // Track template usage if product was created from template (Phase 6)
      const result = await response.json()
      if (fromTemplate && templateId && session?.user?.id && result?.id) {
        try {
          await fetch('/api/universal/barcode-management/track-template-usage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              templateId,
              productId: result.id,
              userId: session.user.id
            })
          })
        } catch (trackError) {
          // Non-critical - don't fail product creation if tracking fails
          console.error('Failed to track template usage:', trackError)
        }
      }

      // Use replace instead of push to prevent back button from returning to form
      router.replace('/grocery/inventory')
    } catch (err) {
      console.error('Error creating inventory item:', err)
      setError(err instanceof Error ? err.message : 'Failed to create inventory item')
    } finally {
      setLoading(false)
    }
  }

  return (
    <BusinessTypeRoute requiredBusinessType="grocery">
      <ContentLayout
        title="🛒 Add Grocery Inventory Item"
        subtitle="Add a new product to your grocery inventory"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Grocery', href: '/grocery' },
          { label: 'Inventory', href: '/grocery/inventory' },
          { label: 'Add Item', isActive: true }
        ]}
      >
        <div className="max-w-2xl mx-auto">
          <div className="card">
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                  </div>
                )}

                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="font-medium text-primary">Basic Information</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">
                        Product Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="input-field w-full"
                        placeholder="e.g., Organic Bananas"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <SKUGenerator
                        businessId={currentBusinessId || ''}
                        categoryName={formData.category}
                        value={formData.sku}
                        onChange={(sku) => setFormData(prev => ({ ...prev, sku }))}
                        disabled={loading || !currentBusinessId}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="input-field w-full"
                      rows={2}
                      placeholder="Product description..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1">
                      Category *
                    </label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="input-field w-full"
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Pricing & Stock */}
                <div className="space-y-4">
                  <h3 className="font-medium text-primary">Pricing & Stock</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">
                        Sell Price * ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={formData.basePrice}
                        onChange={(e) => setFormData(prev => ({ ...prev, basePrice: e.target.value }))}
                        className="input-field w-full"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">
                        Cost Price ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.costPrice}
                        onChange={(e) => setFormData(prev => ({ ...prev, costPrice: e.target.value }))}
                        className="input-field w-full"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">
                        Initial Stock
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.currentStock}
                        onChange={(e) => setFormData(prev => ({ ...prev, currentStock: e.target.value }))}
                        className="input-field w-full"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">
                        Low Stock Threshold
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.lowStockThreshold}
                        onChange={(e) => setFormData(prev => ({ ...prev, lowStockThreshold: e.target.value }))}
                        className="input-field w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Grocery-Specific Attributes */}
                <div className="space-y-4">
                  <h3 className="font-medium text-primary">Grocery Attributes</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">
                        Temperature Zone
                      </label>
                      <select
                        value={formData.attributes.temperatureZone}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          attributes: {
                            ...prev.attributes,
                            temperatureZone: e.target.value
                          }
                        }))}
                        className="input-field w-full"
                      >
                        {temperatureZones.map(zone => (
                          <option key={zone.value} value={zone.value}>
                            {zone.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">
                        Shelf Life (days)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.attributes.expirationDays}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          attributes: {
                            ...prev.attributes,
                            expirationDays: e.target.value
                          }
                        }))}
                        className="input-field w-full"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">
                        PLU Code
                      </label>
                      <input
                        type="text"
                        value={formData.attributes.pluCode}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          attributes: {
                            ...prev.attributes,
                            pluCode: e.target.value
                          }
                        }))}
                        className="input-field w-full"
                        placeholder="e.g., 4011"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">
                        Batch Number
                      </label>
                      <input
                        type="text"
                        value={formData.attributes.batchNumber}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          attributes: {
                            ...prev.attributes,
                            batchNumber: e.target.value
                          }
                        }))}
                        className="input-field w-full"
                        placeholder="e.g., BTH2024001"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.attributes.organicCertified}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          attributes: {
                            ...prev.attributes,
                            organicCertified: e.target.checked
                          }
                        }))}
                        className="mr-2"
                      />
                      <span className="text-sm text-secondary">Organic Certified</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? 'Creating...' : 'Create Item'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </ContentLayout>
    </BusinessTypeRoute>
  )
}