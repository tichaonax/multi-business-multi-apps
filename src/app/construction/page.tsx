'use client'

import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'

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

export default function ConstructionPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return (
      <BusinessTypeRoute requiredBusinessType="construction">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </BusinessTypeRoute>
    )
  }

  return (
    <BusinessTypeRoute requiredBusinessType="construction">
      <ContentLayout
        title="🏗️ Construction Projects"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Construction', isActive: true }
        ]}
        headerActions={
          <Link
            href="/projects/new"
            className="btn-primary"
          >
            New Project
          </Link>
        }
      >

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="card p-6">
              <h3 className="text-lg font-semibold mb-2 text-primary">{project.name}</h3>
              <p className="text-secondary mb-4">{project.description}</p>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    project.status === 'active' ? 'bg-green-100 text-green-800' :
                    project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {project.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Budget:</span>
                  <span>${project.budget?.toLocaleString() || 'N/A'}</span>
                </div>
              </div>
              
              <div className="mt-4 space-x-2">
                <Link
                  href={`/construction/${project.id}`}
                  className="text-blue-600 hover:text-blue-500 text-sm"
                >
                  View Details
                </Link>
                <Link
                  href={`/construction/${project.id}/expenses`}
                  className="text-green-600 hover:text-green-500 text-sm"
                >
                  Expenses
                </Link>
              </div>
            </div>
          ))}
          
          {projects.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              No projects found. Create your first project to get started.
            </div>
          )}
        </div>
      </ContentLayout>
    </BusinessTypeRoute>
  )
}