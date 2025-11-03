'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { MainLayout } from '@/components/layout/main-layout'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useEffect, useState } from 'react'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'
import { PhoneNumberInput } from '@/components/ui/phone-number-input'

interface Supplier {
  id: string
  name: string
  contactPerson: string | null
  email: string | null
  phone: string | null
  address: string | null
  productsSupplied: string | null
  isActive: boolean
  _count?: {
    business_products: number
  }
}

export default function ServiceSuppliersPage() {
  const { currentBusiness } = useBusinessPermissionsContext()
  const customAlert = useAlert()
  const customConfirm = useConfirm()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    productsSupplied: '',
    isActive: true,
  })

  useEffect(() => {
    if (currentBusiness?.businessId) {
      fetchSuppliers()
    }
  }, [currentBusiness?.businessId])

  const fetchSuppliers = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/business/${currentBusiness?.businessId}/suppliers`)
      if (response.ok) {
        const data = await response.json()
        // API returns { suppliers: [...], pagination: {...} }
        setSuppliers(data.suppliers || [])
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error)
      setSuppliers([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name) {
      await customAlert('Please enter a supplier name')
      return
    }

    try {
      const url = editingSupplier
        ? `/api/business/${currentBusiness?.businessId}/suppliers/${editingSupplier.id}`
        : `/api/business/${currentBusiness?.businessId}/suppliers`
      
      const method = editingSupplier ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await customAlert(`Supplier ${editingSupplier ? 'updated' : 'created'} successfully!`)
        setShowAddModal(false)
        setEditingSupplier(null)
        setFormData({ name: '', contactPerson: '', email: '', phone: '', address: '', isActive: true })
        fetchSuppliers()
      } else {
        const error = await response.json()
        await customAlert(`Error: ${error.message || 'Failed to save supplier'}`)
      }
    } catch (error) {
      console.error('Error saving supplier:', error)
      await customAlert('Error saving supplier')
    }
  }

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setFormData({
      name: supplier.name,
      contactPerson: supplier.contactPerson || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      productsSupplied: supplier.productsSupplied || '',
      isActive: supplier.isActive,
    })
    setShowAddModal(true)
  }

  const handleDelete = async (id: string, name: string, productCount: number) => {
    if (productCount > 0) {
      await customAlert(
        `Cannot delete "${name}" because it is linked to ${productCount} service(s). Please reassign or delete those services first.`
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
          `/api/business/${currentBusiness?.businessId}/suppliers/${id}`,
          { method: 'DELETE' }
        )

        if (response.ok) {
          await customAlert(`Supplier "${name}" deleted successfully`)
          fetchSuppliers()
        } else {
          const error = await response.json()
          await customAlert(`Error: ${error.message || 'Failed to delete supplier'}`)
        }
      } catch (error) {
        console.error('Error deleting supplier:', error)
        await customAlert('Error deleting supplier')
      }
    }
  }

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(
        `/api/business/${currentBusiness?.businessId}/suppliers/${id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: !currentStatus }),
        }
      )

      if (response.ok) {
        fetchSuppliers()
      } else {
        await customAlert('Error updating supplier status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      await customAlert('Error updating supplier status')
    }
  }

  const resetForm = () => {
    setFormData({ name: '', contactPerson: '', email: '', phone: '', address: '', productsSupplied: '', isActive: true })
    setEditingSupplier(null)
    setShowAddModal(false)
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <ContentLayout
          title="Suppliers"
          subtitle="Manage your materials and equipment suppliers"
          breadcrumb={[
            { label: 'Business Hub', href: '/dashboard' },
            { label: 'Services', href: '/services' },
            { label: 'Suppliers', isActive: true }
          ]}
        >
          <div className="mb-6 flex justify-between items-center">
            <p className="text-slate-600 dark:text-slate-400">
              {suppliers.length} {suppliers.length === 1 ? 'supplier' : 'suppliers'}
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary"
            >
              ➕ Add Supplier
            </button>
          </div>

          {/* Suppliers Table */}
          <div className="card p-6">
            {loading ? (
              <div className="text-center py-8">
                <p className="text-slate-600 dark:text-slate-400">Loading suppliers...</p>
              </div>
            ) : suppliers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-600 dark:text-slate-400 mb-4">No suppliers yet</p>
                <button onClick={() => setShowAddModal(true)} className="btn-primary">
                  Add Your First Supplier
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Supplier</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Contact</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Email</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Phone</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Products</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Status</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((supplier) => (
                      <tr key={supplier.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800">
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-900 dark:text-slate-100">{supplier.name}</p>
                          {supplier.address && (
                            <p className="text-sm text-slate-600 dark:text-slate-400">{supplier.address}</p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {supplier.contactPerson || '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {supplier.email || '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {supplier.phone || '-'}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400">
                          {supplier._count?.business_products || 0}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleStatus(supplier.id, supplier.isActive)}
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full cursor-pointer ${
                              supplier.isActive
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}
                          >
                            {supplier.isActive ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleEdit(supplier)}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDelete(
                                supplier.id,
                                supplier.name,
                                supplier._count?.business_products || 0
                              )}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Add/Edit Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-2xl">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                  {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Supplier Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className="input w-full"
                        placeholder="e.g., BuildRight Materials"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Contact Person
                      </label>
                      <input
                        type="text"
                        value={formData.contactPerson}
                        onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                        className="input w-full"
                        placeholder="e.g., John Doe"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="input w-full"
                        placeholder="supplier@example.com"
                      />
                    </div>

                    <div>
                      <PhoneNumberInput
                        value={formData.phone}
                        onChange={(fullNumber) => setFormData({ ...formData, phone: fullNumber })}
                        label="Phone"
                        placeholder="77 123 4567"
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Address
                    </label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      rows={2}
                      className="input w-full"
                      placeholder="Street address, city, state, zip"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Products/Materials Supplied
                    </label>
                    <textarea
                      value={formData.productsSupplied}
                      onChange={(e) => setFormData({ ...formData, productsSupplied: e.target.value })}
                      rows={3}
                      className="input w-full"
                      placeholder="Lumber, Screws, Nails, Paint, Electrical supplies..."
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Enter comma-separated items this supplier provides
                    </p>
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
                      {editingSupplier ? 'Update' : 'Create'}
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
