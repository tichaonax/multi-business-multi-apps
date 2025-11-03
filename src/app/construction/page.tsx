'use client'

import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Wrench, Users, DollarSign, FolderKanban, Package, TrendingUp } from 'lucide-react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

interface Stats {
  totalProjects: number
  activeProjects: number
  totalRevenue: number
  totalServices: number
  totalSuppliers: number
  categoriesCount: number
}

interface Project {
  id: string
  name: string
  description: string
  status: string
  budget: number
  startDate: string
  endDate: string
  createdAt: string
}

export default function ConstructionDashboard() {
  const { currentBusiness } = useBusinessPermissionsContext()

  const [stats, setStats] = useState<Stats>({
    totalProjects: 0,
    activeProjects: 0,
    totalRevenue: 0,
    totalServices: 0,
    totalSuppliers: 0,
    categoriesCount: 0
  })
  const [recentProjects, setRecentProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch data when currentBusiness is available
    if (currentBusiness?.businessId) {
      fetchDashboardData()
    }
  }, [currentBusiness?.businessId])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // Fetch projects for this specific construction business
      const projectsResponse = await fetch(`/api/projects?businessType=construction&businessId=${currentBusiness?.businessId || ''}`)
      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json()
        setRecentProjects(projectsData.slice(0, 5))
        
        // Calculate project stats
        const activeCount = projectsData.filter((p: Project) => p.status === 'active').length
        setStats(prev => ({
          ...prev,
          totalProjects: projectsData.length,
          activeProjects: activeCount
        }))
      } else {
        console.error('Failed to fetch projects:', projectsResponse.status)
      }

      // Fetch business stats (services, categories, suppliers)
      if (currentBusiness?.businessId) {
        const statsResponse = await fetch(`/api/business/${currentBusiness.businessId}/stats`)
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setStats(prev => ({
            ...prev,
            totalServices: statsData.products || 0,
            categoriesCount: statsData.categories || 0,
            totalSuppliers: statsData.suppliers || 0
          }))
        } else {
          console.error('Failed to fetch business stats:', statsResponse.status)
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <BusinessTypeRoute requiredBusinessType="construction">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
        </div>
      </BusinessTypeRoute>
    )
  }

  return (
    <BusinessTypeRoute requiredBusinessType="construction">
      <ContentLayout
        title="🏗️ Construction Dashboard"
        subtitle="Manage your construction projects, services, and resources"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Construction', isActive: true }
        ]}
      >
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link href={`/projects?businessType=construction&businessId=${currentBusiness?.businessId || ''}`}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Projects</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.totalProjects}</p>
                  </div>
                  <Building2 className="h-12 w-12 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href={`/projects?businessType=construction&status=active&businessId=${currentBusiness?.businessId || ''}`}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Projects</p>
                    <p className="text-3xl font-bold text-green-600">{stats.activeProjects}</p>
                  </div>
                  <FolderKanban className="h-12 w-12 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/services/list">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Services Offered</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.totalServices}</p>
                  </div>
                  <Wrench className="h-12 w-12 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/services/suppliers">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Suppliers</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.totalSuppliers}</p>
                  </div>
                  <Package className="h-12 w-12 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Project Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/projects/new" className="block p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <div className="font-medium">Create New Project</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Start a new construction project</div>
              </Link>
              <Link href="/projects?businessType=construction" className="block p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <div className="font-medium">View All Projects</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Manage all your projects</div>
              </Link>
              <Link href="/projects?businessType=construction&status=active" className="block p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <div className="font-medium">Active Projects</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">View ongoing work</div>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Services & Offerings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/services/add" className="block p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <div className="font-medium">Add New Service</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Create a new service offering</div>
              </Link>
              <Link href="/services/list" className="block p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <div className="font-medium">Manage Services</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">View and edit all services</div>
              </Link>
              <Link href="/services/categories" className="block p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <div className="font-medium">Service Categories</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Organize service types</div>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Resources & Suppliers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/services/suppliers" className="block p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <div className="font-medium">Manage Suppliers</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">View supplier directory</div>
              </Link>
              <Link href="/construction/suppliers" className="block p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <div className="font-medium">Materials & Equipment</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Track construction materials</div>
              </Link>
              <Link href="/employees?businessType=construction" className="block p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <div className="font-medium">Crew Management</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Manage construction workers</div>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Recent Projects */}
        {recentProjects.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Projects</CardTitle>
                <Link href="/projects?businessType=construction" className="text-sm text-blue-600 hover:text-blue-500">
                  View All →
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentProjects.map((project) => (
                  <Link 
                    key={project.id} 
                    href={`/projects/${project.id}`}
                    className="block p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{project.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{project.description}</p>
                      </div>
                      <div className="ml-4 flex items-center gap-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          project.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          project.status === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                          project.status === 'planning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                          {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                        </span>
                        {project.budget > 0 && (
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              ${project.budget.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500">Budget</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {recentProjects.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No Projects Yet</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Get started by creating your first construction project
                </p>
                <Link href="/projects/new" className="btn-primary">
                  Create First Project
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </ContentLayout>
    </BusinessTypeRoute>
  )
}