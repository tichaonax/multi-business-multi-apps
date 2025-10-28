'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { isSystemAdmin } from '@/lib/permission-utils'
import { CustomerLayby, LaybyStatus } from '@/types/layby'
import { LaybyList } from '@/components/laybys/layby-list'
import { LaybyDetails } from '@/components/laybys/layby-details'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Search, Filter, RefreshCw } from 'lucide-react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

export default function LaybysPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [laybys, setLaybys] = useState<CustomerLayby[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedLayby, setSelectedLayby] = useState<CustomerLayby | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // Filters
  const [filters, setFilters] = useState({
    status: '' as LaybyStatus | '',
    customerId: '',
    startDate: '',
    endDate: ''
  })

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0
  })

  // Business context and permissions
  const { currentBusiness, hasPermission, isAuthenticated } = useBusinessPermissionsContext()
  const currentUser = session?.user as any
  const businessId = currentBusiness?.businessId
  const canManageLaybys = isSystemAdmin(currentUser) || hasPermission('canManageLaybys')

  // Fetch laybys
  const fetchLaybys = async () => {
    if (!businessId) return

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        businessId,
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      })

      if (filters.status) params.append('status', filters.status)
      if (filters.customerId) params.append('customerId', filters.customerId)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)

      const response = await fetch(`/api/laybys?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch laybys')
      }

      const data = await response.json()
      setLaybys(data.data || [])
      setPagination(prev => ({
        ...prev,
        totalCount: data.pagination.totalCount,
        totalPages: data.pagination.totalPages
      }))
    } catch (err) {
      console.error('Error fetching laybys:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLaybys()
  }, [businessId, pagination.page, filters])

  const handleLaybyClick = async (layby: CustomerLayby) => {
    // Fetch full layby details
    try {
      const response = await fetch(`/api/laybys/${layby.id}`)
      if (!response.ok) throw new Error('Failed to fetch layby details')

      const data = await response.json()
      setSelectedLayby(data.data)
      setShowDetailModal(true)
    } catch (err) {
      console.error('Error fetching layby details:', err)
      alert('Failed to load layby details')
    }
  }

  const handleCreateNew = () => {
    router.push('/business/laybys/new')
  }

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to page 1 on filter change
  }

  const clearFilters = () => {
    setFilters({
      status: '',
      customerId: '',
      startDate: '',
      endDate: ''
    })
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  if (!businessId) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="card p-12 text-center border-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
              <div className="text-6xl mb-4">🏢</div>
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">No Business Selected</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                To view and manage laybys, you need to select a business first.
              </p>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg text-left max-w-md mx-auto border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">How to select a business:</h3>
                <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li className="flex items-start">
                    <span className="font-bold mr-2">1.</span>
                    <span>Look at the left sidebar under <strong>&quot;Business Types&quot;</strong></span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-2">2.</span>
                    <span>Click on a business type (e.g., Clothing, Hardware, Grocery)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-2">3.</span>
                    <span>Click on a specific business from the list</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-2">4.</span>
                    <span>Return to <strong>Layby Management</strong> to view laybys for that business</span>
                  </li>
                </ol>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-6">
                {isSystemAdmin(currentUser)
                  ? "As a System Administrator, you have access to all businesses."
                  : "You can only access businesses you're a member of."}
              </p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!canManageLaybys) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto px-4 py-8">
          <div className="card p-12 text-center">
            <p className="text-secondary">You don&apos;t have permission to manage laybys</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-primary">Layby Management</h1>
            <p className="text-secondary mt-1">
              Manage customer layby agreements and payments
            </p>
          </div>
          <Button onClick={handleCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            New Layby
          </Button>
        </div>

        {/* Filters */}
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-secondary" />
            <h3 className="font-semibold">Filters</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="DEFAULTED">Defaulted</option>
                <option value="ON_HOLD">On Hold</option>
              </select>
            </div>

            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>

            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={clearFilters} className="flex-1">
                Clear Filters
              </Button>
              <Button variant="outline" onClick={fetchLaybys}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="card p-6 mb-6 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Stats */}
        {!loading && laybys.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="card p-4">
              <p className="text-sm text-secondary">Total Laybys</p>
              <p className="text-2xl font-bold">{pagination.totalCount}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-secondary">Active</p>
              <p className="text-2xl font-bold text-blue-600">
                {laybys.filter(l => l.status === 'ACTIVE').length}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-secondary">Completed</p>
              <p className="text-2xl font-bold text-green-600">
                {laybys.filter(l => l.status === 'COMPLETED').length}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-secondary">This Page</p>
              <p className="text-2xl font-bold">{laybys.length}</p>
            </div>
          </div>
        )}

        {/* Layby List */}
        <LaybyList
          laybys={laybys}
          loading={loading}
          onLaybyClick={handleLaybyClick}
          onRefresh={fetchLaybys}
        />

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-secondary">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
            >
              Next
            </Button>
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedLayby && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowDetailModal(false)}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between flex-shrink-0">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Layby Details</h2>
                <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                  Close
                </Button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 bg-white dark:bg-gray-800">
                <LaybyDetails layby={selectedLayby} />
                <div className="mt-6 flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/business/laybys/${selectedLayby.id}`)}
                  >
                    Manage Layby
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
