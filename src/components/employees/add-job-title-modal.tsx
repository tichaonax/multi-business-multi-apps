'use client'

import { useState } from 'react'

interface AddJobTitleModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (newJobTitle: any) => void
  onError: (error: string) => void
}

export function AddJobTitleModal({ isOpen, onClose, onSuccess, onError }: AddJobTitleModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    level: '',
    description: '',
    responsibilities: [] as string[]
  })
  const [newResponsibility, setNewResponsibility] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!formData.title.trim()) {
        onError('Job title is required')
        setLoading(false)
        return
      }

      const response = await fetch('/api/job-titles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title.trim(),
          department: formData.department.trim() || null,
          level: formData.level.trim() || null,
          description: formData.description.trim() || null,
          responsibilities: formData.responsibilities.filter(r => r.trim() !== '')
        })
      })

      if (response.ok) {
        const newJobTitle = await response.json()
        onSuccess(newJobTitle)
        handleClose()
      } else {
        const errorData = await response.json()
        onError(errorData.error || 'Failed to create job title')
      }
    } catch (error) {
      console.error('Error creating job title:', error)
      onError('Error creating job title')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      title: '',
      department: '',
      level: '',
      description: '',
      responsibilities: []
    })
    setNewResponsibility('')
    onClose()
  }

  const addResponsibility = () => {
    if (newResponsibility.trim()) {
      setFormData({
        ...formData,
        responsibilities: [...formData.responsibilities, newResponsibility.trim()]
      })
      setNewResponsibility('')
    }
  }

  const removeResponsibility = (index: number) => {
    setFormData({
      ...formData,
      responsibilities: formData.responsibilities.filter((_, i) => i !== index)
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-primary">Create New Job Title</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium text-primary mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="input-field"
                    placeholder="e.g., Senior Software Engineer"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className="input-field"
                    placeholder="e.g., Engineering, Sales, HR"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Level
                  </label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({...formData, level: e.target.value})}
                    className="input-field"
                  >
                    <option value="">Select Level</option>
                    <option value="entry">Entry Level</option>
                    <option value="junior">Junior</option>
                    <option value="mid">Mid Level</option>
                    <option value="senior">Senior</option>
                    <option value="lead">Lead</option>
                    <option value="principal">Principal</option>
                    <option value="manager">Manager</option>
                    <option value="director">Director</option>
                    <option value="vp">Vice President</option>
                    <option value="c-level">C-Level</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Job Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
                className="input-field"
                placeholder="Brief description of the role and its purpose..."
              />
            </div>

            {/* Responsibilities */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Key Responsibilities
              </label>

              {/* Add new responsibility */}
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newResponsibility}
                  onChange={(e) => setNewResponsibility(e.target.value)}
                  className="input-field flex-1"
                  placeholder="Add a key responsibility..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addResponsibility()
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addResponsibility}
                  disabled={!newResponsibility.trim()}
                  className="btn-primary disabled:opacity-50 px-3"
                >
                  Add
                </button>
              </div>

              {/* Current responsibilities */}
              {formData.responsibilities.length > 0 && (
                <div className="space-y-2">
                  {formData.responsibilities.map((responsibility, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                      <span className="text-primary text-sm">{responsibility}</span>
                      <button
                        type="button"
                        onClick={() => removeResponsibility(index)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="submit"
                disabled={loading || !formData.title.trim()}
                className="btn-primary disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Job Title'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}