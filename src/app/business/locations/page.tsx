'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { hasPermission } from '@/lib/permission-utils'
import { LocationEditor } from '@/components/locations/location-editor'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { ContentLayout } from '@/components/layout/content-layout'

interface Location {
  id: string
  businessId: string
  locationCode: string
  name: string
  emoji?: string | null
  description?: string | null
  locationType?: string | null
  capacity?: number | null
  isActive: boolean
  parentLocationId?: string | null
  productCount: number
  createdAt: string
  updatedAt: string
}

export default function LocationsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { currentBusinessId, currentBusiness, loading: businessLoading } = useBusinessPermissionsContext()
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showActiveOnly, setShowActiveOnly] = useState(true)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const canView = session?.user ? hasPermission(session.user, 'canViewLocations') : false
  const canCreate = session?.user ? hasPermission(session.user, 'canCreateLocations') : false
  const canEdit = session?.user ? hasPermission(session.user, 'canEditLocations') : false
  const canDelete = session?.user ? hasPermission(session.user, 'canDeleteLocations') : false

  useEffect(() => {
    if (businessLoading || !currentBusinessId) return

    if (!canView) {
      router.push('/dashboard')
      return
    }

    fetchLocations()
  }, [currentBusinessId, searchQuery, showActiveOnly, businessLoading])

  const fetchLocations = async () => {
    if (!currentBusinessId) return

    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (showActiveOnly) params.append('isActive', 'true')

      const response = await fetch(`/api/business/${currentBusinessId}/locations?${params}`)
      if (!response.ok) throw new Error('Failed to fetch locations')

      const data = await response.json()
      setLocations(data.locations || [])
    } catch (error) {
      console.error('Error fetching locations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setSelectedLocation(null)
    setShowEditor(true)
  }

  const handleEdit = (location: Location) => {
    setSelectedLocation(location)
    setShowEditor(true)
  }

  const handleDelete = async (location: Location) => {
    if (!currentBusinessId) return

    try {
      const response = await fetch(`/api/business/${currentBusinessId}/locations/${location.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        setErrorMessage(data.message || 'Failed to delete location')
        setDeleteConfirm(null)
        return
      }

      setDeleteConfirm(null)
      fetchLocations()
    } catch (error) {
      console.error('Error deleting location:', error)
      setErrorMessage('Failed to delete location. Please try again.')
      setDeleteConfirm(null)
    }
  }

  const handleSave = () => {
    setShowEditor(false)
    setSelectedLocation(null)
    fetchLocations()
  }

  if (!session || businessLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!currentBusinessId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">No business selected. Please select a business from the sidebar.</p>
        </div>
      </div>
    )
  }

  if (!canView) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">You don&apos;t have permission to view locations.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <ContentLayout
        title="📍 Locations"
        subtitle={`Manage storage locations for ${currentBusiness?.businessName || 'your business'}`}
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: currentBusiness?.businessName || 'Business', href: `/${currentBusiness?.businessType || 'dashboard'}` },
          { label: 'Locations', isActive: true }
        ]}
        headerActions={
          canCreate ? (
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              + Add Location
            </button>
          ) : undefined
        }
      >
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.checked)}
                className="rounded border-gray-300"
              />
              Active only
            </label>
          </div>

          {/* Locations Grid */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Loading locations...</p>
            </div>
          ) : locations.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-400">No locations found.</p>
              {canCreate && (
                <button
                  onClick={handleCreate}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create your first location
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {locations.map((location) => (
                <div
                  key={location.id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{location.emoji || '📍'}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{location.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{location.locationCode}</p>
                  </div>
                </div>
                {!location.isActive && (
                  <span className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                    Inactive
                  </span>
                )}
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm mb-4">
                {location.locationType && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <span>🏷️</span>
                    <span>{location.locationType}</span>
                  </div>
                )}
                {location.description && (
                  <div className="text-gray-600 dark:text-gray-400 text-xs line-clamp-2">
                    {location.description}
                  </div>
                )}
                {location.capacity && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <span>📦</span>
                    <span>Capacity: {location.capacity}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Products:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{location.productCount}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {canEdit && (
                  <button
                    onClick={() => handleEdit(location)}
                    className="flex-1 px-3 py-1.5 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => setDeleteConfirm(location.id)}
                    className="flex-1 px-3 py-1.5 text-sm bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>

              {/* Delete Confirmation */}
              {deleteConfirm === location.id && (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                  <p className="text-sm text-red-800 dark:text-red-200 mb-2">Delete this location?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(location)}
                      className="flex-1 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="flex-1 px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
                </div>
              ))}
            </div>
          )}
        </div>
      </ContentLayout>

      {/* Editor Modal */}
      {showEditor && currentBusinessId && (
        <LocationEditor
          location={selectedLocation}
          businessId={currentBusinessId}
          onSave={handleSave}
          onCancel={() => {
            setShowEditor(false)
            setSelectedLocation(null)
          }}
        />
      )}

      {/* Error Modal */}
      {errorMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Error</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{errorMessage}</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 rounded-b-lg flex justify-end">
              <button
                onClick={() => setErrorMessage(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
