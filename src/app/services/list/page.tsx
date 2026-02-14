'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { ProtectedRoute } from '@/components/auth/protected-route'
import { MainLayout } from '@/components/layout/main-layout'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'
import { useGlobalCart } from '@/contexts/global-cart-context'
import { toast } from 'sonner'

interface ServiceProduct {
  id: string
  name: string
  sku: string
  description: string | null
  sellingPrice: number
  cost: number
  productType: string
  isActive: boolean
  unitOfMeasure: string | null
  business_categories: {
    id: string
    name: string
  } | null
}

export default function ServicesListPage() {
  const { currentBusiness } = useBusinessPermissionsContext()
  const customAlert = useAlert()
  const customConfirm = useConfirm()
  const { addToCart } = useGlobalCart()
  const [services, setServices] = useState<ServiceProduct[]>([])
  const [filteredServices, setFilteredServices] = useState<ServiceProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])

  // Handle query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const status = params.get('status')
    if (status === 'active') {
      setStatusFilter('active')
    } else if (status === 'inactive') {
      setStatusFilter('inactive')
    }
  }, [])

  useEffect(() => {
    if (currentBusiness?.businessId) {
      fetchServices()
      fetchCategories()
    }
  }, [currentBusiness?.businessId])

  useEffect(() => {
    filterServices()
  }, [services, searchTerm, statusFilter, categoryFilter])

  const fetchServices = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/business/${currentBusiness?.businessId}/products`)
      if (response.ok) {
        const data = await response.json()
        const serviceData = data.filter((p: ServiceProduct) => p.productType === 'SERVICE')
        setServices(serviceData)
      }
    } catch (error) {
      console.error('Error fetching services:', error)
      customAlert({ title: 'Error', description: 'Error fetching services' })
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch(`/api/business/${currentBusiness?.businessId}/categories`)
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const filterServices = () => {
    let filtered = [...services]

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          s.sku.toLowerCase().includes(term) ||
          s.description?.toLowerCase().includes(term)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((s) => 
        statusFilter === 'active' ? s.isActive : !s.isActive
      )
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((s) => s.business_categories?.id === categoryFilter)
    }

    setFilteredServices(filtered)
  }

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await customConfirm({
      title: 'Delete Service',
      description: `Are you sure you want to delete "${name}"? This action cannot be undone.`
    })

    if (confirmed) {
      try {
        const response = await fetch(`/api/business/${currentBusiness?.businessId}/products/${id}`, {
          method: 'DELETE',
        })

        if (response.ok) {
          await customAlert({ title: 'Success', description: `Service "${name}" deleted successfully` })
          fetchServices()
        } else {
          const error = await response.json()
          await customAlert({ title: 'Error', description: error.message || 'Failed to delete service' })
        }
      } catch (error) {
        console.error('Error deleting service:', error)
        await customAlert({ title: 'Error', description: 'Error deleting service' })
      }
    }
  }

  const handleAddToCart = (service: ServiceProduct) => {
    addToCart({
      productId: service.id,
      variantId: `svc_${service.id}`,  // Virtual variant ID for cart display
      name: service.name,
      sku: service.sku,
      price: service.sellingPrice,
      attributes: { isService: true, businessService: true, productName: service.name }
    })
    toast.success(`Added "${service.name}" to cart`)
  }

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/business/${currentBusiness?.businessId}/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      })

      if (response.ok) {
        fetchServices()
      } else {
        await customAlert({ title: 'Error', description: 'Error updating service status' })
      }
    } catch (error) {
      console.error('Error updating status:', error)
      await customAlert({ title: 'Error', description: 'Error updating service status' })
    }
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <ContentLayout
          title="Services List"
          subtitle="Manage all your service offerings"
          breadcrumb={[
            { label: 'Business Hub', href: '/dashboard' },
            { label: 'Services', href: '/services' },
            { label: 'List', isActive: true }
          ]}
        >
          {/* Filters and Search */}
          <div className="card p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Search by name, SKU, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input w-full px-4 py-2.5 text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="input w-full px-4 py-2.5 text-base"
                >
                  <option value="all">All Services</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="input w-full px-4 py-2.5 text-base"
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-between items-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Showing {filteredServices.length} of {services.length} services
              </p>
              <Link href="/services/add" className="btn-primary">
                ➕ Add New Service
              </Link>
            </div>
          </div>

          {/* Services Table */}
          <div className="card p-6">
            {loading ? (
              <div className="text-center py-8">
                <p className="text-slate-600 dark:text-slate-400">Loading services...</p>
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                    ? 'No services match your filters'
                    : 'No services found'}
                </p>
                {!searchTerm && statusFilter === 'all' && categoryFilter === 'all' && (
                  <Link href="/services/add" className="btn-primary">
                    Add Your First Service
                  </Link>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Service</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Category</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Price</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Cost</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Margin</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Status</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredServices.map((service) => {
                      const margin = service.sellingPrice - service.cost
                      const marginPercent = service.cost > 0 
                        ? ((margin / service.cost) * 100).toFixed(1)
                        : '0'
                      
                      return (
                        <tr key={service.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium text-slate-900 dark:text-slate-100">{service.name}</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">{service.sku}</p>
                              {service.unitOfMeasure && (
                                <p className="text-xs text-slate-500 dark:text-slate-500">Unit: {service.unitOfMeasure}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                            {service.business_categories?.name || 'Uncategorized'}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-slate-100">
                            ${service.sellingPrice.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                            ${service.cost.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={margin >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                              ${margin.toFixed(2)} ({marginPercent}%)
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleToggleStatus(service.id, service.isActive)}
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full cursor-pointer ${
                                service.isActive 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}
                            >
                              {service.isActive ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex justify-center gap-2">
                              {service.isActive && service.sellingPrice > 0 && (
                                <button
                                  onClick={() => handleAddToCart(service)}
                                  className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                                  title="Add to Cart"
                                >
                                  🛒
                                </button>
                              )}
                              <Link
                                href={`/services/edit/${service.id}`}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                title="Edit"
                              >
                                ✏️
                              </Link>
                              <button
                                onClick={() => handleDelete(service.id, service.name)}
                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                title="Delete"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
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
