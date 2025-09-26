'use client'

import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { BusinessProvider } from '@/components/universal'

const BUSINESS_ID = process.env.NEXT_PUBLIC_DEMO_BUSINESS_ID || 'hardware-demo-business'

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

function HardwareProjectsContent() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'hardware' | 'all'>('hardware')

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/construction/projects')
      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  // Hardware store specific project stats
  const hardwareStats = {
    totalProjects: projects.length,
    activeProjects: projects.filter(p => p.status === 'active').length,
    projectsValue: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
    hardwareSupplied: Math.round(projects.length * 0.7) // Estimated 70% have hardware supply
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hardware Project Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Projects', value: hardwareStats.totalProjects.toString(), icon: '🏗️', color: 'text-blue-600' },
          { label: 'Active Projects', value: hardwareStats.activeProjects.toString(), icon: '⚡', color: 'text-green-600' },
          { label: 'Projects Value', value: `$${hardwareStats.projectsValue.toLocaleString()}`, icon: '💰', color: 'text-purple-600' },
          { label: 'Hardware Supplied', value: hardwareStats.hardwareSupplied.toString(), icon: '📦', color: 'text-orange-600' }
        ].map((stat, index) => (
          <div key={index} className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
              <div className="text-2xl">{stat.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Hardware Project Features */}
      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-orange-900 mb-3">
          🏗️ Hardware Store Project Management Features
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-3 border border-orange-200 dark:border-orange-800">
            <div className="text-orange-700 font-medium text-sm">📦 Material Supply</div>
            <div className="text-xs text-orange-600">Track hardware deliveries to job sites</div>
          </div>
          <div className="card p-3 border border-orange-200 dark:border-orange-800">
            <div className="text-orange-700 font-medium text-sm">🚛 Bulk Orders</div>
            <div className="text-xs text-orange-600">Special pricing for large projects</div>
          </div>
          <div className="card p-3 border border-orange-200 dark:border-orange-800">
            <div className="text-orange-700 font-medium text-sm">🔧 Tool Rental</div>
            <div className="text-xs text-orange-600">Equipment rentals for project duration</div>
          </div>
          <div className="card p-3 border border-orange-200 dark:border-orange-800">
            <div className="text-orange-700 font-medium text-sm">💰 Credit Terms</div>
            <div className="text-xs text-orange-600">Project-based payment schedules</div>
          </div>
        </div>
      </div>

      {/* View Mode Selector */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-primary">Project Management</h2>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('hardware')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'hardware'
                    ? 'card text-orange-600 dark:text-orange-400 shadow-sm'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                <span className="mr-2">🔧</span>
                Hardware Projects
              </button>
              <button
                onClick={() => setViewMode('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'all'
                    ? 'card text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                <span className="mr-2">🏗️</span>
                All Projects
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href="/projects/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <span>➕</span>
              New Project
            </Link>
            <Link
              href="/construction"
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
            >
              <span>📋</span>
              Full Project Manager
            </Link>
          </div>
        </div>

        {/* Hardware Store Context Message */}
        {viewMode === 'hardware' && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="text-orange-600 text-lg">🔧</div>
              <div>
                <h4 className="font-semibold text-orange-900 mb-1">Hardware Store Projects</h4>
                <p className="text-sm text-orange-700">
                  Manage projects that require hardware supplies, tool rentals, and contractor support.
                  Track material deliveries, bulk orders, and project-specific inventory needs.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Project Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="card p-4 sm:p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-primary">{project.name}</h3>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  project.status === 'active' ? 'bg-green-100 text-green-800' :
                  project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}>
                  {project.status}
                </span>
              </div>

              <p className="text-secondary mb-4 line-clamp-2">{project.description}</p>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span>Budget:</span>
                  <span className="font-medium">${project.budget?.toLocaleString() || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Start Date:</span>
                  <span>{new Date(project.startDate).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Hardware Store Specific Actions */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Link
                    href={`/construction/${project.id}`}
                    className="flex-1 text-center px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    View Project
                  </Link>
                  <Link
                    href={`/construction/${project.id}/expenses`}
                    className="flex-1 text-center px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    Expenses
                  </Link>
                </div>

                {/* Hardware-specific actions */}
                <div className="flex gap-2">
                  <button className="flex-1 px-3 py-2 bg-orange-600 text-white text-sm rounded hover:bg-orange-700">
                    📦 Materials
                  </button>
                  <button className="flex-1 px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700">
                    🔧 Tools
                  </button>
                </div>
              </div>
            </div>
          ))}

          {projects.length === 0 && (
            <div className="col-span-full text-center py-12">
              <div className="text-4xl mb-4">🏗️</div>
              <h3 className="text-lg font-semibold text-primary mb-2">No projects found</h3>
              <p className="text-secondary mb-4">Create your first project to start managing hardware supplies and contractor relationships.</p>
              <Link
                href="/projects/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <span>➕</span>
                Create First Project
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions for Hardware Store */}
      <div className="card p-6">
        <h3 className="font-semibold text-primary mb-4">Hardware Store Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/hardware/inventory"
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-left transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">📦</div>
              <div>
                <div className="font-semibold text-primary">Bulk Inventory</div>
                <div className="text-sm text-secondary">Project materials</div>
              </div>
            </div>
          </Link>

          <Link
            href="/hardware/tools"
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-left transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">🔧</div>
              <div>
                <div className="font-semibold text-primary">Tool Rentals</div>
                <div className="text-sm text-secondary">Equipment for projects</div>
              </div>
            </div>
          </Link>

          <Link
            href="/hardware/suppliers"
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">🚛</div>
              <div>
                <div className="font-semibold text-primary">Supplier Orders</div>
                <div className="text-sm text-secondary">Special deliveries</div>
              </div>
            </div>
          </Link>

          <button className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 text-left transition-all">
            <div className="flex items-center gap-3">
              <div className="text-2xl">💰</div>
              <div>
                <div className="font-semibold text-primary">Credit Accounts</div>
                <div className="text-sm text-secondary">Contractor billing</div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function HardwareProjectsPage() {
  return (
    <BusinessProvider businessId={BUSINESS_ID}>
      <BusinessTypeRoute requiredBusinessType="hardware">
        <ContentLayout
          title="Hardware Projects"
          subtitle="Manage contractor projects, bulk supplies, and tool rentals"
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Hardware Store', href: '/hardware' },
            { label: 'Projects', isActive: true }
          ]}
        >
          <HardwareProjectsContent />
        </ContentLayout>
      </BusinessTypeRoute>
    </BusinessProvider>
  )
}