'use client'

import { useState } from 'react'

interface BusinessCreationModalProps {
  onClose: () => void
  onSuccess: (message: string) => void
  onError: (error: string) => void
}

const BUSINESS_TYPES = [
  'construction',
  'restaurant',
  'grocery',
  'clothing',
  'consulting',
  'retail',
  'services',
  'other'
]

export function BusinessCreationModal({ onClose, onSuccess, onError }: BusinessCreationModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'other',
    description: ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.type) {
      onError('Business name and type are required')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      if (response.ok) {
        onSuccess(data.message)
        onClose()
      } else {
        onError(data.error || 'Failed to create business')
      }
    } catch (error) {
      onError('Error creating business')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-primary">Create New Business</h2>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Business Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              className="input-field"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter business name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Business Type <span className="text-red-500">*</span>
            </label>
            <select
              className="input-field"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              required
            >
              {BUSINESS_TYPES.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Description (Optional)
            </label>
            <textarea
              className="input-field"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the business"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button 
              type="button" 
              onClick={onClose} 
              className="btn-secondary"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Creating...' : 'Create Business'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}