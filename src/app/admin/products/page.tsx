'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Package,
  Search,
  DollarSign,
  Barcode,
  ShoppingBag
} from 'lucide-react'
import { useToastContext } from '@/components/ui/toast'

interface Product {
  id: string
  name: string
  sku: string
  barcode: string | null
  basePrice: number
  costPrice: number | null
  isAvailable: boolean
  businessType: string
  businesses: {
    id: string
    name: string
  }
  business_categories: {
    id: string
    name: string
    emoji: string | null
    domain: {
      id: string
      name: string
      emoji: string | null
    }
  }
}

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
}

function UniversalProductsPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [businessType, setBusinessType] = useState(() => {
    return searchParams.get('businessType') || 'clothing'
  })
  const [products, setProducts] = useState<Product[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBusiness, setSelectedBusiness] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(() => {
    return searchParams.get('categoryId') || ''
  })
  const [stats, setStats] = useState<any>(null)

  const toast = useToastContext()

  // Update businessType when URL changes
  useEffect(() => {
    const typeFromUrl = searchParams.get('businessType')
    if (typeFromUrl && typeFromUrl !== businessType) {
      setBusinessType(typeFromUrl)
    }
  }, [searchParams])

  // Fetch products
  const fetchProducts = async (page = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        businessType,
        page: page.toString(),
        limit: pagination.limit.toString()
      })

      if (searchQuery) {
        params.append('search', searchQuery)
      }

      if (selectedBusiness) {
        params.append('businessId', selectedBusiness)
      }

      if (selectedDepartment) {
        params.append('domainId', selectedDepartment)
      }

      if (selectedCategory) {
        params.append('categoryId', selectedCategory)
      }

      const response = await fetch(`/api/admin/products?${params}`)
      const data = await response.json()

      if (data.success) {
        setProducts(data.data.products)
        setPagination(data.data.pagination)
      } else {
        toast?.push('Failed to load products')
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      toast?.push('Error loading products')
    } finally {
      setLoading(false)
    }
  }

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const params = new URLSearchParams({ businessType })
      const response = await fetch(`/api/admin/products/stats?${params}`)
      const data = await response.json()

      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  // Fetch data when filters change
  useEffect(() => {
    fetchProducts(1)
  }, [businessType, searchQuery, selectedBusiness, selectedDepartment, selectedCategory])

  // Fetch stats when businessType changes
  useEffect(() => {
    fetchStats()
  }, [businessType])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchProducts(1)
  }

  const handlePageChange = (newPage: number) => {
    fetchProducts(newPage)
  }

  const capitalizeBusinessType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  const handleDepartmentSelect = (departmentId: string) => {
    // Clear all other filters when selecting a department
    setSelectedDepartment(departmentId)
    setSelectedCategory('')
    setSelectedBusiness('')
    setSearchQuery('')

    // Update URL to only have businessType and domainId
    const newUrl = `/admin/products?businessType=${businessType}&domainId=${departmentId}`
    router.push(newUrl)
  }

  return (
    <ProtectedRoute>
      <ContentLayout title={`${capitalizeBusinessType(businessType)} Products`}>
        <div className="space-y-6">
          {/* Statistics Cards */}
          {stats && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border bg-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Products</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <Package className="h-8 w-8 text-blue-500" />
                </div>
              </div>

              <div className="rounded-lg border bg-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Need Pricing</p>
                    <p className="text-2xl font-bold">{stats.withoutPrices}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-yellow-500" />
                </div>
              </div>

              <div className="rounded-lg border bg-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Need Barcodes</p>
                    <p className="text-2xl font-bold">{stats.withoutBarcodes}</p>
                  </div>
                  <Barcode className="h-8 w-8 text-orange-500" />
                </div>
              </div>

              <div className="rounded-lg border bg-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Available</p>
                    <p className="text-2xl font-bold">{stats.available}</p>
                  </div>
                  <ShoppingBag className="h-8 w-8 text-green-500" />
                </div>
              </div>
            </div>
          )}

          {/* Filters and Search */}
          <div className="rounded-lg border bg-card p-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search by product name or SKU..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-10 py-2 text-sm"
                    />
                  </div>
                </div>

                <select
                  value={selectedBusiness}
                  onChange={(e) => setSelectedBusiness(e.target.value)}
                  className="rounded-md border border-input bg-background px-4 py-2 text-sm"
                >
                  <option value="">All Businesses</option>
                  {stats?.allBusinesses && stats.allBusinesses.map((biz: any) => (
                    <option key={biz.id} value={biz.id}>
                      {biz.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="rounded-md border border-input bg-background px-4 py-2 text-sm"
                >
                  <option value="">All Departments</option>
                  {stats?.byDepartment && Object.entries(stats.byDepartment).map(([id, dept]: [string, any]) => (
                    <option key={id} value={id}>
                      {dept.emoji} {dept.name} ({dept.count})
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Search
                </button>
              </div>

              {/* Active Filters */}
              {(selectedCategory || selectedDepartment || selectedBusiness) && (
                <div className="flex items-center gap-2 pt-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">Active filters:</span>
                  {selectedBusiness && (
                    <span className="inline-flex items-center gap-2 rounded-md bg-purple-100 dark:bg-purple-900 px-3 py-1 text-sm font-medium text-purple-800 dark:text-purple-200">
                      Business: {stats?.byBusiness?.[selectedBusiness]?.name}
                      <button
                        type="button"
                        onClick={() => setSelectedBusiness('')}
                        className="hover:text-purple-600 dark:hover:text-purple-400"
                        title="Clear business filter"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {selectedDepartment && (
                    <span className="inline-flex items-center gap-2 rounded-md bg-green-100 dark:bg-green-900 px-3 py-1 text-sm font-medium text-green-800 dark:text-green-200">
                      Department: {stats?.byDepartment?.[selectedDepartment]?.emoji} {stats?.byDepartment?.[selectedDepartment]?.name}
                      <button
                        type="button"
                        onClick={() => setSelectedDepartment('')}
                        className="hover:text-green-600 dark:hover:text-green-400"
                        title="Clear department filter"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {selectedCategory && (
                    <span className="inline-flex items-center gap-2 rounded-md bg-blue-100 dark:bg-blue-900 px-3 py-1 text-sm font-medium text-blue-800 dark:text-blue-200">
                      Category Filter
                      <button
                        type="button"
                        onClick={() => setSelectedCategory('')}
                        className="hover:text-blue-600 dark:hover:text-blue-400"
                        title="Clear category filter"
                      >
                        ×
                      </button>
                    </span>
                  )}
                </div>
              )}
            </form>
          </div>

          {/* Department Quick Navigation - Show for Clothing */}
          {businessType === 'clothing' && stats?.byDepartment && Object.keys(stats.byDepartment).length > 0 && !selectedDepartment && (
            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Browse by Department</h3>
                <span className="text-sm text-muted-foreground">
                  {Object.keys(stats.byDepartment).length} departments
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {Object.entries(stats.byDepartment)
                  .sort(([, a]: [string, any], [, b]: [string, any]) => b.count - a.count)
                  .map(([id, dept]: [string, any]) => (
                  <button
                    key={id}
                    onClick={() => handleDepartmentSelect(id)}
                    className="flex flex-col items-center justify-center p-4 rounded-lg border bg-background hover:bg-muted transition-colors text-center"
                  >
                    <span className="text-3xl mb-2">{dept.emoji}</span>
                    <span className="text-sm font-medium mb-1">{dept.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {dept.count} products
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Products Table */}
          <div className="rounded-lg border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="p-4 text-left text-sm font-medium">SKU</th>
                    <th className="p-4 text-left text-sm font-medium">Product Name</th>
                    <th className="p-4 text-left text-sm font-medium">Business</th>
                    <th className="p-4 text-left text-sm font-medium">Department</th>
                    <th className="p-4 text-left text-sm font-medium">Category</th>
                    <th className="p-4 text-left text-sm font-medium">Price</th>
                    <th className="p-4 text-left text-sm font-medium">Barcode</th>
                    <th className="p-4 text-left text-sm font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground">
                        Loading products...
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground">
                        No products found
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => (
                      <tr key={product.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <span className="font-mono text-sm">{product.sku}</span>
                        </td>
                        <td className="p-4">
                          <div className="max-w-xs truncate text-sm">{product.name}</div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm">{product.businesses?.name}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm">
                            {product.business_categories?.domain?.emoji} {product.business_categories?.domain?.name}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm">
                            {product.business_categories?.emoji} {product.business_categories?.name}
                          </span>
                        </td>
                        <td className="p-4">
                          {Number(product.basePrice) > 0 ? (
                            <span className="text-sm font-medium">${Number(product.basePrice).toFixed(2)}</span>
                          ) : (
                            <span className="text-sm text-yellow-600 dark:text-yellow-400">Not set</span>
                          )}
                        </td>
                        <td className="p-4">
                          {product.barcode ? (
                            <span className="font-mono text-sm">{product.barcode}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-4">
                          {product.isAvailable ? (
                            <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-100">
                              Available
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-100">
                              Unavailable
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t p-4">
                <div className="text-sm text-muted-foreground">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} products
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="rounded-md border bg-background px-3 py-1 text-sm disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      const pageNum = i + 1
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`rounded-md px-3 py-1 text-sm ${
                            pagination.page === pageNum
                              ? 'bg-primary text-primary-foreground'
                              : 'border bg-background hover:bg-muted'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className="rounded-md border bg-background px-3 py-1 text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Business Breakdown */}
          {stats?.byBusiness && Object.keys(stats.byBusiness).length > 1 && (
            <div className="rounded-lg border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4">Products by Business</h3>
              <div className="space-y-3">
                {Object.entries(stats.byBusiness).map(([id, biz]: [string, any]) => (
                  <div key={id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🏪</span>
                      <div>
                        <p className="font-medium">{biz.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {biz.count} products • {biz.withPrices} priced • {biz.withBarcodes} with barcodes
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedBusiness(id)}
                      className="text-sm text-primary hover:underline"
                    >
                      View All
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Department Breakdown */}
          {stats?.byDepartment && (
            <div className="rounded-lg border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4">Products by Department</h3>
              <div className="space-y-3">
                {Object.entries(stats.byDepartment).map(([id, dept]: [string, any]) => (
                  <div key={id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{dept.emoji}</span>
                      <div>
                        <p className="font-medium">{dept.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {dept.count} products • {dept.withPrices} priced • {dept.withBarcodes} with barcodes
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedDepartment(id)}
                      className="text-sm text-primary hover:underline"
                    >
                      View All
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ContentLayout>
    </ProtectedRoute>
  )
}

export default function UniversalProductsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <UniversalProductsPageContent />
    </Suspense>
  )
}
