"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { BusinessTypeRedirect } from '@/components/business-type-redirect'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { getSupportedBusinessTypes } from '@/app/universal/pos/config/business-type-config'
import { ContentLayout } from '@/components/layout/content-layout'
import { BusinessProvider } from '@/components/universal'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

interface Coupon {
  id: string
  code: string
  barcode: string | null
  description: string | null
  discountAmount: number
  requiresApproval: boolean
  isActive: boolean
  createdBy: string | null
  createdAt: string
  employees: { firstName: string; lastName: string } | null
  _count: { coupon_usages: number }
}

export default function ClothingCouponsPage() {
  const customAlert = useAlert()
  const confirm = useConfirm()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all')

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    barcode: '',
    description: '',
    discountAmount: ''
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const { data: session, status } = useSession()
  const router = useRouter()
  const {
    currentBusiness,
    currentBusinessId,
    isAuthenticated,
    loading: businessLoading,
    businesses
  } = useBusinessPermissionsContext()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/auth/signin')
  }, [session, status, router])

  const businessId = currentBusinessId!

  const loadCoupons = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    try {
      const response = await fetch(`/api/coupons?businessId=${businessId}`)
      const data = await response.json()
      if (data.success) {
        setCoupons(data.data)
      }
    } catch (error) {
      console.error('Error loading coupons:', error)
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    if (businessId) {
      loadCoupons()
    }
  }, [businessId, loadCoupons])

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
          <p className="text-gray-600">You need to be logged in to manage coupons.</p>
        </div>
      </div>
    )
  }

  const clothingBusinesses = businesses.filter((b: any) => b.businessType === 'clothing' && b.isActive)
  if (!currentBusiness && clothingBusinesses.length > 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Select a Clothing Business</h2>
          <p className="text-gray-600 mb-4">Please select a clothing business from the sidebar.</p>
        </div>
      </div>
    )
  }

  if (currentBusiness && currentBusiness.businessType !== 'clothing') {
    return <BusinessTypeRedirect />
  }

  // Filter coupons
  const filteredCoupons = coupons.filter(c => {
    const matchesSearch = searchTerm === '' ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterActive === 'all' ||
      (filterActive === 'active' && c.isActive) ||
      (filterActive === 'inactive' && !c.isActive)
    return matchesSearch && matchesFilter
  })

  // Stats
  const activeCoupons = coupons.filter(c => c.isActive).length
  const totalUsages = coupons.reduce((sum, c) => sum + c._count.coupon_usages, 0)
  const avgDiscount = coupons.length > 0
    ? (coupons.reduce((sum, c) => sum + Number(c.discountAmount), 0) / coupons.length).toFixed(2)
    : '0.00'

  const resetForm = () => {
    setFormData({ code: '', barcode: '', description: '', discountAmount: '' })
    setFormErrors({})
    setEditingCoupon(null)
  }

  const openCreateForm = () => {
    resetForm()
    setShowForm(true)
  }

  const openEditForm = (coupon: Coupon) => {
    setEditingCoupon(coupon)
    setFormData({
      code: coupon.code,
      barcode: coupon.barcode || '',
      description: coupon.description || '',
      discountAmount: String(coupon.discountAmount)
    })
    setFormErrors({})
    setShowForm(true)
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!formData.code.trim()) errors.code = 'Coupon code is required'
    const amount = parseFloat(formData.discountAmount)
    if (!formData.discountAmount || isNaN(amount)) errors.discountAmount = 'Discount amount is required'
    else if (amount <= 0) errors.discountAmount = 'Amount must be greater than 0'
    else if (amount > 20) errors.discountAmount = 'Amount cannot exceed $20'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setSaving(true)
    try {
      const url = editingCoupon
        ? `/api/coupons/${editingCoupon.id}`
        : '/api/coupons'
      const method = editingCoupon ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          code: formData.code.trim(),
          barcode: formData.barcode.trim() || null,
          description: formData.description.trim() || null,
          discountAmount: parseFloat(formData.discountAmount)
        })
      })

      const data = await response.json()
      if (data.success) {
        await loadCoupons()
        setShowForm(false)
        resetForm()
        void customAlert({
          title: 'Success',
          description: `Coupon ${editingCoupon ? 'updated' : 'created'} successfully`
        })
      } else {
        setFormErrors({ submit: data.error || 'Failed to save coupon' })
      }
    } catch (error) {
      setFormErrors({ submit: 'Network error' })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (coupon: Coupon) => {
    const action = coupon.isActive ? 'deactivate' : 'activate'
    const ok = await confirm({
      title: `${coupon.isActive ? 'Deactivate' : 'Activate'} Coupon`,
      description: `Are you sure you want to ${action} coupon ${coupon.code}?`,
      confirmText: coupon.isActive ? 'Deactivate' : 'Activate',
      cancelText: 'Cancel'
    })
    if (!ok) return

    try {
      const response = await fetch(`/api/coupons/${coupon.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !coupon.isActive })
      })
      const data = await response.json()
      if (data.success) {
        await loadCoupons()
        void customAlert({ title: 'Updated', description: `Coupon ${action}d successfully` })
      }
    } catch (error) {
      void customAlert({ title: 'Error', description: `Failed to ${action} coupon` })
    }
  }

  const handleDelete = async (coupon: Coupon) => {
    const ok = await confirm({
      title: 'Delete Coupon',
      description: `Are you sure you want to delete coupon ${coupon.code}?${coupon._count.coupon_usages > 0 ? ' This coupon has been used and will be deactivated instead.' : ''}`,
      confirmText: 'Delete',
      cancelText: 'Cancel'
    })
    if (!ok) return

    try {
      const response = await fetch(`/api/coupons/${coupon.id}`, { method: 'DELETE' })
      const data = await response.json()
      if (data.success) {
        await loadCoupons()
        void customAlert({
          title: 'Deleted',
          description: data.data.deactivated
            ? 'Coupon had usage history and was deactivated'
            : 'Coupon deleted successfully'
        })
      }
    } catch (error) {
      void customAlert({ title: 'Error', description: 'Failed to delete coupon' })
    }
  }

  return (
    <BusinessProvider businessId={businessId}>
      <BusinessTypeRoute requiredBusinessType={getSupportedBusinessTypes()}>
        <ContentLayout
          title="Coupon Management"
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Clothing', href: '/clothing' },
            { label: 'Coupons', isActive: true }
          ]}
        >
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Coupons</p>
                    <p className="text-2xl font-bold text-purple-600">{coupons.length}</p>
                  </div>
                  <div className="text-2xl">🎟️</div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
                    <p className="text-2xl font-bold text-green-600">{activeCoupons}</p>
                  </div>
                  <div className="text-2xl">✅</div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Times Used</p>
                    <p className="text-2xl font-bold text-blue-600">{totalUsages}</p>
                  </div>
                  <div className="text-2xl">📊</div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Avg Discount</p>
                    <p className="text-2xl font-bold text-orange-600">${avgDiscount}</p>
                  </div>
                  <div className="text-2xl">💰</div>
                </div>
              </div>
            </div>

            {/* Coupons Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
              <div className="p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Coupons</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Manage discount coupons for POS checkout</p>
                  </div>
                  <button
                    onClick={openCreateForm}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Create Coupon
                  </button>
                </div>

                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <input
                    type="text"
                    placeholder="Search by code or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
                  />
                  <select
                    value={filterActive}
                    onChange={(e) => setFilterActive(e.target.value as any)}
                    className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
                  >
                    <option value="all">All Coupons</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                  </select>
                </div>

                {/* Table */}
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Loading coupons...</p>
                  </div>
                ) : filteredCoupons.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-3">🎟️</div>
                    <p className="text-gray-600 dark:text-gray-400">
                      {coupons.length === 0 ? 'No coupons yet. Create your first coupon!' : 'No coupons match your search.'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-3 px-2 font-medium text-gray-600 dark:text-gray-400">Code</th>
                          <th className="text-left py-3 px-2 font-medium text-gray-600 dark:text-gray-400">Barcode</th>
                          <th className="text-left py-3 px-2 font-medium text-gray-600 dark:text-gray-400">Description</th>
                          <th className="text-right py-3 px-2 font-medium text-gray-600 dark:text-gray-400">Discount</th>
                          <th className="text-center py-3 px-2 font-medium text-gray-600 dark:text-gray-400">Approval</th>
                          <th className="text-center py-3 px-2 font-medium text-gray-600 dark:text-gray-400">Uses</th>
                          <th className="text-center py-3 px-2 font-medium text-gray-600 dark:text-gray-400">Status</th>
                          <th className="text-right py-3 px-2 font-medium text-gray-600 dark:text-gray-400">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCoupons.map((coupon) => (
                          <tr key={coupon.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750">
                            <td className="py-3 px-2 font-mono font-semibold text-purple-600">{coupon.code}</td>
                            <td className="py-3 px-2 text-gray-500">{coupon.barcode || '-'}</td>
                            <td className="py-3 px-2 text-gray-700 dark:text-gray-300">{coupon.description || '-'}</td>
                            <td className="py-3 px-2 text-right font-semibold text-green-600">${Number(coupon.discountAmount).toFixed(2)}</td>
                            <td className="py-3 px-2 text-center">
                              {coupon.requiresApproval ? (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Manager</span>
                              ) : (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">Auto</span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-center text-gray-600">{coupon._count.coupon_usages}</td>
                            <td className="py-3 px-2 text-center">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                coupon.isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {coupon.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-right">
                              <div className="flex justify-end gap-1">
                                <button
                                  onClick={() => openEditForm(coupon)}
                                  className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleToggleActive(coupon)}
                                  className={`px-2 py-1 text-xs border rounded ${
                                    coupon.isActive
                                      ? 'border-yellow-300 text-yellow-700 hover:bg-yellow-50'
                                      : 'border-green-300 text-green-700 hover:bg-green-50'
                                  }`}
                                >
                                  {coupon.isActive ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  onClick={() => handleDelete(coupon)}
                                  className="px-2 py-1 text-xs border border-red-300 text-red-700 rounded hover:bg-red-50"
                                >
                                  Delete
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
            </div>
          </div>

          {/* Create/Edit Coupon Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
                  </h3>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Coupon Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        placeholder="e.g. SAVE5"
                        className={`w-full rounded-md border ${formErrors.code ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white font-mono`}
                      />
                      {formErrors.code && <p className="text-xs text-red-500 mt-1">{formErrors.code}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Barcode <span className="text-gray-400">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.barcode}
                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                        placeholder="Scan or enter barcode"
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description <span className="text-gray-400">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="e.g. $5 off any purchase"
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Discount Amount ($) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="20"
                        value={formData.discountAmount}
                        onChange={(e) => setFormData({ ...formData, discountAmount: e.target.value })}
                        placeholder="0.00"
                        className={`w-full rounded-md border ${formErrors.discountAmount ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white`}
                      />
                      {formErrors.discountAmount && <p className="text-xs text-red-500 mt-1">{formErrors.discountAmount}</p>}
                      <p className="text-xs text-gray-500 mt-1">
                        Max $20. Coupons over $5 require manager approval at POS.
                      </p>
                    </div>

                    {formErrors.submit && (
                      <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3">
                        <p className="text-sm text-red-800 dark:text-red-400">{formErrors.submit}</p>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => { setShowForm(false); resetForm() }}
                        disabled={saving}
                        className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </ContentLayout>
      </BusinessTypeRoute>
    </BusinessProvider>
  )
}
