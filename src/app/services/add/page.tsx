'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { ProtectedRoute } from '@/components/auth/protected-route'
import { MainLayout } from '@/components/layout/main-layout'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAlert } from '@/components/ui/confirm-modal'
import { SearchableSelect } from '@/components/ui/searchable-select'

interface Category {
  id: string
  name: string
  emoji?: string
}

export default function AddServicePage() {
  const { currentBusiness } = useBusinessPermissionsContext()
  const router = useRouter()
  const customAlert = useAlert()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    sellingPrice: '',
    cost: '',
    unitOfMeasure: 'fixed',
    categoryId: '',
    isActive: true,
  })

  useEffect(() => {
    if (currentBusiness?.businessId) {
      fetchCategories()
    }
  }, [currentBusiness?.businessId])

  const fetchCategories = async () => {
    try {
      const response = await fetch(`/api/business/${currentBusiness?.businessId}/categories`)
      if (response.ok) {
        const data = await response.json()
        // Sort alphabetically (API already sorts, but ensure client-side)
        const sorted = [...data].sort((a: Category, b: Category) => a.name.localeCompare(b.name))
        setCategories(sorted)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const createCategory = async () => {
    if (!newCategoryName.trim()) return

    setCreatingCategory(true)
    try {
      const response = await fetch(`/api/business/${currentBusiness?.businessId}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      })

      if (response.ok) {
        const newCat = await response.json()
        setCategories(prev => [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name)))
        setFormData(prev => ({ ...prev, categoryId: newCat.id }))
        setNewCategoryName('')
        setShowNewCategory(false)
      } else {
        const err = await response.json()
        await customAlert({ title: 'Error', description: err.error || 'Failed to create category' })
      }
    } catch (error) {
      console.error('Error creating category:', error)
      await customAlert({ title: 'Error', description: 'Error creating category' })
    } finally {
      setCreatingCategory(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.sku || !formData.categoryId) {
      await customAlert({ title: 'Missing Fields', description: 'Please fill in service name, SKU, and select a category.' })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/business/${currentBusiness?.businessId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          sellingPrice: parseFloat(formData.sellingPrice) || 0,
          cost: parseFloat(formData.cost) || 0,
          productType: 'SERVICE',
        }),
      })

      if (response.ok) {
        await customAlert({ title: 'Success', description: 'Service created successfully!' })
        // Use replace instead of push to prevent back button from returning to form
        router.replace('/services/list')
      } else {
        const error = await response.json()
        await customAlert({ title: 'Error', description: error.message || 'Failed to create service' })
      }
    } catch (error) {
      console.error('Error creating service:', error)
      await customAlert({ title: 'Error', description: 'Error creating service' })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const generateSKU = () => {
    const prefix = formData.name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 3)
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    setFormData(prev => ({ ...prev, sku: `SVC-${prefix}-${random}` }))
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <ContentLayout
          title="Add New Service"
          subtitle="Create a new service offering"
          breadcrumb={[
            { label: 'Business Hub', href: '/dashboard' },
            { label: 'Services', href: '/services' },
            { label: 'Add', isActive: true }
          ]}
        >
          <div className="card p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Service Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="input w-full px-4 py-2.5 text-base"
                      placeholder="e.g., Plumbing Repair Service"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      SKU <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        name="sku"
                        value={formData.sku}
                        onChange={handleChange}
                        required
                        className="input flex-1"
                        placeholder="e.g., SVC-PLB-001"
                      />
                      <button
                        type="button"
                        onClick={generateSKU}
                        className="btn-secondary"
                      >
                        Generate
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={3}
                      className="input w-full px-4 py-2.5 text-base"
                      placeholder="Describe the service..."
                    />
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                  Pricing
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Selling Price <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                      <input
                        type="number"
                        name="sellingPrice"
                        value={formData.sellingPrice}
                        onChange={handleChange}
                        required
                        step="0.01"
                        min="0"
                        className="input w-full pl-8"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Cost
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                      <input
                        type="number"
                        name="cost"
                        value={formData.cost}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                        className="input w-full pl-8"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Pricing Type
                    </label>
                    <select
                      name="unitOfMeasure"
                      value={formData.unitOfMeasure}
                      onChange={handleChange}
                      className="input w-full px-4 py-2.5 text-base"
                    >
                      <option value="fixed">Fixed Fee</option>
                      <option value="hour">Per Hour</option>
                      <option value="day">Per Day</option>
                      <option value="project">Per Project</option>
                      <option value="sqft">Per Square Foot</option>
                      <option value="room">Per Room</option>
                      <option value="unit">Per Unit</option>
                    </select>
                  </div>
                </div>

                {formData.sellingPrice && formData.cost && (
                  <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Margin: <span className="font-semibold">
                        ${(parseFloat(formData.sellingPrice) - parseFloat(formData.cost)).toFixed(2)}
                      </span> (
                      {parseFloat(formData.cost) > 0
                        ? ((parseFloat(formData.sellingPrice) - parseFloat(formData.cost)) / parseFloat(formData.cost) * 100).toFixed(1)
                        : '0'
                      }%)
                    </p>
                  </div>
                )}
              </div>

              {/* Category & Status */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                  Organization
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      options={categories}
                      value={formData.categoryId}
                      onChange={(id) => setFormData(prev => ({ ...prev, categoryId: id }))}
                      placeholder="Select a category..."
                      searchPlaceholder="Search categories..."
                      emptyMessage="No categories found"
                    />
                    {!showNewCategory ? (
                      <button
                        type="button"
                        onClick={() => setShowNewCategory(true)}
                        className="mt-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        + Create new category
                      </button>
                    ) : (
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="New category name"
                          className="input flex-1 px-3 py-1.5 text-sm"
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), createCategory())}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={createCategory}
                          disabled={creatingCategory || !newCategoryName.trim()}
                          className="btn-primary text-sm px-3 py-1.5"
                        >
                          {creatingCategory ? '...' : 'Add'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowNewCategory(false); setNewCategoryName('') }}
                          className="btn-secondary text-sm px-3 py-1.5"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Status
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleChange}
                        className="mr-2"
                      />
                      <span className="text-slate-700 dark:text-slate-300">Active</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="btn-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Service'}
                </button>
              </div>
            </form>
          </div>
        </ContentLayout>
      </MainLayout>
    </ProtectedRoute>
  )
}
