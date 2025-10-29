'use client'

import { useState, useEffect } from 'react'
import { EmojiPicker } from '@/components/common/emoji-picker'

interface Location {
  id?: string
  businessId?: string
  locationCode?: string
  name: string
  emoji?: string | null
  description?: string | null
  locationType?: string | null
  capacity?: number | null
  parentLocationId?: string | null
  isActive?: boolean
}

interface LocationEditorProps {
  location?: Location | null
  businessId: string
  onSave: (createdLocationId?: string) => void
  onCancel: () => void
}

const LOCATION_TYPES = [
  'Warehouse',
  'Shelf',
  'Aisle',
  'Room',
  'Floor',
  'Building',
  'Zone',
  'Bin',
  'Rack',
  'Display',
  'Storage',
  'Other'
]

export function LocationEditor({ location, businessId, onSave, onCancel }: LocationEditorProps) {
  const [formData, setFormData] = useState<Location>({
    name: '',
    emoji: null,
    locationCode: '',
    description: null,
    locationType: null,
    capacity: null,
    parentLocationId: null,
    isActive: true
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parentLocations, setParentLocations] = useState<Array<{
    id: string
    name: string
    locationCode: string
    emoji?: string | null
  }>>([])

  useEffect(() => {
    if (location) {
      setFormData({
        name: location.name || '',
        emoji: location.emoji || null,
        locationCode: location.locationCode || '',
        description: location.description || null,
        locationType: location.locationType || null,
        capacity: location.capacity || null,
        parentLocationId: location.parentLocationId || null,
        isActive: location.isActive !== false
      })
    }

    // Fetch available parent locations
    fetchParentLocations()
  }, [location])

  const fetchParentLocations = async () => {
    try {
      const response = await fetch(`/api/business/${businessId}/locations?isActive=true`)
      if (response.ok) {
        const data = await response.json()
        // Exclude current location from parent options
        const filtered = location?.id
          ? data.locations.filter((loc: any) => loc.id !== location.id)
          : data.locations
        setParentLocations(filtered)
      }
    } catch (error) {
      console.error('Failed to fetch parent locations:', error)
    }
  }

  const handleInputChange = (field: keyof Location, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setError(null)

    if (!formData.name.trim()) {
      setError('Location name is required')
      return
    }

    if (!formData.locationCode?.trim()) {
      setError('Location code is required')
      return
    }

    try {
      setLoading(true)

      const url = location?.id
        ? `/api/business/${businessId}/locations/${location.id}`
        : `/api/business/${businessId}/locations`

      const method = location?.id ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      console.log('LocationEditor - API response:', data)

      if (!response.ok) {
        setError(data.message || 'Failed to save location')
        return
      }

      // Pass the created/updated location ID back
      const locationId = data.location?.id || location?.id
      console.log('LocationEditor - extracted locationId:', locationId, 'from data.location?.id:', data.location?.id, 'or location?.id:', location?.id)
      onSave(locationId)
    } catch (error) {
      console.error('Error saving location:', error)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full my-8" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {location ? 'Edit Location' : 'Create Location'}
            </h2>
            {location?.locationCode && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Code: {location.locationCode}
              </p>
            )}
          </div>

          {/* Body */}
          <div className="px-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-6">
              {/* Emoji Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Emoji (Optional)
                </label>
                <EmojiPicker
                  onSelect={(emoji) => handleInputChange('emoji', emoji)}
                  selectedEmoji={formData.emoji || undefined}
                  searchPlaceholder="Search location emoji..."
                  compact={true}
                  businessId={businessId}
                  context="location"
                />
              </div>

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Location Code *
                  </label>
                  <input
                    type="text"
                    value={formData.locationCode}
                    onChange={(e) => handleInputChange('locationCode', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    placeholder="A1, WH-001, etc."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Location Type
                  </label>
                  <select
                    value={formData.locationType || ''}
                    onChange={(e) => handleInputChange('locationType', e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Select type...</option>
                    {LOCATION_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Location Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    placeholder="Front Display Shelf"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Parent Location
                  </label>
                  <select
                    value={formData.parentLocationId || ''}
                    onChange={(e) => handleInputChange('parentLocationId', e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">None (Top Level)</option>
                    {parentLocations.map(loc => (
                      <option key={loc.id} value={loc.id}>
                        {loc.emoji} {loc.name} ({loc.locationCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Capacity
                  </label>
                  <input
                    type="number"
                    value={formData.capacity || ''}
                    onChange={(e) => handleInputChange('capacity', e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    placeholder="Max items"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => handleInputChange('description', e.target.value || null)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    placeholder="Additional details about this location..."
                  />
                </div>
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Active Location
                </label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
              )}
              {loading ? 'Saving...' : 'Save Location'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
