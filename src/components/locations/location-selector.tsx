'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { LocationEditor } from './location-editor'

interface Location {
  id: string
  name: string
  locationCode: string
  emoji?: string | null
}

interface LocationSelectorProps {
  businessId: string
  value?: string | null
  onChange: (locationId: string | null) => void
  placeholder?: string
  canCreate?: boolean
  className?: string
}

export function LocationSelector({
  businessId,
  value,
  onChange,
  placeholder = 'Select location...',
  canCreate = false,
  className = ''
}: LocationSelectorProps) {
  const { hasPermission } = useBusinessPermissionsContext()
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  const userCanCreate = hasPermission('canCreateLocations')
  const allowCreate = canCreate && userCanCreate

  // Track client-side mounting for portal
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    fetchLocations()
  }, [businessId])

  const fetchLocations = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append('isActive', 'true')
      params.append('limit', '100')

      const response = await fetch(`/api/business/${businessId}/locations?${params}`)
      if (!response.ok) throw new Error('Failed to fetch locations')

      const data = await response.json()
      setLocations(data.locations || [])
    } catch (error) {
      console.error('Error fetching locations:', error)
      setLocations([])
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (locationId: string | null) => {
    onChange(locationId)
    setShowDropdown(false)
    setSearchQuery('')
  }

  const handleCreate = () => {
    setShowDropdown(false)
    setShowEditor(true)
  }

  const handleSave = async (createdLocationId?: string) => {
    console.log('LocationSelector - handleSave called with ID:', createdLocationId)
    setShowEditor(false)
    await fetchLocations()
    // Auto-select the newly created location
    if (createdLocationId) {
      console.log('LocationSelector - calling onChange with ID:', createdLocationId)
      onChange(createdLocationId)
    }
  }

  const selectedLocation = locations.find(l => l.id === value)

  const filteredLocations = searchQuery
    ? locations.filter(l =>
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.locationCode.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : locations

  return (
    <>
      <div className={`relative ${className}`}>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-left flex items-center justify-between hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
          >
            <span className="flex items-center gap-2">
              {selectedLocation ? (
                <>
                  {selectedLocation.emoji && <span>{selectedLocation.emoji}</span>}
                  <span>{selectedLocation.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({selectedLocation.locationCode})
                  </span>
                </>
              ) : (
                <span className="text-gray-500 dark:text-gray-400">{placeholder}</span>
              )}
            </span>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${showDropdown ? 'transform rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showDropdown && (
            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-hidden flex flex-col">
              {/* Search */}
              <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search locations..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  autoFocus
                />
              </div>

              {/* Options List */}
              <div className="overflow-y-auto flex-1">
                {loading ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent"></div>
                  </div>
                ) : (
                  <>
                    {/* Clear Selection Option */}
                    {value && (
                      <button
                        type="button"
                        onClick={() => handleSelect(null)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 text-sm border-b border-gray-200 dark:border-gray-700"
                      >
                        <span className="italic">No location</span>
                      </button>
                    )}

                    {/* Locations List */}
                    {filteredLocations.length > 0 ? (
                      filteredLocations.map(location => (
                        <button
                          key={location.id}
                          type="button"
                          onClick={() => handleSelect(location.id)}
                          className={`w-full px-3 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2 ${
                            value === location.id ? 'bg-blue-100 dark:bg-blue-900/40' : ''
                          }`}
                        >
                          {location.emoji && <span className="text-lg">{location.emoji}</span>}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {location.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {location.locationCode}
                            </div>
                          </div>
                          {value === location.id && (
                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                        {searchQuery ? 'No locations found' : 'No locations available'}
                      </div>
                    )}

                    {/* Create New Option */}
                    {allowCreate && (
                      <button
                        type="button"
                        onClick={handleCreate}
                        className="w-full px-3 py-2 text-left hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400 font-medium text-sm border-t border-gray-200 dark:border-gray-700 flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create New Location
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Click outside to close */}
        {showDropdown && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
        )}
      </div>

      {/* Editor Modal - rendered via portal to avoid nested forms */}
      {showEditor && isMounted && createPortal(
        <LocationEditor
          businessId={businessId}
          onSave={handleSave}
          onCancel={() => setShowEditor(false)}
        />,
        document.body
      )}
    </>
  )
}
