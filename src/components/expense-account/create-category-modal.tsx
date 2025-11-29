'use client'

import { useState } from 'react'
import type { OnSuccessArg } from '@/types/ui'
import fetchWithValidation from '@/lib/fetchWithValidation'
import { useToastContext } from '@/components/ui/toast'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'

interface CreateCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (payload: OnSuccessArg & { category?: any }) => void
  onError: (error: string) => void
}

// Predefined color options
const COLOR_OPTIONS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Orange', value: '#F59E0B' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Gray', value: '#6B7280' },
]

// Common emoji suggestions
const EMOJI_SUGGESTIONS = [
  '💼', '💰', '🔨', '⚡', '📎', '🔧', '🚗', '🛡️',
  '📱', '💵', '🏠', '🍽️', '🛒', '🎓', '🏥', '✈️',
  '🎨', '🎭', '🎮', '📚', '🎯', '💡', '🔑', '📦'
]

export function CreateCategoryModal({
  isOpen,
  onClose,
  onSuccess,
  onError
}: CreateCategoryModalProps) {
  const [loading, setLoading] = useState(false)
  const toast = useToastContext()
  const customAlert = useAlert()
  const customConfirm = useConfirm()

  const [formData, setFormData] = useState({
    name: '',
    emoji: '💰',
    color: '#3B82F6',
    description: ''
  })

  const [errors, setErrors] = useState({
    name: '',
    emoji: '',
    color: ''
  })

  const validateForm = () => {
    const newErrors = {
      name: '',
      emoji: '',
      color: ''
    }

    // Validate category name
    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Category name must be at least 2 characters'
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Category name must not exceed 50 characters'
    }

    // Validate emoji
    if (!formData.emoji.trim()) {
      newErrors.emoji = 'Emoji is required'
    }

    // Validate color
    if (!formData.color.trim()) {
      newErrors.color = 'Color is required'
    }

    setErrors(newErrors)
    return !newErrors.name && !newErrors.emoji && !newErrors.color
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const result = await fetchWithValidation('/api/expense-categories/flat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          emoji: formData.emoji.trim(),
          color: formData.color,
          description: formData.description.trim() || null,
          requiresSubcategory: false, // Always flat for on-the-fly creation
          isUserCreated: true
        })
      })

      // Success
      toast.push('Category created successfully')
      try {
        onSuccess({
          message: 'Category created successfully',
          id: result.data.category.id,
          refresh: true,
          category: result.data.category
        })
      } catch (e) {}

      onClose()

      // Reset form
      setFormData({
        name: '',
        emoji: '💰',
        color: '#3B82F6',
        description: ''
      })
      setErrors({ name: '', emoji: '', color: '' })
    } catch (error) {
      console.error('Create category error:', error)
      const message = error instanceof Error ? error.message : 'Failed to create category'
      toast.push(message)
      try {
        onError(message)
      } catch (e) {}
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    // Check if form has unsaved changes
    const hasChanges = formData.name.trim() !== '' ||
                       formData.description.trim() !== '' ||
                       formData.emoji !== '💰' ||
                       formData.color !== '#3B82F6'

    if (hasChanges) {
      const confirmed = await customConfirm(
        'You have unsaved changes. Are you sure you want to cancel?'
      )
      if (!confirmed) return
    }

    onClose()

    // Reset form
    setFormData({
      name: '',
      emoji: '💰',
      color: '#3B82F6',
      description: ''
    })
    setErrors({ name: '', emoji: '', color: '' })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-primary mb-4">Create Expense Category</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Category Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value })
                setErrors({ ...errors, name: '' })
              }}
              className={`w-full px-3 py-2 border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.name ? 'border-red-500' : 'border-border'
              }`}
              placeholder="e.g., Marketing Expenses"
              required
              maxLength={50}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Emoji <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.emoji}
                onChange={(e) => {
                  setFormData({ ...formData, emoji: e.target.value })
                  setErrors({ ...errors, emoji: '' })
                }}
                className={`w-20 px-3 py-2 text-2xl text-center border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.emoji ? 'border-red-500' : 'border-border'
                }`}
                placeholder="💰"
                required
                maxLength={2}
              />
              <div className="flex-1 flex flex-wrap gap-1 p-2 border border-border rounded-md bg-background max-h-24 overflow-y-auto">
                {EMOJI_SUGGESTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setFormData({ ...formData, emoji })}
                    className="text-xl hover:bg-gray-100 dark:hover:bg-gray-800 p-1 rounded transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            {errors.emoji && (
              <p className="mt-1 text-sm text-red-500">{errors.emoji}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Color <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-5 gap-2">
              {COLOR_OPTIONS.map((colorOption) => (
                <button
                  key={colorOption.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: colorOption.value })}
                  className={`h-10 rounded-md border-2 transition-all ${
                    formData.color === colorOption.value
                      ? 'border-gray-900 dark:border-gray-100 scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: colorOption.value }}
                  title={colorOption.name}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-secondary">Selected:</span>
              <div
                className="w-8 h-8 rounded border border-border"
                style={{ backgroundColor: formData.color }}
              />
              <span className="text-sm text-secondary">{formData.color}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Brief description of this category..."
              rows={2}
              maxLength={200}
            />
            <p className="text-xs text-secondary mt-1">
              {formData.description.length}/200 characters
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <span className="font-semibold">Note:</span> This creates a simple flat category that doesn't require subcategories. Perfect for quick expense categorization.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-secondary bg-background border border-border rounded-md hover:bg-muted"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
