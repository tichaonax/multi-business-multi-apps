'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { RefreshCw, Building2, AlertCircle, ArrowLeft } from 'lucide-react'
import BusinessReactivationModal from '@/components/business/business-reactivation-modal'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

interface InactiveBusiness {
  id: string
  name: string
  type: string
  description: string | null
  shortName: string
  createdAt: string
  updatedAt: string
}

export default function InactiveBusinessesPage() {
  const { refreshBusinesses } = useBusinessPermissionsContext()
  const [businesses, setBusinesses] = useState<InactiveBusiness[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedBusiness, setSelectedBusiness] = useState<InactiveBusiness | null>(null)

  const fetchInactiveBusinesses = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/admin/businesses/inactive')
      
      if (!response.ok) {
        throw new Error('Failed to fetch inactive businesses')
      }

      const data = await response.json()
      setBusinesses(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInactiveBusinesses()
  }, [])

  const handleReactivationSuccess = async () => {
    setSelectedBusiness(null)
    fetchInactiveBusinesses()
    // Refresh global business context to update sidebar
    try {
      await refreshBusinesses()
    } catch (e) {
      console.error('Failed to refresh businesses:', e)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-200">Error Loading Inactive Businesses</p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link 
          href="/business/manage"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Business Management
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Inactive Businesses
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage deactivated businesses that can be reactivated
        </p>
      </div>

      {/* Empty State */}
      {businesses.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Inactive Businesses
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            All businesses are currently active
          </p>
        </div>
      ) : (
        /* Business List */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {businesses.map((business) => (
            <div
              key={business.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {business.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {business.type}
                  </p>
                </div>
                <div className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-medium text-gray-600 dark:text-gray-400">
                  Inactive
                </div>
              </div>

              {business.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {business.description}
                </p>
              )}

              <div className="text-xs text-gray-500 dark:text-gray-500 mb-4">
                <p>Short Name: {business.shortName}</p>
                <p>Deactivated: {new Date(business.updatedAt).toLocaleDateString()}</p>
              </div>

              <button
                onClick={() => setSelectedBusiness(business)}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reactivate
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Reactivation Modal */}
      {selectedBusiness && (
        <BusinessReactivationModal
          business={selectedBusiness}
          onClose={() => setSelectedBusiness(null)}
          onSuccess={handleReactivationSuccess}
        />
      )}
    </div>
  )
}
