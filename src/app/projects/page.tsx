'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { ContentLayout } from '@/components/layout/content-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, Filter, DollarSign, Users, Calendar, TrendingUp, User, Clock, UserCheck } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { hasUserPermission, getCustomPermissionValue, isSystemAdmin } from '@/lib/permission-utils'
import Link from 'next/link'

interface ProjectType {
  id: string
  name: string
  description?: string
  businessType: string
  isActive: boolean
  isSystem: boolean
}

interface Project {
  id: string
  name: string
  description?: string
  businessType: string
  status: string
  budget?: number
  startDate?: string
  endDate?: string
  createdAt: string
  updatedAt?: string
  projectType: ProjectType
  user?: {
    id: string
    name: string
    email: string
  }
  projectContractors: Array<{
    id: string
    isPrimary: boolean
    person: {
      id: string
      fullName: string
      phone: string
      email: string
    }
  }>
  financialSummary: {
    totalBudget: number
    totalSpent: number
    remainingBudget: number
    contractorPayments: number
    projectExpenses: number
    percentageSpent: number
  }
  _count: {
    projectContractors: number
    projectTransactions: number
  }
}

export default function ProjectsPage() {
  const { data: session } = useSession()
  const [projects, setProjects] = useState<Project[]>([])
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBusinessType, setSelectedBusinessType] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [selectedProjectType, setSelectedProjectType] = useState<string>('')
  const [showMyProjectsOnly, setShowMyProjectsOnly] = useState<boolean>(false)

  const businessTypes = [
    { value: 'personal', label: 'Personal' },
    { value: 'construction', label: 'Construction' },
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'grocery', label: 'Grocery' },
    { value: 'clothing', label: 'Clothing' },
    { value: 'hardware', label: 'Hardware' }
  ]

  const statusOptions = [
    { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
    { value: 'completed', label: 'Completed', color: 'bg-blue-100 text-blue-800' },
    { value: 'on-hold', label: 'On Hold', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' }
  ]

  useEffect(() => {
    fetchProjects()
    fetchProjectTypes()
  }, [selectedBusinessType, selectedStatus, selectedProjectType])

  const fetchProjects = async () => {
    try {
      const params = new URLSearchParams()
      if (selectedBusinessType) params.append('businessType', selectedBusinessType)
      if (selectedStatus) params.append('status', selectedStatus)
      if (selectedProjectType) params.append('projectTypeId', selectedProjectType)

      const response = await fetch(`/api/projects?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProjectTypes = async () => {
    try {
      const params = new URLSearchParams()
      if (selectedBusinessType) params.append('businessType', selectedBusinessType)

      const response = await fetch(`/api/project-types?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setProjectTypes(data)
      }
    } catch (error) {
      console.error('Error fetching project types:', error)
    }
  }

  const filteredProjects = projects.filter(project => {
    // Text search filter
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.project_types.name.toLowerCase().includes(searchTerm.toLowerCase())

    // My Projects filter
    const matchesMyProjects = !showMyProjectsOnly || project.users?.id === session?.users?.id

    return matchesSearch && matchesMyProjects
  })

  const getStatusBadgeColor = (status: string) => {
    const statusOption = statusOptions.find(opt => opt.value === status)
    return statusOption?.color || 'bg-gray-100 text-gray-800'
  }

  const canCreateProjects = (businessType: string) => {
    if (!session?.user) return false
    // System admins can create projects for any business type
    if (isSystemAdmin(session.user as any)) return true
    return getCustomPermissionValue(session.user as any, `${businessType}.canCreateProjects`, undefined, false)
  }

  const canViewProjects = (businessType: string) => {
    if (!session?.user) return false
    // System admins can view projects for any business type
    if (isSystemAdmin(session.user as any)) return true

    // Check general view projects permission first
    if (hasUserPermission(session.user as any, 'canViewProjects')) return true

    // For personal projects, also check personal project permissions
    if (businessType === 'personal') {
      return hasUserPermission(session.user as any, 'canCreatePersonalProjects') ||
             hasUserPermission(session.user as any, 'canManagePersonalProjects')
    }

    // For business projects, check business-specific permissions
    return getCustomPermissionValue(session.user as any, `${businessType}.canViewProjects`, undefined, false)
  }

  const hasAnyProjectPermissions = businessTypes.some(bt =>
    canViewProjects(bt.value) || canCreateProjects(bt.value)
  )

  if (!hasAnyProjectPermissions) {
    return (
      <ContentLayout title="Projects" subtitle="Manage projects across all business types">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-secondary mb-2">Access Denied</h3>
              <p className="text-secondary/80">You don't have permission to access project management.</p>
            </div>
          </CardContent>
        </Card>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout
      title="Projects"
      subtitle="Manage projects across all business types"
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Projects', isActive: true }
      ]}
      headerActions={
        <div className="flex gap-2">
          {(
            // System admins can always create projects
            isSystemAdmin(session?.user as any) ||
            // Or users with specific business type permissions
            (selectedBusinessType && canCreateProjects(selectedBusinessType))
          ) && (
            <Link href="/projects/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </Link>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary/50" />
                  <Input
                    placeholder="Search projects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Business Type</label>
                <Select value={selectedBusinessType} onValueChange={setSelectedBusinessType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All business types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All business types</SelectItem>
                    {businessTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    {statusOptions.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Project Type</label>
                <Select value={selectedProjectType} onValueChange={setSelectedProjectType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All project types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All project types</SelectItem>
                    {projectTypes.map(type => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Creator Filter</label>
                <Button
                  variant={showMyProjectsOnly ? "default" : "outline"}
                  onClick={() => setShowMyProjectsOnly(!showMyProjectsOnly)}
                  className="w-full justify-start"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  {showMyProjectsOnly ? "My Projects" : "All Projects"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Project Summary Stats */}
        {filteredProjects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-secondary/80">Total Projects</p>
                    <p className="text-2xl font-bold text-primary">{filteredProjects.length}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-secondary/80">Total Budget</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(filteredProjects.reduce((sum, p) => sum + (p.financialSummary?.totalBudget || 0), 0))}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-secondary/80">Total Spent</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(filteredProjects.reduce((sum, p) => sum + (p.financialSummary?.totalSpent || 0), 0))}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-secondary/80">Active Projects</p>
                    <p className="text-2xl font-bold text-primary">
                      {filteredProjects.filter(p => p.status === 'active').length}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Projects List */}
        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-secondary/80">Loading projects...</p>
              </div>
            </CardContent>
          </Card>
        ) : filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-secondary mb-2">No projects found</h3>
                <p className="text-secondary/80 mb-4">
                  {searchTerm || selectedBusinessType || selectedStatus || selectedProjectType
                    ? 'Try adjusting your filters to see more projects.'
                    : 'Get started by creating your first project.'}
                </p>
                {(
                  // System admins can always create projects
                  isSystemAdmin(session?.user as any) ||
                  // Or users with specific business type permissions
                  (selectedBusinessType && canCreateProjects(selectedBusinessType))
                ) && (
                  <Link href="/projects/new">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Project
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredProjects.map((project) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg">
                          <Link href={`/projects/${project.id}`} className="hover:text-primary/80">
                            {project.name}
                          </Link>
                        </CardTitle>
                        <Badge className={getStatusBadgeColor(project.status)}>
                          {project.status}
                        </Badge>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4 text-sm text-secondary/80">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md">
                            {project.businessType}
                          </span>
                          <span>{project.project_types.name}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-secondary/60">
                          {project.user && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span>Created by: {project.users.name}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
                          </div>
                          {project.updatedAt && project.updatedAt !== project.createdAt && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>Modified: {new Date(project.updatedAt).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {project.description && (
                    <p className="text-sm text-secondary/80 mt-2">{project.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Financial Summary */}
                    {project.financialSummary && (
                      <div className="grid grid-cols-2 gap-4 p-4 bg-secondary/5 border border-secondary/10 rounded-lg">
                        <div>
                          <p className="text-xs font-medium text-secondary/70 uppercase tracking-wide">Budget</p>
                          <p className="text-lg font-semibold text-secondary">
                            {formatCurrency(project.financialSummary.totalBudget)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-secondary/70 uppercase tracking-wide">Spent</p>
                          <p className="text-lg font-semibold text-secondary">
                            {formatCurrency(project.financialSummary.totalSpent)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-secondary/70 uppercase tracking-wide">Remaining</p>
                          <p className="text-lg font-semibold text-secondary">
                            {formatCurrency(project.financialSummary.remainingBudget)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-secondary/70 uppercase tracking-wide">Progress</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-secondary/20 rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{
                                  width: `${Math.min(project.financialSummary.percentageSpent, 100)}%`
                                }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-secondary">
                              {project.financialSummary.percentageSpent.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Project Info */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{project._count.projectContractors} contractors</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span>{project._count.projectTransactions} transactions</span>
                      </div>
                    </div>

                    {/* Dates */}
                    {(project.startDate || project.endDate) && (
                      <div className="flex items-center gap-4 text-sm text-secondary/80">
                        {project.startDate && (
                          <div>
                            <span className="font-medium">Start:</span> {new Date(project.startDate).toLocaleDateString()}
                          </div>
                        )}
                        {project.endDate && (
                          <div>
                            <span className="font-medium">End:</span> {new Date(project.endDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Primary Contractor */}
                    {project.project_contractors.length > 0 && (
                      <div>
                        {project.project_contractors.filter(pc => pc.isPrimary).map(primaryContractor => (
                          <div key={primaryContractor.id} className="flex items-center gap-2 text-sm">
                            <span className="font-medium">Primary Contractor:</span>
                            <span>{primaryContractor.persons.fullName}</span>
                            <Badge variant="outline" className="text-xs">Primary</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ContentLayout>
  )
}