'use client'

import { useState, useRef } from 'react'
import { useAlert } from '@/components/ui/confirm-modal'

interface Ad {
  id: string
  title: string
  imageUrl: string
  duration: number
  isActive: boolean
}

interface AdUploadFormProps {
  businessId: string
  ad?: Ad // If provided, form is in edit mode
  onSuccess?: () => void
  onCancel?: () => void
}

export function AdUploadForm({ businessId, ad, onSuccess, onCancel }: AdUploadFormProps) {
  const customAlert = useAlert()
  const [title, setTitle] = useState(ad?.title || '')
  const [duration, setDuration] = useState(ad?.duration || 10)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(ad?.imageUrl || null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      customAlert({
        title: 'Invalid File',
        description: 'Please select an image file (JPG, PNG, GIF, etc.)'
      })
      return
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      customAlert({
        title: 'File Too Large',
        description: 'Image size must be less than 5MB. Please choose a smaller file.'
      })
      return
    }

    setImageFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!title.trim()) {
      customAlert({
        title: 'Missing Title',
        description: 'Please enter a title for the advertisement.'
      })
      return
    }

    if (!ad && !imageFile) {
      customAlert({
        title: 'Missing Image',
        description: 'Please select an image for the advertisement.'
      })
      return
    }

    if (duration < 5 || duration > 60) {
      customAlert({
        title: 'Invalid Duration',
        description: 'Duration must be between 5 and 60 seconds.'
      })
      return
    }

    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('businessId', businessId)
      formData.append('title', title.trim())
      formData.append('duration', duration.toString())

      if (imageFile) {
        formData.append('image', imageFile)
      }

      // Determine endpoint and method
      const url = ad
        ? `/api/customer-display/ads/${ad.id}`
        : '/api/customer-display/ads'
      const method = ad ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        body: formData
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save advertisement')
      }

      customAlert({
        title: 'Success',
        description: ad
          ? 'Advertisement updated successfully!'
          : 'Advertisement created successfully!'
      })

      // Reset form if creating new ad
      if (!ad) {
        setTitle('')
        setDuration(10)
        setImageFile(null)
        setImagePreview(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }

      onSuccess?.()
    } catch (error) {
      console.error('Error saving advertisement:', error)
      customAlert({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save advertisement. Please try again.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {ad ? 'Edit Advertisement' : 'Upload New Advertisement'}
        </h3>

        {/* Title */}
        <div className="mb-4">
          <label htmlFor="ad-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="ad-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Summer Sale 50% Off"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            required
            disabled={isSubmitting}
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Give your ad a descriptive title (for internal reference only)
          </p>
        </div>

        {/* Duration */}
        <div className="mb-4">
          <label htmlFor="ad-duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Duration (seconds) <span className="text-red-500">*</span>
          </label>
          <input
            id="ad-duration"
            type="number"
            min="5"
            max="60"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value, 10))}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            required
            disabled={isSubmitting}
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            How long to show this ad (5-60 seconds)
          </p>
        </div>

        {/* Image Upload */}
        <div className="mb-4">
          <label htmlFor="ad-image" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Image {!ad && <span className="text-red-500">*</span>}
          </label>
          <input
            id="ad-image"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-100"
            required={!ad}
            disabled={isSubmitting}
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Recommended: 1920x1080px (16:9 aspect ratio), max 5MB
          </p>
        </div>

        {/* Image Preview */}
        {imagePreview && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Preview
            </label>
            <div className="relative rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 max-w-2xl">
              <img
                src={imagePreview}
                alt="Advertisement preview"
                className="w-full h-auto"
              />
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Tips for Great Ads
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
            <li>Use high-quality, eye-catching images</li>
            <li>Keep text minimal and easy to read from a distance</li>
            <li>Use bright colors and high contrast</li>
            <li>Focus on one clear message per ad</li>
            <li>Test your ads on the customer display before publishing</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                {ad ? 'Updating...' : 'Uploading...'}
              </>
            ) : (
              ad ? 'Update Advertisement' : 'Create Advertisement'
            )}
          </button>
        </div>
      </div>
    </form>
  )
}
