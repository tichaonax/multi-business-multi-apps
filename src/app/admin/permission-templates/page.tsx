'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { ContentLayout } from '@/components/layout/content-layout'
import { isSystemAdmin } from '@/lib/permission-utils'
import { BusinessType, BusinessPermissions } from '@/types/permissions'

interface PermissionTemplate {
  id: string
  name: string
  businessType: BusinessType
  permissions: Partial<BusinessPermissions>
  isActive: boolean
  createdAt: string
  creator: {
    id: string
    name: string
    email: string
  }
}

interface CreateTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

function CreateTemplateModal({ isOpen, onClose, onSuccess }: CreateTemplateModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    businessType: 'clothing' as BusinessType,
    permissions: {}
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/admin/permission-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        onSuccess()
        onClose()
        setFormData({ name: '', businessType: 'clothing', permissions: {} })
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create template')
      }
    } catch (error) {
      alert('Failed to create template')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Create Permission Template
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Template Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g., Kitchen Manager, Inventory Specialist"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Business Type
            </label>
            <select
              value={formData.businessType}
              onChange={(e) => setFormData({ ...formData, businessType: e.target.value as BusinessType })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="clothing">Clothing</option>
              <option value="restaurant">Restaurant</option>
              <option value="construction">Construction</option>
              <option value="grocery">Grocery</option>
              <option value="consulting">Consulting</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            Note: Permissions will be configured after creating the template.
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function PermissionTemplatesPage() {
  const { data: session } = useSession()
  const [templates, setTemplates] = useState<PermissionTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBusinessType, setSelectedBusinessType] = useState<BusinessType | ''>('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Check if user is system admin - moved after all hooks
  const isAuthorized = session?.user && isSystemAdmin(session.user as any)

  if (!isAuthorized) {
    return (
      <ContentLayout title="Permission Templates">
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">
            You don't have permission to access this page.
          </p>
        </div>
      </ContentLayout>
    )
  }

  const fetchTemplates = async () => {
    try {
      const url = selectedBusinessType 
        ? `/api/admin/permission-templates?businessType=${selectedBusinessType}`
        : '/api/admin/permission-templates'
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [selectedBusinessType])

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this permission template?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/permission-templates/${templateId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchTemplates() // Refresh the list
      } else {
        alert('Failed to delete template')
      }
    } catch (error) {
      alert('Failed to delete template')
    }
  }

  if (loading) {
    return (
      <ContentLayout title="Permission Templates">
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">Loading templates...</p>
        </div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout 
      title="Permission Templates"
      subtitle="Create and manage reusable permission templates for different business types"
      headerActions={
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Create Template
        </button>
      }
    >
      <div className="space-y-6">
        {/* Filter by Business Type */}
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Filter by Business Type:
          </label>
          <select
            value={selectedBusinessType}
            onChange={(e) => setSelectedBusinessType(e.target.value as BusinessType | '')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Types</option>
            <option value="clothing">Clothing</option>
            <option value="restaurant">Restaurant</option>
            <option value="construction">Construction</option>
            <option value="grocery">Grocery</option>
            <option value="consulting">Consulting</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Templates List */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Template Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Business Type</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Created By</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Created</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">
                      {selectedBusinessType 
                        ? `No templates found for ${selectedBusinessType} business type`
                        : 'No permission templates found. Create one to get started.'
                      }
                    </td>
                  </tr>
                ) : (
                  templates.map((template) => (
                    <tr key={template.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900 dark:text-white">{template.name}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                          {template.businessType}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-900 dark:text-white">{template.creator.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{template.creator.email}</div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(template.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <button 
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <CreateTemplateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchTemplates}
      />
    </ContentLayout>
  )
}