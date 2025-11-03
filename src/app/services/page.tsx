'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { MainLayout } from '@/components/layout/main-layout'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAlert } from '@/components/ui/confirm-modal'

interface ServiceProduct {
  id: string
  name: string
  sku: string
  description: string | null
  sellingPrice: number
  cost: number
  productType: string
  isActive: boolean
  business_categories: {
    name: string
  } | null
}

export default function ServicesPage() {
  const { currentBusiness } = useBusinessPermissionsContext()
  const customAlert = useAlert()
  const [services, setServices] = useState<ServiceProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalServices: 0,
    activeServices: 0,
    categories: 0,
    suppliers: 0
  })

  useEffect(() => {
    if (currentBusiness?.businessId) {
      fetchServices()
      fetchStats()
    }
  }, [currentBusiness?.businessId])

  const fetchServices = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/business/${currentBusiness?.businessId}/products`)
      if (response.ok) {
        const data = await response.json()
        setServices(data.filter((p: ServiceProduct) => p.productType === 'SERVICE'))
      }
    } catch (error) {
      console.error('Error fetching services:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/business/${currentBusiness?.businessId}/stats`)
      if (response.ok) {
        const data = await response.json()
        setStats({
          totalServices: data.products || 0,
          activeServices: data.activeProducts || 0,
          categories: data.categories || 0,
          suppliers: data.suppliers || 0
        })
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <ContentLayout
          title="🔧 Services Management"
          subtitle={currentBusiness ? `Manage services for ${currentBusiness.businessName}` : 'Service offerings and pricing'}
          breadcrumb={[
            { label: 'Business Hub', href: '/dashboard' },
            { label: 'Services', isActive: true }
          ]}
        >
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Link href="/services/list" className="card p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <span className="text-2xl">🔧</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Services</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.totalServices}</p>
                </div>
              </div>
            </Link>

            <Link href="/services/list?status=active" className="card p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                  <span className="text-2xl">✅</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Active Services</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.activeServices}</p>
                </div>
              </div>
            </Link>

            <Link href="/services/categories" className="card p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <span className="text-2xl">📂</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Categories</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.categories}</p>
                </div>
              </div>
            </Link>

            <Link href="/services/suppliers" className="card p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center">
                <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                  <span className="text-2xl">🏢</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Suppliers</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.suppliers}</p>
                </div>
              </div>
            </Link>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Link href="/services/list" className="card p-6 hover:shadow-lg transition-shadow text-center">
              <div className="text-4xl mb-3">📋</div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Services List</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">View and manage all services</p>
            </Link>

            <Link href="/services/add" className="card p-6 hover:shadow-lg transition-shadow text-center">
              <div className="text-4xl mb-3">➕</div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Add Service</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Create new service offering</p>
            </Link>

            <Link href="/services/categories" className="card p-6 hover:shadow-lg transition-shadow text-center">
              <div className="text-4xl mb-3">📂</div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Categories</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Manage service categories</p>
            </Link>

            <Link href="/services/suppliers" className="card p-6 hover:shadow-lg transition-shadow text-center">
              <div className="text-4xl mb-3">🏢</div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Suppliers</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Manage suppliers</p>
            </Link>
          </div>

          {/* Recent Services */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Recent Services</h3>
            {loading ? (
              <p className="text-slate-600 dark:text-slate-400">Loading services...</p>
            ) : services.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-600 dark:text-slate-400 mb-4">No services found</p>
                <Link href="/services/add" className="btn-primary">
                  Add Your First Service
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Service Name</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Category</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Price</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.slice(0, 10).map((service) => (
                      <tr key={service.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-slate-900 dark:text-slate-100">{service.name}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{service.sku}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {service.business_categories?.name || 'Uncategorized'}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-slate-100">
                          ${service.sellingPrice.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            service.isActive 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {service.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </ContentLayout>
      </MainLayout>
    </ProtectedRoute>
  )
}
