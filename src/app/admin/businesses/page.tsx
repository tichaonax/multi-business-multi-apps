'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { ContentLayout } from '@/components/layout/content-layout'
import { isSystemAdmin } from '@/lib/permission-utils'
import { formatDateByFormat } from '@/lib/country-codes'
import { useDateFormat } from '@/contexts/settings-context'

interface Business {
  id: string
  name: string
  type: string
  description: string | null
  isActive: boolean
  wifiIntegrationEnabled: boolean
  createdAt: string
  createdBy: string
}

export default function AdminBusinessesPage() {
  const { data: session } = useSession()
  const { format: globalDateFormat } = useDateFormat()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [detailsModalMode, setDetailsModalMode] = useState<'view' | 'edit'>('view')
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    type: 'retail',
    description: '',
    wifiIntegrationEnabled: false
  })
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (session?.user && isSystemAdmin(session.user)) {
      fetchBusinesses()
    }
  }, [session])

  const fetchBusinesses = async () => {
    try {
      const response = await fetch('/api/admin/businesses')
      if (response.ok) {
        const data = await response.json()
        setBusinesses(data)
      }
    } catch (error) {
      console.error('Failed to fetch businesses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setMessage('')

    try {
      const response = await fetch('/api/admin/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (response.ok) {
        setMessage(`Business "${formData.name}" created successfully!`)
        setFormData({ name: '', type: 'retail', description: '' })
        setShowCreateModal(false)
        fetchBusinesses() // Refresh the list
      } else {
        setMessage(`Error: ${result.error}`)
      }
    } catch (error) {
      setMessage('Failed to create business')
    } finally {
      setCreating(false)
    }
  }

  const handleEdit = (business: Business) => {
    setSelectedBusiness(business)
    setFormData({
      name: business.name,
      type: business.type,
      description: business.description || '',
      wifiIntegrationEnabled: business.wifiIntegrationEnabled || false
    })
    setShowEditModal(true)
  }

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBusiness) return

    setUpdating(true)
    setMessage('')

    try {
      const response = await fetch(`/api/admin/businesses/${selectedBusiness.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (response.ok) {
        setMessage(`Business "${formData.name}" updated successfully!`)
        setShowEditModal(false)
        setSelectedBusiness(null)
        fetchBusinesses() // Refresh the list
      } else {
        setMessage(`Error: ${result.error}`)
      }
    } catch (error) {
      setMessage('Failed to update business')
    } finally {
      setUpdating(false)
    }
  }

  const handleViewDetails = (business: Business) => {
    setSelectedBusiness(business)
    setDetailsModalMode('view')
    setShowDetailsModal(true)
  }

  const closeModals = () => {
    setShowCreateModal(false)
    setShowEditModal(false)
    setShowDetailsModal(false)
    setDetailsModalMode('view')
    setSelectedBusiness(null)
    setFormData({ name: '', type: 'retail', description: '' })
  }

  const handleEditFromDetails = () => {
    if (selectedBusiness) {
      setFormData({
        name: selectedBusiness.name,
        type: selectedBusiness.type,
        description: selectedBusiness.description || ''
      })
      setDetailsModalMode('edit')
    }
  }

  const handleUpdateFromDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBusiness) return

    setUpdating(true)
    setMessage('')

    try {
      const response = await fetch(`/api/admin/businesses/${selectedBusiness.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (response.ok) {
        setMessage(`Business "${formData.name}" updated successfully!`)
        setDetailsModalMode('view')
        setSelectedBusiness({ ...selectedBusiness, ...formData })
        fetchBusinesses() // Refresh the list
      } else {
        setMessage(`Error: ${result.error}`)
      }
    } catch (error) {
      setMessage('Failed to update business')
    } finally {
      setUpdating(false)
    }
  }

  if (!session) {
    return (
      <ContentLayout title="🏢 Business Management">
        <div className="text-center py-8">
          <p className="text-secondary">Please sign in to access business management.</p>
        </div>
      </ContentLayout>
    )
  }

  if (!isSystemAdmin(session.user)) {
    return (
      <ContentLayout title="🏢 Business Management">
        <div className="text-center py-8">
          <p className="text-secondary">You don't have permission to manage businesses.</p>
        </div>
      </ContentLayout>
    )
  }

  if (loading) {
    return (
      <ContentLayout title="🏢 Business Management">
        <div className="text-center py-8">
          <p className="text-secondary">Loading businesses...</p>
        </div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout
      title="🏢 Business Management"
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Admin', href: '/admin' },
        { label: 'Businesses', isActive: true }
      ]}
      headerActions={
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          Create New Business
        </button>
      }
      maxWidth="6xl"
    >
      {message && (
        <div className={`mb-6 p-4 rounded-md ${
          message.includes('Error') 
            ? 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200' 
            : 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-200'
        }`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {businesses.map((business) => (
          <div key={business.id} className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-primary">{business.name}</h3>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                business.isActive 
                  ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
              }`}>
                {business.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            <div className="space-y-2 text-sm">
              <p><span className="font-medium text-secondary">Type:</span> <span className="text-primary">{business.type}</span></p>
              <p><span className="font-medium text-secondary">ID:</span> <span className="text-primary font-mono text-xs">{business.id}</span></p>
              {business.description && (
                <p><span className="font-medium text-secondary">Description:</span> <span className="text-primary">{business.description}</span></p>
              )}
              <p><span className="font-medium text-secondary">Created:</span> <span className="text-primary">{formatDateByFormat(business.createdAt, globalDateFormat)}</span></p>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button 
                onClick={() => handleEdit(business)}
                className="btn-secondary text-sm mr-2"
              >
                Edit
              </button>
              <button 
                onClick={() => handleViewDetails(business)}
                className="btn-secondary text-sm"
              >
                View Details
              </button>
            </div>
          </div>
        ))}

        {businesses.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-secondary mb-4">No businesses found.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              Create Your First Business
            </button>
          </div>
        )}
      </div>

      {/* Create Business Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-primary">Create New Business</h2>
                <button
                  onClick={closeModals}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    placeholder="Enter business name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Business Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="retail">Retail</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="construction">Construction</option>
                    <option value="clothing">Clothing</option>
                    <option value="grocery">Grocery</option>
                    <option value="technology">Technology</option>
                    <option value="services">Services</option>
                    <option value="manufacturing">Manufacturing</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="education">Education</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional description"
                  />
                </div>

                {/* WiFi Integration Toggle - Only for restaurant and grocery */}
                {(formData.type === 'restaurant' || formData.type === 'grocery') && (
                  <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md">
                    <div className="flex-1">
                      <label htmlFor="wifiIntegration" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                        Enable WiFi Integration
                      </label>
                      <span className="block text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Allow this {formData.type} to sell WiFi access tokens and manage WiFi portal integration
                      </span>
                    </div>
                    <input
                      id="wifiIntegration"
                      type="checkbox"
                      checked={formData.wifiIntegrationEnabled}
                      onChange={(e) => setFormData({...formData, wifiIntegrationEnabled: e.target.checked})}
                      className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={creating}
                    className="btn-primary disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Create Business'}
                  </button>
                  <button
                    type="button"
                    onClick={closeModals}
                    disabled={creating}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Business Modal */}
      {showEditModal && selectedBusiness && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-primary">Edit Business</h2>
                <button
                  onClick={closeModals}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              <form onSubmit={handleUpdateSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Business Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="retail">Retail</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="construction">Construction</option>
                    <option value="clothing">Clothing</option>
                    <option value="grocery">Grocery</option>
                    <option value="technology">Technology</option>
                    <option value="services">Services</option>
                    <option value="manufacturing">Manufacturing</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="education">Education</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* WiFi Integration Toggle - Only for restaurant and grocery */}
                {(formData.type === 'restaurant' || formData.type === 'grocery') && (
                  <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md">
                    <div className="flex-1">
                      <label htmlFor="wifiIntegrationEdit" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                        Enable WiFi Integration
                      </label>
                      <span className="block text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Allow this {formData.type} to sell WiFi access tokens and manage WiFi portal integration
                      </span>
                    </div>
                    <input
                      id="wifiIntegrationEdit"
                      type="checkbox"
                      checked={formData.wifiIntegrationEnabled}
                      onChange={(e) => setFormData({...formData, wifiIntegrationEnabled: e.target.checked})}
                      className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={updating}
                    className="btn-primary disabled:opacity-50"
                  >
                    {updating ? 'Updating...' : 'Update Business'}
                  </button>
                  <button
                    type="button"
                    onClick={closeModals}
                    disabled={updating}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View/Edit Details Modal */}
      {showDetailsModal && selectedBusiness && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-primary">
                  {detailsModalMode === 'view' ? 'Business Details' : 'Edit Business Details'}
                </h2>
                <button
                  onClick={closeModals}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
            </div>

            {detailsModalMode === 'view' ? (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-secondary mb-2">Business Name</h3>
                    <p className="text-primary font-semibold">{selectedBusiness.name}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-secondary mb-2">Business Type</h3>
                    <p className="text-primary">{selectedBusiness.type}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-secondary mb-2">Status</h3>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      selectedBusiness.isActive
                        ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                    }`}>
                      {selectedBusiness.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-secondary mb-2">Created Date</h3>
                    <p className="text-primary">{formatDateByFormat(selectedBusiness.createdAt, globalDateFormat)}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-secondary mb-2">Business ID</h3>
                  <p className="text-primary font-mono text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded border">
                    {selectedBusiness.id}
                  </p>
                </div>

                {selectedBusiness.description && (
                  <div>
                    <h3 className="text-sm font-medium text-secondary mb-2">Description</h3>
                    <p className="text-primary">{selectedBusiness.description}</p>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleEditFromDetails}
                    className="btn-primary mr-3"
                  >
                    Edit Business
                  </button>
                  <button
                    onClick={closeModals}
                    className="btn-secondary"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <form onSubmit={handleUpdateFromDetails} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Business Type *
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="input-field"
                      required
                    >
                      <option value="retail">Retail</option>
                      <option value="restaurant">Restaurant</option>
                      <option value="construction">Construction</option>
                      <option value="clothing">Clothing</option>
                      <option value="grocery">Grocery</option>
                      <option value="technology">Technology</option>
                      <option value="services">Services</option>
                      <option value="manufacturing">Manufacturing</option>
                      <option value="healthcare">Healthcare</option>
                      <option value="education">Education</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      rows={3}
                      className="input-field"
                      placeholder="Optional description"
                    />
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="submit"
                      disabled={updating}
                      className="btn-primary disabled:opacity-50"
                    >
                      {updating ? 'Updating...' : 'Update Business'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailsModalMode('view')}
                      disabled={updating}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={closeModals}
                      disabled={updating}
                      className="btn-secondary"
                    >
                      Close
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </ContentLayout>
  )
}