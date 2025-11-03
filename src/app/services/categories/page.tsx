'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { MainLayout } from '@/components/layout/main-layout'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useEffect, useState } from 'react'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'

interface Category {
  id: string
  name: string
  description: string | null
  isActive: boolean
  _count?: {
    business_products: number
  }
}

export default function ServiceCategoriesPage() {
  const { currentBusiness } = useBusinessPermissionsContext()
  const customAlert = useAlert()
  const customConfirm = useConfirm()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true,
  })

  useEffect(() => {
    if (currentBusiness?.businessId) {
      fetchCategories()
    }
  }, [currentBusiness?.businessId])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/business/${currentBusiness?.businessId}/categories`)
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name) {
      await customAlert('Please enter a category name')
      return
    }

    try {
      const url = editingCategory
        ? `/api/business/${currentBusiness?.businessId}/categories/${editingCategory.id}`
        : `/api/business/${currentBusiness?.businessId}/categories`
      
      const method = editingCategory ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await customAlert(`Category ${editingCategory ? 'updated' : 'created'} successfully!`)
        setShowAddModal(false)
        setEditingCategory(null)
        setFormData({ name: '', description: '', isActive: true })
        fetchCategories()
      } else {
        const error = await response.json()
        await customAlert(`Error: ${error.message || 'Failed to save category'}`)
      }
    } catch (error) {
      console.error('Error saving category:', error)
      await customAlert('Error saving category')
    }
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description || '',
      isActive: category.isActive,
    })
    setShowAddModal(true)
  }

  const handleDelete = async (id: string, name: string, productCount: number) => {
    if (productCount > 0) {
      await customAlert(
        `Cannot delete "${name}" because it has ${productCount} service(s) assigned to it. Please reassign or delete those services first.`
      )
      return
    }

    const confirmed = await customConfirm(
      `Are you sure you want to delete "${name}"?`,
      'This action cannot be undone.'
    )

    if (confirmed) {
      try {
        const response = await fetch(
          `/api/business/${currentBusiness?.businessId}/categories/${id}`,
          { method: 'DELETE' }
        )

        if (response.ok) {
          await customAlert(`Category "${name}" deleted successfully`)
          fetchCategories()
        } else {
          const error = await response.json()
          await customAlert(`Error: ${error.message || 'Failed to delete category'}`)
        }
      } catch (error) {
        console.error('Error deleting category:', error)
        await customAlert('Error deleting category')
      }
    }
  }

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(
        `/api/business/${currentBusiness?.businessId}/categories/${id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: !currentStatus }),
        }
      )

      if (response.ok) {
        fetchCategories()
      } else {
        await customAlert('Error updating category status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      await customAlert('Error updating category status')
    }
  }

  const resetForm = () => {
    setFormData({ name: '', description: '', isActive: true })
    setEditingCategory(null)
    setShowAddModal(false)
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <ContentLayout
          title="Service Categories"
          subtitle="Organize your services by category"
          breadcrumb={[
            { label: 'Business Hub', href: '/dashboard' },
            { label: 'Services', href: '/services' },
            { label: 'Categories', isActive: true }
          ]}
        >
          <div className="mb-6 flex justify-between items-center">
            <p className="text-slate-600 dark:text-slate-400">
              {categories.length} {categories.length === 1 ? 'category' : 'categories'}
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary"
            >
              ➕ Add Category
            </button>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full text-center py-8">
                <p className="text-slate-600 dark:text-slate-400">Loading categories...</p>
              </div>
            ) : categories.length === 0 ? (
              <div className="col-span-full card p-8 text-center">
                <p className="text-slate-600 dark:text-slate-400 mb-4">No categories yet</p>
                <button onClick={() => setShowAddModal(true)} className="btn-primary">
                  Create Your First Category
                </button>
              </div>
            ) : (
              categories.map((category) => (
                <div key={category.id} className="card p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {category.name}
                    </h3>
                    <button
                      onClick={() => handleToggleStatus(category.id, category.isActive)}
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        category.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}
                    >
                      {category.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                  
                  {category.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                      {category.description}
                    </p>
                  )}
                  
                  <p className="text-sm text-slate-500 dark:text-slate-500 mb-4">
                    {category._count?.business_products || 0} service(s)
                  </p>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(category)}
                      className="flex-1 btn-secondary text-sm py-2"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(
                        category.id,
                        category.name,
                        category._count?.business_products || 0
                      )}
                      className="flex-1 btn-secondary text-sm py-2 text-red-600 hover:text-red-800"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add/Edit Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                  {editingCategory ? 'Edit Category' : 'Add New Category'}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Category Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="input w-full"
                      placeholder="e.g., Plumbing Services"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="input w-full"
                      placeholder="Optional description..."
                    />
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-slate-700 dark:text-slate-300">Active</span>
                    </label>
                  </div>

                  <div className="flex justify-end gap-4 pt-4">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary">
                      {editingCategory ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </ContentLayout>
      </MainLayout>
    </ProtectedRoute>
  )
}
