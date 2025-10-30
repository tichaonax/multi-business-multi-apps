'use client'

import { useState } from 'react'

interface BusinessCreationModalProps {
  onClose: () => void
  // onSuccess now receives the full server response so callers can access
  // the created business object (if present) as well as the message.
  onSuccess: (result: { message?: string; business?: any }) => void
  onError: (error: string) => void
  // Optional: initial values for edit mode
  initial?: { name?: string; type?: string; description?: string }
  // Optional: HTTP method override for the form (default POST). Use 'PUT' for edit.
  method?: 'POST' | 'PUT'
  // Optional: resource id when using PUT
  id?: string
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

export function BusinessCreationModal({ onClose, onSuccess, onError, initial, method = 'POST', id }: BusinessCreationModalProps) {
  const [formData, setFormData] = useState({
    name: initial?.name || '',
    type: initial?.type || 'other',
    description: initial?.description || ''
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
      const url = method === 'PUT' && id ? `/api/admin/businesses/${id}` : '/api/admin/businesses'
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      if (response.ok) {
        // Pass the whole payload back to the caller so they can access
        // the created/updated business id/object and perform follow-up actions
        onSuccess({ message: data.message, business: data.business })
        onClose()
      } else {
        onError(data.error || `Failed to ${method === 'PUT' ? 'update' : 'create'} business`)
      }
    } catch (error) {
      onError(method === 'PUT' ? 'Error updating business' : 'Error creating business')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto shadow-lg border border-gray-200 dark:border-neutral-700">
        <div className="p-6 border-b border-gray-200 dark:border-neutral-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-primary">{method === 'PUT' ? 'Edit Business' : 'Create New Business'}</h2>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-600 dark:text-neutral-300 dark:hover:text-neutral-100"
            >
              ✕
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-primary">
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
              {loading ? (method === 'PUT' ? 'Saving...' : 'Creating...') : (method === 'PUT' ? 'Save Changes' : 'Create Business')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}