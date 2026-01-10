'use client'

import { useState, useEffect } from 'react'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Ad {
  id: string
  title: string
  imageUrl: string
  duration: number
  isActive: boolean
  sortOrder: number
}

interface AdListProps {
  businessId: string
  onEdit?: (ad: Ad) => void
  refreshTrigger?: number // External trigger to refresh the list
}

function SortableAdItem({ ad, onToggleActive, onDelete, onEdit }: {
  ad: Ad
  onToggleActive: (id: string, isActive: boolean) => void
  onDelete: (id: string) => void
  onEdit: (ad: Ad) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: ad.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${
        !ad.isActive ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          title="Drag to reorder"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>

        {/* Thumbnail */}
        <div className="flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
          <img
            src={ad.imageUrl}
            alt={ad.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Info */}
        <div className="flex-grow">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {ad.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Duration: {ad.duration} seconds
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {ad.isActive ? 'Active' : 'Inactive'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Active Toggle */}
          <label className="flex items-center cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={ad.isActive}
                onChange={(e) => onToggleActive(ad.id, e.target.checked)}
                className="sr-only"
              />
              <div className={`block w-14 h-8 rounded-full transition ${
                ad.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}></div>
              <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition ${
                ad.isActive ? 'transform translate-x-6' : ''
              }`}></div>
            </div>
          </label>

          {/* Edit Button */}
          <button
            onClick={() => onEdit(ad)}
            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
            title="Edit"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          {/* Delete Button */}
          <button
            onClick={() => onDelete(ad.id)}
            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
            title="Delete"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdList({ businessId, onEdit, refreshTrigger }: AdListProps) {
  const customAlert = useAlert()
  const customConfirm = useConfirm()
  const [ads, setAds] = useState<Ad[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  // Fetch ads
  const fetchAds = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/customer-display/ads?businessId=${businessId}`)
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch advertisements')
      }

      setAds(data.ads || [])
    } catch (error) {
      console.error('Error fetching ads:', error)
      setError(error instanceof Error ? error.message : 'Failed to load advertisements')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (businessId) {
      fetchAds()
    }
  }, [businessId, refreshTrigger])

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = ads.findIndex(ad => ad.id === active.id)
    const newIndex = ads.findIndex(ad => ad.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // Optimistically update UI
    const newAds = arrayMove(ads, oldIndex, newIndex)
    setAds(newAds)

    // Update sortOrder on server
    try {
      const adsWithNewOrder = newAds.map((ad, index) => ({
        id: ad.id,
        sortOrder: index
      }))

      const response = await fetch('/api/customer-display/ads/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          ads: adsWithNewOrder
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to reorder advertisements')
      }

      // Update with server response
      setAds(data.ads || newAds)
    } catch (error) {
      console.error('Error reordering ads:', error)
      // Revert on error
      fetchAds()
      customAlert({
        title: 'Error',
        description: 'Failed to save new order. Please try again.'
      })
    }
  }

  // Toggle active status
  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const formData = new FormData()
      formData.append('isActive', isActive.toString())

      const response = await fetch(`/api/customer-display/ads/${id}`, {
        method: 'PUT',
        body: formData
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update advertisement')
      }

      // Update local state
      setAds(ads.map(ad => ad.id === id ? { ...ad, isActive } : ad))

      customAlert({
        title: 'Success',
        description: `Advertisement ${isActive ? 'activated' : 'deactivated'} successfully!`
      })
    } catch (error) {
      console.error('Error toggling ad status:', error)
      customAlert({
        title: 'Error',
        description: 'Failed to update advertisement status. Please try again.'
      })
    }
  }

  // Delete ad
  const handleDelete = async (id: string) => {
    const confirmed = await customConfirm({
      title: 'Delete Advertisement?',
      description: 'This will permanently remove this advertisement. This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    })

    if (!confirmed) return

    try {
      const response = await fetch(`/api/customer-display/ads/${id}?hard=true`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete advertisement')
      }

      // Remove from local state
      setAds(ads.filter(ad => ad.id !== id))

      customAlert({
        title: 'Success',
        description: 'Advertisement deleted successfully!'
      })
    } catch (error) {
      console.error('Error deleting ad:', error)
      customAlert({
        title: 'Error',
        description: 'Failed to delete advertisement. Please try again.'
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={fetchAds}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          Retry
        </button>
      </div>
    )
  }

  if (ads.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="text-6xl mb-4">📢</div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          No advertisements yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Upload your first advertisement to start displaying marketing content on customer-facing screens.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={ads.map(ad => ad.id)}
          strategy={verticalListSortingStrategy}
        >
          {ads.map(ad => (
            <SortableAdItem
              key={ad.id}
              ad={ad}
              onToggleActive={handleToggleActive}
              onDelete={handleDelete}
              onEdit={onEdit || (() => {})}
            />
          ))}
        </SortableContext>
      </DndContext>

      <div className="text-sm text-gray-500 dark:text-gray-400 text-center mt-4">
        Drag and drop to reorder advertisements
      </div>
    </div>
  )
}
