'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { DateInput } from '@/components/ui/date-input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import {
  getCustomPermissionValue,
  isSystemAdmin,
  getAvailableBusinessTypesForProjects,
  canCreatePersonalProjects,
  canCreateBusinessProjects
} from '@/lib/permission-utils'

interface ProjectType {
  id: string
  name: string
  description?: string
  businessType: string
  isActive: boolean
  isSystem: boolean
}

interface ProjectCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (project: any) => void
  defaultBusinessType?: string
}

export function ProjectCreationModal({ isOpen, onClose, onSuccess, defaultBusinessType = 'personal' }: ProjectCreationModalProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([])

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    businessType: defaultBusinessType,
    businessId: '', // For business project assignment
    projectTypeId: '',
    budget: '',
    startDate: '',
    endDate: ''
  })

  const [availableBusinesses, setAvailableBusinesses] = useState<Array<{businessId: string, businessName: string, businessType: string}>>([])

  // Get available business types based on user permissions
  const availableBusinessTypes = session?.user
    ? getAvailableBusinessTypesForProjects(session.user as any)
    : []

  // Fetch user's business memberships for business assignment
  useEffect(() => {
    const fetchBusinesses = async () => {
      if (session?.user && canCreateBusinessProjects(session.user as any)) {
        try {
          const response = await fetch('/api/user/business-memberships')
          if (response.ok) {
            const memberships = await response.json()
            setAvailableBusinesses(memberships)
          }
        } catch (error) {
          console.error('Error fetching business memberships:', error)
        }
      }
    }

    if (isOpen) {
      fetchBusinesses()
    }
  }, [session, isOpen])

  useEffect(() => {
    if (formData.businessType) {
      fetchProjectTypes(formData.businessType)
    } else {
      setProjectTypes([])
    }
  }, [formData.businessType])

  const fetchProjectTypes = async (businessType: string) => {
    try {
      const response = await fetch(`/api/project-types?businessType=${businessType}`)
      if (response.ok) {
        const data = await response.json()
        setProjectTypes(data)
      }
    } catch (error) {
      console.error('Error fetching project types:', error)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }

      // Reset businessId when businessType changes
      if (field === 'businessType') {
        newData.businessId = ''
        // Also reset project type since it depends on business type
        newData.projectTypeId = ''
      }

      return newData
    })
    setError('')
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Project name is required')
      return false
    }
    if (!formData.businessType) {
      setError('Business type is required')
      return false
    }
    // For business projects (not personal), business assignment is required
    if (formData.businessType !== 'personal' && !formData.businessId) {
      setError('Business assignment is required for business projects')
      return false
    }
    if (!formData.projectTypeId) {
      setError('Project type is required')
      return false
    }
    if (formData.budget && isNaN(Number(formData.budget))) {
      setError('Budget must be a valid number')
      return false
    }
    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate)
      const endDate = new Date(formData.endDate)
      if (startDate >= endDate) {
        setError('End date must be after start date')
        return false
      }
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    // Check permissions
    if (!session?.user) {
      setError('You must be logged in to create projects')
      return
    }

    // Check if user can create projects for this business type using new permission functions
    const isAdmin = isSystemAdmin(session.user as any)
    const canCreateProjectsForType = isAdmin ||
      (formData.businessType === 'personal'
        ? canCreatePersonalProjects(session.user as any)
        : canCreateBusinessProjects(session.user as any) &&
          getCustomPermissionValue(session.user as any, `${formData.businessType}.canCreateProjects`, undefined, false)
      )

    if (!canCreateProjectsForType) {
      setError(`You don't have permission to create ${formData.businessType} projects`)
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          businessType: formData.businessType,
          businessId: formData.businessType === 'personal' ? null : formData.businessId || null,
          projectTypeId: formData.projectTypeId,
          budget: formData.budget ? Number(formData.budget) : null,
          startDate: formData.startDate || null,
          endDate: formData.endDate || null
        })
      })

      if (response.ok) {
        const newProject = await response.json()

        // Reset form
        setFormData({
          name: '',
          description: '',
          businessType: defaultBusinessType,
          businessId: '',
          projectTypeId: '',
          budget: '',
          startDate: '',
          endDate: ''
        })

        // Call success callback
        if (onSuccess) {
          onSuccess(newProject)
        }

        // Close modal
        onClose()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to create project')
      }
    } catch (error) {
      console.error('Error creating project:', error)
      setError('Failed to create project. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    // Reset form when closing
    setFormData({
      name: '',
      description: '',
      businessType: defaultBusinessType,
      businessId: '',
      projectTypeId: '',
      budget: '',
      startDate: '',
      endDate: ''
    })
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-primary mb-4">Create New Project</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter project name"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter project description (optional)"
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessType">Business Type *</Label>
              <Select
                value={formData.businessType}
                onValueChange={(value) => handleInputChange('businessType', value)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select business type">
                    {formData.businessType ?
                      availableBusinessTypes.find(type => type.value === formData.businessType)?.label || formData.businessType
                      : "Select business type"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableBusinessTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectTypeId">Project Type *</Label>
              <Select
                value={formData.projectTypeId}
                onValueChange={(value) => handleInputChange('projectTypeId', value)}
                disabled={loading || !formData.businessType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project type">
                    {formData.projectTypeId ?
                      projectTypes.find(type => type.id === formData.projectTypeId)?.name || formData.projectTypeId
                      : "Select project type"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {projectTypes.map(type => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                      {type.isSystem && (
                        <span className="ml-2 text-xs text-secondary/60">(System)</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.businessType && projectTypes.length === 0 && (
                <p className="text-sm text-secondary/60">
                  No project types available for {formData.businessType}
                </p>
              )}
            </div>
          </div>

          {/* Business Assignment Dropdown - Only show for business projects */}
          {formData.businessType && formData.businessType !== 'personal' && (
            <div className="space-y-2">
              <Label htmlFor="businessId">Business Assignment *</Label>
              <Select
                value={formData.businessId}
                onValueChange={(value) => handleInputChange('businessId', value)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select business">
                    {formData.businessId ?
                      availableBusinesses.find(business => business.businessId === formData.businessId)?.businessName || formData.businessId
                      : "Select business"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableBusinesses
                    .filter(business => business.businessType === formData.businessType)
                    .map(business => (
                      <SelectItem key={business.businessId} value={business.businessId}>
                        {business.businessName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {formData.businessType && formData.businessType !== 'personal' && availableBusinesses.filter(b => b.businessType === formData.businessType).length === 0 && (
                <p className="text-sm text-secondary/60">
                  No businesses available for {formData.businessType} projects
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="budget">Budget (Optional)</Label>
            <Input
              id="budget"
              type="number"
              step="0.01"
              min="0"
              value={formData.budget}
              onChange={(e) => handleInputChange('budget', e.target.value)}
              placeholder="Enter project budget"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date (Optional)</Label>
              <DateInput
                id="startDate"
                value={formData.startDate}
                onChange={(value) => handleInputChange('startDate', value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date (Optional)</Label>
              <DateInput
                id="endDate"
                value={formData.endDate}
                onChange={(value) => handleInputChange('endDate', value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}