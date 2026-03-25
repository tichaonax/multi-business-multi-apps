'use client'

// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { DateInput } from '@/components/ui/date-input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Save, ArrowLeft, AlertCircle } from 'lucide-react'
import {
  getCustomPermissionValue,
  isSystemAdmin,
  getAvailableBusinessTypesForProjects,
  canCreatePersonalProjects,
  canCreateBusinessProjects
} from '@/lib/permission-utils'
import Link from 'next/link'

interface ProjectType {
  id: string
  name: string
  description?: string
  businessType: string
  isActive: boolean
  isSystem: boolean
}

export default function NewProjectPage() {
  const { data: session } = useSession()
  const currentUser = session?.user as any
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([])

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    businessType: '',
    businessId: '', // For business project assignment
    projectTypeId: '',
    budget: '',
    startDate: '',
    endDate: ''
  })

  const [availableBusinesses, setAvailableBusinesses] = useState<Array<{businessId: string, businessName: string, businessType: string}>>([])

  // Get available business types based on user permissions
  const availableBusinessTypes = currentUser
    ? getAvailableBusinessTypesForProjects(currentUser as any)
    : []

  // Fetch user's business memberships for business assignment
  useEffect(() => {
    const fetchBusinesses = async () => {
  if (currentUser && canCreateBusinessProjects(currentUser as any)) {
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

    fetchBusinesses()
  }, [session])

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
    if (!currentUser) {
      setError('You must be logged in to create projects')
      return
    }

    // Check if user can create projects for this business type using new permission functions
    const isAdmin = isSystemAdmin(currentUser as any)
    const canCreateProjectsForType = isAdmin ||
      (formData.businessType === 'personal'
        ? canCreatePersonalProjects(currentUser as any)
        : canCreateBusinessProjects(currentUser as any) &&
          getCustomPermissionValue(currentUser as any, `${formData.businessType}.canCreateProjects`, undefined, false)
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
        // Use replace instead of push to prevent back button from returning to form
        router.replace(`/projects/${newProject.id}`)
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

  const canCreateAnyProjects =
    // System admins can always create projects
    (currentUser && isSystemAdmin(currentUser as any)) ||
    // Or users who can create personal projects
    (currentUser && canCreatePersonalProjects(currentUser as any)) ||
    // Or users who can create business projects (simplified check)
    (currentUser && canCreateBusinessProjects(currentUser as any))

  if (!canCreateAnyProjects) {
    return (
      <ContentLayout title="Create New Project" subtitle="Add a new project to manage">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-secondary mb-2">Access Denied</h3>
              <p className="text-secondary/80">You don't have permission to create projects.</p>
              <Link href="/projects">
                <Button variant="outline" className="mt-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Projects
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout
      title="Create New Project"
      subtitle="Add a new project to manage"
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Projects', href: '/projects' },
        { label: 'New Project', isActive: true }
      ]}
      headerActions={
        <Link href="/projects">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </Link>
      }
    >
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent>
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
                <Link href="/projects">
                  <Button type="button" variant="outline" disabled={loading}>
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Create Project
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </ContentLayout>
  )
}